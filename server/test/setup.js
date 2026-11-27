// server/test/setup.js
const mongoose = require('mongoose');
require('dotenv').config();

beforeAll(async () => {
  if (!process.env.TEST_MONGODB_URI) {
    throw new Error(
      'TEST_MONGODB_URI is not set. Add it to server/.env — it must point to a separate test database, not your production DB.'
    );
  }

  await mongoose.connect(process.env.TEST_MONGODB_URI);

  // Safety check — abort if we're connected to the wrong DB
  const dbName = mongoose.connection.name;
  if (!dbName.includes('test')) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". ` +
      `TEST_MONGODB_URI must point to a database whose name contains "test".`
    );
  }

  console.log(`✅ Connected to test DB: ${dbName}`);
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});