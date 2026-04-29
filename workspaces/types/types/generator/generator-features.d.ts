export type GeneratorCustomFeatures = Record<string, unknown>;

type InstallTask = (nodePackageManager: string | undefined, defaultTask: () => Promise<boolean>) => void | Promise<void>;

export type GeneratorFeatures = {
  uniqueBy?: string;
  uniqueGlobally?: boolean;
  /**
   * Inject a commit task into Environment.
   * This feature is first served, the first composed generator that implements it will take precedence.
   *
   * If set to a truthy value, the default commit task will not be run. And the generator should handle the commit task itself.
   */
  customCommitTask?: boolean | (() => Promise<void> | void);
  /**
   * Inject an install task into Environment.
   * This feature is first served, the first composed generator that implements it will take precedence.
   *
   * If set to a function, the function will be called with the node package manager and a default task that runs the install task.
   * The function can choose to run the default task or implement its own logic.
   * If set to a truthy value, the default install task will not be run. And the generator should handle the install task itself.
   * If set to false, the install task will not be run.
   * If set to 'ask', supported since yeoman-environment 6.1.0, the user will be prompted to choose whether to run the install task or not.
   */
  customInstallTask?: boolean | InstallTask | 'ask';
};
