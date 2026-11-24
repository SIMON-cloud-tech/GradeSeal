// server/generate-keys.js
const crypto = require('node:crypto');
const fs = require('node:fs');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Save the private key (keep this secret!)
fs.writeFileSync('ed25519-private.pem', privateKey, { mode: 0o600 });
// Save the public key (this can be shared)
fs.writeFileSync('ed25519-public.pem', publicKey);

console.log('Keys generated successfully.');