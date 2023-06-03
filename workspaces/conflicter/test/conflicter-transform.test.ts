import assert from 'node:assert';
import { Readable } from 'node:stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, beforeEach, vitest, expect } from 'vitest';
import { pipeline, passthrough } from '@yeoman/transform';
// eslint-disable-next-line n/file-extension-in-import
import { TestAdapter } from '@yeoman/adapter/testing';
import { type ConflictedFile, createConflicterTransform } from '../src/conflicter.js';

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

    spyTransformPre = vitest.fn();
    spyTransformPost = vitest.fn();

    stream = Readable.from(files);
  });

  describe('Conflicter.createTransform()', () => {
    beforeEach(async () => {
      await pipeline(
        stream,
        passthrough(spyTransformPre),
        passthrough((file: ConflictedFile) => {
          if (!file.conflicter) {
            file.conflicter = 'force';
          }
        }),
        createConflicterTransform(new TestAdapter()),
        passthrough(spyTransformPost),
      );
    });

    it('should forward modified and not skipped files', () => {
      expect(spyTransformPre).toHaveBeenCalledTimes(files.length);
      expect(spyTransformPost).toHaveBeenCalledTimes(files.length - 1);
      for (const file of files) {
        assert.equal(file.conflicter, undefined);
        assert.equal(file.binary, undefined);
        assert.equal(file.conflicterChanges, undefined);
        assert.equal(file.conflicterLog, undefined);
      }
    });

    it('should clear the state of skipped file', () => {
      assert.equal(conflicterSkippedFile.state, undefined);
      assert.equal(conflicterSkippedFile.isNew, undefined);
      assert.equal(conflicterSkippedFile.stateCleared, 'modified');
    });
  });
});
