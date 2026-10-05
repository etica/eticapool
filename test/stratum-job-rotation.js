// Regression test: the retarget timer must hand miners distinct work on every job, and shares
// mined on a recent job must still verify after the extraNonce rotated.
// Run: node test/stratum-job-rotation.js (no MongoDB/Redis needed)
import assert from 'node:assert/strict';
import Worker from '../lib/stratum/worker.js';
import TokenDataHelper from '../lib/util/token-data-helper.js';
import PeerHelper from '../lib/util/peer-helper.js';
import multiHashing from 'cryptonight-hashing';
import * as rx from '../lib/util/randomx-formats-helper.js';

const blob = '0'.repeat(152);           // 76-byte header, nonce at 39, reserved at 55
const seed = 'ab'.repeat(32);
const challenge = '0x' + '11'.repeat(32);
TokenDataHelper.getRandomxBlob = async () => blob;
TokenDataHelper.getRandomxSeedhash = async () => seed;
TokenDataHelper.getChallengeNumber = async () => challenge;
TokenDataHelper.getEpochCount = async () => 42;
PeerHelper.getMinerData = async () => null;

const sent = [];
const socket = { remoteAddress: '127.0.0.1', localPort: 1234, on() {}, write(s) { sent.push(JSON.parse(s)); } };
const poolConfig = { miningConfig: { minimumShareDifficultyHard: 1 }, minimumTarget: 1, epochCount: 42, challengeNumber: challenge,
  mintingConfig: { publicAddress: '0xE0B8525729E4b49eb68903A2d02E8CD8Cf7cBc1C' }, randomxBlob: blob, randomxSeedhash: seed };
const inserted = [];
const mongo = { insertOne: async (_c, d) => inserted.push(d) };
const w = new Worker(socket, poolConfig, null, { getEthBlockNumber: async () => 1 }, mongo, null);
w.authorized = true; w.subscribe = true; w.minerEthAddress = '0xE0B8525729E4b49eb68903A2d02E8CD8Cf7cBc1C'; w.fullWorkerName = w.minerEthAddress + '.t';
w.loginId = 'login-x';

await w.sendFirstJob();
const job1 = sent.at(-1).result.job;
// what the retarget timer does: same chain state, new job
await w.sendNewJob(true, true);
const job2 = sent.at(-1).params;
await w.sendNewJob(true, true);
const job3 = sent.at(-1).params;

assert.notEqual(job1.job_id, job2.job_id);
assert.notEqual(job1.blob, job2.blob, 'resent job must carry different work');
assert.notEqual(job2.blob, job3.blob);
assert.equal(job1.seed_hash, job2.seed_hash);
assert.equal(job1.blob.slice(0, 110), job2.blob.slice(0, 110), 'only the reserved extraNonce bytes change');
assert.notEqual(job1.blob.slice(110, 126), job2.blob.slice(110, 126));

// a share mined on job1 (older extraNonce) submitted after two rotations is still accepted
const nonce = '01020304';
const blobWithNonce = Buffer.from(job1.blob, 'hex'); Buffer.from(nonce, 'hex').copy(blobWithNonce, 39);
const result = multiHashing.randomx(blobWithNonce, Buffer.from(seed, 'hex'), 0).toString('hex');
w.lastShareSubmissionTime = 0;
await w._processInteraction({ id: 7, method: 'submit', params: { id: 'login-x', job_id: job1.job_id, nonce, result } }, null, { getEthBlockNumber: async () => 1 });
assert.equal(sent.at(-1).id, 7); assert.equal(sent.at(-1).result?.status, 'OK', JSON.stringify(sent.at(-1)));
assert.equal(inserted.length, 1);
const job1ExtraNonce = inserted[0].extraNonce;
assert.notEqual(job1ExtraNonce, rx.convertAdd0x(w.extraNonce), 'share must record the extraNonce it was mined with');
assert.equal(rx.setReservedHashOnBlob(blob, poolConfig.mintingConfig.publicAddress, challenge, job1ExtraNonce), job1.blob,
  'recorded extraNonce reproduces the blob the miner hashed (what peer-interface re-verifies)');

// same share against the newest job id is rejected (different work)
w.lastShareSubmissionTime = 0;
await w._processInteraction({ id: 8, method: 'submit', params: { id: 'login-x', job_id: job3.job_id, nonce, result } }, null, { getEthBlockNumber: async () => 1 });
assert.equal(sent.at(-1).error?.code, 28, // INVALID_SHARE
   JSON.stringify(sent.at(-1)));

// unknown/missing job_id falls back to the current job (legacy behaviour)
assert.equal(w.getJobForSubmit(undefined).extraNonce, w.extraNonce);
assert.equal(w.getJobForSubmit('nope').extraNonce, w.extraNonce);

// only the last 4 jobs are kept; challenge change drops them all
for (let i = 0; i < 5; i++) await w.sendNewJob(true, true);
assert.equal(w.recentJobs.size, 4);
await w.handleUpdate({ challengeNumber: '0x' + '22'.repeat(32), epochCount: 43, randomxBlob: blob, randomxSeedhash: seed });
await new Promise((r) => setTimeout(r, 50)); // handleUpdate fires sendNewJob without awaiting it
assert.equal(w.recentJobs.size, 1);
w.stopRetargetTimer();
console.log('ok: jobs rotate, stale-job shares verify against their own extraNonce');
process.exit(0);
