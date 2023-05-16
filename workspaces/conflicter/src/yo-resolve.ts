import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Minimatch } from 'minimatch';
import slash from 'slash';
import { transformFileField } from '@yeoman/transform';
import { type ConflicterStatus, type ConflicterFile } from './conflicter.js';

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
      // eslint-disable-next-line no-await-in-loop
      const map = await this.getMapForFolder(folder);
      if (map) {
        for (const [pattern, value] of map) {
          // eslint-disable-next-line unicorn/prefer-regexp-test
          if (pattern.match(filePath)) {
            return value as ConflicterStatus;
          }
        }
      }
    }

    return undefined;
  }

  createTransform() {
    return transformFileField<'conflicter', ConflicterFile>(
      'conflicter',
      async (status: ConflicterStatus | undefined, file: ConflicterFile) => status ?? this.getStatusForFile(file.path),
    );
  }

  private async getMapForFolder(folder: string): Promise<Map<Minimatch, string> | undefined> {
    const map = this.groupedYoResolve.get(folder);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
    } catch {}

    return undefined;
  }
}

export const createYoResolveTransform = (...args: ConstructorParameters<typeof YoResolve>) => new YoResolve(...args).createTransform();
