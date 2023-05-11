import assert from 'node:assert';
import { describe, it, beforeEach, esmocha, expect } from 'esmocha';
import { pipeline, passthrough, type File, filterPattern } from '../src/transform.js';

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
    unmodifiedFile = { path: 'unmodifiedFile' };
    newFile = { state: 'modified', isNew: true, path: 'newFile' };
    modifiedFile = { state: 'modified', path: 'modifiedFile' };
    newDeletedFile = { state: 'deleted', isNew: true, path: 'newDeletedFile' };
    yoRcFile = { state: 'modified', path: '.yo-rc.json' };
    yoRcGlobalFile = { state: 'modified', path: '.yo-rc-global.json' };
    yoResolveFile = { state: 'modified', path: '.yo-resolve' };
    conflicterSkippedFile = {
      state: 'modified',
      path: 'conflicterSkippedFile',
      conflicter: 'skip',
    };

    files = [unmodifiedFile, newFile, modifiedFile, newDeletedFile, yoRcFile, yoRcGlobalFile, yoResolveFile, conflicterSkippedFile];

    sinonTransformPre = esmocha.fn();
    sinonTransformPost = esmocha.fn();

    stream = passthrough();
    for (const file of files) {
      stream.write(file);
    }

    stream.end();
  });

  describe('passthrough()', () => {
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
      for (const file of files) {
        if ([yoRcFile, yoRcGlobalFile, yoResolveFile].includes(file)) {
          assert.equal(file.conflicter, 'force');
        }
      }
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
