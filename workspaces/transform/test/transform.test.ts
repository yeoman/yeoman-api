/* eslint-disable n/prefer-global/buffer */
/* eslint-disable max-nested-callbacks */
import assert from 'node:assert';
import { describe, it, beforeEach, esmocha, expect } from 'esmocha';
import { pipeline, passthrough, type File, filterPattern, transformContents } from '../src/transform.js';

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

  let sinonTransformPre;
  let sinonTransformPost;

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

    sinonTransformPre = esmocha.fn();
    sinonTransformPost = esmocha.fn();

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

        await pipeline(
          stream,
          passthrough(sinonTransformPre),
          passthrough<File & { conflicter: string }>(
            file => {
              file.conflicter = 'force';
            },
            { pattern: '**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}' },
          ),
          passthrough(sinonTransformPost),
        );
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(sinonTransformPre).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), conflicter: 'force' }),
        );
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), conflicter: 'force' }),
        );
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), conflicter: 'force' }),
        );
        for (let i = 4; i <= files.length; i++) {
          expect(sinonTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ conflicter: 'force' }));
        }
      });
    });

    describe('using filter', () => {
      beforeEach(async () => {
        await pipeline(
          stream,
          passthrough(sinonTransformPre),
          passthrough<File & { conflicter: string }>(
            file => {
              file.conflicter = 'force';
            },
            { filter: file => file.path.endsWith('.yo-rc.json') },
          ),
          passthrough(sinonTransformPost),
        );
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(sinonTransformPre).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-rc.json'), conflicter: 'force' }),
        );
        for (let i = 2; i <= files.length; i++) {
          expect(sinonTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ conflicter: 'force' }));
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

        await pipeline(
          stream,
          passthrough(sinonTransformPre),
          transformContents<File & { conflicter: string }>(() => Buffer.from('foo'), {
            pattern: '**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}',
          }),
          passthrough(sinonTransformPost),
        );
      });

      it('should edit selected files contents', () => {
        expect(sinonTransformPre).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), contents: Buffer.from('foo') }),
        );
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), contents: Buffer.from('foo') }),
        );
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ path: expect.stringMatching('.yo-*'), contents: Buffer.from('foo') }),
        );
        for (let i = 4; i <= files.length; i++) {
          expect(sinonTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ contents: Buffer.from('foo') }));
        }
      });
    });

    describe('using filter', () => {
      beforeEach(async () => {
        await pipeline(
          stream,
          passthrough(sinonTransformPre),
          transformContents<File & { conflicter: string }>(() => Buffer.from('foo'), { filter: file => file.path.endsWith('.yo-rc.json') }),
          passthrough(sinonTransformPost),
        );
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(sinonTransformPre).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toBeCalledTimes(files.length);
        expect(sinonTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-rc.json'), contents: Buffer.from('foo') }),
        );
        for (let i = 2; i <= files.length; i++) {
          expect(sinonTransformPost).toHaveBeenNthCalledWith(i, expect.not.objectContaining({ contents: Buffer.from('foo') }));
        }
      });
    });
  });

  describe('filterPattern()', () => {
    beforeEach(async () => {
      await pipeline(
        stream,
        passthrough(sinonTransformPre),
        filterPattern('**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}'),
        passthrough(sinonTransformPost),
      );
    });

    it('should pass filtered files through', () => {
      expect(sinonTransformPre).toBeCalledTimes(files.length);
      expect(sinonTransformPost).toBeCalledTimes(3);
      expect(sinonTransformPost).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching('.yo-rc.json') }));
      expect(sinonTransformPost).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching('.yo-resolve') }));
      expect(sinonTransformPost).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching('.yo-rc-global.json') }));
    });
  });

  describe('with error', () => {
    it('should call the function for every modified file and forward them through', async () => {
      await expect(
        pipeline(
          stream,
          passthrough(() => {
            throw new Error('foo error');
          }),
        ),
      ).rejects.toThrowError('foo error');
    });
  });
});
