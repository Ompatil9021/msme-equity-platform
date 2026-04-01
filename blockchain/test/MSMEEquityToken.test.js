const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MSMEEquityToken", function () {
  let token, owner, investor1, investor2;

  beforeEach(async function () {
    [owner, investor1, investor2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MSMEEquityToken");

    token = await Factory.deploy(
      "ChaiWala Token",            // 0: _name
      "CHAI",                      // 1: _symbol
      "msme_001",                  // 2: _msmeId
      "Mumbai Chai House",         // 3: _businessName
      "Food & Beverage",           // 4: _category
      "Mumbai",                    // 5: _city
      "27AABCU9603R1ZX",           // 6: _gstNumber
      ethers.parseEther("0.1"),    // 7: _targetAmountWei
      10,                          // 8: _equityPercentage
      ethers.parseEther("0.0001"), // 9: _tokenPriceWei
      1000,                        // 10: _totalTokensForSale
      6,                           // 11: _vestingMonths
      30,                          // 12: _fundingDays
      owner.address                // 13: _founder
    );
  });

  it("Should deploy with correct parameters", async function () {
    expect(await token.businessName()).to.equal("Mumbai Chai House");
    expect(await token.city()).to.equal("Mumbai");
    expect(await token.equityPercentage()).to.equal(10);
    expect(await token.totalTokensForSale()).to.equal(1000);
    console.log("    ✅ Deploy parameters correct");
  });

  it("Should approve KYC", async function () {
    await token.approveKYC(investor1.address);
    expect(await token.kycApproved(investor1.address)).to.be.true;
    console.log("    ✅ KYC approved");
  });

  it("Should allow KYC investor to buy tokens", async function () {
    await token.approveKYC(investor1.address);
    await token.connect(investor1).buyTokens({ value: ethers.parseEther("0.001") });
    const balance = await token.balanceOf(investor1.address);
    expect(balance).to.equal(ethers.parseEther("10"));
    console.log("    ✅ Bought 10 tokens successfully");
  });

  it("Should reject non-KYC investor", async function () {
    await expect(
      token.connect(investor2).buyTokens({ value: ethers.parseEther("0.001") })
    ).to.be.revertedWith("KYC not approved");
    console.log("    ✅ Non-KYC correctly rejected");
  });

  it("Should distribute dividends correctly", async function () {
    await token.approveKYC(investor1.address);
    await token.approveKYC(investor2.address);
    await token.connect(investor1).buyTokens({ value: ethers.parseEther("0.05") });
    await token.connect(investor2).buyTokens({ value: ethers.parseEther("0.05") });

    expect(await token.fundingSuccessful()).to.be.true;
    console.log("    ✅ Funding target reached");

    await token.depositDividends({ value: ethers.parseEther("0.01") });
    const pending = await token.pendingDividends(investor1.address);
    expect(pending).to.be.gt(0);
    console.log("    ✅ Dividends distributed");
  });

  it("Should allow refund if funding fails", async function () {
    await token.approveKYC(investor1.address);
    await token.connect(investor1).buyTokens({ value: ethers.parseEther("0.001") });

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await token.closeFundingAfterDeadline();
    expect(await token.fundingSuccessful()).to.be.false;

    const before = await ethers.provider.getBalance(investor1.address);
    await token.connect(investor1).claimRefund();
    const after = await ethers.provider.getBalance(investor1.address);
    expect(after).to.be.gt(before);
    console.log("    ✅ Refund claimed successfully");
  });

  it("Should create proposal and cast votes", async function () {
    await token.approveKYC(investor1.address);
    await token.approveKYC(investor2.address);
    await token.connect(investor1).buyTokens({ value: ethers.parseEther("0.05") });
    await token.connect(investor2).buyTokens({ value: ethers.parseEther("0.05") });

    await token.connect(investor1).createProposal("Expand to second location", 1);
    expect(await token.proposalCount()).to.equal(1);
    console.log("    ✅ Proposal created");

    await token.connect(investor1).castVote(1, true);
    await token.connect(investor2).castVote(1, false);
    const p = await token.proposals(1);
    expect(p.votesFor).to.be.gt(0);
    console.log("    ✅ Votes cast successfully");
  });
});