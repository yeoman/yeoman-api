/* eslint-disable import/no-named-as-default-member */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import process from 'node:process';
import { describe } from 'esmocha';
import assert from 'yeoman-assert';
import sinon from 'sinon';
import logSymbols from 'log-symbols';
import stripAnsi from 'strip-ansi';
import { TerminalAdapter } from '../src/adapter.js';
import { createLogger } from '../src/log.js';
import { QueuedAdapter } from '../src/queued-adapter.js';

describe('QueuedAdapter/TerminalAdapter', () => {
  beforeEach(function () {
    this.adapter = new QueuedAdapter(new TerminalAdapter());
  });

  describe('#prompt()', () => {
    let fakeAnswers;

    beforeEach(function () {
      fakeAnswers = { foo: 'bar' };
      this.stub = sinon.stub().resolves(fakeAnswers);
      this.adapter = new QueuedAdapter(new TerminalAdapter({ promptModule: this.stub }));
    });

    it('pass its arguments to inquirer', async function () {
      const questions = [];
      const returnValue = await this.adapter.prompt(questions);
      sinon.assert.calledWith(this.stub, questions);
      assert.equal(returnValue, fakeAnswers);
    });

    it('pass its arguments with answers to inquirer', async function () {
      const questions = [];
      const answers = {};
      const returnValue = await this.adapter.prompt(questions, answers);
      sinon.assert.calledWith(this.stub, questions, answers);
      assert.equal(returnValue, fakeAnswers);
    });
  });

  describe('#prompt() with answers', () => {
    it('pass its arguments to inquirer', function (done) {
      const questions = [];
      const answers = { prompt1: 'foo' };
      this.adapter.prompt(questions, answers).then(returnValue => {
        assert.equal(returnValue.prompt1, answers.prompt1);
        done();
      });
    });
  });

  describe('#diff()', () => {
    it('returns properly colored diffs', async function () {
      const logSpy = sinon.spy(this.adapter.actualAdapter.log, 'write');
      await this.adapter.log.colored([{ color: 'added', message: 'var' }, { message: ' ' }, { color: 'removed', message: 'let' }]);
      assert.textEqual(stripAnsi(logSpy.getCall(0).args[0]), 'var let');
    });
  });

  describe('#log()', () => {
    let logMessage;
    const stderrWriteBackup = process.stderr.write;

    beforeEach(function () {
      this.spyerror = sinon.spy(this.adapter.actualAdapter.console, 'error');

      logMessage = '';
      process.stderr.write = (() => string => {
        logMessage = string;
      })(process.stderr.write);
    });

    afterEach(function () {
      this.adapter.actualAdapter.console.error.restore();
      process.stderr.write = stderrWriteBackup;
    });

    it('calls console.error and perform strings interpolation', async function () {
      this.adapter.log('%has %many %reps', {
        has: 'has',
        many: 'many',
        reps: 'reps',
      });
      await this.adapter.onIdle();
      assert(this.spyerror.withArgs('has many reps').calledOnce);
      assert.equal(stripAnsi(logMessage), 'has many reps\n');
    });

    it('substitutes strings correctly when context argument is falsey', async function () {
      this.adapter.log('Zero = %d, One = %s', 0, 1);
      await this.adapter.onIdle();
      assert(this.spyerror.calledOnce);
      assert.equal(stripAnsi(logMessage), 'Zero = 0, One = 1\n');
    });

    it('boolean values', async function () {
      this.adapter.log(true);
      await this.adapter.onIdle();
      assert(this.spyerror.withArgs(true).calledOnce);
      assert.equal(stripAnsi(logMessage), 'true\n');
    });

    it('#write() numbers', async function () {
      this.adapter.log(42);
      await this.adapter.onIdle();
      assert(this.spyerror.withArgs(42).calledOnce);
      assert.equal(stripAnsi(logMessage), '42\n');
    });

    it('#write() objects', async function () {
      const outputObject = {
        something: 72,
        another: 12,
      };

      this.adapter.log(outputObject);
      await this.adapter.onIdle();
      assert(this.spyerror.withArgs(outputObject).calledOnce);
      assert.equal(stripAnsi(logMessage), '{ something: 72, another: 12 }\n');
    });
  });

  describe('#log', () => {
    beforeEach(function () {
      this.spylog = sinon.spy(process.stderr, 'write');
    });

    afterEach(() => {
      process.stderr.write.restore();
    });

    it('#write() pass strings as they are', async function () {
      const testString = 'dummy';
      this.adapter.log.write(testString);
      await this.adapter.onIdle();
      assert(this.spylog.withArgs(testString).calledOnce);
    });

    it('#write() accepts util#format style arguments', async function () {
      this.adapter.log.write('A number: %d, a string: %s', 1, 'bla');
      await this.adapter.onIdle();
      assert(this.spylog.withArgs('A number: 1, a string: bla').calledOnce);
    });

    it('#writeln() adds a \\n at the end', async function () {
      this.adapter.log.writeln('dummy');
      await this.adapter.onIdle();
      assert(this.spylog.withArgs('dummy').calledOnce);
      assert(this.spylog.withArgs('\n').calledOnce);
    });

    it('#ok() adds a green "✔ " at the beginning and \\n at the end', async function () {
      this.adapter.log.ok('dummy');
      await this.adapter.onIdle();
      assert(this.spylog.withArgs(`${logSymbols.success} dummy\n`).calledOnce);
    });

    it('#error() adds a green "✗ " at the beginning and \\n at the end', async function () {
      this.adapter.log.error('dummy');
      await this.adapter.onIdle();
      assert(this.spylog.withArgs(`${logSymbols.error} dummy\n`).calledOnce);
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
    it('log has functions', function () {
      this.adapter.log = createLogger();
      for (const k of [...funcs, ...defaultColors]) {
        assert.equal(typeof this.adapter.log[k], 'function');
      }
    });
    it('log can be added custom status', function () {
      this.adapter.log = createLogger({ colors: { merge: 'yellow' } });
      for (const k of [...funcs, ...defaultColors, 'merge']) {
        assert.equal(typeof this.adapter.log[k], 'function');
      }
    });
  });
});
