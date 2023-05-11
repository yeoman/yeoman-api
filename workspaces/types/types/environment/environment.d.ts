import type { Transform } from 'node:stream';
import type { Store } from 'mem-fs';
import type { MemFsEditorFile } from 'mem-fs-editor';

import type { GeneratorBaseOptions } from '../generator/generator-options.js';
import type { BaseGenerator } from '../generator/generator.js';
import type { GetGeneratorConstructor, GetGeneratorOptions } from '../generator/utils.js';
import type { InputOutputAdapter } from './adapter.js';

export type EnvironmentConstructor<A extends InputOutputAdapter = InputOutputAdapter> = new (
  options?: BaseEnvironmentOptions,
  adapter?: A,
) => BaseEnvironment<A>;

export type BaseEnvironmentOptions = GeneratorBaseOptions & {
  /**
   * The working-directory of the environment.
   */
  cwd?: string | undefined;

  /**
   * A value indicating whether the experimental features should be enabled.
   */
  experimental?: boolean;

  /**
   * Options to pass to every generator instantiated by this Environment.
   */
  sharedOptions?: GeneratorBaseOptions;

  /**
   * `mem-fs` Store.
   */
  sharedFs?: Store;
};

export type ApplyTransformsOptions = {
  name?: string;
  log?: boolean;
  stream?: ReturnType<Store<MemFsEditorFile>['stream']>;
  streamOptions: Parameters<Store<MemFsEditorFile>['stream']>[0];
};

export type BaseEnvironment<A = InputOutputAdapter, S extends Store = Store> = {
  cwd: string;
  adapter: A;
  sharedFs: S;

  emit(eventName: string | symbol, ...args: any[]): boolean;

  applyTransforms(transformStreams: Transform[], options?: ApplyTransformsOptions): Promise<void>;

  create<G extends BaseGenerator = BaseGenerator>(
    namespaceOrPath: string | GetGeneratorConstructor<G>,
    args: string[],
    options?: Partial<Omit<GetGeneratorOptions<G>, 'env' | 'resolved' | 'namespace'>>,
  ): Promise<G>;

  instantiate<G extends BaseGenerator = BaseGenerator>(
    generator: GetGeneratorConstructor<G>,
    args: string[],
    options?: Partial<Omit<GetGeneratorOptions<G>, 'env' | 'resolved' | 'namespace'>>,
  ): Promise<G>;

  /**
   * Converts the specified `filePath` to a namespace.
   *
   * @param filePath The path to convert.
   * @param lookups The path-part to exclude (such as `lib/generators`).
   */
  namespace(filePath: string, lookups?: string[]): string;

  /**
   * Gets the version of this `Environment` object.
   */
  getVersion(): string;

  /**
   * Gets the version of the specified `dependency`.
   *
   * @param dependency The name of the dependency.
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  getVersion(dependency: string): string;

  queueGenerator<G extends BaseGenerator = BaseGenerator>(generator: G, schedule?: boolean): Promise<G>;

  rootGenerator<G extends BaseGenerator = BaseGenerator>(): G;

  runGenerator(generator: BaseGenerator): Promise<void>;

  /**
   * Registers a specific `generator` to this environment.
   * This generator is stored under the provided `namespace` or, if not specified, a default namespace format.
   *
   * @param filePath The filepath to the generator or an npm package name.
   * @param namespace The namespace under which the generator should be registered.
   * @param packagePath The path to the npm package of the generator.
   */
  register(filePath: string, namespace?: string, packagePath?: string): Promise<void>;

  /**
   * Registers a stubbed generator to this environment.
   *
   * @param generator The generator constructor.
   * @param namespace The namespace under which the generator should be registered.
   * @param resolved The file-path to the generator.
   * @param packagePath The path to the npm package of the generator.
   */
  registerStub(generator: GetGeneratorConstructor, namespace: string, resolved?: string, packagePath?: string): void;

  /**
   * Queue tasks
   * @param priority
   * @param task
   * @param options
   */
  queueTask(priority: string, task: (...args: any[]) => void | Promise<void>, options?: { once?: string; startQueue?: boolean }): void;

  /**
   * Add priority
   * @param priority
   * @param before
   */
  addPriority(priority: string, before?: string): void;
};
