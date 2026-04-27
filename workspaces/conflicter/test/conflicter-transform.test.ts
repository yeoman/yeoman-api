import assert from 'node:assert';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { passthrough, pipeline } from '@yeoman/transform';
import { TestAdapter } from '@yeoman/adapter/testing';
import { type ConflicterFile, createConflicterTransform } from '../src/conflicter.js';

describe('Transform stream', () => {
  let unmodifiedFile: ConflicterFile;
  let newFile: ConflicterFile;
  let modifiedFile: ConflicterFile;
  let newDeletedFile: ConflicterFile;
  let yoRcFile: ConflicterFile;
  let yoRcGlobalFile: ConflicterFile;
  let yoResolveFile: ConflicterFile;
  let conflicterSkippedFile: ConflicterFile;
  let conflicterIgnoreFile: ConflicterFile;

  let stream: Readable;
  let files: ConflicterFile[];

  let spyTransformPre: any;
  let spyTransformPost: any;

  beforeEach(() => {
    unmodifiedFile = { path: 'unmodifiedFile', contents: null };
    newFile = { state: 'modified', isNew: true, path: 'newFile', contents: null };
    modifiedFile = { state: 'modified', path: 'modifiedFile', contents: null };
    newDeletedFile = { state: 'deleted', isNew: true, path: 'newDeletedFile', contents: null };
    yoRcFile = { state: 'modified', path: '.yo-rc.json', contents: null };
    yoRcGlobalFile = { state: 'modified', path: '.yo-rc-global.json', contents: null };
    yoResolveFile = { state: 'modified', path: '.yo-resolve', contents: null };
    conflicterSkippedFile = {
      state: 'modified',
      path: 'conflicterSkippedFile',
      conflicter: 'skip',
      contents: null,
    };
    conflicterIgnoreFile = {
      state: 'modified',
      path: 'conflicterIgnoreFile',
      conflicter: 'ignore',
      contents: null,
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
    let yoResolveFile: ConflicterFile | undefined;

    beforeEach(async () => {
      await pipeline(
        stream,
        passthrough(file => spyTransformPre(file)),
        passthrough((file: ConflicterFile) => {
          file.conflicter ||= 'force';
        }),
        createConflicterTransform(new TestAdapter()),
        passthrough(file => spyTransformPost(file)),
        passthrough((file: ConflicterFile) => {
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
      expect(yoResolveFile!.contents!.toString()).toBe('conflicterIgnoreFile skip\n');
    });

    it('should clear the state of skipped file', () => {
      assert.equal(conflicterSkippedFile.state, undefined);
      assert.equal(conflicterSkippedFile.isNew, undefined);
      assert.equal(conflicterSkippedFile.stateCleared, 'modified');
    });
  });
});
