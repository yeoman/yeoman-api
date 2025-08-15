import assert from 'node:assert';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { Duplex } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { transform } from '@yeoman/transform';
import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { filter } from 'lodash-es';
import slash from 'slash';
import { QueuedAdapter } from '@yeoman/adapter';
import { TestAdapter, defineConfig as defineTestAdapterConfig } from '@yeoman/adapter/testing';
import { Conflicter, type ConflicterFile } from '../src/index.js';

defineTestAdapterConfig({
  spyFactory: ({ returns }) => vitest.fn().mockReturnValue(returns),
});

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
  let customizeActions: any;
  let separator: any;

  beforeEach(() => {
    testAdapter = new TestAdapter();
    separator = vitest.fn();
    testAdapter.separator = separator;

    customizeActions = vitest.fn().mockImplementation(actions => actions);
    conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), { customizeActions });
  });

  describe('#checkForCollision()', () => {
    let conflictingFile: ConflicterFile;

    beforeEach(() => {
      conflictingFile = { path: __filename, contents: Buffer.from('') };
    });

    it('handles predefined status', async () => {
      const contents = fs.readFileSync(__filename, 'utf8');
      const file = await conflicter.checkForCollision({ path: __filename, contents, conflicter: 'someStatus' });
      assert.equal(file.conflicter, 'someStatus');
    });

    it('identical status', async () => {
      const conflicter = new Conflicter(
        new QueuedAdapter({
          adapter: new TestAdapter({ mockedAnswers: { action: 'force' } }),
        }),
      );
      const me = fs.readFileSync(__filename, 'utf8');

      const file = await conflicter.checkForCollision({
        path: __filename,
        contents: me,
        stat: {
          mode: 1,
        },
      });

      assert.strictEqual(file.conflicter, 'force');
      assert.strictEqual(file.conflicterLog, undefined);
    });

    it('handles custom actions', async () =>
      new Promise((resolve, reject) => {
        const conflicter = new Conflicter(
          new QueuedAdapter({
            adapter: new TestAdapter({
              mockedAnswers: {
                action(data) {
                  try {
                    assert.ok(this === conflicter);
                    assert.strictEqual(slash(data.relativeFilePath), 'test/conflicter.test.ts');
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                },
              },
            }),
          }),
        );

        conflicter.checkForCollision(conflictingFile);
      }));

    it('identical status', async () => {
      const me = fs.readFileSync(__filename, 'utf8');

      const file = await conflicter.checkForCollision({ path: __filename, contents: me });
      assert.strictEqual(file.conflicter, 'skip');
    });

    it('create status', async () => {
      const file = await conflicter.checkForCollision({
        path: 'file-who-does-not-exist.js',
        contents: '',
      });
      assert.equal(file.conflicter, 'create');
    });

    it('user choose "yes"', async () => {
      const conflicter = new Conflicter(
        new QueuedAdapter({
          adapter: new TestAdapter({ mockedAnswers: { action: 'write' } }),
        }),
      );

      const file = await conflicter.checkForCollision(conflictingFile);
      assert.equal(file.conflicter, 'force');
    });

    it('user choose "skip"', async () => {
      const conflicter = new Conflicter(
        new QueuedAdapter({
          adapter: new TestAdapter({ mockedAnswers: { action: 'skip' } }),
        }),
      );

      const file = await conflicter.checkForCollision(conflictingFile);
      assert.equal(file.conflicter, 'skip');
    });

    it('user choose "force"', async () => {
      const conflicter = new Conflicter(
        new QueuedAdapter({
          adapter: new TestAdapter({ mockedAnswers: { action: 'force' } }),
        }),
      );

      const file = await conflicter.checkForCollision(conflictingFile);
      assert.equal(file.conflicter, 'force');
    });

    it('force conflict status', async () => {
      conflicter.force = true;
      const file = await conflicter.checkForCollision(conflictingFile);
      assert.equal(file.conflicter, 'force');
    });

    describe('with bail option', () => {
      it('abort on first conflict', async () => {
        const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), { bail: true });
        await expect(conflicter.checkForCollision(conflictingFile)).rejects.toThrowError(
          /Process aborted by conflict: (.*)conflicter.test.ts/s,
        );
      });

      it('abort on first conflict with whitespace changes', async () => {
        const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), { bail: true });
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
          const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
            ignoreWhitespace: true,
            bail: true,
          });
          const file = await conflicter.checkForCollision({
            path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
            contents: `initial
                 content
      `,
          });
          assert.equal(file.conflicter, 'skip');
        });
      });

      it('abort on create new file', async () => {
        const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), { bail: true });
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
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
        force: false,
        dryRun: true,
      });
      const file = await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
        contents: `initial
                 content
      `,
      });
      assert.equal(file.conflicter, 'skip');
      assert.equal(file.changesDetected, true);
    });

    it('skip new file with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
        force: false,
        dryRun: true,
      });
      const file = await conflicter.checkForCollision({ path: 'file-who-does-not-exist2.js', contents: '' });
      assert.equal(file.conflicter, 'skip');
    });

    it('skip deleted file with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
        force: false,
        dryRun: true,
      });
      const file = await conflicter.checkForCollision({ path: path.join(__dirname, 'fixtures/conflicter/foo.js'), contents: null });
      assert.equal(file.conflicter, 'skip');
    });

    it('skip whitespace changes with dryRun', async () => {
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
        force: false,
        dryRun: true,
        ignoreWhitespace: true,
      });
      const file = await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
        contents: `initial
                 content
      `,
      });
      assert.equal(file.conflicter, 'skip');
    });

    it('does not give a conflict with ignoreWhitespace', async () => {
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
        force: false,
        ignoreWhitespace: true,
      });

      const file = await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
        contents: `initial
           content
`,
      });
      assert.equal(file.conflicter, 'skip');
    });

    it('skip rewrite with ignoreWhitespace and skipRegenerate', async () => {
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }), {
        force: false,
        ignoreWhitespace: true,
        skipRegenerate: true,
      });

      const file = await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
        contents: `initial
           content
`,
      });
      assert.equal(file.conflicter, 'skip');
    });

    it('does give a conflict without ignoreWhitespace', async () => {
      const conflicter = new Conflicter(
        new QueuedAdapter({
          adapter: new TestAdapter({ mockedAnswers: { action: 'skip' } }),
        }),
      );

      const file = await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
        contents: `initial
           content
`,
      });
      assert.equal(file.conflicter, 'skip');
    });

    it('does not give a conflict on same binary files', async () => {
      const file = await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png')),
      });
      assert.equal(file.conflicter, 'skip');
    });

    it('does not provide a diff option for directory', async () => {
      const queuedAdapter = new QueuedAdapter({
        adapter: new TestAdapter({ mockedAnswers: { action: 'write' } }),
      });
      const conflicter = new Conflicter(queuedAdapter);
      const spy = vitest.spyOn(conflicter.adapter.actualAdapter, 'prompt');
      await conflicter.checkForCollision({ path: __dirname, contents: null });
      await queuedAdapter.onIdle();
      assert.equal(filter(spy.mock.lastCall![0], { value: 'diff' }).length, 0);
    });

    it('displays default diff for text files', async () => {
      const testAdapter = new TestAdapter({
        mockedAnswers: createActions(['diff', 'write']),
      });
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }));

      await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/foo.js'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/foo-template.js')),
      });
      expect(testAdapter.log.colored).toHaveBeenCalled();
    });

    it('shows old content for deleted text files', async () => {
      const testAdapter = new TestAdapter({
        mockedAnswers: createActions(['diff', 'write']),
      });
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }));
      await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/foo.js'),
        contents: null,
      });
      expect(testAdapter.log.colored).toHaveBeenCalled();
    });

    it('displays custom diff for binary files', async () => {
      const testAdapter = new TestAdapter({
        mockedAnswers: createActions(['diff', 'write']),
      });
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }));

      await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/testFile.tar.gz')),
      });
      expect(testAdapter.log.writeln).toHaveBeenCalledWith(expect.stringMatching(/Existing.*Replacement.*Diff/));
    });

    it('displays custom diff for deleted binary files', async () => {
      const testAdapter = new TestAdapter({
        mockedAnswers: createActions(['diff', 'write']),
      });
      const conflicter = new Conflicter(new QueuedAdapter({ adapter: testAdapter }));

      await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/yeoman-logo.png'),
        contents: null,
      });

      expect(testAdapter.log.writeln).toHaveBeenCalledWith(expect.stringMatching(/Existing.*Replacement.*Diff/));
    });

    it('prints diff if diff status is provided', async () => {
      mock.method(conflicter, '_printDiff');
      await pipeline(
        Duplex.from([
          {
            path: path.join(__dirname, 'fixtures/conflicter/file-conflict.txt'),
            conflicter: 'diff',
            contents: `initial
           content
`,
          },
        ]),
        conflicter.createTransform(),
        transform(() => {}),
      );
      assert.ok(conflicter._printDiff.mock.calls.length === 1);
    });

    it('should call customizeActions', async () => {
      await conflicter.checkForCollision({
        path: path.join(__dirname, 'fixtures/conflicter/foo.js'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/conflicter/foo-template.js')),
      });

      expect(customizeActions).toHaveBeenCalled();
      expect(customizeActions).toHaveBeenLastCalledWith(expect.any(Array), expect.objectContaining({ separator }));
    });
  });
});
