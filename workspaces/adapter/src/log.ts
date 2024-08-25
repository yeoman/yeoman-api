import { Console } from 'node:console';
import util from 'node:util';
import EventEmitter from 'node:events';
import process from 'node:process';
import table from 'text-table';
import chalk, { type ChalkInstance, type ForegroundColorName, type ModifierName } from 'chalk';
import logSymbols from 'log-symbols';
import type { ColoredMessage, DefaultLoggerCategories, Logger as LoggerApi } from '@yeoman/types';

// Padding step
const step = '  ';
let padding = ' ';

function pad(status: string) {
  const max = 'identical'.length;
  const delta = max - status.length;
  return delta ? ' '.repeat(delta) + status : status;
}

// Borrowed from https://github.com/mikeal/logref/blob/master/main.js#L6-15
function formatter(message: string, ctx: Record<string, string | number>) {
  while (message.includes('%')) {
    const start = message.indexOf('%');
    let end = message.indexOf(' ', start);

    if (end === -1) {
      end = message.length;
    }

    message = `${message.slice(0, start)}${ctx[message.slice(start + 1, end)]}${message.slice(end)}`;
  }

  return message;
}

const getDefaultColors = (): Record<DefaultLoggerCategories, ChalkInstance> => ({
  skip: chalk.yellow,
  force: chalk.yellow,
  create: chalk.green,
  invoke: chalk.bold,
  conflict: chalk.red,
  identical: chalk.cyan,
  info: chalk.gray,
  added: chalk.black.bgGreen,
  removed: chalk.bgRed,
});

export type LoggerOptions<Loggers = any, LoggerCategories extends string | number | symbol = DefaultLoggerCategories> = {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  console?: Console;
  colors?: Record<LoggerCategories, ForegroundColorName | ModifierName>;
  loggers?: Loggers;
};

export function createLogger<Loggers = any, LoggerCategories extends string | number | symbol = DefaultLoggerCategories>(
  parameters?: LoggerOptions<Loggers, LoggerCategories>,
): LoggerApi & Loggers & { console: Console } {
  const stdout = parameters?.stdout ?? process.stdout;
  const stderr: NodeJS.WriteStream = parameters?.stderr ?? parameters?.stdout ?? process.stderr;
  const customConsole = parameters?.console ?? new Console(stdout, stderr);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const colors: Record<LoggerCategories | DefaultLoggerCategories, ChalkInstance> = {
    ...getDefaultColors(),
    ...(parameters?.colors
      ? Object.fromEntries(
          Object.entries(parameters.colors)?.map(([name, chalkName]) => [name, chalk[chalkName as ForegroundColorName | ModifierName]]),
        )
      : {}),
  };

  // `this.log` is a [logref](https://github.com/mikeal/logref)
  // compatible logger, with an enhanced API.
  //
  // It also has EventEmitter like capabilities, so you can call on / emit
  // on it, namely used to increase or decrease the padding.
  //
  // All logs are done against STDERR, letting you stdout for meaningfull
  // value and redirection, should you need to generate output this way.
  //
  // Log functions take two arguments, a message and a context. For any
  // other kind of paramters, `console.error` is used, so all of the
  // console format string goodies you're used to work fine.
  //
  // - msg      - The message to show up
  // - context  - The optional context to escape the message against
  //
  // @param {Object} params
  // @param {Object} params.colors status mappings
  //
  // Returns the logger
  function log(message: string, ctx?: Record<string, string | number>) {
    message = message ?? '';

    if (typeof ctx === 'object' && !Array.isArray(ctx)) {
      customConsole.error(formatter(message, ctx));
    } else {
      // eslint-disable-next-line prefer-rest-params
      customConsole.error(...arguments);
    }

    return log;
  }

  Object.assign(log, EventEmitter.prototype);
  log.console = customConsole;

  // A simple write method, with formatted message.
  //
  // Returns the logger
  log.write = function (...args: Parameters<typeof util.format>) {
    stderr.write(util.format(...args));
    return this;
  };

  // Same as `log.write()` but automatically appends a `\n` at the end
  // of the message.
  log.writeln = function (...args: Parameters<typeof util.format>) {
    this.write(...args);
    this.write('\n');
    return this;
  };

  // Convenience helper to write sucess status, this simply prepends the
  // message with a gren `✔`.
  log.ok = function (...args: Parameters<typeof util.format>) {
    this.write(logSymbols.success + ' ' + util.format(...args) + '\n');
    return this;
  };

  log.error = function (...args: Parameters<typeof util.format>) {
    this.write(logSymbols.error + ' ' + util.format(...args) + '\n');
    return this;
  };

  (log as any).on('up', () => {
    padding += step;
  });
  (log as any).on('down', () => {
    padding = padding.replace(step, '');
  });

  for (const [status, color] of Object.entries(colors)) {
    // Each predefined status has its logging method utility, handling
    // status color and padding before the usual `.write()`
    //
    // Example
    //
    //    this.log
    //      .write()
    //      .info('Doing something')
    //      .force('Forcing filepath %s, 'some path')
    //      .conflict('on %s' 'model.js')
    //      .write()
    //      .ok('This is ok');
    //
    // The list of default status and mapping colors
    //
    //    skip       yellow
    //    force      yellow
    //    create     green
    //    invoke     bold
    //    conflict   red
    //    identical  cyan
    //    info       grey
    //
    // Returns the logger
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    log[status] = function (...args: Parameters<typeof util.format>) {
      this.write(color(pad(status))).write(padding);
      this.write(util.format(...args) + '\n');
      return this;
    };
  }

  if (parameters?.loggers) {
    Object.assign(log, parameters.loggers);
  }

  // A basic wrapper around `cli-table` package, resetting any single
  // char to empty strings, this is used for aligning options and
  // arguments without too much Math on our side.
  //
  // - opts - A list of rows or an Hash of options to pass through cli
  //          table.
  //
  // Returns the table reprensetation
  log.table = (options: any[] | { rows: any[] }) => {
    const tableData = [];

    options = Array.isArray(options) ? { rows: options } : (options ?? {});
    options.rows = options.rows || [];

    for (const row of options.rows) {
      tableData.push(row);
    }

    return table(tableData);
  };

  log.colored = function (coloredMessages: Array<ColoredMessage<LoggerCategories>>) {
    this.write(coloredMessages.map(({ color, message }): string => (color ? colors[color](message) : message)).join(''));
  };
  return log as any;
}

export type Logger = ReturnType<typeof createLogger>;
