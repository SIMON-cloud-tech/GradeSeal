// server/test/integration/e2e-workflow.test.js
const crypto = require('node:crypto');

// 1. Ensure Ed25519 signing keys exist before loading server modules
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
process.env.ED25519_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.ED25519_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' });

// 2. Spy-enabled PDFKit mock so we can count exact QR images drawn onto the PDF
const mockImageCalls = [];
jest.mock('pdfkit', () => {
  const { EventEmitter } = require('node:events');
  return jest.fn().mockImplementation(() => {
    const doc = new EventEmitter();
    let pipedDest = null;
    const chain = () => doc;

    Object.assign(doc, {
      x: 50,
      y: 50,
      pipe(dest) { pipedDest = dest; return dest; },
      addPage: chain,
      save: chain,
      restore: chain,
      lineWidth: chain,
      strokeColor: chain,
      dash: chain,
      undash: chain,
      rect: chain,
      stroke: chain,
      image: jest.fn((...args) => { mockImageCalls.push(args); return doc; }),
      fillColor: chain,
      font: chain,
      fontSize: chain,
      text: chain,
      moveDown: chain,
      end() {
        const buf = Buffer.from('%PDF-1.4 mock-label-sheet');
        doc.emit('data', buf);
        doc.emit('end');
        if (pipedDest) {
          if (typeof pipedDest.write === 'function') pipedDest.write(buf);
          if (typeof pipedDest.end === 'function') pipedDest.end();
        }
        return doc;
      },
    });
    return doc;
  });
});

// 3. Mock Cloudinary upload
jest.mock('../../utils/uploadToCloudinary', () => ({
  uploadToCloudinary: jest.fn(async () => 'https://cloudinary.com'),
  uploadPdfToCloudinary: jest.fn(async (_buf, coaId) => `https://cloudinary.com{coaId}.pdf`),
}));

const request = require('supertest');
const app = require('../../server');
const { createUserAndLogin } = require('../helpers/authHelper');

