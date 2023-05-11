import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import slash from 'slash';
import { passthrough } from '@yeoman/transform';
import { type ConflicterStatus, setConflicterStatus, type ConflicterFile } from './conflicter.js';

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

  async getMapForFolder(folder: string): Promise<Map<Minimatch, string> | undefined> {
    const map = this.groupedYoResolve.get(folder);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (map || map === null) {
      return map ?? undefined;
    }

    try {
      const yoResolveFile = join(folder, this.yoResolveFileName);
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
            map.set(new Minimatch(`${negate ? '!' : ''}${join(folder, negate ? pattern.slice(1) : pattern)}`), status);
          }
        }

        return map;
      }
    } catch {}

    return undefined;
  }

  createTransform() {
    return passthrough(
      async (file: ConflicterFile): Promise<void> => {
        setConflicterStatus(file, await this.getStatusForFile(file.path));
      },
      { filter: file => !file.conflicter },
    );
  }
}

export const createYoResolveTransform = (...args: ConstructorParameters<typeof YoResolve>) => new YoResolve(...args).createTransform();
