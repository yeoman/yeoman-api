/* eslint-disable @typescript-eslint/no-unsafe-return, import/no-named-as-default-member, @typescript-eslint/no-implicit-any-catch, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import assert from 'node:assert';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import { describe, it, beforeEach, expect } from 'esmocha';
import { filter } from 'lodash-es';
import sinon from 'sinon';
import slash from 'slash';
import { TestAdapter } from 'yeoman-test';
import { QueuedAdapter } from '@yeoman/adapter';
import { Conflicter, type ConflicterFile } from '../src/conflicter.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create conflicter action answers to be returned in order.
 */
const createActions = actions => ({
  _action: actions,
  get action() {
    return this._action.shift();
  },
});

describe('Conflicter', () => {
  let conflicter: Conflicter;
  let testAdapter: TestAdapter;

  beforeEach(function () {
    testAdapter = new TestAdapter();
    testAdapter.log.colored = sinon.spy();

    conflicter = new Conflicter(new QueuedAdapter(testAdapter));
  });

  describe('#checkForCollision()', () => {
    let conflictingFile: ConflicterFile;

    beforeEach(function () {
      this.timeout(5000);
      conflictingFile = { path: __filename, contents: Buffer.from('') };
    });

    it('handles predefined status', async function () {
      const contents = fs.readFileSync(__filename, 'utf8');
      return conflicter
        .checkForCollision({
          path: __filename,
          contents,
          conflicter: 'someStatus',
        })
        .then(file => {
          assert.equal(file.conflicter, 'someStatus');
        });
    });

    it('identical status', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(new TestAdapter({ action: 'force' })));
      const me = fs.readFileSync(__filename, 'utf8');

      return conflicter
        .checkForCollision({
          path: __filename,
          contents: me,
          stat: {
            mode: 1,
          },
        })
        .then(file => {
          assert.strictEqual(file.conflicter, 'force');
          assert.strictEqual(file.conflicterLog, undefined);
        });
    });

    it('handles custom actions', function (done) {
      const conflicter = new Conflicter(
        new QueuedAdapter(
          new TestAdapter({
            action(data) {
              try {
                assert(this === conflicter);
                assert.strictEqual(slash(data.relativeFilePath), 'test/conflicter.test.ts');
                done();
              } catch (error) {
                done(error);
              }
            },
          }),
        ),
      );

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      conflicter.checkForCollision(conflictingFile);
    });

    it('identical status', async function () {
      const me = fs.readFileSync(__filename, 'utf8');

      return conflicter
        .checkForCollision({
          path: __filename,
          contents: me,
        })
        .then(file => {
          assert.strictEqual(file.conflicter, 'skip');
          assert.strictEqual(file.conflicterLog, 'identical');
        });
    });

    it('create status', async function () {
      return conflicter
        .checkForCollision({
          path: 'file-who-does-not-exist.js',
          contents: '',
        })
        .then(file => {
          assert.equal(file.conflicter, 'create');
        });
    });

    it('user choose "yes"', async function () {
      const conflicter = new Conflicter(new QueuedAdapter(new TestAdapter({ action: 'write' })));

      return conflicter.checkForCollision(conflictingFile).then(file => {
        assert.equal(file.conflicter, 'force');
      });
    });

    it('user choose "skip"', async function () {
      const conflicter = new Conflicter(new QueuedAdapter(new TestAdapter({ action: 'skip' })));

      return conflicter.checkForCollision(conflictingFile).then(file => {
        assert.equal(file.conflicter, 'skip');
      });
    });

    it('user choose "force"', async function () {
      const conflicter = new Conflicter(new QueuedAdapter(new TestAdapter({ action: 'force' })));

      return conflicter.checkForCollision(conflictingFile).then(file => {
        assert.equal(file.conflicter, 'force');
      });
    });

    it('set conflicterStatus.force when user choose "force"', async function () {
      const conflicter = new Conflicter(new QueuedAdapter(new TestAdapter({ action: 'force' })));
      const conflicterStatus = { force: false };
      await conflicter.checkForCollision(conflictingFile, conflicterStatus);
      assert(conflicterStatus.force);
    });

    it('force conflict status', async function () {
      conflicter.force = true;
      return conflicter.checkForCollision(conflictingFile).then(file => {
        assert.equal(file.conflicter, 'force');
      });
    });

    describe('with bail option', () => {
      it('abort on first conflict', async function () {
        this.timeout(4000);
        const conflicter = new Conflicter(new QueuedAdapter(testAdapter), { bail: true });
        await expect(conflicter.checkForCollision(conflictingFile)).rejects.toThrowError(
          /Process aborted by conflict: (.*)conflicter.test.ts/s,
        );
      });

      it('abort on first conflict with whitespace changes', async function () {
        const conflicter = new Conflicter(new QueuedAdapter(testAdapter), { bail: true });
        return conflicter
          .checkForCollision({
            path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
            contents: `initial
                 content
      `,
          })
          .then(() => assert.fail('was not supposed to succeed'))
          .catch(error => {
            assert.equal(slash(error.message), 'Process aborted by conflict: test/fixtures/conflicter/file-conflict.txt');
          });
      });

      describe('with ignoreWhitespace option', () => {
        it('should not abort on first conflict with whitespace changes', async () => {
          const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
            ignoreWhitespace: true,
            bail: true,
          });
          return conflicter
            .checkForCollision({
              path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
              contents: `initial
                 content
      `,
            })
            .then(file => {
              assert.equal(file.conflicter, 'skip');
            });
        });
      });

      it('abort on create new file', async () => {
        const conflicter = new Conflicter(new QueuedAdapter(testAdapter), { bail: true });
        return conflicter
          .checkForCollision({
            path: 'file-who-does-not-exist2.js',
            contents: '',
          })
          .then(() => assert.fail('was not supposed to succeed'))
          .catch(error => {
            assert.equal(error.message, 'Process aborted by conflict: file-who-does-not-exist2.js');
          });
      });
    });

    it('skip file changes with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
        force: false,
        dryRun: true,
      });
      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
          contents: `initial
                 content
      `,
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
          assert.equal(file.conflicterLog, 'conflict');
        });
    });

    it('skip new file with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
        force: false,
        dryRun: true,
      });
      return conflicter
        .checkForCollision({
          path: 'file-who-does-not-exist2.js',
          contents: '',
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
          assert.equal(file.conflicterLog, 'create');
        });
    });

    it('skip deleted file with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
        force: false,
        dryRun: true,
      });
      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/foo.js'),
          contents: null,
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
        });
    });

    it('skip whitespace changes with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
        force: false,
        dryRun: true,
        ignoreWhitespace: true,
      });
      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
          contents: `initial
                 content
      `,
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
        });
    });

    it('does not give a conflict with ignoreWhitespace', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
        force: false,
        ignoreWhitespace: true,
      });

      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
          contents: `initial
           content
`,
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
          assert.equal(file.conflicterLog, 'identical');
        });
    });

    it('skip rewrite with ignoreWhitespace and skipRegenerate', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter), {
        force: false,
        ignoreWhitespace: true,
        skipRegenerate: true,
      });

      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
          contents: `initial
           content
`,
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
        });
    });

    it('does give a conflict without ignoreWhitespace', async () => {
      const conflicter = new Conflicter(new QueuedAdapter(new TestAdapter({ action: 'skip' })));

      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
          contents: `initial
           content
`,
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
        });
    });

    it('does not give a conflict on same binary files', async function () {
      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png'),
          contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png')),
        })
        .then(file => {
          assert.equal(file.conflicter, 'skip');
          assert.equal(file.conflicterLog, 'identical');
        });
    });

    it('does not provide a diff option for directory', async () => {
      const queuedAdapter = new QueuedAdapter(new TestAdapter({ action: 'write' }));
      const conflicter = new Conflicter(queuedAdapter);
      const spy = sinon.spy(conflicter.adapter.actualAdapter, 'prompt');
      await conflicter.checkForCollision({ path: __dirname, contents: null });
      await queuedAdapter.onIdle();
      assert.equal(filter(spy.firstCall.args[0][0].choices, { value: 'diff' }).length, 0);
    });

    it('displays default diff for text files', async () => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      testAdapter.log.colored = sinon.spy();
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter));

      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/foo.js'),
          contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/foo-template.js')),
        })
        .then(() => {
          sinon.assert.called(testAdapter.log.colored);
        });
    });

    it('shows old content for deleted text files', async () => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      testAdapter.log.colored = sinon.spy();
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter));
      await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/foo.js'),
        contents: null,
      });
      sinon.assert.called(testAdapter.log.colored);
    });

    it('displays custom diff for binary files', async () => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter));

      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png'),
          contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/testFile.tar.gz')),
        })
        .then(() => {
          sinon.assert.calledWithMatch(testAdapter.log.writeln, /Existing.*Replacement.*Diff/);
          sinon.assert.notCalled(testAdapter.diff);
        });
    });

    it('displays custom diff for deleted binary files', async () => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      const conflicter = new Conflicter(new QueuedAdapter(testAdapter));

      return conflicter
        .checkForCollision({
          path: path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png'),
          contents: null,
        })
        .then(() => {
          sinon.assert.calledWithMatch(testAdapter.log.writeln, /Existing.*Replacement.*Diff/);
          sinon.assert.notCalled(testAdapter.diff);
        });
    });
  });
});