describe('GradeSeal Full End-to-End Lifecycle', () => {
  it('runs Specs → Batch → Sample → Approve → QR Labels → Print → Public Scan', async () => {
    mockImageCalls.length = 0;

    // ── STEP 0: Log in as CEO (manages specs, approves COAs, prints) & Operator (creates batch, samples) ──
    const { cookie: ceoCookie } = await createUserAndLogin(app, {
      email: `ceo-e2e-${Date.now()}@test.com`,
      password: 'password123',
      role: 'ceo',
    });

    const { cookie: opCookie } = await createUserAndLogin(app, {
      email: `op-e2e-${Date.now()}@test.com`,
      password: 'password123',
      role: 'operator',
    });

    // ── STEP 1: Enter Government Standard (SpecificationsManage.jsx -> POST /api/specifications) ──
    const govRes = await request(app)
      .post('/api/specifications')
      .set('Cookie', ceoCookie)
      .send({
        type: 'government',
        authority: 'KEBS',
        region: 'Kenya',
        product: 'Gum Arabic',
        limits: {
          gelThickness: '+++',
          impurity: { min: '', max: '1.5' },
          moisture: { min: '', max: '14.0' },
          ringTest: 'Pass',
        },
      });
    expect(govRes.status).toBe(201);
    const standardId = govRes.body._id;

    // ── STEP 2: Enter Client Specification (SpecificationsManage.jsx -> POST /api/specifications) ──
    const clientRes = await request(app)
      .post('/api/specifications')
      .set('Cookie', ceoCookie)
      .send({
        type: 'client',
        client: 'Acme EU Foods',
        product: 'Gum Arabic',
        limits: {
          gelThickness: '+++',
          impurity: { min: '', max: '1.0' },
          moisture: { min: '', max: '13.0' },
          ringTest: 'Pass',
        },
      });
    expect(clientRes.status).toBe(201);
    const clientSpecId = clientRes.body._id;

    // ── STEP 3: Enter Batch Details (BatchesManage.jsx -> POST /api/batches) ──
    // 5 bags total: BAG-0001 through BAG-0005
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Cookie', opCookie)
      .send({
        productName: 'Gum Arabic',
        palletNumber: 'PLT-2026-01',
        startingBagId: 'BAG-0001',
        batchNo: 'B-E2E-001',
        lotNo: 'LOT-99',
        origin: 'Isiolo',
        numberOfBags: 5,
        clientSpecId,
        standardId,
        comments: 'Clean amber tears',
      });
    expect(batchRes.status).toBe(201);
    expect(batchRes.body.qcStatus).toBe('Awaiting Sample');
    const batchId = batchRes.body._id;

    // ── STEP 4: Draw Random Bag to Sample (BatchesManage.jsx -> POST /api/batches/:id/assign-sample) ──
    const assignRes = await request(app)
      .post(`/api/batches/${batchId}/assign-sample`)
      .set('Cookie', opCookie);
    expect(assignRes.status).toBe(200);
    const sampledBagId = assignRes.body.sampledBagId;
    expect(sampledBagId).toMatch(/^BAG-000[1-5]$/);

    // ── STEP 5: Submit Lab Measurements (SampleModal.jsx -> POST /api/batches/:id/sample) ──
    const sampleRes = await request(app)
      .post(`/api/batches/${batchId}/sample`)
      .set('Cookie', opCookie)
      .field('comments', 'Lab verified, within both KEBS and Acme EU limits')
      .field('measurements', JSON.stringify({
        gelThickness: '+++',
        impurity: '0.8',
        rotation: '-28',
        colour: 'Pale amber',
        moisture: '12.2',
        diameter: '15',
        ringTest: 'Pass',
      }));
    expect(sampleRes.status).toBe(200);
    expect(sampleRes.body.qcStatus).toBe('Pending Approval');
    expect(sampleRes.body.verdict).toBe('Pass');

    // ── STEP 6: Approve Batch & Generate Signed COA (BatchesManage.jsx -> POST /api/batches/:id/approve) ──
    const approveRes = await request(app)
      .post(`/api/batches/${batchId}/approve`)
      .set('Cookie', ceoCookie);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.qcStatus).toBe('Approved');
    const coaId = approveRes.body.coaDetails.coaId;
    expect(coaId).toBe('COA-B-E2E-001');
    expect(approveRes.body.coaDetails.qrCount).toBe(5); // 1 COA + 4 remaining bags

    // ── STEP 7: Inspect Print Manifest & Verify Sampled Bag Is Excluded (PrintQueueDetailPage.jsx) ──
    const manifestRes = await request(app)
      .get(`/api/batches/${batchId}/manifest`)
      .set('Cookie', ceoCookie);
    expect(manifestRes.status).toBe(200);
    expect(manifestRes.body.total).toBe(5);

    const printedIds = manifestRes.body.items.map((item) => item.id);
    expect(printedIds).toContain(coaId);
    expect(printedIds).not.toContain(sampledBagId); // Sampled bag gets NO sticker

    // ── STEP 8: Generate QR Data URLs & Verify Every Bag Payload ──
    const qrJsonRes = await request(app)
      .get(`/api/batches/${batchId}/qr-labels`)
      .set('Cookie', ceoCookie);
    expect(qrJsonRes.status).toBe(200);
    expect(qrJsonRes.body.coaQr.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(qrJsonRes.body.bagQrs).toHaveLength(4);
    qrJsonRes.body.bagQrs.forEach((bag) => {
      expect(bag.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(bag.id).not.toBe(sampledBagId);
    });

    // ── STEP 9: Generate Printable PDF Sheet & Prove All 5 QRs Were Drawn ──
    mockImageCalls.length = 0; // reset before PDF generation
    const pdfRes = await request(app)
      .get(`/api/batches/${batchId}/labels?cols=3&rows=8`)
      .set('Cookie', ceoCookie);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);
    expect(mockImageCalls).toHaveLength(5); // Proves doc.image() drew 1 COA QR + 4 Bag QRs

    // ── STEP 10: Mark Labels as Printed (PrintQueueDetailPage.jsx -> PATCH /api/batches/:id/printed) ──
    const printRes = await request(app)
      .patch(`/api/batches/${batchId}/printed`)
      .set('Cookie', ceoCookie);
    expect(printRes.status).toBe(200);
    expect(printRes.body.coaDetails.status).toBe('Printed');

    // ── STEP 11: Simulate Public Buyer Scanning a Printed Bag QR (VerifyPage.jsx -> GET /api/verify/...) ──
   const validBagId = qrJsonRes.body.bagQrs[0].bagId;
   expect(validBagId).toBeTruthy();
    const scanValidRes = await request(app).get(`/api/verify/${coaId}/${validBagId}`);
    expect(scanValidRes.status).toBe(200);
    expect(scanValidRes.body.result).toBe('Valid');
    expect(scanValidRes.body.signatureValid).toBe(true);

    // Scanning the sampled bag (which was opened in the lab and never printed) must be rejected
    const scanSampledRes = await request(app).get(`/api/verify/${coaId}/${sampledBagId}`);
    expect(scanSampledRes.status).toBe(200);
    expect(scanSampledRes.body.result).toBe('Invalid Bag');
  });
});
