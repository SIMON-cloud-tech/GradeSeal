// utils/qrGenerator.js
// Nothing in here is stored. QR codes are rebuilt from the batch whenever they are needed.
const QRCode = require('qrcode');
const { listBagIds } = require('./bagId');

const stripSlash = (u) => String(u).replace(/\/+$/, '');

/** QR as a base64 data URL (used for the QR printed inside the COA PDF). */
const generateQR = async (data, opts = {}) =>
  QRCode.toDataURL(data, {
    width: opts.width || 300,
    margin: opts.margin ?? 1,
    errorCorrectionLevel: 'M',
  });

/** QR as a PNG buffer (used when drawing label sheets). */
const generateQRBuffer = (data, opts = {}) =>
  QRCode.toBuffer(data, {
    type: 'png',
    width: opts.width || 300,
    margin: opts.margin ?? 1,
    errorCorrectionLevel: 'M',
  });

/**
 * The list of things that get a QR, with their URLs. No images are rendered here,
 * so it is cheap enough to call just to show a manifest.
 *   - 1 certificate QR  -> {baseUrl}/verify/{coaId}
 *   - 1 bag QR per bag EXCEPT the sampled bag -> {baseUrl}/verify/{coaId}/{bagId}
 */
const buildQrTargets = (batch, coaId, baseUrl) => {
  const base = stripSlash(baseUrl);
  const targets = [{ type: 'COA', id: coaId, qrUrl: `${base}/verify/${coaId}` }];

  listBagIds(batch.startingBagId, batch.numberOfBags)
    .filter((bagId) => bagId !== batch.sampledBagId)
    .forEach((bagId) => {
      targets.push({ type: 'Bag', id: bagId, qrUrl: `${base}/verify/${coaId}/${bagId}` });
    });

  return targets;
};

/** Full manifest with rendered data-URL images, built in parallel chunks. */
const buildBatchQrManifest = async (batch, coaId, baseUrl, { chunkSize = 50 } = {}) => {
  const targets = buildQrTargets(batch, coaId, baseUrl);
  const rendered = [];

  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    const items = await Promise.all(
      chunk.map(async (t) => ({ ...t, dataUrl: await generateQR(t.qrUrl) }))
    );
    rendered.push(...items);
  }

  const [coa, ...bags] = rendered;
  return {
    coaQr: { type: 'COA', coaId, qrUrl: coa.qrUrl, dataUrl: coa.dataUrl },
    bagQrs: bags.map((b) => ({ type: 'Bag', bagId: b.id, qrUrl: b.qrUrl, dataUrl: b.dataUrl })),
  };
};

module.exports = { generateQR, generateQRBuffer, buildQrTargets, buildBatchQrManifest };
