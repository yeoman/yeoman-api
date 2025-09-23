import events from 'node:events';
import { Duplex } from 'node:stream';
import { createPrompt } from '@inquirer/core';
import { createPromptModule } from 'inquirer';
import type { Logger, PromptAnswers, PromptQuestions, QueuedAdapter, Task } from '../../types/index.js';

import { createLogger } from '../log.js';

type PromptModule = ReturnType<typeof createPromptModule>;

type TestQuestion = {
  name: string;
  message: string;
  type: string;
  default?: any;
};

type PromptCalls = {
  question: TestQuestion;
  answer: any;
};

export type DummyPromptCallback = (answer: any, { question, answers }: { question: TestQuestion; answers: PromptAnswers }) => any;

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

const isValueSet = (type: string, answer: any) => {
  if (type === 'list') {
    // List prompt accepts any answer value including null
    return answer !== undefined;
  }
  if (type === 'confirm') {
    // Ensure that we don't replace `false` with default `true`
    return answer || answer === false;
  }
  // Other prompts treat all falsy values to default
  return Boolean(answer);
};

const createDummyPrompt = ({ calls }: { calls: PromptCalls[] }, options: DummyPromptOptions = {}) => {
  const { mockedAnswers = {}, callback = answer => answer, throwOnMissingAnswer = false } = options;
  return createPrompt<any, TestQuestion>((config, done) => {
    let answer = mockedAnswers[config.name!];

    if (!isValueSet(config.type, answer)) {
      if (answer === undefined && config.default === undefined) {
        const missingAnswerMessage = `yeoman-test: question ${config.name ?? ''} was asked but answer was not provided`;
        console.warn(missingAnswerMessage);
        if (throwOnMissingAnswer) {
          throw new Error(missingAnswerMessage);
        }
      }

      answer = config.default;

      if (answer === undefined && config.type === 'confirm') {
        // Confirm prompt defaults to true
        answer = true;
      }
    }
    calls.push({ question: config, answer });
    done(callback(answer, { question: config, answers: { [config.name]: answer } }));

    return config.message;
  });
};

export const defineConfig = (config: DefineTestAdapterConfig) => Object.assign(defaultConfig, config);

export const getConfig = () => ({ ...defaultConfig });

/**
 * @experimental
 */
export class TestAdapter<LogType extends Logger = Logger, SpyType = any> implements QueuedAdapter {
  promptModule: PromptModule;
  diff: any & SpyType;
  log: LogType & SpyType;
  registerDummyPrompt: (promptName: string, customPromptOptions?: DummyPromptOptions) => PromptModule;
  readonly mockedAnswers: PromptAnswers;
  readonly calls: PromptCalls[] = [];

  private abortController = new AbortController();
  readonly signal: AbortSignal = this.abortController.signal;

  private readonly spyFactory: SpyFactory<SpyType>;

  constructor(options: TestAdapterOptions<SpyType> = {}) {
    const {
      spyFactory = defaultConfig.spyFactory ?? (spyOptions => () => spyOptions.returns),
      log = defaultConfig.log ?? createLogger(),
      mockedAnswers,
      callback,
      throwOnMissingAnswer,
    } = options;

    this.spyFactory = spyFactory;
    this.promptModule = createPromptModule({
      input: Duplex.from('should not read from input'),
      output: Duplex.from(async () => {}),
      skipTTYChecks: true,
      signal: this.abortController.signal,
    });
    this.mockedAnswers = {};
    this.addAnswers(mockedAnswers ?? {});

    const actualRegisterPrompt = this.promptModule.registerPrompt.bind(this.promptModule);

    this.registerDummyPrompt = (promptModuleName: string, customPromptOptions?: DummyPromptOptions) =>
      actualRegisterPrompt(
        promptModuleName,
        createDummyPrompt(
          { calls: this.calls },
          { callback, mockedAnswers: this.mockedAnswers, throwOnMissingAnswer, ...customPromptOptions },
        ),
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
      .filter(([method, desc]) => typeof (desc as any).value === 'function' && !Object.getOwnPropertyDescriptor(this.log, method))
      .map(([method]) => method);
    for (const methodName of logMethods) {
      (this.log as any)[methodName] = this.spyFactory({ returns: this.log });
    }
  }

  async queue<TaskResultType>(function_: Task<TaskResultType>): Promise<TaskResultType> {
    return function_(this);
  }

  async progress<ReturnType>(
    function_: (progress: { step: (prefix: string, message: string, ...arguments_: any[]) => void }) => ReturnType,

    _options?: { disabled?: boolean | undefined; name?: string | undefined } | undefined,
  ): Promise<ReturnType> {
    return function_({ step() {} });
  }

  close(): void {
    this.abortController.abort();
  }

  async prompt<A extends PromptAnswers = PromptAnswers>(
    questions: PromptQuestions<A>,
    initialAnswers?: Partial<A> | undefined,
  ): Promise<A> {
    return this.promptModule(questions, initialAnswers);
  }

  /**
   * Add answers to the mocked answers.
   */
  addAnswers(answers: PromptAnswers): void {
    // Copy properties using Object.getOwnPropertyDescriptor to preserve getters and setters
    for (const key in answers) {
      const descriptors = Object.getOwnPropertyDescriptor(answers, key);
      if (descriptors) {
        Object.defineProperty(this.mockedAnswers, key, descriptors);
      }
    }
  }
}
