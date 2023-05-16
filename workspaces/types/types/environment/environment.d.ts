import type { Transform } from 'node:stream';
import type { Store } from 'mem-fs';
import type { MemFsEditorFile } from 'mem-fs-editor';

import type { BaseGeneratorOptions } from '../generator/generator-options.js';
import type { BaseGenerator, BaseGeneratorConstructor } from '../generator/generator.js';
import type { GetGeneratorConstructor, GetGeneratorOptions } from '../generator/utils.js';
import type { InputOutputAdapter } from './adapter.js';
import type { GeneratorMeta, LookupGeneratorMeta, LookupOptions, BaseGeneratorMeta } from './methods-options.js';

export type EnvironmentConstructor<A extends InputOutputAdapter = InputOutputAdapter> = new (
  options?: BaseEnvironmentOptions,
  adapter?: A,
) => BaseEnvironment<A>;

export type BaseEnvironmentOptions = BaseGeneratorOptions & {
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
  sharedOptions?: BaseGeneratorOptions;

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

export type BaseEnvironment<A = InputOutputAdapter, S extends Store<MemFsEditorFile> = Store<MemFsEditorFile>> = {
  cwd: string;
  adapter: A;
  sharedFs: S;

  emit(eventName: string | symbol, ...args: any[]): boolean;

  applyTransforms(transformStreams: Transform[], options?: ApplyTransformsOptions): Promise<void>;

  /**
   * Gets a single constructor of a generator from the registered list of generators.
   *
   * The lookup is based on generator's namespace, "walking up" the namespaces until a matching is found.
   * Eg. if an `angular:common` namespace is registered, and we try to get `angular:common:all`,
   * then we get `angular:common` as a fallback (unless an `angular:common:all` generator is registered).
   *
   * @param namespaceOrPath The namespace of the generator or the path to a generator.
   * @returns The constructor of the generator registered under the namespace.
   */
  get<C extends BaseGeneratorConstructor = BaseGeneratorConstructor>(namespaceOrPath: string): Promise<C | undefined>;

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
   * Creates an alias.
   *
   * Alias allows the `get()` and `lookup()` methods to search in alternate filepath for a given namespaces.
   * It's used for example to map `generator-*` npm package to their namespace equivalent (without the generator- prefix),
   * or to default a single namespace like `angular` to `angular:app` or `angular:all`.
   *
   * If multiple aliases are defined, then the replacement is recursive, replacing each alias in reverse order.
   *
   * An alias can be a single String or a Regular Expression.
   * The finding is done based on .match().
   *
   * @param match The name to match.
   * @param value The replacement for the specified `match`.
   *
   * @example
   * env.alias(/^([a-zA-Z0-9:\*]+)$/, 'generator-$1');
   * env.alias(/^([^:]+)$/, '$1:app');
   * env.alias(/^([^:]+)$/, '$1:all');
   * env.alias('foo');
   * // => generator-foo:all
   */
  alias(match: string | RegExp, value: string): void;

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
   * @param meta Generator metadata.
   */
  register(filePath: string, meta?: Partial<BaseGeneratorMeta>): void;

  /**
   * Registers a stubbed generator to this environment.
   *
   * @param generator The generator constructor.
   * @param meta Generator metadata.
   */
  register(generator: unknown, meta: BaseGeneratorMeta): void;

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

  /**
   * Searches for generators and their sub-generators.
   *
   * A generator is a `:lookup/:name/index.js` file placed inside an npm package.
   *
   * Default lookups are:
   *   - `./`
   *   - `./generators/`
   *   - `./lib/generators/`
   *
   * So the index file `node_modules/generator-dummy/lib/generators/yo/index.js` would be registered as `dummy:yo` generator.
   *
   * @param options The options for the lookup.
   * @returns A list of generators.
   */
  lookup(options?: LookupOptions): Promise<LookupGeneratorMeta[]>;

  /**
   * Checks whether a package with the specified `packageNamespace` has been registered.
   *
   * @param packageNamespace The package-namespace to check.
   * @returns A value indicating whether a package with the specified `packageNamespace` has been registered.
   */
  isPackageRegistered(packageNamespace?: string): boolean;

  /**
   * Gets the namespaces of all registered packages.
   */
  getRegisteredPackages(): string[];

  /**
   * Returns stored generators meta
   */
  getGeneratorMeta(namespace: string): GeneratorMeta;
};
