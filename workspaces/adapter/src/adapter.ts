import process from 'node:process';
import type inquirer from 'inquirer';
import { createPromptModule, type PromptModule } from 'inquirer';
import chalk from 'chalk';
import type { PromptAnswers, Logger, PromptQuestions, InputOutputAdapter } from '@yeoman/types';
import npmlog from 'npmlog';
import { createLogger } from './log.js';

npmlog.level = 'error';

export type TerminalAdapterOptions = {
  promptModule?: PromptModule;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  console?: Console;
};

export class TerminalAdapter implements InputOutputAdapter {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  console: Console;
  log: Logger;
  promptModule: PromptModule;
  promptUi?: inquirer.ui.Prompt;

  /**
   * `TerminalAdapter` is the default implementation of `Adapter`, an abstraction
   * layer that defines the I/O interactions.
   *
   * It provides a CLI interaction
   *
   * @constructor
   * @param {Object}          [options]
   * @param {Console} [options.console]
   */
  constructor(options?: TerminalAdapterOptions) {
    this.stdin = options?.stdin ?? process.stdin;
    this.stdout = options?.stdout ?? process.stdout;
    this.stderr = options?.stderr ?? options?.stdout ?? process.stderr;
    this.console = options?.console ?? new console.Console(this.stdout, this.stderr);
    npmlog.stream = this?.stderr;

    this.promptModule =
      options?.promptModule ??
      createPromptModule({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        skipTTYChecks: true,
        input: this.stdin,
        output: this.stdout,
      });

    this.log = createLogger(this);
  }

  get _colorDiffAdded() {
    return chalk.black.bgGreen;
  }

  get _colorDiffRemoved() {
    return chalk.bgRed;
  }

  _colorLines(name: 'Added' | 'Removed', string: string) {
    return string
      .split('\n')
      .map(line => this[`_colorDiff${name}`](line))
      .join('\n');
  }

  close() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.promptUi?.close();
  }

  /**
   * Prompt a user for one or more questions and pass
   * the answer(s) to the provided callback.
   *
   * It shares its interface with `Base.prompt`
   *
   * (Defined inside the constructor to keep interfaces separated between
   * instances)
   *
   * @param questions
   * @param answers Answers to be passed to inquirer
   * @return promise answers
   */
  async prompt<A extends PromptAnswers = PromptAnswers>(questions: PromptQuestions<A>, initialAnswers?: Partial<A>): Promise<A> {
    const promptPromise = this.promptModule(questions, initialAnswers);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.promptUi = promptPromise.ui as any;
    const result = await promptPromise;
    delete this.promptUi;
    return result;
  }
}
