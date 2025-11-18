import type expand from '@inquirer/expand';
import { createPromptModule } from 'inquirer';

// Used by Conflicter
export type ExpandChoices<T> = Parameters<typeof expand<T>>[0]['choices'];

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
        Object.defineProperty(promptModule.prompts, 'list', { value });
      },
      configurable: true,
      enumerable: true,
    });
  };
  promptModule.restoreDefaultPrompts();
  return promptModule;
};
export type PromptModule = ReturnType<typeof createPromptModule>;

export { Separator } from '@inquirer/core';
