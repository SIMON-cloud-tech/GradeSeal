// utils/bagIds.js
// Single source of truth for bag IDs: sampling, QR generation and validation all use this.
const crypto = require('crypto');

const listBagIds = (startingBagId, numberOfBags) => {
  if (!Number.isInteger(numberOfBags) || numberOfBags <= 0) {
    throw new Error('numberOfBags must be a positive integer');
  }

  const prefix = startingBagId.replace(/\d+$/, '');
  const digits = startingBagId.slice(prefix.length);
  const start = parseInt(digits, 10);
  if (!digits || Number.isNaN(start)) throw new Error('startingBagId must end in a number');
  return Array.from({ length: numberOfBags }, (_, i) =>
    `${prefix}${String(start + i).padStart(digits.length, '0')}`
  );
};

// Cryptographically secure, unbiased pick
const pickRandomBag = (ids) => ids[crypto.randomInt(ids.length)];

module.exports = { listBagIds, pickRandomBag };
