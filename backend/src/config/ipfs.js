// Web3.Storage IPFS uploader
const uploadToIPFS = async (data, filename) => {
  try {
    const { Web3Storage, File } = await import('@web3-storage/w3up-client');
    // Simplified mock for hackathon — replace with real IPFS call
    // For MVP, we store hash in Firebase and simulate IPFS
    const mockHash = `Qm${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 44)}`;
    return {
      cid: mockHash,
      url: `https://ipfs.io/ipfs/${mockHash}`,
    };
  } catch (err) {
    console.error('IPFS upload error:', err);
    // Fallback — store as base64 mock CID
    const mockCid = `QmMOCK${Date.now()}`;
    return { cid: mockCid, url: `https://ipfs.io/ipfs/${mockCid}` };
  }
};

module.exports = { uploadToIPFS };