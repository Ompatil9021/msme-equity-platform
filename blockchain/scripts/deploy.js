const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  console.log("\n📦 Deploying MSMEEquityToken contract...");
  const MSMEEquityToken = await ethers.getContractFactory("MSMEEquityToken");
  const token = await MSMEEquityToken.deploy();
  await token.waitForDeployment();
  const contractAddress = await token.getAddress();

  console.log("\n✅ MSMEEquityToken deployed!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Polygonscan:", `https://mumbai.polygonscan.com/address/${contractAddress}`);
  console.log("\n📋 Save this address in your .env files!\n");

  const msmeParams = {
    firestoreId: "msme_001",
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

  console.log("✅ Sample MSME registered on-chain with msmeId:", registeredMsmeId);

  console.log("\n🔐 Approving deployer for KYC...");
  const kycTx = await token.approveKYC(deployer.address);
  await kycTx.wait();
  console.log("✅ KYC approved for:", deployer.address);

  console.log("\nAll done. Use this contract address and sample MSME ID in your frontend and backend config.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});