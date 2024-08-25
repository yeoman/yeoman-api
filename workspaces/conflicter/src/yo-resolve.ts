import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Minimatch } from 'minimatch';
import slash from 'slash';
import { transformFileField } from '@yeoman/transform';
import { type FileTransform } from 'mem-fs';
import { type MemFsEditorFile } from 'mem-fs-editor';
import { isFilePending } from 'mem-fs-editor/state';
import { type ConflicterFile, type ConflicterStatus } from './conflicter.js';

const eachFolder = function* (folder: string) {
  let last;
  do {
    yield folder;
    last = folder;
    folder = dirname(folder);
  } while (folder !== last);
};

export class YoResolve {
  groupedYoResolve = new Map<string, Map<Minimatch, string>>();
  readonly yoResolveFileName: string;

  constructor(options?: { yoResolveFileName?: string }) {
    this.yoResolveFileName = options?.yoResolveFileName ?? '.yo-resolve';
  }

  async getStatusForFile(filePath: string): Promise<ConflicterStatus | undefined> {
    for (const folder of eachFolder(slash(filePath))) {
      const map = await this.getMapForFolder(folder);
      if (map) {
        for (const [pattern, value] of map) {
          if (pattern.match(filePath)) {
            return value as ConflicterStatus;
          }
        }
      }
    }

    return undefined;
  }

  createTransform(): FileTransform<MemFsEditorFile> {
    return transformFileField<'conflicter', ConflicterFile>(
      'conflicter',
      async (status: ConflicterStatus | undefined, file: ConflicterFile) => status ?? this.getStatusForFile(file.path),
      { filter: isFilePending },
    );
  }

  private async getMapForFolder(folder: string): Promise<Map<Minimatch, string> | undefined> {
    const map = this.groupedYoResolve.get(folder);
    if (map || map === null) {
      return map ?? undefined;
    }

    try {
      const yoResolveFile = resolve(folder, this.yoResolveFileName);
      const fileStat = await stat(yoResolveFile);
      if (fileStat.isFile()) {
        const contents = await readFile(yoResolveFile);
        const map = new Map<Minimatch, string>();
        this.groupedYoResolve.set(folder, map);
        if (contents) {
          const parsed = contents
            .toString()
            .split(/\r?\n/)
            .map(override => override.trim())
            .map(override => override.split('#')[0].trim())
            .filter(Boolean)
            .map(override => override.split(/[\s+=]/));
          for (const [pattern, status = 'skip'] of parsed) {
            const negate = pattern.startsWith('!');
            const minimatchPattern = `${negate ? '!' : ''}${folder}/${negate ? pattern.slice(1) : pattern}`;
            map.set(new Minimatch(minimatchPattern), status);
          }
        }

        return map;
      }
    } catch {
      // Ignore errors
    }

    return undefined;
  }
}

export const createYoResolveTransform = (...args: ConstructorParameters<typeof YoResolve>): FileTransform<MemFsEditorFile> =>
  new YoResolve(...args).createTransform();
