// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MSMEEquityToken
 * @dev Platform token contract for MSME share tokenisation and sale.
 */
contract MSMEEquityToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant MIN_INVESTMENT_WEI = 1.25 ether; // ₹100 at ₹80 per MATIC
    uint256 public msmeCount;

    struct MSMEListing {
        string firestoreId;
        address founder;
        uint256 companyValuationWei;
        uint256 totalTokenSupply;
        uint256 tokensForSale;
        uint256 tokensSold;
        uint256 tokenPriceWei;
        uint256 equityPercent;
        uint256 deadline;
        bool fundingClosed;
        bool targetReached;
        uint256 amountRaisedWei;
    }

    mapping(uint256 => MSMEListing) public listings;
    mapping(uint256 => mapping(address => uint256)) public tokenBalance;
    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public vestingEnd;
    mapping(address => uint256) public vestedTokens;

    event KYCApproved(address indexed investor);
    event KYCRevoked(address indexed investor);
    event MSMERegistered(uint256 indexed msmeId, address indexed founder, string firestoreId);
    event TokensPurchased(uint256 indexed msmeId, address indexed investor, uint256 tokenCount, uint256 amountPaid);
    event FounderPayout(uint256 indexed msmeId, address indexed founder, uint256 amountPaidWei);
    event FundingCompleted(uint256 indexed msmeId, uint256 tokensSold, uint256 amountRaisedWei);
    event FundingFailed(uint256 indexed msmeId, uint256 amountRaisedWei);
    event MoreTokensListed(uint256 indexed msmeId, uint256 additionalTokens);
    event VestedTokensClaimed(address indexed founder, uint256 amount);

    modifier onlyWhitelisted() {
        require(whitelisted[msg.sender], "KYC not approved");
        _;
    }

    modifier msmeExists(uint256 msmeId) {
        require(msmeId > 0 && msmeId <= msmeCount, "MSME not found");
        _;
    }

    modifier fundingOpen(uint256 msmeId) {
        MSMEListing storage listing = listings[msmeId];
        require(!listing.fundingClosed, "Funding closed");
        require(block.timestamp < listing.deadline, "Funding deadline passed");
        _;
    }

    modifier onlyFundingSuccessful(uint256 msmeId) {
        require(listings[msmeId].targetReached, "Funding not successful");
        _;
    }

    constructor() ERC20("MSME Equity Token", "MSME") Ownable(msg.sender) {
        // Platform ERC20 for MSME share tokens.
    }

    function approveKYC(address investor) external onlyOwner {
        whitelisted[investor] = true;
        emit KYCApproved(investor);
    }

    function revokeKYC(address investor) external onlyOwner {
        whitelisted[investor] = false;
        emit KYCRevoked(investor);
    }

    function registerMSME(
        string calldata firestoreId,
        uint256 totalTokenSupply,
        uint256 tokensForSale,
        uint256 tokenPriceWei,
        uint256 equityPercent,
        uint256 deadlineTimestamp
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(bytes(firestoreId).length > 0, "Firestore ID required");
        require(totalTokenSupply >= 10 && totalTokenSupply <= 10000, "Total tokens must be 10-10000");
        require(tokensForSale > 0 && tokensForSale <= totalTokenSupply, "Sell between 1 and total supply");
        require(equityPercent >= 1 && equityPercent <= 20, "Equity must be 1-20%");
        require(tokenPriceWei > 0, "Token price required");
        require(deadlineTimestamp > block.timestamp + 1 days, "Deadline must be at least 24h away");

        msmeCount++;
        MSMEListing storage listing = listings[msmeCount];
        listing.firestoreId = firestoreId;
        listing.founder = msg.sender;
        listing.companyValuationWei = (tokenPriceWei * totalTokenSupply * 100) / equityPercent;
        listing.totalTokenSupply = totalTokenSupply;
        listing.tokensForSale = tokensForSale;
        listing.tokensSold = 0;
        listing.tokenPriceWei = tokenPriceWei;
        listing.equityPercent = equityPercent;
        listing.deadline = deadlineTimestamp;
        listing.fundingClosed = false;
        listing.targetReached = false;
        listing.amountRaisedWei = 0;

        uint256 founderTokens = totalTokenSupply - tokensForSale;
        vestedTokens[msg.sender] = founderTokens;
        vestingEnd[msg.sender] = block.timestamp + 180 days;
        _mint(address(this), founderTokens * 10**decimals());

        emit MSMERegistered(msmeCount, msg.sender, firestoreId);
        return msmeCount;
    }

    function buyTokens(uint256 msmeId, uint256 tokenCount) external payable whenNotPaused nonReentrant onlyWhitelisted msmeExists(msmeId) fundingOpen(msmeId) {
        require(tokenCount > 0, "Buy at least 1 token");

        MSMEListing storage listing = listings[msmeId];
        uint256 available = listing.tokensForSale - listing.tokensSold;
        require(tokenCount <= available, "Only the available tokens can be bought");

        uint256 totalCost = tokenCount * listing.tokenPriceWei;
        require(msg.value >= totalCost, "Insufficient payment");

        listing.tokensSold += tokenCount;
        listing.amountRaisedWei += totalCost;
        tokenBalance[msmeId][msg.sender] += tokenCount;
        _mint(msg.sender, tokenCount * 10**decimals());

        // Send proceeds directly to founder wallet on each purchase.
        (bool founderPaid, ) = payable(listing.founder).call{value: totalCost}("");
        require(founderPaid, "Founder payout failed");
        emit FounderPayout(msmeId, listing.founder, totalCost);

        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit TokensPurchased(msmeId, msg.sender, tokenCount, totalCost);

        if (listing.tokensSold >= listing.tokensForSale) {
            listing.fundingClosed = true;
            listing.targetReached = true;
            emit FundingCompleted(msmeId, listing.tokensSold, listing.amountRaisedWei);
        }
    }

    function listMoreTokens(uint256 msmeId, uint256 additionalTokens) external msmeExists(msmeId) nonReentrant {
        MSMEListing storage listing = listings[msmeId];
        require(msg.sender == listing.founder, "Only founder can list more tokens");
        require(additionalTokens > 0, "Add at least 1 token");
        require(listing.tokensForSale + additionalTokens <= listing.totalTokenSupply, "Cannot exceed total supply");

        listing.tokensForSale += additionalTokens;
        listing.fundingClosed = false;
        emit MoreTokensListed(msmeId, additionalTokens);
    }

    function getAvailableTokens(uint256 msmeId) external view msmeExists(msmeId) returns (uint256) {
        MSMEListing storage listing = listings[msmeId];
        return listing.tokensForSale - listing.tokensSold;
    }

    function getInvestorTokens(uint256 msmeId, address investor) external view msmeExists(msmeId) returns (uint256) {
        return tokenBalance[msmeId][investor];
    }

    function getTokenPrice(uint256 msmeId) external view msmeExists(msmeId) returns (uint256) {
        return listings[msmeId].tokenPriceWei;
    }

    function getListingDetails(uint256 msmeId)
        external
        view
        msmeExists(msmeId)
        returns (
            string memory firestoreId,
            address founder,
            uint256 companyValuationWei,
            uint256 totalTokenSupply,
            uint256 tokensForSale,
            uint256 tokensSold,
            uint256 tokenPriceWei,
            uint256 equityPercent,
            uint256 deadline,
            bool fundingClosed,
            bool targetReached,
            uint256 amountRaisedWei
        )
    {
        MSMEListing storage listing = listings[msmeId];
        return (
            listing.firestoreId,
            listing.founder,
            listing.companyValuationWei,
            listing.totalTokenSupply,
            listing.tokensForSale,
            listing.tokensSold,
            listing.tokenPriceWei,
            listing.equityPercent,
            listing.deadline,
            listing.fundingClosed,
            listing.targetReached,
            listing.amountRaisedWei
        );
    }

    function claimVestedTokens() external nonReentrant {
        require(block.timestamp >= vestingEnd[msg.sender], "Still locked");
        uint256 amount = vestedTokens[msg.sender];
        require(amount > 0, "Nothing to claim");

        vestedTokens[msg.sender] = 0;
        vestingEnd[msg.sender] = 0;
        _transfer(address(this), msg.sender, amount * 10**decimals());

        emit VestedTokensClaimed(msg.sender, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}
