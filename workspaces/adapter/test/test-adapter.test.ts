/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import assert from 'node:assert';
import { esmocha, expect } from 'esmocha';
import { TestAdapter } from '../src/testing/test-adapter.js';

describe('TestAdapter', function () {
  describe('#prompt()', function () {
    it('allows pre-filled answers', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
      );
      return adapter
        .prompt([{ name: 'respuesta', message: 'foo', type: 'input', default: 'bar' }], {
          respuesta: 'foo',
        })
        .then(function (answers) {
          assert.equal(answers.respuesta, 'foo');
        });
    });
    it('handles mockedAnswers', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
        {
          mockedAnswers: {
            respuesta: 'foo',
          },
        },
      );
      const answers = await adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'input', default: 'bar' }]);
      assert.equal(answers.respuesta, 'foo');
    });
    it('handles default value', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
      );
      const answers = await adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'input', default: 'bar' }]);
      assert.equal(answers.respuesta, 'bar');
    });
    it('optionally throws on missing answer', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
        { throwOnMissingAnswer: true },
      );
      await expect(adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'input' }])).rejects.toThrowError(
        'yeoman-test: question respuesta was asked but answer was not provided',
      );
    });
    it('should default to true for confirm prompt', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
      );
      await expect(adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'confirm' }])).resolves.toMatchObject({
        respuesta: true,
      });
    });
    it('list prompt should accept null answer', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
        { mockedAnswers: { respuesta: null } },
      );
      await expect(adapter.prompt([{ name: 'respuesta', message: 'foo', type: 'list' }])).resolves.toMatchObject({
        respuesta: null,
      });
    });
  });
  describe('#close()', function () {
    it('should restore prompts', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
      );
      esmocha.spyOn(adapter.promptModule, 'restoreDefaultPrompts');
      adapter.close();
      expect(adapter.promptModule.restoreDefaultPrompts).toHaveBeenCalled();
    });
  });
  describe('#queue()', function () {
    it('should execute the callback', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
      );
      await expect(adapter.queue(() => 2)).resolves.toBe(2);
    });
  });
  describe('#progress()', function () {
    it('should execute the callback', async function () {
      const adapter = new TestAdapter(
        ({ returns } = {}) =>
          () =>
            returns,
      );
      await expect(
        adapter.progress(({ step }) => {
          step('prefix', 'msg');
          return 2;
        }),
      ).resolves.toBe(2);
    });
  });
});
