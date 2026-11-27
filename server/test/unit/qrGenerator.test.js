// server/test/unit/qrGenerator.test.js
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async (data) => `data:image/png;base64,${Buffer.from(data).toString('base64')}`),
  toBuffer: jest.fn(async (data) => Buffer.from(data)),
}));

const { buildBatchQrManifest } = require('../../utils/qrGenerator');

// Minimal batch object — just the fields the generator needs
const makeBatch = () => ({
  batchNo: 'BATCH-001',
  startingBagId: 'BAG-0001',
  numberOfBags: 10,
  sampledBagId: 'BAG-0005',
});

describe('buildBatchQrManifest', () => {
  it('produces 1 COA QR and (N-1) bag QRs', async () => {
    const batch = makeBatch();
    const manifest = await buildBatchQrManifest(batch, 'COA-BATCH-001', 'http://test.local');

    expect(manifest.coaQr).toBeDefined();
    expect(manifest.bagQrs).toHaveLength(9); // 10 bags - 1 sampled
  });

  it('excludes the sampled bag from bagQrs', async () => {
    const batch = makeBatch();
    const manifest = await buildBatchQrManifest(batch, 'COA-BATCH-001', 'http://test.local');

    const bagIds = manifest.bagQrs.map((q) => q.bagId);
    expect(bagIds).not.toContain('BAG-0005');
  });

  it('generates the correct COA URL', async () => {
    const batch = makeBatch();
    const manifest = await buildBatchQrManifest(batch, 'COA-BATCH-001', 'http://test.local');

    expect(manifest.coaQr.qrUrl).toBe('http://test.local/verify/COA-BATCH-001');
  });

  it('each bag QR has a dataUrl (base64 PNG)', async () => {
    const batch = makeBatch();
    const manifest = await buildBatchQrManifest(batch, 'COA-BATCH-001', 'http://test.local');

    for (const qr of manifest.bagQrs) {
      expect(qr.dataUrl).toMatch(/^data:image\/png;base64,/);
    }
  });
});
