// server/test/helpers/auth.js
const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

async function createUserAndLogin(app, { email, password, role = 'ceo' }) {
  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    name: `Test ${role}`,
    email,
    password: hashed,
    role,
    status: 'active',
  });

  const res = await request(app).post('/api/login').send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }

  const setCookieHeader = res.headers['set-cookie'];
  if (!setCookieHeader || !setCookieHeader[0]) {
    throw new Error('Login succeeded but no cookie was returned');
  }

  return {
    cookie: setCookieHeader[0].split(';')[0],
    user: res.body.user,
  };
}

module.exports = { createUserAndLogin };