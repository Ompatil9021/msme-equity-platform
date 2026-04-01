// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MSMEEquityToken
 * @dev ERC-20 equity token for Indian MSME fundraising
 * HACKATHON PROTOTYPE — TESTNET ONLY — NOT A REAL SECURITIES OFFERING
 */
contract MSMEEquityToken is ERC20, Ownable, ReentrancyGuard, Pausable {

    // ============ STATE VARIABLES ============

    string public msmeId;           // Firebase MSME document ID
    string public businessName;
    string public category;
    string public city;
    string public gstNumber;

    uint256 public targetAmountWei;         // Target in wei (test MATIC)
    uint256 public equityPercentage;         // e.g., 10 = 10%
    uint256 public tokenPriceWei;            // Price per token in wei
    uint256 public totalTokensForSale;       // Total tokens offered
    uint256 public tokensSold;               // Tokens sold so far
    uint256 public raisedAmountWei;          // Total raised so far
    uint256 public vestingEndTime;           // Founder vesting end timestamp
    uint256 public fundingDeadline;          // Deadline for fundraising

    bool public fundingSuccessful;           // Did we hit target?
    bool public fundingClosed;               // Is fundraising closed?
    bool public dividendsEnabled;            // Can dividends be distributed?

    // ============ KYC WHITELIST ============
    mapping(address => bool) public kycApproved;
    mapping(address => uint256) public investmentAmount; // wei invested per investor
    mapping(address => bool) public hasRefunded;

    // ============ GOVERNANCE ============
    struct Proposal {
        uint256 id;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 endTime;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    // ============ DIVIDEND TRACKING ============
    uint256 public totalDividendsDeposited;
    mapping(address => uint256) public dividendsClaimed;
    uint256 public dividendPerToken; // cumulative dividends per token (scaled 1e18)

    // ============ EVENTS ============
    event KYCApproved(address indexed investor);
    event KYCRevoked(address indexed investor);
    event TokensPurchased(address indexed investor, uint256 tokens, uint256 amountPaid);
    event FundingSuccessful(uint256 totalRaised);
    event FundingFailed(uint256 totalRaised);
    event RefundClaimed(address indexed investor, uint256 amount);
    event DividendDeposited(uint256 amount, uint256 dividendPerToken);
    event DividendClaimed(address indexed investor, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    // ============ MODIFIERS ============
    modifier onlyKYCApproved() {
        require(kycApproved[msg.sender], "KYC not approved");
        _;
    }

    modifier fundingOpen() {
        require(!fundingClosed, "Funding is closed");
        require(block.timestamp < fundingDeadline, "Funding deadline passed");
        _;
    }

    modifier fundingMustBeSuccessful() {
        require(fundingSuccessful, "Funding was not successful");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _msmeId,
        string memory _businessName,
        string memory _category,
        string memory _city,
        string memory _gstNumber,
        uint256 _targetAmountWei,
        uint256 _equityPercentage,
        uint256 _tokenPriceWei,
        uint256 _totalTokensForSale,
        uint256 _vestingMonths,
        uint256 _fundingDays,
        address _founder
    ) ERC20(_name, _symbol) Ownable(_founder) {
        msmeId = _msmeId;
        businessName = _businessName;
        category = _category;
        city = _city;
        gstNumber = _gstNumber;
        targetAmountWei = _targetAmountWei;
        equityPercentage = _equityPercentage;
        tokenPriceWei = _tokenPriceWei;
        totalTokensForSale = _totalTokensForSale;

        vestingEndTime = block.timestamp + (_vestingMonths * 30 days);
        fundingDeadline = block.timestamp + (_fundingDays * 1 days);

        // Mint all tokens to this contract (for sale)
        _mint(address(this), _totalTokensForSale * 10**decimals());
        // Mint founder tokens (vested - held in contract)
        uint256 founderTokens = (_totalTokensForSale * (100 - _equityPercentage)) / _equityPercentage;
        _mint(address(this), founderTokens * 10**decimals());
    }

    // ============ KYC FUNCTIONS ============

    function approveKYC(address investor) external onlyOwner {
        kycApproved[investor] = true;
        emit KYCApproved(investor);
    }

    function approveKYCBatch(address[] calldata investors) external onlyOwner {
        for (uint256 i = 0; i < investors.length; i++) {
            kycApproved[investors[i]] = true;
            emit KYCApproved(investors[i]);
        }
    }

    function revokeKYC(address investor) external onlyOwner {
        kycApproved[investor] = false;
        emit KYCRevoked(investor);
    }

    // ============ TOKEN PURCHASE ============

    function buyTokens() external payable nonReentrant onlyKYCApproved fundingOpen whenNotPaused {
        require(msg.value >= tokenPriceWei, "Below minimum investment");

        uint256 tokensToBuy = msg.value / tokenPriceWei;
        require(tokensToBuy > 0, "Not enough MATIC for even 1 token");
        require(tokensSold + tokensToBuy <= totalTokensForSale, "Not enough tokens left");

        // Refund excess MATIC
        uint256 cost = tokensToBuy * tokenPriceWei;
        uint256 excess = msg.value - cost;

        tokensSold += tokensToBuy;
        raisedAmountWei += cost;
        investmentAmount[msg.sender] += cost;

        // Transfer tokens from contract to investor
        _transfer(address(this), msg.sender, tokensToBuy * 10**decimals());

        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit TokensPurchased(msg.sender, tokensToBuy, cost);

        // Check if target reached
        if (raisedAmountWei >= targetAmountWei) {
            _closeFundingSuccess();
        }
    }

    function _closeFundingSuccess() internal {
        fundingSuccessful = true;
        fundingClosed = true;
        dividendsEnabled = true;
        emit FundingSuccessful(raisedAmountWei);
    }

    function closeFundingAfterDeadline() external {
        require(block.timestamp >= fundingDeadline, "Deadline not reached");
        require(!fundingClosed, "Already closed");

        fundingClosed = true;
        if (raisedAmountWei >= targetAmountWei) {
            fundingSuccessful = true;
            dividendsEnabled = true;
            emit FundingSuccessful(raisedAmountWei);
        } else {
            fundingSuccessful = false;
            emit FundingFailed(raisedAmountWei);
        }
    }

    // ============ REFUND (if target not met) ============

    function claimRefund() external nonReentrant {
        require(fundingClosed, "Funding not closed yet");
        require(!fundingSuccessful, "Funding was successful, no refund");
        require(!hasRefunded[msg.sender], "Already refunded");
        require(investmentAmount[msg.sender] > 0, "No investment found");

        uint256 refundAmount = investmentAmount[msg.sender];
        uint256 userTokens = balanceOf(msg.sender);

        hasRefunded[msg.sender] = true;
        investmentAmount[msg.sender] = 0;

        // Burn their tokens
        if (userTokens > 0) {
            _burn(msg.sender, userTokens);
        }

        payable(msg.sender).transfer(refundAmount);
        emit RefundClaimed(msg.sender, refundAmount);
    }

    // ============ DIVIDEND DISTRIBUTION ============

    function depositDividends() external payable nonReentrant fundingMustBeSuccessful {
        require(msg.value > 0, "Must send MATIC for dividends");
        require(totalSupply() > 0, "No tokens in circulation");

        totalDividendsDeposited += msg.value;
        // Scale by 1e18 for precision
        dividendPerToken += (msg.value * 1e18) / totalSupply();

        emit DividendDeposited(msg.value, dividendPerToken);
    }

    function claimDividends() external nonReentrant fundingMustBeSuccessful {
        uint256 userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "No tokens held");

        uint256 owed = (userBalance * dividendPerToken) / 1e18;
        uint256 alreadyClaimed = dividendsClaimed[msg.sender];
        uint256 claimable = owed > alreadyClaimed ? owed - alreadyClaimed : 0;

        require(claimable > 0, "No dividends to claim");

        dividendsClaimed[msg.sender] = owed;
        payable(msg.sender).transfer(claimable);

        emit DividendClaimed(msg.sender, claimable);
    }

    function pendingDividends(address investor) external view returns (uint256) {
        uint256 userBalance = balanceOf(investor);
        if (userBalance == 0) return 0;
        uint256 owed = (userBalance * dividendPerToken) / 1e18;
        uint256 alreadyClaimed = dividendsClaimed[investor];
        return owed > alreadyClaimed ? owed - alreadyClaimed : 0;
    }

    // ============ GOVERNANCE ============

    function createProposal(string calldata description, uint256 votingDays)
        external
        fundingMustBeSuccessful
    {
        require(balanceOf(msg.sender) > 0, "Must hold tokens to propose");
        require(votingDays >= 1 && votingDays <= 30, "Voting: 1-30 days");

        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.id = proposalCount;
        p.description = description;
        p.endTime = block.timestamp + (votingDays * 1 days);
        p.executed = false;

        emit ProposalCreated(proposalCount, description, p.endTime);
    }

    function castVote(uint256 proposalId, bool support) external fundingMustBeSuccessful {
        require(balanceOf(msg.sender) > 0, "Must hold tokens to vote");
        Proposal storage p = proposals[proposalId];
        require(block.timestamp < p.endTime, "Voting period ended");
        require(!p.hasVoted[msg.sender], "Already voted");
        require(!p.executed, "Proposal already executed");

        uint256 weight = balanceOf(msg.sender);
        p.hasVoted[msg.sender] = true;

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.endTime, "Voting still active");
        require(!p.executed, "Already executed");

        p.executed = true;
        p.passed = p.votesFor > p.votesAgainst;

        emit ProposalExecuted(proposalId, p.passed);
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id, string memory description, uint256 votesFor,
        uint256 votesAgainst, uint256 endTime, bool executed, bool passed
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.id, p.description, p.votesFor, p.votesAgainst, p.endTime, p.executed, p.passed);
    }

    // ============ FOUNDER VESTING ============

    function withdrawFounderTokens() external onlyOwner {
        require(block.timestamp >= vestingEndTime, "Vesting period not ended");
        // Release founder tokens from contract to founder
        uint256 contractBalance = balanceOf(address(this));
        if (contractBalance > 0) {
            _transfer(address(this), owner(), contractBalance);
        }
    }

    // ============ OWNER WITHDRAW (after successful funding) ============

    function withdrawRaisedFunds() external onlyOwner nonReentrant fundingMustBeSuccessful {
        uint256 balance = address(this).balance;
        // Keep some MATIC for dividends gas
        require(balance > 0, "Nothing to withdraw");
        payable(owner()).transfer(balance);
    }

    // ============ VIEW FUNCTIONS ============

    function getFundingStatus() external view returns (
        uint256 raised, uint256 target, uint256 sold,
        uint256 totalForSale, bool closed, bool successful, uint256 deadline
    ) {
        return (raisedAmountWei, targetAmountWei, tokensSold,
                totalTokensForSale, fundingClosed, fundingSuccessful, fundingDeadline);
    }

    function getContractInfo() external view returns (
        string memory _msmeId, string memory _businessName,
        string memory _category, string memory _city,
        uint256 _equityPercentage, uint256 _tokenPriceWei
    ) {
        return (msmeId, businessName, category, city, equityPercentage, tokenPriceWei);
    }

    // ============ PAUSE (emergency) ============
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Allow contract to receive MATIC
    receive() external payable {}
}