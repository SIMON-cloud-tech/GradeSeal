// server/test/mocks/pdfkit.js
const EventEmitter = require('events');

module.exports = function PDFDocument() {
  const doc = new EventEmitter();
  const chain = () => doc;
  let pipedDest = null;

  Object.assign(doc, {
    x: 50,
    y: 50,
    pipe(dest) {
      pipedDest = dest;
      return dest;
    },
    addPage: chain,
    save: chain,
    restore: chain,
    lineWidth: chain,
    strokeColor: chain,
    dash: chain,
    undash: chain,
    rect: chain,
    stroke: chain,
    image: chain,
    fillColor: chain,
    font: chain,
    fontSize: chain,
    text: chain,
    moveDown: chain,
    end() {
      const mockPdf = Buffer.from('%PDF-1.4 mock');
      doc.emit('data', mockPdf);
      doc.emit('end');
      if (pipedDest) {
        if (typeof pipedDest.write === 'function') pipedDest.write(mockPdf);
        if (typeof pipedDest.end === 'function') pipedDest.end();
      }
      return doc;
    },
  });

  return doc;
};
