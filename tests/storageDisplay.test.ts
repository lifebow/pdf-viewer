import assert from 'node:assert/strict';
import { calculateStorageUsagePercentage } from '../src/utils/pdfStorage';

const quota = 50 * 1024 * 1024;

assert.equal(calculateStorageUsagePercentage(0, quota), 0);
assert.equal(calculateStorageUsagePercentage(512 * 1024, quota), 1);
assert.equal(calculateStorageUsagePercentage(25 * 1024 * 1024, quota), 50);
assert.equal(calculateStorageUsagePercentage(75 * 1024 * 1024, quota), 100);
assert.equal(calculateStorageUsagePercentage(-1, quota), 0);
assert.equal(calculateStorageUsagePercentage(1024, 0), 0);

console.log('storage display tests passed');
