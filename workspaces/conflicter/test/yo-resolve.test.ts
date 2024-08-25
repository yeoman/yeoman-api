import assert from 'node:assert';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { YoResolve } from '../src/yo-resolve.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('YoResolve', () => {
  describe('YoResolve.getStatusForFile()', () => {
    const yoResolveRoot = path.join(__dirname, 'fixtures', 'yo-resolve');
    const yoResolveSub = path.join(yoResolveRoot, 'sub');
    const rootToSkipFile = path.join(yoResolveRoot, 'root-to-skip');
    const subToSkipFile = path.join(yoResolveSub, 'sub-to-skip');
    const sub2ToForceFile = path.join(yoResolveSub, 'sub2-to-force');
    const noResolveFile = path.join(yoResolveSub, 'no-resolve');
    const matchToSkipFile = path.join(yoResolveSub, 'match-to-skip');

    it('should return correct status for root-to-skip', async () => {
      assert.strictEqual(await new YoResolve().getStatusForFile(rootToSkipFile), 'skip');
    });

    it('should return correct status for sub-to-skip', async () => {
      assert.strictEqual(await new YoResolve().getStatusForFile(subToSkipFile), 'skip');
    });

    it('should return correct status for sub2-to-force', async () => {
      assert.strictEqual(await new YoResolve().getStatusForFile(sub2ToForceFile), 'force');
    });

    it('should return correct status for no-resolve', async () => {
      assert.strictEqual(await new YoResolve().getStatusForFile(noResolveFile), undefined);
    });

    it('should return correct status for match-to-skip', async () => {
      assert.strictEqual(await new YoResolve().getStatusForFile(matchToSkipFile), 'skip');
    });
  });
});
