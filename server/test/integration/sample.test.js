// server/test/integration/sample.test.js
const request = require('supertest');
const app = require('../../server');
const Batch = require('../../models/Batch');
const Specification = require('../../models/Specifications');
const { createUserAndLogin } = require('../helpers/authHelper');

describe('POST /api/batches/:id/sample', () => {
  let operatorCookie;
  let batchId;

  beforeEach(async () => {
    // 1. Create a fresh Operator for each test (since afterEach clears all collections)
    const { cookie } = await createUserAndLogin(app, {
      email: `operator-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
      password: 'password123',
      role: 'operator',
    });
    operatorCookie = cookie;

    // 2. Create the Specs needed for the batch
    const cs = await Specification.create({
      type: 'client',
      client: 'Test Client',
      product: 'Gum Arabic',
      limits: { moisture: { max: '13' }, impurity: { max: '2.0' } },
    });
    const gs = await Specification.create({
      type: 'government',
      authority: 'KEBS',
      region: 'Kenya',
      product: 'Gum Arabic',
      limits: { moisture: { max: '14' }, impurity: { max: '3.0' } },
    });

    // 3. Create a batch that already had its sample bag drawn in Step 1
    const batch = await Batch.create({
      batchNo: `B-${Date.now()}`,
      lotNo: 'L-TEST',
      productName: 'Gum Arabic',
      origin: 'Isiolo',
      palletNumber: 'PLT-01',
      startingBagId: 'BAG-0001',
      numberOfBags: 20,
      sampledBagId: 'BAG-0005',
      clientSpecId: cs._id.toString(),
      standardId: gs._id.toString(),
      qcStatus: 'Awaiting Sample',
    });
    batchId = batch._id.toString();
  });

  it('saves a valid sample and flips batch status to Pending Approval → 200', async () => {
    const res = await request(app)
      .post(`/api/batches/${batchId}/sample`)
      .set('Cookie', operatorCookie)
      .field('comments', 'Slight amber tint')
      .field('measurements', JSON.stringify({
        gelThickness: '++',
        impurity: '1.5',
        rotation: '-31',
        colour: 'Pale amber',
        moisture: '12.5',
        diameter: '2.8',
        ringTest: 'Pass',
      }));

    expect(res.status).toBe(200);

    const updated = await Batch.findById(batchId);
    expect(updated.qcStatus).toBe('Pending Approval');
    expect(updated.sampledBagId).toBe('BAG-0005');
    expect(updated.verdict).toBe('Pass');
  });

  it('rejects a sample from an unauthenticated user → 401', async () => {
    const res = await request(app)
      .post(`/api/batches/${batchId}/sample`)
      .field('bagId', 'BAG-0005');

    expect(res.status).toBe(401);
  });

  it('rejects a sample from a Buyer → 403', async () => {
    const { cookie: buyerCookie } = await createUserAndLogin(app, {
      email: `buyer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
      password: 'password123',
      role: 'buyer',
    });

    const res = await request(app)
      .post(`/api/batches/${batchId}/sample`)
      .set('Cookie', buyerCookie)
      .field('bagId', 'BAG-0005');

    expect(res.status).toBe(403);
  });
});
