/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable n/prefer-global/buffer */
/* eslint-disable max-nested-callbacks */
import assert from 'node:assert';
// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, beforeEach, vitest, expect } from 'vitest';
import { filePipeline, passthrough, type File, filterPattern, transformContents } from '../src/transform.js';

describe('Transform stream', () => {
  let unmodifiedFile;
  let newFile;
  let modifiedFile;
  let newDeletedFile;
  let yoRcFile;
  let yoRcGlobalFile;
  let yoResolveFile;
  let conflicterSkippedFile;

  let stream;
  let files;

  let spyTransformPre;
  let spyTransformPost;

  beforeEach(() => {
    yoRcFile = { state: 'modified', path: '.yo-rc.json' };
    yoRcGlobalFile = { state: 'modified', path: '.yo-rc-global.json' };
    yoResolveFile = { state: 'modified', path: '.yo-resolve' };
    unmodifiedFile = { path: 'unmodifiedFile' };
    newFile = { state: 'modified', isNew: true, path: 'newFile' };
    modifiedFile = { state: 'modified', path: 'modifiedFile' };
    newDeletedFile = { state: 'deleted', isNew: true, path: 'newDeletedFile' };
    conflicterSkippedFile = {
      state: 'modified',
      path: 'conflicterSkippedFile',
      conflicter: 'skip',
    };

    files = [yoRcFile, yoRcGlobalFile, yoResolveFile, unmodifiedFile, newFile, modifiedFile, newDeletedFile, conflicterSkippedFile];

    spyTransformPre = vitest.fn();
    spyTransformPost = vitest.fn();

    stream = passthrough();
    for (const file of files) {
      stream.write(file);
    }

    stream.end();
  });

  describe('passthrough()', () => {
    describe('using pattern', () => {
      beforeEach(async () => {
        for (const file of [yoRcFile, yoRcGlobalFile, yoResolveFile]) {
          assert.equal(file.conflicter, undefined);
        }

        await filePipeline(stream, [
          passthrough(spyTransformPre),
          passthrough<File & { conflicter: string }>(
            file => {
              file.conflicter = 'force';
            },
            { pattern: '**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}' },
          ),
          passthrough(spyTransformPost),
        ]);
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(spyTransformPre).toBeCalledTimes(files.length);
        expect(spyTransformPost).toBeCalledTimes(files.length);
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), conflicter: 'force' }),
        );
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), conflicter: 'force' }),
        );
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), conflicter: 'force' }),
        );
        for (let i = 4; i <= files.length; i++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ conflicter: 'force' }));
        }
      });
    });

    describe('using filter', () => {
      beforeEach(async () => {
        await filePipeline(stream, [
          passthrough(spyTransformPre),
          passthrough<File & { conflicter: string }>(
            file => {
              file.conflicter = 'force';
            },
            { filter: file => file.path.endsWith('.yo-rc.json') },
          ),
          passthrough(spyTransformPost),
        ]);
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(spyTransformPre).toBeCalledTimes(files.length);
        expect(spyTransformPost).toBeCalledTimes(files.length);
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-rc.json'), conflicter: 'force' }),
        );
        for (let i = 2; i <= files.length; i++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ conflicter: 'force' }));
        }
      });
    });
  });

  describe('transformContents()', () => {
    describe('using pattern', () => {
      beforeEach(async () => {
        for (const file of [yoRcFile, yoRcGlobalFile, yoResolveFile]) {
          assert.equal(file.conflicter, undefined);
        }

        await filePipeline(stream, [
          passthrough(spyTransformPre),
          transformContents<File & { conflicter: string }>(() => Buffer.from('foo'), {
            pattern: '**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}',
          }),
          passthrough(spyTransformPost),
        ]);
      });

      it('should edit selected files contents', () => {
        expect(spyTransformPre).toBeCalledTimes(files.length);
        expect(spyTransformPost).toBeCalledTimes(files.length);
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), contents: Buffer.from('foo') }),
        );
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), contents: Buffer.from('foo') }),
        );
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), contents: Buffer.from('foo') }),
        );
        for (let i = 4; i <= files.length; i++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ contents: Buffer.from('foo') }));
        }
      });
    });

    describe('using filter', () => {
      beforeEach(async () => {
        await filePipeline(stream, [
          passthrough(spyTransformPre),
          transformContents<File & { conflicter: string }>(() => Buffer.from('foo'), { filter: file => file.path.endsWith('.yo-rc.json') }),
          passthrough(spyTransformPost),
        ]);
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(spyTransformPre).toBeCalledTimes(files.length);
        expect(spyTransformPost).toBeCalledTimes(files.length);
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-rc.json'), contents: Buffer.from('foo') }),
        );
        for (let i = 2; i <= files.length; i++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ contents: Buffer.from('foo') }));
        }
      });
    });
  });

  describe('filterPattern()', () => {
    beforeEach(async () => {
      await filePipeline(stream, [
        passthrough(spyTransformPre),
        filterPattern('**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}'),
        passthrough(spyTransformPost),
      ]);
    });

    it('should pass filtered files through', () => {
      expect(spyTransformPre).toBeCalledTimes(files.length);
      expect(spyTransformPost).toBeCalledTimes(3);
      expect(spyTransformPost).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching('.yo-rc.json') }));
      expect(spyTransformPost).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching('.yo-resolve') }));
      expect(spyTransformPost).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching('.yo-rc-global.json') }));
    });
  });

  describe('with error', () => {
    it('should call the function for every modified file and forward them through', async () => {
      await expect(
        filePipeline(stream, [
          passthrough(() => {
            throw new Error('foo error');
          }),
        ]),
      ).rejects.toThrowError('foo error');
    });
  });
});
