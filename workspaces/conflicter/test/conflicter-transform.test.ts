/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable import/no-named-as-default-member */
import assert from 'node:assert';
import { Readable } from 'node:stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, beforeEach } from 'esmocha';
import sinon from 'sinon';
import { pipeline, passthrough } from '@yeoman/transform';
import { TestAdapter } from 'yeoman-test';
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

    sinonTransformPre = sinon.stub().callsFake(() => {});
    sinonTransformPost = sinon.stub().callsFake(() => {});

    stream = Readable.from(files);
  });

  describe('Conflicter.createTransform()', () => {
    beforeEach(async () => {
      await pipeline(
        stream,
        passthrough(sinonTransformPre),
        passthrough((file: ConflictedFile) => {
          if (!file.conflicter) {
            file.conflicter = 'force';
          }
        }),
        createConflicterTransform(new TestAdapter()),
        passthrough(sinonTransformPost),
      );
    });

    it('should forward modified and not skipped files', () => {
      assert.equal(sinonTransformPre.callCount, files.length);
      assert.equal(sinonTransformPost.callCount, files.length - 1);
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
