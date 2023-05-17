import npmlog from 'npmlog';
import PQueue from 'p-queue';
import { TrackerGroup } from 'are-we-there-yet';
import type { Logger, InputOutputAdapter, PromptAnswers, PromptQuestions, QueuedAdapter as QueuedAdapterApi } from '@yeoman/types';
import { TerminalAdapter, type TerminalAdapterOptions } from './adapter.js';

/**  */
// eslint-disable-next-line @typescript-eslint/naming-convention
const PROMPT_PRIORITY = 10;
// eslint-disable-next-line @typescript-eslint/naming-convention
const LOG_PRIORITY = 20;
// eslint-disable-next-line @typescript-eslint/naming-convention
const BLOCKING_PRIORITY = 90;

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
    const defferredLogger = (...args: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.queueLog(() => {
        this.actualAdapter.log(...args);
      });
      return defferredLogger;
    };

    Object.assign(defferredLogger, this.actualAdapter.log);
    defferredLogger.write = (...args: any[]) => {
      this.queueLog(() => {
        this.actualAdapter.log.write(...args);
      }).catch(console.error);
      return defferredLogger;
    };

    this.log = defferredLogger as unknown as Logger;
    this.delta = (delta ?? 0) * 100;
  }

  newAdapter(delta?: number) {
    return new QueuedAdapter({ adapter: this.actualAdapter, delta: delta ?? this.delta + 1, queue: this.#queue });
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.#queue.add(async () => this.actualAdapter.prompt(questions, initialAnswers), {
      priority: PROMPT_PRIORITY + this.delta,
    }) as any;
  }

  async onIdle() {
    return this.#queue.onIdle();
  }

  /**
   * Basic queue is recommended for blocking calls.
   * @param fn
   * @returns
   */
  async queue<TaskResultType>(fn: Task<TaskResultType>): Promise<TaskResultType | void> {
    return this.#queue.add(() => fn(this.actualAdapter));
  }

  /**
   * Log has a highest priority and should be not blocking.
   * @param fn
   * @returns
   */
  async queueLog<TaskResultType>(fn: Task<TaskResultType>): Promise<TaskResultType | void> {
    return this.#queue.add(() => fn(this.actualAdapter), { priority: LOG_PRIORITY + this.delta });
  }

  /**
   * Progress is blocking, but will be skipped if the queue is not empty.
   * @param callback
   * @param options
   * @returns
   */
  progress<ReturnType>(
    fn: (progress: { step: (prefix: string, message: string, ...args: any[]) => void }) => ReturnType,
    options?: { disabled?: boolean; name: string },
  ) {
    if (this.#queue.size > 0 || options?.disabled) {
      // Don't show progress if not empty
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return fn({ step() {} });
    }

    npmlog.tracker = new TrackerGroup();
    npmlog.enableProgress();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const log: any = (npmlog as any).newItem(options?.name);

    const step = (prefix: string, message: string, ...args: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      log.completeWork(10);
      npmlog.info(prefix, message, ...args);
    };

    return this.#queue
      .add(() => fn({ step }), { priority: BLOCKING_PRIORITY + this.delta })
      .finally(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        log.finish();
        npmlog.disableProgress();
      });
  }
}
