const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Example MSME — change these values per MSME listing
  const params = {
    name: "ChaiWala Token",
    symbol: "CHAI",
    msmeId: "msme_001",
    businessName: "Mumbai Chai House",
    category: "Food & Beverage",
    city: "Mumbai",
    gstNumber: "27AABCU9603R1ZX",
    targetAmountWei: ethers.parseEther("0.1"),   // 0.1 test MATIC = demo target
    equityPercentage: 10,                          // 10% equity offered
    tokenPriceWei: ethers.parseEther("0.0001"),   // 0.0001 MATIC per token (~₹100)
    totalTokensForSale: 1000,                      // 1000 tokens for sale
    vestingMonths: 6,                              // 6 month founder vesting
    fundingDays: 30,                               // 30 days to raise
    founder: deployer.address,
  };

  console.log("\n📦 Deploying MSMEEquityToken...");
  const MSMEEquityToken = await ethers.getContractFactory("MSMEEquityToken");

  const token = await MSMEEquityToken.deploy(
    params.name, params.symbol, params.msmeId,
    params.businessName, params.category, params.city, params.gstNumber,
    params.targetAmountWei, params.equityPercentage, params.tokenPriceWei,
    params.totalTokensForSale, params.vestingMonths, params.fundingDays,
    params.founder
  );

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("\n✅ MSMEEquityToken deployed!");
  console.log("📍 Contract Address:", address);
  console.log("🔗 Polygonscan:", `https://mumbai.polygonscan.com/address/${address}`);
  console.log("\n📋 Save this address in your .env files!\n");

  // Auto-approve deployer for KYC demo
  console.log("🔐 Approving deployer for KYC...");
  const tx = await token.approveKYC(deployer.address);
  await tx.wait();
  console.log("✅ KYC approved for:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});