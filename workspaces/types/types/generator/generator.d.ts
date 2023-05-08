import type { BaseEnvironment } from '../environment/environment.js';
import type { GeneratorFeatures } from './generator-features.js';
import type { GeneratorOptions } from './generator-options.js';

export type EnvironmentGenerator = {
  readonly env: BaseEnvironment;
  readonly features: unknown;

  _postConstruct?(): Promise<void>;

  destinationRoot(): string;

  // Generator >= v5
  queueTasks?(): Promise<void>;
};

export type BaseGenerator<
  O extends GeneratorOptions = GeneratorOptions,
  F extends GeneratorFeatures = GeneratorFeatures,
> = EnvironmentGenerator & {
  readonly options: O;

  // Generator >= v5
  readonly features: F | undefined;
};
