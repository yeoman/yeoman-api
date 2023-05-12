import { type BaseGenerator, type GetGeneratorConstructor } from '../index.js';

/**
 * Provides options for the `lookup` method.
 */
export type LookupOptions = {
  /**
   * The paths to look for generators.
   */
  packagePaths?: string[];

  /**
   * The repüository paths to look for generator packages.
   */
  npmPaths?: string[];

  /**
   * The file-patterns to look for.
   */
  filePatterns?: string[];

  /**
   * The package patterns to look for.
   */
  packagePatterns?: string[];

  /**
   * A value indicating whether the lookup should be stopped after finding the first result.
   */
  singleResult?: boolean;

  /**
   * The `deep` option to pass to `globby`.
   */
  globbyDeep?: number;
  /**
   * A value indicating whether globally installed packages should be ignored.
   */
  localOnly?: boolean;
};

/**
 * Provides information about a generator.
 */
export type LookupGeneratorMeta = {
  /**
   * A value indicating whether the generator could be registered.
   */
  registered: boolean;

  /**
   * The resolved path to the generator.
   */
  generatorPath: string;

  /**
   * The namespace of the generator.
   */
  namespace: string;

  /**
   * The path to the package containing the generator.
   */
  packagePath: string;
};

export type BaseGeneratorMeta = {
  /** The key under which the generator can be retrieved */
  namespace: string;
  /** The file path to the generator (used only if generator is a module) */
  resolved?: string;
  /** PackagePath to the generator npm package */
  packagePath?: string;
};

export type GeneratorMeta = BaseGeneratorMeta & {
  packageNamespace?: string;
  /** Import and find the Generator Class */
  importGenerator: () => Promise<GetGeneratorConstructor>;
  /** Import the module `import(meta.resolved)` */
  importModule?: () => Promise<unknown>;
  /** Intantiate the Generator `env.instantiate(await meta.importGenerator())` */
  instantiate: <G extends BaseGenerator = BaseGenerator>(args?: string[], options?: any) => Promise<G>;
  /** Intantiate the Generator passing help option */
  instantiateHelp: <G extends BaseGenerator = BaseGenerator>() => Promise<G>;
};
