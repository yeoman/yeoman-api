import { Transform, type TransformCallback } from 'node:stream';
import { Minimatch, type MinimatchOptions } from 'minimatch';

type File = { path: string; contents: any };

type TransformFile<F extends File = File> = (file: F) => F | undefined;

export function createTransform<F extends File = File>(transform: TransformFile<F>) {
  return new Transform({
    objectMode: true,
    transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
      try {
        callback(undefined, transform.apply(this, chunk));
      } catch (error: unknown) {
        callback(error as Error);
      }
    },
  });
}

type TransformMinimatchOptions = {
  /** Minimatch pattern */
  pattern: string;
  /** Minimatch options */
  options?: MinimatchOptions;
};

type MatchFilePatternOptions<F extends File = File> = TransformMinimatchOptions & {
  matched: TransformFile<F>;
  notMatched: TransformFile<F>;
};

type PickFilePatternOptions<F extends File = File> = TransformMinimatchOptions & { transform: TransformFile<F> };

/**
 * Conditional pick files based on pattern.
 */
export function matchFilePattern<F extends File = File>({ matched, notMatched, pattern, options }: MatchFilePatternOptions<F>) {
  const minimatch = new Minimatch(pattern, options);
  // eslint-disable-next-line unicorn/prefer-regexp-test
  return createTransform<F>(file => (minimatch.match(file.path) ? matched(file) : notMatched(file)));
}

/**
 * Conditional pick files based on pattern.
 */
export function pickFilePattern<F extends File = File>({ transform, ...options }: PickFilePatternOptions<F>) {
  return matchFilePattern<F>({ matched: transform, notMatched: file => file, ...options });
}

/**
 * Conditional filter on pattern.
 */
export function filterFilePassthough(options: TransformMinimatchOptions) {
  return matchFilePattern({ matched: file => file, notMatched: () => undefined, ...options });
}
