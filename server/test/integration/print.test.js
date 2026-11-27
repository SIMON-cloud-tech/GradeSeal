// server/test/integration/print.test.js
const request = require('supertest');
const app = require('../../server');
const Batch = require('../../models/Batch');
const Specification = require('../../models/Specifications');
const { createUserAndLogin } = require('../helpers/authHelper');

describe('Print endpoints (/api/batches/:id/...)', () => {
  let ceoCookie;
  let buyerCookie;
  let batchId;
  let clientSpecId;
  let standardSpecId;

  beforeEach(async () => {
    // Fresh CEO + Buyer per test
    const { cookie: ceoC } = await createUserAndLogin(app, {
      email: `ceo-print-${Date.now()}@test.com`,
      password: 'password123',
      role: 'ceo',
    });
    ceoCookie = ceoC;

    const { cookie: buyerC } = await createUserAndLogin(app, {
      email: `buyer-print-${Date.now()}@test.com`,
      password: 'password123',
      role: 'buyer',
    });
    buyerCookie = buyerC;

    // Fresh specs per test
    const cs = await Specification.create({
      type: 'client',
      client: 'Print Test Client',
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
    clientSpecId = cs._id;
    standardSpecId = gs._id;

    // Fresh approved batch per test
    const batch = await Batch.create({
      batchNo: 'PRINT-001',
      lotNo: 'L-PRINT',
      productName: 'Gum Arabic',
      origin: 'Isiolo',
      palletNumber: 'PLT-PRINT',
      startingBagId: 'BAG-0001',
      numberOfBags: 5,
      clientSpecId,
      standardId: standardSpecId,
      qcStatus: 'Approved',
      sampledBagId: 'BAG-0003',
      verdict: 'Pass',
      measurements: { moisture: '12.5', impurity: '1.0' },
      coaDetails: {
        coaId: 'COA-PRINT-001',
        verifyBaseUrl: 'http://verify.test.local',
        pdfUrl: 'http://verify.test.local/coa/COA-PRINT-001.pdf',
        status: 'Approved',
      },
    });
    batchId = batch._id.toString();
  });

  describe('GET /api/batches/:id/manifest', () => {
    it('returns the manifest of items to print → 200', async () => {
      const res = await request(app)
        .get(`/api/batches/${batchId}/manifest`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.body.coaId).toBe('COA-PRINT-001');
      expect(res.body.total).toBe(5);
      expect(res.body.items[0].type).toBe('COA');
    });

    it('flags a localhost verify URL → localUrlWarning true', async () => {
      // No reset needed — this test has its own batch
      await Batch.findByIdAndUpdate(batchId, {
        'coaDetails.verifyBaseUrl': 'http://localhost:5173',
      });

      const res = await request(app)
        .get(`/api/batches/${batchId}/manifest`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.body.localUrlWarning).toBe(true);
    });

    it('rejects unauthenticated requests → 401', async () => {
      const res = await request(app).get(`/api/batches/${batchId}/manifest`);
      expect(res.status).toBe(401);
    });

    it('rejects Buyers → 403', async () => {
      const res = await request(app)
        .get(`/api/batches/${batchId}/manifest`)
        .set('Cookie', buyerCookie);
      expect(res.status).toBe(403);
    });

    it('returns 400 for a batch that is not Approved', async () => {
      const draft = await Batch.create({
        batchNo: 'PRINT-DRAFT',
        lotNo: 'L-DRAFT',
        productName: 'Gum Arabic',
        origin: 'Isiolo',
        palletNumber: 'PLT-DRAFT',
        startingBagId: 'BAG-0100',
        numberOfBags: 5,
        clientSpecId,           // ← now from the fresh spec created in beforeEach
        standardId: standardSpecId,
        qcStatus: 'Awaiting Sample',
      });

      const res = await request(app)
        .get(`/api/batches/${draft._id}/manifest`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no approved COA/i);
    });
  });

  describe('GET /api/batches/:id/labels', () => {
    it('returns a PDF stream → 200 + correct content-type', async () => {
      const res = await request(app)
        .get(`/api/batches/${batchId}/labels`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/labels-COA-PRINT-001/);
    });

    it('accepts custom cols/rows query params', async () => {
      const res = await request(app)
        .get(`/api/batches/${batchId}/labels?cols=2&rows=4`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('rejects unauthenticated requests → 401', async () => {
      const res = await request(app).get(`/api/batches/${batchId}/labels`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/batches/:id/qr-labels', () => {
    it('returns JSON with COA QR and bag QR data URLs → 200', async () => {
      const res = await request(app)
        .get(`/api/batches/${batchId}/qr-labels`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.body.coaQr.qrUrl).toBe('http://verify.test.local/verify/COA-PRINT-001');
      expect(res.body.bagQrs).toHaveLength(4);
    });

    it('rejects Buyers → 403', async () => {
      const res = await request(app)
        .get(`/api/batches/${batchId}/qr-labels`)
        .set('Cookie', buyerCookie);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/batches/:id/printed', () => {
    it('flips coaDetails.status to Printed → 200', async () => {
      const res = await request(app)
        .patch(`/api/batches/${batchId}/printed`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.body.coaDetails.status).toBe('Printed');
    });

    it('is idempotent — re-marking works', async () => {
      await request(app).patch(`/api/batches/${batchId}/printed`).set('Cookie', ceoCookie);
      const res = await request(app)
        .patch(`/api/batches/${batchId}/printed`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(200);
      expect(res.body.coaDetails.status).toBe('Printed');
    });

    it('returns 400 for a batch without an approved COA', async () => {
      const draft = await Batch.create({
        batchNo: 'PRINT-NOCOA',
        lotNo: 'L-NOCOA',
        productName: 'Gum Arabic',
        origin: 'Isiolo',
        palletNumber: 'PLT-NOCOA',
        startingBagId: 'BAG-0200',
        numberOfBags: 5,
        clientSpecId,
        standardId: standardSpecId,
        qcStatus: 'Approved',
        // no coaDetails.coaId
      });

      const res = await request(app)
        .patch(`/api/batches/${draft._id}/printed`)
        .set('Cookie', ceoCookie);

      expect(res.status).toBe(400);
    });
  });
});