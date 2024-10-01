import fs from 'node:fs';
import { stat as fsStat, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import type { ColoredMessage, InputOutputAdapter, QueuedAdapter } from '@yeoman/types';
import { type Change, diffLines, diffWords } from 'diff';
import { type FileTransform, loadFile } from 'mem-fs';
import type { MemFsEditorFile } from 'mem-fs-editor';
import { clearFileState, setModifiedFileState } from 'mem-fs-editor/state';
import { transform } from 'p-transform';
import { binaryDiff, isBinary } from './binary-diff.js';

export type ConflicterStatus = 'create' | 'skip' | 'identical' | 'force' | 'conflict' | 'ignore';

export type ConflicterLog = ConflicterStatus | 'conflict';

export type ConflicterAction = 'write' | 'abort' | 'diff' | 'reload' | 'force' | 'edit';

export function setConflicterStatus<F extends ConflicterFile = ConflicterFile>(file: F, status?: ConflicterStatus): F {
  file.conflicter = status;
  return file;
}

export type ConflicterFile = MemFsEditorFile & {
  relativePath: string;
  conflicter?: ConflicterStatus;
  fileModeChanges?: [number, number];
  changesDetected?: boolean;
  binary?: boolean;
  conflicterChanges?: Change[];
};

export type ConflictedFile = ConflicterFile & {
  conflicterChanges: Change[];
  changesDetected: true;
};

export type ConflicterOptions = {
  force?: boolean;
  bail?: boolean;
  ignoreWhitespace?: boolean;
  regenerate?: boolean;
  dryRun?: boolean;
  cwd?: string;
  diffOptions?: any;
};

type ConflicterTransformOptions = { yoResolveFileName?: string };

const prepareChange = (changes: string, prefix: string) =>
  changes
    .split('\n')
    .map((line, index, array) => (array.length - 1 === index ? line : `${prefix}${line}`))
    .join('\n');

/**
 * The Conflicter is a module that can be used to detect conflict between files. Each
 * Generator file system helpers pass files through this module to make sure they don't
 * break a user file.
 *
 * When a potential conflict is detected, we prompt the user and ask them for
 * confirmation before proceeding with the actual write.
 *
 * @constructor
 * @property {Boolean} force - same as the constructor argument
 *
 * @param  {TerminalAdapter} adapter - The generator adapter
 * @param  {Object} options - Conflicter options
 * @param  {Boolean} [options.force=false] - When set to true, we won't check for conflict. (the conflicter become a passthrough)
 * @param  {Boolean} [options.bail=false] - When set to true, we will abort on first conflict. (used for testing reproducibility)
 * @param  {Boolean} [options.ignoreWhitespace=false] - When set to true, whitespace changes should not generate a conflict.
 * @param  {Boolean} [options.regenerate=false] - When set to true, identical files should be written to disc.
 * @param  {Boolean} [options.dryRun=false] - When set to true, no write operation will be executed.
 * @param  {Boolean} [options.cwd=process.cwd()] - Path to be used as reference for relative path.
 * @param  {string} cwd - Set cwd for relative logs.
 */
export class Conflicter {
  force: boolean;
  bail: boolean;
  ignoreWhitespace: boolean;
  regenerate: boolean;
  dryRun: boolean;
  cwd: string;
  diffOptions?: any;

  constructor(
    private readonly adapter: InputOutputAdapter,
    options?: ConflicterOptions,
  ) {
    this.force = options?.force ?? false;
    this.bail = options?.bail ?? false;
    this.ignoreWhitespace = options?.ignoreWhitespace ?? false;
    this.regenerate = options?.regenerate ?? false;
    this.dryRun = options?.dryRun ?? false;
    this.cwd = path.resolve(options?.cwd ?? process.cwd());
    this.diffOptions = options?.diffOptions;

    if (this.bail) {
      // Bail conflicts with force option, if bail set force to false.
      this.force = false;
    }
  }

  private log(file: ConflicterFile, adapter: InputOutputAdapter = this.adapter) {
    const logStatus = file.conflicter;
    const logLevel = logStatus === 'ignore' ? 'skip' : logStatus;
    if (logLevel && adapter.log[logLevel]) {
      adapter.log[logLevel](file.relativePath);
    }
  }

  /**
   * Print the file differences to console
   *
   * @param  {Object}   file File object respecting this interface: { path, contents }
   */
  private async _printDiff({ file, adapter }: { file: ConflictedFile; adapter?: InputOutputAdapter }) {
    const destinationAdapter = adapter ?? this.adapter;
    if (file.binary === undefined) {
      file.binary = isBinary(file.path, file.contents ?? undefined);
    }

    if (file.binary) {
      destinationAdapter.log.writeln(binaryDiff(file.path, file.contents ?? undefined));
      return;
    }

    const colorLines = (colored: ColoredMessage): ColoredMessage[] => {
      if (colored.color) {
        const lines = colored.message.split('\n');
        const returnValue: ColoredMessage[] = [];
        for (const [index, message] of lines.entries()) {
          // Empty message can be ignored
          if (message) {
            returnValue.push({ message, color: colored.color });
          }

          if (index + 1 < lines.length) {
            returnValue.push({ message: '\n' });
          }
        }

        return returnValue;
      }

      return [colored];
    };

    const messages: ColoredMessage[][] = file.conflicterChanges
      ?.map((change: Change): ColoredMessage => {
        if (change.added) {
          return { color: 'added', message: prepareChange(change.value, '+') };
        }

        if (change.removed) {
          return { color: 'removed', message: prepareChange(change.value, '-') };
        }

        return { message: prepareChange(change.value, ' ') };
      })
      .map((colored: ColoredMessage): ColoredMessage[] => colorLines(colored));

    if (file.fileModeChanges) {
      destinationAdapter.log.colored([
        { message: `\nold mode ${file.fileModeChanges[0]}`, color: 'removed' },
        { message: `\nnew mode ${file.fileModeChanges[1]}`, color: 'added' },
        { message: '\n' },
      ]);
    }

    if (messages) {
      destinationAdapter.log.colored([
        { message: '\n' },
        { message: 'removed', color: 'removed' },
        { message: '' },
        { message: 'added', color: 'added' },
        { message: '\n\n' },
        ...messages.flat(),
        { message: '\n\n' },
      ]);
    }
  }

  /**
   * Detect conflicts between file contents at `filepath` with the `contents` passed to the
   * function
   *
   * If `filepath` points to a folder, we'll always return true.
   *
   * Based on detect-conflict module
   *
   * @param  {import('vinyl')} file File object respecting this interface: { path, contents }
   * @return {Boolean} `true` if there's a conflict, `false` otherwise.
   */
  private async _detectConflict(file: ConflicterFile): Promise<boolean> {
    let { contents } = file;
    const { stat } = file;
    const filepath = path.resolve(file.path);

    // If file path point to a directory, then it's not safe to write
    const diskStat = await fsStat(filepath);
    if (diskStat.isDirectory()) {
      return true;
    }

    if (stat?.mode && diskStat.mode !== stat.mode) {
      file.fileModeChanges = [Number.parseInt(diskStat.mode.toString(8), 10), Number.parseInt(stat.mode.toString(8), 10)];
    }

    if (file.binary === undefined) {
      file.binary = isBinary(file.path, file.contents ?? undefined);
    }

    const actual = await readFile(path.resolve(filepath));

    if (!Buffer.isBuffer(contents)) {
      contents = Buffer.from(contents ?? '', 'utf8');
    }

    if (file.binary) {
      return Boolean(file.fileModeChanges) || actual.toString('hex') !== contents.toString('hex');
    }

    let modified: boolean;
    let changes;
    if (this.ignoreWhitespace) {
      changes = diffWords(actual.toString(), contents.toString(), this.diffOptions);
      modified = changes.some(change => change.value?.trim() && (change.added || change.removed));
    } else {
      changes = diffLines(actual.toString(), contents.toString(), this.diffOptions);
      modified = (changes.length > 1 || changes[0].added || changes[0].removed) ?? false;
    }

    if (modified) {
      file.conflicterChanges = changes;
    }

    return Boolean(file.fileModeChanges) || modified;
  }

  /**
   * Check if a file conflict with the current version on the user disk
   *
   * A basic check is done to see if the file exists, if it does:
   *
   *   1. Read its content from  `fs`
   *   2. Compare it with the provided content
   *   3. If identical, mark it as is and skip the check
   *   4. If diverged, prepare and show up the file collision menu
   *
   * @param file - Vinyl file
   * @return Promise the Vinyl file
   */
  async checkForCollision(file: ConflicterFile): Promise<ConflicterFile> {
    file.relativePath = path.relative(this.cwd, file.path);

    if (!file.conflicter) {
      file = await this._checkForCollision(file);
    }

    if (file.conflicter === 'conflict' && !this.bail && !this.dryRun) {
      const conflictedFile: ConflictedFile = file as ConflictedFile;

      if ((this.adapter as any).queue) {
        const queuedFile = await (this.adapter as QueuedAdapter).queue(async adapter => {
          const file = await this.ask(adapter, conflictedFile);
          this.log(file, adapter);
          return file;
        });
        /* c8 ignore next 3 */
        if (!queuedFile) {
          throw new Error('A conflicter file was not returned');
        }

        file = queuedFile;
      } else {
        /* c8 ignore next 3 */
        file = await this.ask(this.adapter, conflictedFile);
        this.log(file);
      }
    } else {
      this.log(file);
    }

    if (file.changesDetected && this.bail) {
      if (file.conflicterChanges) {
        await this._printDiff({ file: file as ConflictedFile });
      }

      this.adapter.log.writeln('Aborting ...');
      const error = new Error(`Process aborted by conflict: ${file.relativePath}`);
      (error as any).file = file;
      throw error;
    }

    if (this.dryRun) {
      if (file.conflicterChanges) {
        await this._printDiff({ file: file as ConflictedFile });
      }

      setConflicterStatus(file, 'skip');
    }

    if (!this.regenerate && file.conflicter === 'identical') {
      setConflicterStatus(file, 'skip');
    }

    return file;
  }

  private async _checkForCollision(file: ConflicterFile): Promise<ConflicterFile> {
    if (!fs.existsSync(file.path)) {
      file.changesDetected = true;
      setConflicterStatus(file, 'create');
      return file;
    }

    if (this.force) {
      setConflicterStatus(file, 'force');
      return file;
    }

    if (await this._detectConflict(file)) {
      file.changesDetected = true;
      setConflicterStatus(file, 'conflict');
      return file;
    }

    setConflicterStatus(file, 'identical');
    return file;
  }

  private async ask(adapter: InputOutputAdapter, file: ConflictedFile): Promise<ConflictedFile> {
    if (this.force) {
      setConflicterStatus(file, 'force');
      return file;
    }

    adapter.log.conflict(file.relativePath);
    const action = await this._ask({ file, counter: 1, adapter });
    setConflicterStatus(file, action);
    return file;
  }

  /**
   * Actual prompting logic
   * @private
   * @param {import('vinyl')} file vinyl file object
   * @param {Number} counter prompts
   */
  private async _ask({
    file,
    counter,
    adapter,
  }: {
    file: ConflictedFile;
    counter: number;
    adapter: InputOutputAdapter;
  }): Promise<ConflicterStatus> {
    // Only offer diff option for files
    const fileStat = await fsStat(file.path);
    const message = `Overwrite ${file.relativePath}?`;

    const result = await adapter.prompt<{ action: ConflicterAction | (({ file }: { file: ConflicterFile }) => ConflicterStatus) }>([
      {
        name: 'action',
        type: 'expand',
        message,
        choices: [
          {
            key: 'y',
            name: 'overwrite',
            value: 'write',
          },
          {
            key: 'n',
            name: 'do not overwrite',
            value: 'skip',
          },
          {
            key: 'a',
            name: 'overwrite this and all others',
            value: 'force',
          },
          {
            key: 'r',
            name: 'reload file (experimental)',
            value: 'reload',
          },
          {
            key: 'x',
            name: 'abort',
            value: 'abort',
          },
          ...(fileStat.isFile()
            ? ([
                {
                  key: 'd',
                  name: 'show the differences between the old and the new',
                  value: 'diff',
                },
                {
                  key: 'e',
                  name: 'edit file (experimental)',
                  value: 'edit',
                },
                {
                  key: 'i',
                  name: 'ignore, do not overwrite and remember (experimental)',
                  value: 'ignore',
                },
              ] as const)
            : []),
        ],
      },
    ]);
    if (typeof result.action === 'function') {
      return result.action.call(this, { file, relativeFilePath: file.relativePath, adapter });
    }

    if (result.action === 'abort') {
      adapter.log.writeln('Aborting ...');
      throw new Error('Process aborted by user');
    }

    if (result.action === 'diff') {
      await this._printDiff({ file, adapter });

      counter++;
      if (counter === 5) {
        throw new Error(`Recursive error ${message}`);
      }

      return this._ask({ file, counter, adapter });
    }

    if (result.action === 'force') {
      this.force = true;
    }

    if (result.action === 'write') {
      return 'force';
    }

    if (result.action === 'reload') {
      if (await this._detectConflict(file)) {
        return this._ask({ file, counter, adapter });
      }

      return 'identical';
    }

    if (result.action === 'edit') {
      const answers = await adapter.prompt<{ content?: string }>([
        {
          name: 'content',
          type: 'editor',
          default: file.contents?.toString(),
          postfix: `.${path.extname(file.path)}`,
          message: `Edit ${file.relativePath}`,
        },
      ]);
      file.contents = Buffer.from(answers.content ?? '', 'utf8');
      if (await this._detectConflict(file)) {
        return this._ask({ file, counter, adapter });
      }

      return 'skip';
    }

    return result.action;
  }

  createTransform({ yoResolveFileName }: ConflicterTransformOptions = {}): FileTransform<MemFsEditorFile> {
    const yoResolveFilePath = path.resolve(this.cwd, yoResolveFileName ?? '.yo-resolve');
    let yoResolveFile: ConflicterFile;
    let yoResolveContents = '';

    return transform<ConflicterFile>(
      async (file: ConflicterFile) => {
        const conflicterFile = await this.checkForCollision(file);
        const action = conflicterFile.conflicter;

        delete conflicterFile.conflicter;
        delete conflicterFile.changesDetected;
        delete conflicterFile.binary;
        delete conflicterFile.conflicterChanges;
        delete conflicterFile.fileModeChanges;

        if (action === 'skip') {
          clearFileState(conflicterFile);
        }

        if (action === 'ignore') {
          yoResolveContents += `${file.relativePath} skip\n`;
          clearFileState(conflicterFile);
        }

        if (file.path === yoResolveFilePath) {
          yoResolveFile = file;
          return;
        }

        return conflicterFile;
      },
      function () {
        if (yoResolveContents) {
          yoResolveFile ??= loadFile(yoResolveFilePath) as unknown as ConflicterFile;
          setModifiedFileState(yoResolveFile);
          const oldContents = yoResolveFile.contents?.toString() ?? '';
          yoResolveFile.contents = Buffer.from(oldContents + yoResolveContents);
          this.push(yoResolveFile);
        } else if (yoResolveFile) {
          this.push(yoResolveFile);
        }
      },
    );
  }
}

export const createConflicterTransform = (
  adapter: InputOutputAdapter,
  { yoResolveFileName, ...conflicterOptions }: ConflicterOptions & ConflicterTransformOptions = {},
): FileTransform<MemFsEditorFile> => new Conflicter(adapter, conflicterOptions).createTransform({ yoResolveFileName });
