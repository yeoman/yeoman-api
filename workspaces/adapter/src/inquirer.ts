import { createPromptModule } from 'inquirer';
export type * from '@inquirer/prompts';

/**
 * Creates a prompt module with a deprecated `list` prompt aliasing the `select` prompt.
 */
export const createAdapterPromptModule: typeof createPromptModule = parameter => {
  const promptModule = createPromptModule(parameter);
  const originalRestoreDefaultPrompts = promptModule.restoreDefaultPrompts;
  promptModule.restoreDefaultPrompts = () => {
    originalRestoreDefaultPrompts();
    Object.defineProperty(promptModule.prompts, 'list', {
      get: () => {
        console.warn('`list` prompt is deprecated. Use `select` prompt instead.');
        return promptModule.prompts['select'];
      },
      set: value => {
        Object.defineProperty(promptModule.prompts, 'list', {
          value,
          writable: true,
          configurable: true,
        });
      },
      configurable: true,
      enumerable: true,
    });
  };
  promptModule.restoreDefaultPrompts();
  return promptModule;
};

export type PromptModule = ReturnType<typeof createPromptModule>;
