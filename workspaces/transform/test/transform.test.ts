import assert from 'node:assert';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { type File, filePipeline, filterPattern, passthrough, transformContents } from '../src/transform.js';

type TestFile = File & {
  state?: 'modified' | 'deleted';
  isNew?: boolean;
  conflicter?: string;
  stateCleared?: string;
};

describe('Transform stream', () => {
  let unmodifiedFile: TestFile;
  let newFile: TestFile;
  let modifiedFile: TestFile;
  let newDeletedFile: TestFile;
  let yoRcFile: TestFile;
  let yoRcGlobalFile: TestFile;
  let yoResolveFile: TestFile;
  let conflicterSkippedFile: TestFile;

  let stream: ReturnType<typeof passthrough>;
  let files: TestFile[];

  let spyTransformPre: any;
  let spyTransformPost: any;

  beforeEach(() => {
    yoRcFile = { state: 'modified', path: '.yo-rc.json', contents: null };
    yoRcGlobalFile = { state: 'modified', path: '.yo-rc-global.json', contents: null };
    yoResolveFile = { state: 'modified', path: '.yo-resolve', contents: null };
    unmodifiedFile = { path: 'unmodifiedFile', contents: null };
    newFile = { state: 'modified', isNew: true, path: 'newFile', contents: null };
    modifiedFile = { state: 'modified', path: 'modifiedFile', contents: null };
    newDeletedFile = { state: 'deleted', isNew: true, path: 'newDeletedFile', contents: null };
    conflicterSkippedFile = {
      state: 'modified',
      path: 'conflicterSkippedFile',
      conflicter: 'skip',
      contents: null,
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
          passthrough(file => spyTransformPre(file)),
          passthrough<File & { conflicter: string }>(
            file => {
              file.conflicter = 'force';
            },
            { pattern: '**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}' },
          ),
          passthrough(file => spyTransformPost(file)),
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
        for (let index = 4; index <= files.length; index++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(index, expect.not.objectContaining({ conflicter: 'force' }));
        }
      });
    });

    describe('using filter', () => {
      beforeEach(async () => {
        await filePipeline(stream, [
          passthrough(file => spyTransformPre(file)),
          passthrough<File & { conflicter: string }>(
            file => {
              file.conflicter = 'force';
            },
            { filter: file => file.path.endsWith('.yo-rc.json') },
          ),
          passthrough(file => spyTransformPost(file)),
        ]);
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(spyTransformPre).toBeCalledTimes(files.length);
        expect(spyTransformPost).toBeCalledTimes(files.length);
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-rc.json'), conflicter: 'force' }),
        );
        for (let index = 2; index <= files.length; index++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(index, expect.not.objectContaining({ conflicter: 'force' }));
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
          passthrough(file => spyTransformPre(file)),
          transformContents<File & { conflicter: string }>(() => Buffer.from('foo'), {
            pattern: '**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}',
          }),
          passthrough(file => spyTransformPost(file)),
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
        for (let index = 4; index <= files.length; index++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(index, expect.not.objectContaining({ contents: Buffer.from('foo') }));
        }
      });
    });

    describe('using filter', () => {
      beforeEach(async () => {
        await filePipeline(stream, [
          passthrough(file => spyTransformPre(file)),
          transformContents<File & { conflicter: string }>(() => Buffer.from('foo'), { filter: file => file.path.endsWith('.yo-rc.json') }),
          passthrough(file => spyTransformPost(file)),
        ]);
      });

      it('should spy files that matches the pattern and pass all files through', () => {
        expect(spyTransformPre).toBeCalledTimes(files.length);
        expect(spyTransformPost).toBeCalledTimes(files.length);
        expect(spyTransformPost).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ path: expect.stringMatching('.yo-rc.json'), contents: Buffer.from('foo') }),
        );
        for (let index = 2; index <= files.length; index++) {
          expect(spyTransformPost).toHaveBeenNthCalledWith(index, expect.not.objectContaining({ contents: Buffer.from('foo') }));
        }
      });
    });
  });

  describe('filterPattern()', () => {
    beforeEach(async () => {
      await filePipeline(stream, [
        passthrough(file => spyTransformPre(file)),
        filterPattern('**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}'),
        passthrough(file => spyTransformPost(file)),
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
