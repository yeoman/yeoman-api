import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import assert from 'yeoman-assert';
import logSymbols from 'log-symbols';
import stripAnsi from 'strip-ansi';
import { TerminalAdapter } from '../src/adapter.js';
import { createLogger } from '../src/log.js';
import { QueuedAdapter } from '../src/queued-adapter.js';

describe('QueuedAdapter/TerminalAdapter', () => {
  let adapter: QueuedAdapter;

  beforeEach(() => {
    adapter = new QueuedAdapter({ adapter: new TerminalAdapter() });
  });

  describe('#newAdapter()', () => {
    it('returns properly colored diffs', async () => {
      expect(adapter.newAdapter().delta).toBe(adapter.delta - 100);
    });
  });

  describe('#prompt()', () => {
    let fakeAnswers;
    let stub;

    beforeEach(() => {
      fakeAnswers = { foo: 'bar' };
      stub = vitest.fn().mockResolvedValue(fakeAnswers);
      adapter = new QueuedAdapter({ adapter: new TerminalAdapter({ promptModule: stub }) });
    });

    it('pass its arguments to inquirer', async () => {
      const questions = [];
      const answers = {};
      const returnValue = await adapter.prompt(questions, answers);
      expect(stub).toHaveBeenCalledWith(questions, answers);
      assert.equal(returnValue, fakeAnswers);
    });

    it('pass its arguments with answers to inquirer', async () => {
      const questions = [];
      const answers = {};
      const returnValue = await adapter.prompt(questions, answers);
      expect(stub).toHaveBeenCalledWith(questions, answers);
      assert.equal(returnValue, fakeAnswers);
    });

    it('should not be executed on aborted adapter', async () => {
      adapter.close();
      try {
        await adapter.prompt([], {});
      } catch {
        expect(stub).not.toHaveBeenCalled();
        return;
      }
      throw new Error('Promise should be rejected');
    });
  });

  describe('#prompt() with answers', () => {
    it('pass its arguments to inquirer', async () => {
      const questions = [];
      const answers = { prompt1: 'foo' };
      const returnValue = await adapter.prompt(questions, answers);
      assert.equal(returnValue.prompt1, answers.prompt1);
    });
  });

  describe('#diff()', () => {
    it('returns properly colored diffs', () => {
      const logSpy = vitest.spyOn(adapter.actualAdapter.log, 'write');
      adapter.log.colored([{ color: 'added', message: 'var' }, { message: ' ' }, { color: 'removed', message: 'let' }]);
      assert.textEqual(stripAnsi(logSpy.mock.calls[0][0]), 'var let');
    });
  });

  describe('#log()', () => {
    let logMessage;
    let spyerror;
    const stderrWriteBackup = process.stderr.write;

    beforeEach(() => {
      spyerror = vitest.spyOn(adapter.actualAdapter.console, 'error');

      logMessage = '';
      process.stderr.write = (() => string => {
        logMessage = string;
      })(process.stderr.write);
    });

    afterEach(() => {
      adapter.actualAdapter.console.error.mockRestore();
      process.stderr.write = stderrWriteBackup;
    });

    it('calls console.error and perform strings interpolation', async () => {
      adapter.log('%has %many %reps', {
        has: 'has',
        many: 'many',
        reps: 'reps',
      });
      await adapter.onIdle();
      expect(spyerror).toHaveBeenNthCalledWith(1, 'has many reps');
      assert.equal(stripAnsi(logMessage), 'has many reps\n');
    });

    it('substitutes strings correctly when context argument is falsey', async () => {
      adapter.log('Zero = %d, One = %s', 0, 1);
      await adapter.onIdle();
      expect(spyerror).toHaveBeenCalledOnce();
      assert.equal(stripAnsi(logMessage), 'Zero = 0, One = 1\n');
    });

    it('boolean values', async () => {
      adapter.log(true);
      await adapter.onIdle();
      expect(spyerror).toHaveBeenNthCalledWith(1, true);
      assert.equal(stripAnsi(logMessage), 'true\n');
    });

    it('#write() numbers', async () => {
      adapter.log(42);
      await adapter.onIdle();
      expect(spyerror).toHaveBeenLastCalledWith(42);
      assert.equal(stripAnsi(logMessage), '42\n');
    });

    it('#write() objects', async () => {
      const outputObject = {
        something: 72,
        another: 12,
      };

      adapter.log(outputObject);
      await adapter.onIdle();
      expect(spyerror).toHaveBeenLastCalledWith(outputObject);
      assert.equal(stripAnsi(logMessage), '{ something: 72, another: 12 }\n');
    });

    it('should execute on aborted adapter', async () => {
      adapter.close();
      const outputObject = {
        something: 72,
        another: 12,
      };

      adapter.log(outputObject);
      await adapter.onIdle();
      expect(spyerror).toHaveBeenCalled();
    });
  });

  describe('#log', () => {
    let spylog;

    beforeEach(() => {
      spylog = vitest.spyOn(process.stderr, 'write');
    });

    afterEach(() => {
      process.stderr.write.mockRestore();
    });

    it('#write() pass strings as they are', async () => {
      const testString = 'dummy';
      adapter.log.write(testString);
      await adapter.onIdle();
      expect(spylog).toHaveBeenCalledWith(testString);
    });

    it('#write() accepts util#format style arguments', async () => {
      adapter.log.write('A number: %d, a string: %s', 1, 'bla');
      await adapter.onIdle();
      expect(spylog).toHaveBeenCalledWith('A number: 1, a string: bla');
    });

    it('#writeln() adds a \\n at the end', async () => {
      adapter.log.writeln('dummy');
      await adapter.onIdle();
      expect(spylog).toHaveBeenCalledWith('dummy');
      expect(spylog).toHaveBeenCalledWith('\n');
    });

    it('#ok() adds a green "✔ " at the beginning and \\n at the end', async () => {
      adapter.log.ok('dummy');
      await adapter.onIdle();
      expect(spylog).toHaveBeenCalledWith(`${logSymbols.success} dummy\n`);
    });

    it('#error() adds a green "✗ " at the beginning and \\n at the end', async () => {
      adapter.log.error('dummy');
      await adapter.onIdle();
      expect(spylog).toHaveBeenCalledWith(`${logSymbols.error} dummy\n`);
    });

    describe('statuses', () => {
      it('#skip()');
      it('#force()');
      it('#create()');
      it('#invoke()');
      it('#conflict()');
      it('#identical()');
      it('#info()');
    });
  });

  describe('#log', () => {
    const funcs = ['write', 'writeln', 'ok', 'error', 'table'];
    const defaultColors = ['skip', 'force', 'create', 'invoke', 'conflict', 'identical', 'info'];
    it('log has functions', () => {
      adapter.log = createLogger();
      for (const k of [...funcs, ...defaultColors]) {
        assert.equal(typeof adapter.log[k], 'function');
      }
    });
    it('log can be added custom status', () => {
      adapter.log = createLogger({ colors: { merge: 'yellow' } });
      for (const k of [...funcs, ...defaultColors, 'merge']) {
        assert.equal(typeof adapter.log[k], 'function');
      }
    });
  });

  describe('#queue()', () => {
    it('should return the result of the queued function', async () => {
      const stub = vitest.fn().mockReturnValue(true);
      const result = await adapter.queue(stub);
      expect(stub).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });

    it('should not be executed on aborted adapter', async () => {
      adapter.close();
      const stub = vitest.fn();
      try {
        await adapter.queue(stub);
      } catch {
        expect(stub).not.toHaveBeenCalled();
        return;
      }
      throw new Error('Promise should be rejected');
    });
  });
});
