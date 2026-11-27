// server/test/integration/approve.test.js
const crypto = require('node:crypto');

// 1. Provide an Ed25519 private key before loading server/coaSigner
const { privateKey } = crypto.generateKeyPairSync('ed25519');
process.env.ED25519_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });

// 2. Mock PDFKit with an EventEmitter required inside the factory (Jest hoisting rule)
jest.mock('pdfkit', () => {
  const { EventEmitter } = require('node:events');
  return jest.fn().mockImplementation(() => {
    const emitter = new EventEmitter();
    emitter.x = 50;
    emitter.y = 50;
    emitter.fontSize = jest.fn().mockReturnThis();
    emitter.text = jest.fn().mockReturnThis();
    emitter.moveDown = jest.fn().mockReturnThis();
    emitter.image = jest.fn().mockReturnThis();
    emitter.end = jest.fn(() => {
      emitter.emit('data', Buffer.from('%PDF-1.4 mock'));
      emitter.emit('end');
    });
    return emitter;
  });
});

// 3. Mock Cloudinary PDF upload so tests don't make external network calls
jest.mock('../../utils/uploadToCloudinary', () => ({
  uploadToCloudinary: jest.fn(async () => 'https://cloudinary.com'),
  uploadPdfToCloudinary: jest.fn(async (_buf, coaId) => `https://cloudinary.com{coaId}.pdf`),
}));

const request = require('supertest');
const app = require('../../server');
const Batch = require('../../models/Batch');
const Specification = require('../../models/Specifications');
const { createUserAndLogin } = require('../helpers/authHelper');

describe('POST /api/batches/:id/approve', () => {
  let cookie;
  let batchId;

  beforeEach(async () => {
    const { cookie: c } = await createUserAndLogin(app, {
      email: `ceo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
      password: 'password123',
      role: 'ceo',
    });
    cookie = c;

    const cs = await Specification.create({
      type: 'client',
      client: 'Test',
      product: 'Gum Arabic',
      limits: { moisture: { max: '13' } },
    });
    const gs = await Specification.create({
      type: 'government',
      authority: 'KEBS',
      region: 'Kenya',
      product: 'Gum Arabic',
      limits: { moisture: { max: '14' } },
    });

    const batch = await Batch.create({
      batchNo: `B-${Date.now()}`,
      lotNo: 'L-TEST',
      productName: 'Gum Arabic',
      origin: 'Isiolo',
      palletNumber: 'PLT-01',
      startingBagId: 'BAG-0001',
      numberOfBags: 10,
      clientSpecId: cs._id.toString(),
      standardId: gs._id.toString(),
      qcStatus: 'Pending Approval',
      sampledBagId: 'BAG-0005',
      measurements: { moisture: '12.5', impurity: '1.0' },
      verdict: 'Pass',
    });
    batchId = batch._id.toString();
  });

  it('approves a valid batch and generates COA + QRs → 200', async () => {
    const res = await request(app)
      .post(`/api/batches/${batchId}/approve`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.qcStatus).toBe('Approved');
    expect(res.body.coaDetails.coaId).toMatch(/^COA-/);
    expect(res.body.coaDetails.qrCount).toBe(10); // 1 COA + 9 bags
    expect(res.body.coaDetails.pdfUrl).toMatch(/^https:\/\/res\.cloudinary\.com/);
    expect(res.body.coaDetails.coaData.signature).toBeTruthy();
  });

  it('refuses to approve a batch that is not Pending Approval → 400', async () => {
    await Batch.findByIdAndUpdate(batchId, { qcStatus: 'Awaiting Sample' });

    const res = await request(app)
      .post(`/api/batches/${batchId}/approve`)
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
  });

  it('refuses to approve a failed batch → 400', async () => {
    await Batch.findByIdAndUpdate(batchId, { verdict: 'Fail' });

    const res = await request(app)
      .post(`/api/batches/${batchId}/approve`)
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
  });
});
