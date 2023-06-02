import path, { dirname } from 'node:path';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it } from 'vitest';
import { isBinary } from '../src/binary-diff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('binary-diff', () => {
  it('regular file that contains ut8 chars is not binary file', async () => {
    const filePath = path.join(__dirname, 'fixtures/binary-diff/file-contains-utf8.yml');

    const data = await readFile(filePath, { encoding: 'utf8' });
    assert.equal(isBinary(filePath, data), false);
  });
});
