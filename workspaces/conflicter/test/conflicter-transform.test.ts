import assert from 'node:assert';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { passthrough, pipeline } from '@yeoman/transform';
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
  let conflicterIgnoreFile;

  let stream;
  let files: any[];

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
    conflicterIgnoreFile = {
      state: 'modified',
      path: 'conflicterIgnoreFile',
      conflicter: 'ignore',
    };

    files = [
      unmodifiedFile,
      newFile,
      modifiedFile,
      newDeletedFile,
      yoRcFile,
      yoRcGlobalFile,
      yoResolveFile,
      conflicterSkippedFile,
      conflicterIgnoreFile,
    ];

    spyTransformPre = vitest.fn();
    spyTransformPost = vitest.fn();

    stream = Readable.from(files);
  });

  describe('Conflicter.createTransform()', () => {
    let yoResolveFile;

    beforeEach(async () => {
      await pipeline(
        stream,
        passthrough(spyTransformPre),
        passthrough((file: ConflictedFile) => {
          file.conflicter ||= 'force';
        }),
        createConflicterTransform(new TestAdapter()),
        passthrough(spyTransformPost),
        passthrough(file => {
          if (file.path.endsWith('.yo-resolve')) {
            yoResolveFile = file;
          }
        }),
      );
    });

    it('should forward every file', () => {
      expect(spyTransformPre).toHaveBeenCalledTimes(files.length);
      expect(spyTransformPost).toHaveBeenCalledTimes(files.length + 1);
    });

    it('should forward every file', () => {
      expect(spyTransformPost).toHaveBeenCalledTimes(files.length + 1);
    });

    it('should write .yo-resolve file', () => {
      expect(yoResolveFile).toBeTruthy();
      expect(yoResolveFile.contents.toString()).toBe('conflicterIgnoreFile skip\n');
    });

    it('should clear the state of skipped file', () => {
      assert.equal(conflicterSkippedFile.state, undefined);
      assert.equal(conflicterSkippedFile.isNew, undefined);
      assert.equal(conflicterSkippedFile.stateCleared, 'modified');
    });
  });
});
