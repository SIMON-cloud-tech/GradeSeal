// server/test/integration/batch.test.js
jest.mock('pdfkit', () => jest.fn());

const request = require('supertest');
const app = require('../../server');
const Batch = require('../../models/Batch');
const Specification = require('../../models/Specifications');
const { createUserAndLogin } = require('../helpers/authHelper');

// Helper: seed a client + gov spec and return their IDs
async function seedSpecs() {
  const clientSpec = await Specification.create({
    type: 'client',
    client: 'Acme EU',
    product: 'Gum Arabic',
    limits: { moisture: { max: '13' } },
  });
  const govSpec = await Specification.create({
    type: 'government',
    authority: 'KEBS',
    region: 'Kenya',
    product: 'Gum Arabic',
    limits: { moisture: { max: '14' } },
  });
  return { clientSpecId: clientSpec._id.toString(), standardId: govSpec._id.toString() };
}

describe('POST /api/batches', () => {
  let cookie;

  beforeEach(async () => {
    const { cookie: c } = await createUserAndLogin(app, {
      email: 'ceo@test.com',
      password: 'password123',
      role: 'ceo',
    });
    cookie = c;
  });

  it('creates a batch with valid data → 201', async () => {
    const { clientSpecId, standardId } = await seedSpecs();

    const res = await request(app)
      .post('/api/batches')
      .set('Cookie', cookie)
      .send({
        batchNo: 'B-1001',
        lotNo: 'L-2001',
        productName: 'Gum Arabic',
        origin: 'Isiolo',
        palletNumber: 'PLT-01',
        startingBagId: 'BAG-0001',
        numberOfBags: 20,
        clientSpecId,
        standardId,
      });

    expect(res.status).toBe(201);
    expect(res.body.batchNo).toBe('B-1001');
    expect(res.body.qcStatus).toBe('Awaiting Sample');

    const inDb = await Batch.findOne({ batchNo: 'B-1001' });
    expect(inDb).toBeTruthy();
  });

  it('rejects a duplicate batchNo → 409', async () => {
    const { clientSpecId, standardId } = await seedSpecs();

    const payload = {
      batchNo: 'B-2001',
      lotNo: 'L-3001',
      productName: 'Gum Arabic',
      origin: 'Isiolo',
      palletNumber: 'PLT-02',
      startingBagId: 'BAG-0001',
      numberOfBags: 20,
      clientSpecId,
      standardId,
    };

    await request(app).post('/api/batches').set('Cookie', cookie).send(payload);
    const res = await request(app).post('/api/batches').set('Cookie', cookie).send(payload);

    expect(res.status).toBe(409);
  });

  it('rejects an invalid startingBagId → 400', async () => {
    const { clientSpecId, standardId } = await seedSpecs();

    const res = await request(app)
      .post('/api/batches')
      .set('Cookie', cookie)
      .send({
        batchNo: 'B-9999',
        lotNo: 'L-9999',
        productName: 'Gum Arabic',
        origin: 'Isiolo',
        palletNumber: 'PLT-03',
        startingBagId: 'NONUMERIC',
        numberOfBags: 20,
        clientSpecId,
        standardId,
      });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests → 401', async () => {
    const res = await request(app).post('/api/batches').send({ batchNo: 'B-X' });
    expect(res.status).toBe(401);
  });
});
