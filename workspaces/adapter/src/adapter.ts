import process from 'node:process';
import inquirer, { createPromptModule } from 'inquirer';
import chalk from 'chalk';
import type { InputOutputAdapter, Logger, PromptAnswers, PromptQuestions } from '../types/index.js';
import { createLogger } from './log.js';

type PromptModule = ReturnType<typeof createPromptModule>;

export type TerminalAdapterOptions = {
  promptModule?: PromptModule;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  console?: Console;
  log?: any;
};

export class TerminalAdapter implements InputOutputAdapter {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  console: Console;
  log: Logger;
  promptModule: PromptModule;
  private abortController = new AbortController();
  readonly signal: AbortSignal = this.abortController.signal;

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

    this.promptModule =
      options?.promptModule ??
      createPromptModule({
        skipTTYChecks: true,
        input: this.stdin,
        output: this.stdout,
        signal: this.abortController.signal,
      });
    this.log = options?.log ?? createLogger(this);
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
    this.abort();
  }

  abort(reason?: any) {
    this.abortController.abort(reason);
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
    try {
      return await this.promptModule(questions, initialAnswers);
    } catch (error) {
      this.abortController.abort(error);
      throw error;
    }
  }

  separator(separator?: string) {
    return new inquirer.Separator(separator);
  }
}
