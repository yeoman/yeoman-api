import process from 'node:process';
import { format } from 'node:util';
import ora, { type Ora } from 'ora';
import PQueue from 'p-queue';
import type {
  InputOutputAdapter,
  Logger,
  ProgressCallback,
  ProgressOptions,
  PromptAnswers,
  PromptQuestions,
  QueuedAdapter as QueuedAdapterApi,
} from '../types/index.js';
import { TerminalAdapter, type TerminalAdapterOptions } from './adapter.js';

export type AdapterWithProgress = QueuedAdapterApi;

const BLOCKING_PRIORITY = 10;
const PROMPT_PRIORITY = 10;
const LOG_PRIORITY = 20;
const MAIN_ADAPTER_PRIORITY = 1000;

type Task<TaskResultType> =
  | ((adapter: InputOutputAdapter) => PromiseLike<TaskResultType>)
  | ((adapter: InputOutputAdapter) => TaskResultType);

type QueuedAdapterOptions = TerminalAdapterOptions & {
  queue?: PQueue;
  delta?: number;
  adapter?: InputOutputAdapter;
};

export class QueuedAdapter implements QueuedAdapterApi {
  #queue: PQueue;
  actualAdapter: InputOutputAdapter;
  delta: number;
  log: Logger;
  #nextChildPriority: number;
  #ora: Ora;

  /**
   * `TerminalAdapter` is the default implementation of `Adapter`, an abstraction
   * layer that defines the I/O interactions.
   *
   * It provides a CLI interaction
   *
   * @constructor
   * @param {terminalAdapter}          [import('./adapter.js').default]
   */
  constructor(options?: QueuedAdapterOptions) {
    const { adapter, queue, delta, ...adapterOptions } = options ?? {};
    this.#queue = queue ?? new PQueue({ concurrency: 1 });
    this.actualAdapter = adapter ?? new TerminalAdapter(adapterOptions);

    // Deffered logger
    const defferredLogger = (...arguments_: any[]) => {
      this.queueLog(() => {
        this.actualAdapter.log(...arguments_);
      });
      return defferredLogger;
    };

    Object.assign(defferredLogger, this.actualAdapter.log);
    defferredLogger.write = (...arguments_: any[]) => {
      this.queueLog(() => {
        this.actualAdapter.log.write(...arguments_);
      }).catch(console.error);
      return defferredLogger;
    };

    this.log = defferredLogger as unknown as Logger;
    this.delta = (delta ?? MAIN_ADAPTER_PRIORITY) * 100;
    this.#nextChildPriority = MAIN_ADAPTER_PRIORITY - 1;

    this.#ora = ora({
      stream: options?.stdout ?? options?.stderr ?? process.stderr,
    });
  }

  newAdapter(delta?: number) {
    return new QueuedAdapter({ adapter: this.actualAdapter, delta: delta ?? this.#nextChildPriority--, queue: this.#queue });
  }

  close() {
    this.actualAdapter.close();
    this.#queue.clear();
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
   * @param {Object|Object[]} questions
   * @param {Object} [answers] Answers to be passed to inquirer
   * @return {Object} promise answers
   */

  async prompt<A extends PromptAnswers = PromptAnswers>(questions: PromptQuestions<A>, initialAnswers?: Partial<A>): Promise<A> {
    return this.#queue.add(async () => this.actualAdapter.prompt(questions, initialAnswers), {
      priority: PROMPT_PRIORITY + this.delta,
      throwOnTimeout: true,
    });
  }

  async onIdle() {
    return this.#queue.onIdle();
  }

  /**
   * Basic queue is recommended for blocking calls.
   * @param fn
   * @returns
   */
  async queue<TaskResultType>(function_: Task<TaskResultType>): Promise<TaskResultType> {
    return this.#queue.add(() => function_(this.actualAdapter), { priority: BLOCKING_PRIORITY + this.delta, throwOnTimeout: true });
  }

  /**
   * Log has a highest priority and should be not blocking.
   * @param fn
   * @returns
   */
  async queueLog<TaskResultType>(function_: Task<TaskResultType>): Promise<TaskResultType> {
    return this.#queue.add(() => function_(this.actualAdapter), { priority: LOG_PRIORITY + this.delta, throwOnTimeout: true });
  }

  /**
   * Progress is blocking, but will be skipped if the queue is not empty.
   * @param callback
   * @param options
   * @returns
   */
  async progress<ReturnType>(function_: ProgressCallback<ReturnType>, options?: ProgressOptions): Promise<ReturnType> {
    if (this.#queue.size > 0 || this.#queue.pending > 0 || options?.disabled || this.#ora.isSpinning) {
      // Don't show progress if queue is not empty or already spinning.
      return Promise.resolve(function_({ step() {} })).finally(() => {
        if (options?.name) {
          this.log.ok(options.name);
        }
      });
    }

    try {
      this.#ora.start(options?.name);
    } catch {
      this.#ora.stop();
    }

    const step = (prefix: string, message: string, ...arguments_: any[]) => {
      if (this.#ora.isSpinning) {
        this.#ora.suffixText = `: ${prefix} ${format(message, ...arguments_)}`;
      }
    };

    return this.queue(() => function_({ step })).finally(() => {
      if (this.#ora.isSpinning) {
        this.#ora.suffixText = '';
        this.#ora.succeed(options?.name);
      }
    });
  }
}
