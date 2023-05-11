import { pipeline as _pipeline, Transform, type TransformCallback } from 'node:stream';
import { promisify } from 'node:util';
import { Minimatch, type MinimatchOptions } from 'minimatch';

export type File = { path: string; contents: any };

type TransformFile<F extends File = File> = (this: Transform, file: F) => Promise<F | undefined> | F | undefined;

type PassthroughFile<F extends File = File> = (file: F) => Promise<void> | void;

type FilterFile<F extends File = File> = (file: F) => Promise<boolean> | boolean;

/**
 * Promisified pipeline
 */
export const pipeline = promisify(_pipeline);

/**
 * The returned file from transform function is passed through if any.
 */
export function transform<F extends File = File>(fn: TransformFile<F>) {
  return new Transform({
    objectMode: true,
    async transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
      try {
        callback(undefined, await fn.call(this, chunk));
      } catch (error: unknown) {
        callback(error as Error);
      }
    },
  });
}

/**
 * Files will always be passed through.
 */
export function passthrough<F extends File = File>(
  fn?: PassthroughFile<F>,
  options?: { filter?: FilterFile<F>; pattern?: string } & TransformMinimatchOptions,
) {
  if (!fn) {
    return transform(f => f);
  }

  const passthroughFilter: FilterFile<F> =
    options?.filter ??
    (options?.pattern ? (file: F) => new Minimatch(options.pattern!, options?.patternOptions).match(file.path) : () => true);

  return transform(async (file: F) => {
    if (await passthroughFilter(file)) {
      await fn(file);
    }

    return file;
  });
}

type TransformMinimatchOptions = {
  /** Minimatch options */
  patternOptions?: MinimatchOptions;
};

/**
 * Filter file.
 * Files that doesn't match the filter condition are removed.
 */
export function filter<F extends File = File>(filter: FilterFile<F>) {
  return transform<F>(async file => ((await filter(file)) ? file : undefined));
}

/**
 * Conditional filter on pattern.
 * Files that doesn't match the pattern are removed.
 */
export function filterPattern(pattern: string, options?: TransformMinimatchOptions) {
  return filter(file => new Minimatch(pattern, options?.patternOptions).match(file.path));
}
