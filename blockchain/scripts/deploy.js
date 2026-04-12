require('dotenv').config();
const { ethers } = require("hardhat");

async function patchBackendListing(contractAddress, msmeId, onChainId, txHash) {
  const backendUrl = (process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const route = `${backendUrl}/api/msme/${encodeURIComponent(msmeId)}/contract`;

  console.log(`\n🔄 Updating backend listing ${msmeId} with contract metadata...`);
  try {
    const response = await fetch(route, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress,
        tokenSymbol: 'MSME',
        txHash,
        onChainId,
      }),
    });

    const payload = await response.json();
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || payload.message || `backend update failed with status ${response.status}`);
    }

    console.log('✅ Backend listing updated successfully:', payload.message || 'OK');
    return payload;
  } catch (err) {
    console.error('❌ Unable to patch backend listing:', err.message || err);
    console.error('Please make sure the backend is running and the BACKEND_URL is correct.');
    return null;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  console.log("\n📦 Deploying MSMEEquityToken contract...");
  const MSMEEquityToken = await ethers.getContractFactory("MSMEEquityToken");
  const token = await MSMEEquityToken.deploy();
  await token.waitForDeployment();
  const contractAddress = await token.getAddress();
  const deploymentTxHash = token.deploymentTransaction()?.hash || null;

  console.log("\n✅ MSMEEquityToken deployed!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Polygonscan:", `https://mumbai.polygonscan.com/address/${contractAddress}`);
  console.log("\n📋 Save this address in your .env files!\n");

  const backendMsmeId = process.env.BACKEND_MSME_ID || process.env.MSME_ID || "msme_001";

  const msmeParams = {
    firestoreId: backendMsmeId,
    totalTokenSupply: 100,
    tokensForSale: 3,
    tokenPriceWei: ethers.parseEther("0.025"), // ₹2,000 per token at ₹80/MATIC
    equityPercent: 20,                         // 20% equity offered overall
    deadlineTimestamp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
  };

  console.log("\n🧾 Registering sample MSME on-chain...");
  const registerTx = await token.registerMSME(
    msmeParams.firestoreId,
    msmeParams.totalTokenSupply,
    msmeParams.tokensForSale,
    msmeParams.tokenPriceWei,
    msmeParams.equityPercent,
    msmeParams.deadlineTimestamp
  );
  const registerReceipt = await registerTx.wait();
  const msmeRegisteredEvent = registerReceipt.events?.find((event) => event.event === "MSMERegistered");
  const registeredMsmeId = msmeRegisteredEvent ? msmeRegisteredEvent.args.msmeId.toString() : "1";
  const parsedOnChainId = Number(registeredMsmeId);

  console.log("✅ Sample MSME registered on-chain with msmeId:", registeredMsmeId);

  await patchBackendListing(contractAddress, msmeParams.firestoreId, Number.isInteger(parsedOnChainId) ? parsedOnChainId : null, deploymentTxHash);

  console.log("\n🔐 Approving deployer for KYC...");
  const kycTx = await token.approveKYC(deployer.address);
  await kycTx.wait();
  console.log("✅ KYC approved for:", deployer.address);

  console.log("\nAll done. Use this contract address and MSME ID in your frontend and backend config.");
  console.log("Backend MSME ID used for patch:", backendMsmeId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});