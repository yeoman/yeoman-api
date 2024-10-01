import assert from 'node:assert';
import { describe, expect, it } from 'vitest';
import { TestAdapter } from '../src/testing/test-adapter.js';

describe('TestAdapter', () => {
  describe('#prompt()', () => {
    it('allows pre-filled answers', async () => {
      const adapter = new TestAdapter();
      return adapter
        .prompt(
          [
            {
              name: 'respuesta',
              message: 'foo',
              type: 'input',
              default: 'bar',
            },
          ],
          {
            respuesta: 'foo',
          },
        )
        .then(answers => {
          assert.equal(answers.respuesta, 'foo');
        });
    });
    it('handles mockedAnswers', async () => {
      const adapter = new TestAdapter({
        mockedAnswers: {
          respuesta: 'foo',
        },
      });
      const answers = await adapter.prompt([
        {
          name: 'respuesta',
          message: 'foo',
          type: 'input',
          default: 'bar',
        },
      ]);
      assert.equal(answers.respuesta, 'foo');
    });
    it('handles default value', async () => {
      const adapter = new TestAdapter();
      const answers = await adapter.prompt([
        {
          name: 'respuesta',
          message: 'foo',
          type: 'input',
          default: 'bar',
        },
      ]);
      assert.equal(answers.respuesta, 'bar');
    });
    it('optionally throws on missing answer', async () => {
      const adapter = new TestAdapter({ throwOnMissingAnswer: true });
      await expect(adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'input' }])).rejects.toThrowError(
        'yeoman-test: question respuesta was asked but answer was not provided',
      );
    });
    it('should default to true for confirm prompt', async () => {
      const adapter = new TestAdapter();
      await expect(adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'confirm' }])).resolves.toMatchObject({
        respuesta: true,
      });
    });
    it('list prompt should accept null answer', async () => {
      const adapter = new TestAdapter({ mockedAnswers: { respuesta: null } });
      await expect(adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'list' }])).resolves.toMatchObject({
        respuesta: null,
      });
    });
  });
  describe('#queue()', () => {
    it('should execute the callback', async () => {
      const adapter = new TestAdapter();
      await expect(adapter.queue(() => 2)).resolves.toBe(2);
    });
  });
  describe('#progress()', () => {
    it('should execute the callback', async () => {
      const adapter = new TestAdapter();
      await expect(
        adapter.progress(({ step }) => {
          step('prefix', 'msg');
          return 2;
        }),
      ).resolves.toBe(2);
    });
  });
});
