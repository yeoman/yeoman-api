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

type TransformMinimatchOptions = {
  /** Minimatch options */
  patternOptions?: MinimatchOptions;
};

export type PassthroughOptions<F extends File = File> = { filter?: FilterFile<F>; pattern?: string } & TransformMinimatchOptions;

/**
 * Files will always be passed through.
 */
export function passthrough<F extends File = File>(fn?: PassthroughFile<F>, options: PassthroughOptions<F> = {}) {
  if (!fn) {
    return transform(f => f);
  }

  const { filter, pattern, patternOptions } = options;

  let patternFilter: FilterFile<F> = () => true;
  if (pattern) {
    const minimatch = new Minimatch(pattern, patternOptions);
    patternFilter = (file: F) => minimatch.match(file.path);
  }

  return transform(async (file: F) => {
    if (filter && !filter(file)) {
      return file;
    }

    if (await patternFilter(file)) {
      await fn(file);
    }

    return file;
  });
}

export type TransformFileField<K extends keyof F, F extends File = File> = (value: F[K], f: F) => F[K] | Promise<F[K]>;

export function transformFileField<K extends keyof F, F extends File = File>(
  field: K,
  fieldValue: F[K] | TransformFileField<K, F>,
  options?: PassthroughOptions<F>,
) {
  if (typeof fieldValue === 'function') {
    return passthrough(async file => {
      file[field] = await (fieldValue as TransformFileField<K, F>)(file[field], file);
    }, options);
  }

  return passthrough(async file => {
    file[field] = fieldValue;
  }, options);
}

export function transformContents<F extends File = File>(
  fn: (contents: F['contents']) => F['contents'] | Promise<F['contents']>,
  options?: PassthroughOptions<F>,
) {
  return transformFileField<F['contents'], F>('contents', fn, options);
}

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
export function filterPattern(pattern: string, options: TransformMinimatchOptions = {}) {
  const minimatch = new Minimatch(pattern, options.patternOptions);
  return filter(file => minimatch.match(file.path));
}
