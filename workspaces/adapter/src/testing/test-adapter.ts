/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-redundant-type-constituents */
import events from 'node:events';
import { PassThrough } from 'node:stream';
import type { PromptAnswers, PromptQuestion, Logger, PromptQuestions, Task } from '@yeoman/types';
import { createPromptModule, type PromptModule } from 'inquirer';

import { createLogger } from '../log.js';
import { type AdapterWithProgress } from '../queued-adapter.js';

export type DummyPromptCallback = (answer: any, { question, answers }: { question: PromptQuestion; answers: PromptAnswers }) => any;

export type DummyPromptOptions = {
  mockedAnswers?: PromptAnswers;
  callback?: DummyPromptCallback;
  throwOnMissingAnswer?: boolean;
};

type SpyFactory<SpyType = any> = ({ returns }: { returns?: any }) => SpyType;

export type TestAdapterOptions<SpyType = any> = DummyPromptOptions & {
  log?: any;
  spyFactory?: SpyFactory<SpyType>;
};

export type DefineTestAdapterConfig = Pick<TestAdapterOptions, 'log' | 'spyFactory' | 'throwOnMissingAnswer'>;

const defaultConfig: DefineTestAdapterConfig = {};

export class DummyPrompt {
  answers: PromptAnswers;
  question: PromptQuestion;
  callback!: DummyPromptCallback;
  throwOnMissingAnswer = defaultConfig.throwOnMissingAnswer ?? false;

  constructor(question: PromptQuestion, _rl: any, answers: PromptAnswers, options: DummyPromptOptions = {}) {
    const { mockedAnswers, callback, throwOnMissingAnswer } = options;
    this.answers = { ...answers, ...mockedAnswers };
    this.question = question;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    this.callback = callback ?? (answers => answers);
    this.throwOnMissingAnswer = throwOnMissingAnswer ?? false;
  }

  async run() {
    let answer = this.answers[this.question.name!];
    let isSet;

    switch (this.question.type) {
      case 'list': {
        // List prompt accepts any answer value including null
        isSet = answer !== undefined;
        break;
      }

      case 'confirm': {
        // Ensure that we don't replace `false` with default `true`

        isSet = answer || answer === false;
        break;
      }

      default: {
        // Other prompts treat all falsy values to default
        isSet = Boolean(answer);
      }
    }

    if (!isSet) {
      if (answer === undefined && this.question.default === undefined) {
        const missingAnswerMessage = `yeoman-test: question ${this.question.name ?? ''} was asked but answer was not provided`;
        console.warn(missingAnswerMessage);
        if (this.throwOnMissingAnswer) {
          throw new Error(missingAnswerMessage);
        }
      }

      answer = this.question.default;

      if (answer === undefined && this.question.type === 'confirm') {
        answer = true;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.callback(answer, { question: this.question, answers: this.answers });
  }
}

export const defineConfig = (config: DefineTestAdapterConfig) => Object.assign(defaultConfig, config);

export const getConfig = () => ({ ...defaultConfig });

/**
 * @experimental
 */
export class TestAdapter<LogType extends Logger = Logger, SpyType = any> implements AdapterWithProgress {
  promptModule: PromptModule;
  diff: any & SpyType;
  log: LogType & SpyType;
  registerDummyPrompt: (promptName: string, customPromptOptions?: DummyPromptOptions) => PromptModule;
  private readonly spyFactory: SpyFactory<SpyType>;

  constructor(options: TestAdapterOptions<SpyType> = {}) {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      spyFactory = defaultConfig.spyFactory ?? (spyOptions => () => spyOptions.returns),
      log = defaultConfig.log ?? createLogger(),
      ...promptOptions
    } = options;

    this.spyFactory = spyFactory;
    this.promptModule = createPromptModule({
      input: new PassThrough() as any,
      output: new PassThrough() as any,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      skipTTYChecks: true,
    });

    const actualRegisterPrompt = this.promptModule.registerPrompt.bind(this.promptModule);

    this.registerDummyPrompt = (promptModuleName: string, customPromptOptions?: DummyPromptOptions) =>
      actualRegisterPrompt(
        promptModuleName,
        class CustomDummyPrompt extends DummyPrompt {
          constructor(question: PromptQuestion, rl: any, answers: PromptAnswers) {
            super(question, rl, answers, customPromptOptions ?? promptOptions);
          }
        } as any,
      );

    this.promptModule.registerPrompt = (name: string) => this.registerDummyPrompt(name);

    for (const promptName of Object.keys(this.promptModule.prompts)) {
      this.promptModule.registerPrompt(promptName, undefined as any);
    }

    this.diff = this.spyFactory({});
    this.log = this.spyFactory({}) as LogType & SpyType;
    Object.assign(this.log, events.EventEmitter.prototype);

    const descriptors = Object.getOwnPropertyDescriptors(log);
    // Make sure all log methods are defined
    const logMethods = Object.entries(descriptors)
      .filter(([method, desc]) => typeof desc.value === 'function' && !Object.getOwnPropertyDescriptor(this.log, method))
      .map(([method]) => method);
    for (const methodName of logMethods) {
      (this.log as any)[methodName] = this.spyFactory({ returns: this.log });
    }
  }

  async queue<TaskResultType>(fn: Task<TaskResultType>): Promise<void | TaskResultType> {
    return fn(this);
  }

  async progress<ReturnType>(
    fn: (progress: { step: (prefix: string, message: string, ...args: any[]) => void }) => ReturnType,
    _options?: { disabled?: boolean | undefined; name?: string | undefined } | undefined,
  ): Promise<void | ReturnType> {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return fn({ step() {} });
  }

  close(): void {
    this.promptModule.restoreDefaultPrompts();
  }

  async prompt<A extends PromptAnswers = PromptAnswers>(
    questions: PromptQuestions<A>,
    initialAnswers?: Partial<A> | undefined,
  ): Promise<A> {
    return this.promptModule(questions, initialAnswers);
  }
}
