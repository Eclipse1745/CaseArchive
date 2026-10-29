const crypto = require('crypto');

const GENESIS_HASH = '0'.repeat(64);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function computeBlockHash({ chainIndex, prevBlockHash, originalHash, sealedAt, documentId }) {
  const payload = `${chainIndex}|${prevBlockHash}|${originalHash}|${sealedAt}|${documentId}`;
  return sha256(Buffer.from(payload, 'utf-8'));
}

// getHash(doc) -> Promise<string>: the hash of the file as it is stored right now.
async function verifyDocument(doc, getHash) {
  const currentHash = await getHash(doc);
  return {
    verified: currentHash === doc.originalHash,
    currentHash,
    sealedHash: doc.originalHash,
  };
}

async function verifyChain(documents, getHash) {
  const sorted = [...documents].sort((a, b) => a.chainIndex - b.chainIndex);
  const currentHashes = await Promise.all(sorted.map((d) => getHash(d)));

  let expectedPrev = GENESIS_HASH;
  let chainIntact = true;
  const blocks = sorted.map((doc, i) => {
    const recomputed = computeBlockHash({
      chainIndex: doc.chainIndex,
      prevBlockHash: expectedPrev,
      originalHash: doc.originalHash,
      sealedAt: doc.sealedAt,
      documentId: doc.id,
    });
    const linkIntact = recomputed === doc.blockHash && expectedPrev === doc.prevBlockHash;
    if (!linkIntact) chainIntact = false;
    expectedPrev = doc.blockHash;

    return {
      documentId: doc.id,
      chainIndex: doc.chainIndex,
      blockHash: doc.blockHash,
      prevBlockHash: doc.prevBlockHash,
      linkIntact,
      contentVerified: currentHashes[i] === doc.originalHash,
      currentHash: currentHashes[i],
    };
  });

  return { chainIntact, blocks };
}

module.exports = { GENESIS_HASH, sha256, computeBlockHash, verifyDocument, verifyChain };
