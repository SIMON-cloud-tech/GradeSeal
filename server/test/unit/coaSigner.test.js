// server/test/unit/coaSigner.test.js
const crypto = require('node:crypto');

// Generate a temporary Ed25519 key pair before loading coaSigner
const { privateKey } = crypto.generateKeyPairSync('ed25519');
process.env.ED25519_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });

const { signCoa, verifyCoaSignature } = require('../../utils/coaSigner');

// Fake payload that looks like a real COA
const makeCoa = () => ({
  coaId: 'COA-TEST-001',
  batchNo: 'BATCH-001',
  sampledBagId: 'BAG-0007',
  verdict: 'Pass',
  measurements: {
    moisture: '12.5',
    impurity: '1.2',
  },
  issuedAt: '2025-01-15T10:00:00.000Z',
});

describe('Ed25519 COA signing', () => {
  it('produces a non-empty signature', () => {
    const coa = makeCoa();
    const sig = signCoa(coa);
    expect(sig).toBeTruthy();
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(40);
  });

  it('verifies an unmodified COA', () => {
    const coa = makeCoa();
    const signature = signCoa(coa);
    expect(verifyCoaSignature({ ...coa, signature })).toBe(true);
  });

  it('rejects a tampered COA (moisture changed)', () => {
    const coa = makeCoa();
    const signature = signCoa(coa);

    const tampered = { ...coa, signature, measurements: { ...coa.measurements, moisture: '10.0' } };
    expect(verifyCoaSignature(tampered)).toBe(false);
  });

  it('rejects a tampered COA (verdict flipped)', () => {
    const coa = makeCoa();
    const signature = signCoa(coa);
    const tampered = { ...coa, signature, verdict: 'Fail' };
    expect(verifyCoaSignature(tampered)).toBe(false);
  });

  it('rejects a signature from a different COA', () => {
    const coa1 = makeCoa();
    const signature = signCoa(coa1);
    const coa2 = { ...makeCoa(), batchNo: 'DIFFERENT-BATCH', signature };
    expect(verifyCoaSignature(coa2)).toBe(false);
  });

  it('returns null or false when signature is missing or garbage', () => {
    const coa = makeCoa();
    expect(verifyCoaSignature({ ...coa, signature: null })).toBeNull();
    expect(verifyCoaSignature({ ...coa, signature: 'not-a-real-signature' })).toBe(false);
  });
});
