/* eslint-disable import/no-named-as-default-member, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import process from 'node:process';
// eslint-disable-next-line import/no-extraneous-dependencies
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import assert from 'yeoman-assert';
import sinon from 'sinon';
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
      stub = sinon.stub().resolves(fakeAnswers);
      adapter = new QueuedAdapter({ adapter: new TerminalAdapter({ promptModule: stub }) });
    });

    it('pass its arguments to inquirer', async () => {
      const questions = [];
      const returnValue = await adapter.prompt(questions);
      sinon.assert.calledWith(stub, questions);
      assert.equal(returnValue, fakeAnswers);
    });

    it('pass its arguments with answers to inquirer', async () => {
      const questions = [];
      const answers = {};
      const returnValue = await adapter.prompt(questions, answers);
      sinon.assert.calledWith(stub, questions, answers);
      assert.equal(returnValue, fakeAnswers);
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
      const logSpy = sinon.spy(adapter.actualAdapter.log, 'write');
      adapter.log.colored([{ color: 'added', message: 'var' }, { message: ' ' }, { color: 'removed', message: 'let' }]);
      assert.textEqual(stripAnsi(logSpy.getCall(0).args[0]), 'var let');
    });
  });

  describe('#log()', () => {
    let logMessage;
    let spyerror;
    const stderrWriteBackup = process.stderr.write;

    beforeEach(() => {
      spyerror = sinon.spy(adapter.actualAdapter.console, 'error');

      logMessage = '';
      process.stderr.write = (() => string => {
        logMessage = string;
      })(process.stderr.write);
    });

    afterEach(() => {
      adapter.actualAdapter.console.error.restore();
      process.stderr.write = stderrWriteBackup;
    });

    it('calls console.error and perform strings interpolation', async () => {
      adapter.log('%has %many %reps', {
        has: 'has',
        many: 'many',
        reps: 'reps',
      });
      await adapter.onIdle();
      assert(spyerror.withArgs('has many reps').calledOnce);
      assert.equal(stripAnsi(logMessage), 'has many reps\n');
    });

    it('substitutes strings correctly when context argument is falsey', async () => {
      adapter.log('Zero = %d, One = %s', 0, 1);
      await adapter.onIdle();
      assert(spyerror.calledOnce);
      assert.equal(stripAnsi(logMessage), 'Zero = 0, One = 1\n');
    });

    it('boolean values', async () => {
      adapter.log(true);
      await adapter.onIdle();
      assert(spyerror.withArgs(true).calledOnce);
      assert.equal(stripAnsi(logMessage), 'true\n');
    });

    it('#write() numbers', async () => {
      adapter.log(42);
      await adapter.onIdle();
      assert(spyerror.withArgs(42).calledOnce);
      assert.equal(stripAnsi(logMessage), '42\n');
    });

    it('#write() objects', async () => {
      const outputObject = {
        something: 72,
        another: 12,
      };

      adapter.log(outputObject);
      await adapter.onIdle();
      assert(spyerror.withArgs(outputObject).calledOnce);
      assert.equal(stripAnsi(logMessage), '{ something: 72, another: 12 }\n');
    });
  });

  describe('#log', () => {
    let spylog;

    beforeEach(() => {
      spylog = sinon.spy(process.stderr, 'write');
    });

    afterEach(() => {
      process.stderr.write.restore();
    });

    it('#write() pass strings as they are', async () => {
      const testString = 'dummy';
      adapter.log.write(testString);
      await adapter.onIdle();
      assert(spylog.withArgs(testString).calledOnce);
    });

    it('#write() accepts util#format style arguments', async () => {
      adapter.log.write('A number: %d, a string: %s', 1, 'bla');
      await adapter.onIdle();
      assert(spylog.withArgs('A number: 1, a string: bla').calledOnce);
    });

    it('#writeln() adds a \\n at the end', async () => {
      adapter.log.writeln('dummy');
      await adapter.onIdle();
      assert(spylog.withArgs('dummy').calledOnce);
      assert(spylog.withArgs('\n').calledOnce);
    });

    it('#ok() adds a green "✔ " at the beginning and \\n at the end', async () => {
      adapter.log.ok('dummy');
      await adapter.onIdle();
      assert(spylog.withArgs(`${logSymbols.success} dummy\n`).calledOnce);
    });

    it('#error() adds a green "✗ " at the beginning and \\n at the end', async () => {
      adapter.log.error('dummy');
      await adapter.onIdle();
      assert(spylog.withArgs(`${logSymbols.error} dummy\n`).calledOnce);
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
});
