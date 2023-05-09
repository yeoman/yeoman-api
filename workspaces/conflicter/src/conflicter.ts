import fs from 'node:fs';
import { stat as fsStat, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import type { ColoredMessage, InputOutputAdapter, QueuedAdapter } from '@yeoman/types';
import { diffWords, diffLines, type Change } from 'diff';
import type { Store } from 'mem-fs';
import { create as createMemFsEditor, type MemFsEditor, type MemFsEditorFile } from 'mem-fs-editor';
import { binaryDiff, isBinary } from './binary-diff.js';

export type ConflicterStatus = 'create' | 'skip' | 'identical' | 'force';

export type ConflicterLog = ConflicterStatus | 'conflict';

export type ConflicterAction = 'write' | 'abort' | 'diff' | 'reload' | 'force' | 'edit';

export type ConflicterStreamStatus = {
  force: boolean;
};

export type ConflicterFile = MemFsEditorFile & {
  conflicterLog?: ConflicterLog;
  conflicter?: ConflicterStatus;
  binary?: boolean;
  conflicterChanges?: Change[];
};

export type ConflictedFile = ConflicterFile & {
  conflicterChanges: Change[];
};

export type ConflicterOptions = {
  memFs?: Store;
  force?: boolean;
  bail?: boolean;
  ignoreWhitespace?: boolean;
  regenerate?: boolean;
  dryRun?: boolean;
  cwd?: string;
  diffOptions?: any;
};

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
  fs?: MemFsEditor<ConflicterFile>;

  constructor(private readonly adapter: InputOutputAdapter, options?: ConflicterOptions) {
    this.fs = createMemFsEditor(options?.memFs as Store<ConflicterFile>) as MemFsEditor<ConflicterFile>;
    this.force = options?.force ?? false;
    this.bail = options?.bail ?? false;
    this.ignoreWhitespace = options?.ignoreWhitespace ?? false;
    this.regenerate = options?.regenerate ?? false;
    this.dryRun = options?.dryRun ?? false;
    this.cwd = path.resolve(options?.cwd ?? process.cwd());

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.diffOptions = options?.diffOptions;

    if (this.bail) {
      // Bail conflicts with force option, if bail set force to false.
      this.force = false;
    }
  }

  log(file: ConflicterFile) {
    const logStatus = file.conflicterLog ?? file.conflicter;
    this._log(logStatus, path.relative(this.cwd, file.path));
  }

  _log(logStatus: ConflicterLog | 'writeln' | undefined, ...args: any[]) {
    if (logStatus && this.adapter.log[logStatus]) {
      this.adapter.log[logStatus](...args);
    }
  }

  /**
   * Print the file differences to console
   *
   * @param  {Object}   file File object respecting this interface: { path, contents }
   */
  async _printDiff({ file, adapter }: { file: ConflictedFile; adapter?: InputOutputAdapter }) {
    const destAdapter = adapter ?? this.adapter;
    if (file.binary === undefined) {
      file.binary = isBinary(file.path, file.contents ?? undefined);
    }

    if (file.binary) {
      destAdapter.log.writeln(binaryDiff(file.path, file.contents ?? undefined));
      return;
    }

    const colorLines = (colored: ColoredMessage): ColoredMessage[] => {
      if (colored.color) {
        const lines = colored.message.split('\n');
        const returnValue: ColoredMessage[] = [];
        for (const [idx, message] of lines.entries()) {
          // Empty message can be ignored
          if (message) {
            returnValue.push({ message, color: colored.color });
          }

          if (lines.length > idx) {
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
          return { color: 'added', message: change.value };
        }

        if (change.removed) {
          return { color: 'removed', message: change.value };
        }

        return { message: change.value };
      })
      .map((colored: ColoredMessage): ColoredMessage[] => colorLines(colored));

    destAdapter.log.colored([
      { message: '\n' },
      { message: 'removed', color: 'removed' },
      { message: '' },
      { message: 'added', color: 'added' },
      { message: '\n\n' },
      ...messages.flat(),
      { message: '\n\n' },
    ]);
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
  async _detectConflict(file: ConflicterFile) {
    let { contents, stat } = file;
    const filepath = path.resolve(file.path);

    // If file path point to a directory, then it's not safe to write
    const diskStat = await fsStat(filepath);
    if (diskStat.isDirectory()) {
      return true;
    }

    if (stat?.mode && diskStat.mode !== stat.mode) {
      return true;
    }

    if (file.binary === undefined) {
      file.binary = isBinary(file.path, file.contents ?? undefined);
    }

    const actual = await readFile(path.resolve(filepath));

    if (!Buffer.isBuffer(contents)) {
      contents = Buffer.from(contents ?? '', 'utf8');
    }

    if (file.binary) {
      return actual.toString('hex') !== contents.toString('hex');
    }

    let modified: boolean;
    let changes;
    if (this.ignoreWhitespace) {
      changes = diffWords(actual.toString(), contents.toString(), this.diffOptions);
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      modified = changes.some(change => change.value?.trim() && (change.added || change.removed));
    } else {
      changes = diffLines(actual.toString(), contents.toString(), this.diffOptions);
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      modified = (changes.length > 1 || changes[0].added || changes[0].removed) ?? false;
    }

    file.conflicterChanges = changes;
    return modified;
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
   * @param {import('vinyl')} file - Vinyl file
   * @param {Object} [conflicterStatus] - Conflicter status
   * @return  {Promise<Vinyl>} Promise the Vinyl file
   */
  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  async checkForCollision(file: ConflicterFile, conflicterStatus: ConflicterStreamStatus = { force: false }): Promise<ConflicterFile> {
    const rfilepath = path.relative(this.cwd, file.path);
    if (file.conflicter) {
      this._log(file.conflicter, rfilepath);
      return file;
    }

    if (!fs.existsSync(file.path)) {
      if (this.bail) {
        this._log('writeln', 'Aborting ...');
        throw new Error(`Process aborted by conflict: ${rfilepath}`);
      }

      this._log('create', rfilepath);
      file.conflicter = this.dryRun ? 'skip' : 'create';
      file.conflicterLog = 'create';
      return file;
    }

    const isForce = () => this.force || conflicterStatus?.force;

    if (isForce()) {
      this._log('force', rfilepath);
      file.conflicter = 'force';
      return file;
    }

    if (await this._detectConflict(file)) {
      const conflictedFile: ConflictedFile = file as ConflictedFile;
      if (this.bail) {
        this.adapter.log.conflict(rfilepath);
        await this._printDiff({ file: conflictedFile });
        this.adapter.log.writeln('Aborting ...');
        const error = new Error(`Process aborted by conflict: ${rfilepath}`);
        (error as any).file = file;
        throw error;
      }

      if (this.dryRun) {
        this._log('conflict', rfilepath);
        await this._printDiff({ file: conflictedFile });
        file.conflicter = 'skip';
        file.conflicterLog = 'conflict';
        return file;
      }

      if (isForce()) {
        file.conflicter = 'force';
        this.adapter.log.force(rfilepath);
        return file;
      }

      const ask = async (adapter: InputOutputAdapter) => {
        adapter.log.conflict(rfilepath);
        const action = await this._ask({ file: conflictedFile, counter: 1, conflicterStatus, adapter });
        adapter.log[action ?? 'force'](rfilepath);
        file.conflicter = action;
        return file;
      };

      if ((this.adapter as any).queue) {
        const file = await (this.adapter as QueuedAdapter).queue(ask);
        if (!file) {
          throw new Error('A conflicter file was not returned');
        }

        return file;
      }

      return ask(this.adapter);
    }

    this._log('identical', rfilepath);
    if (!this.regenerate) {
      file.conflicter = 'skip';
      file.conflicterLog = 'identical';
      return file;
    }

    file.conflicter = 'identical';
    return file;
  }

  /**
   * Actual prompting logic
   * @private
   * @param {import('vinyl')} file vinyl file object
   * @param {Number} counter prompts
   */
  async _ask({
    file,
    counter,
    conflicterStatus,
    adapter,
  }: {
    file: ConflictedFile;
    counter: number;
    conflicterStatus: ConflicterStreamStatus;
    adapter: InputOutputAdapter;
  }): Promise<ConflicterStatus> {
    if (file.conflicter) {
      return file.conflicter;
    }

    const rfilepath = path.relative(this.cwd, file.path);
    const prompt = {
      name: 'action',
      type: 'expand',
      message: `Overwrite ${rfilepath}?`,
      pageSize: 20,
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
      ],
    };

    // Only offer diff option for files
    const fileStat = await fsStat(file.path);
    if (fileStat.isFile()) {
      prompt.choices.push(
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
      );
      if (this.fs) {
        prompt.choices.push({
          key: 'i',
          name: 'ignore, do not overwrite and remember (experimental)',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          value: ({ relativeFilePath }: { relativeFilePath: string }) => {
            this.fs!.append(`${this.cwd}/.yo-resolve`, `${relativeFilePath} skip`, { create: true });
            return 'skip';
          },
        });
      }
    }

    const result = await adapter.prompt<{ action: ConflicterAction | (({ file }: { file: ConflicterFile }) => ConflicterStatus) }>([
      prompt,
    ]);
    if (typeof result.action === 'function') {
      return result.action.call(this, { file, relativeFilePath: rfilepath, adapter });
    }

    if (result.action === 'abort') {
      adapter.log.writeln('Aborting ...');
      throw new Error('Process aborted by user');
    }

    if (result.action === 'diff') {
      await this._printDiff({ file, adapter });

      counter++;
      if (counter === 5) {
        throw new Error(`Recursive error ${prompt.message}`);
      }

      return this._ask({ file, counter, conflicterStatus, adapter });
    }

    if (result.action === 'force') {
      if (conflicterStatus) {
        conflicterStatus.force = true;
      } else {
        this.force = true;
      }
    }

    if (result.action === 'write') {
      return 'force';
    }

    if (result.action === 'reload') {
      if (await this._detectConflict(file)) {
        return this._ask({ file, counter, conflicterStatus, adapter });
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
          message: `Edit ${rfilepath}`,
        },
      ]);
      file.contents = Buffer.from(answers.content ?? '', 'utf8');
      if (await this._detectConflict(file)) {
        return this._ask({ file, counter, conflicterStatus, adapter });
      }

      return 'skip';
    }

    return result.action;
  }
}
