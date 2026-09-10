const crypto = require('crypto');
const fs = require('fs');

const GENESIS_HASH = '0'.repeat(64);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return sha256(buffer);
}

function computeBlockHash({ chainIndex, prevBlockHash, originalHash, sealedAt, documentId }) {
  const payload = `${chainIndex}|${prevBlockHash}|${originalHash}|${sealedAt}|${documentId}`;
  return sha256(Buffer.from(payload, 'utf-8'));
}

function verifyDocument(doc) {
  const currentHash = hashFile(doc.filePath);
  return {
    verified: currentHash === doc.originalHash,
    currentHash,
    sealedHash: doc.originalHash,
  };
}

function verifyChain(documents) {
  const sorted = [...documents].sort((a, b) => a.chainIndex - b.chainIndex);
  let expectedPrev = GENESIS_HASH;
  const blocks = [];
  let chainIntact = true;

  for (const doc of sorted) {
    const recomputedBlockHash = computeBlockHash({
      chainIndex: doc.chainIndex,
      prevBlockHash: expectedPrev,
      originalHash: doc.originalHash,
      sealedAt: doc.sealedAt,
      documentId: doc.id,
    });
    const linkIntact = recomputedBlockHash === doc.blockHash && expectedPrev === doc.prevBlockHash;
    if (!linkIntact) chainIntact = false;

    const content = verifyDocument(doc);

    blocks.push({
      documentId: doc.id,
      chainIndex: doc.chainIndex,
      blockHash: doc.blockHash,
      prevBlockHash: doc.prevBlockHash,
      linkIntact,
      contentVerified: content.verified,
      currentHash: content.currentHash,
    });

    expectedPrev = doc.blockHash;
  }

  return { chainIntact, blocks };
}

module.exports = {
  GENESIS_HASH,
  sha256,
  hashFile,
  computeBlockHash,
  verifyDocument,
  verifyChain,
};
