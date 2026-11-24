// utils/coaSigner.js
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Load the private key once at startup.
// Production (Render etc.): set ED25519_PRIVATE_KEY to the PEM text, with real newlines or "\n".
// Local: falls back to ed25519-private.pem in the project root (keep it in .gitignore).
const privateKeyPath = path.join(__dirname, '..', 'ed25519-private.pem');
let privateKey = null;
let publicKey = null;

try {
  const pem = process.env.ED25519_PRIVATE_KEY
    ? process.env.ED25519_PRIVATE_KEY.replace(/\\n/g, '\n')
    : fs.readFileSync(privateKeyPath, 'utf8');
  privateKey = crypto.createPrivateKey(pem);
  publicKey = crypto.createPublicKey(privateKey); // derived from the private key, used by verifyCoaSignature
} catch (err) {
  console.error('WARNING: Ed25519 private key not found or invalid. Approve will fail until it is set.');
}

// The exact string that gets signed. Signing and verifying MUST use the same keys in the same order.
const buildPayload = (c) => JSON.stringify({
  coaId: c.coaId,
  batchNo: c.batchNo,
  sampledBagId: c.sampledBagId,
  verdict: c.verdict,
  measurements: c.measurements,
  issuedAt: c.issuedAt,
});

/**
 * Sign the COA data.
 * @returns {string|null} Base64url encoded signature
 */
const signCoa = (coaData) => {
  if (!privateKey) return null;
  // Ed25519 signing (the first argument 'null' is correct for Ed25519)
  return crypto.sign(null, Buffer.from(buildPayload(coaData)), privateKey).toString('base64url');
};

/**
 * Check a stored COA (the coaData saved on the batch at approval) against its signature.
 * @returns {boolean|null} true = genuine, false = altered, null = could not be checked
 */
const verifyCoaSignature = (coaData) => {
  if (!publicKey || !coaData || !coaData.signature) return null;
  try {
    return crypto.verify(
      null,
      Buffer.from(buildPayload(coaData)),
      publicKey,
      Buffer.from(coaData.signature, 'base64url')
    );
  } catch {
    return false;
  }
};

module.exports = { signCoa, verifyCoaSignature };