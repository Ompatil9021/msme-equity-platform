const { getDb } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// POST /api/investor/kyc — Submit mock KYC
const submitKYC = async (req, res) => {
  try {
    const db = getDb();
    const { walletAddress, fullName, panNumber, aadhaarLast4, email } = req.body;

    const wallet = walletAddress.toLowerCase();
    const kycId = `kyc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    // Check if already submitted
    const existing = await db.collection('kyc_records').doc(wallet).get();
    if (existing.exists && existing.data().status === 'approved') {
      return res.json({
        success: true,
        message: 'KYC already approved',
        data: { kycStatus: 'approved', walletAddress: wallet }
      });
    }

    const kycData = {
      kycId,
      walletAddress: wallet,
      fullName: fullName.trim(),
      panLast4: panNumber.slice(-4),        // Store only last 4 digits
      aadhaarLast4,
      email: email?.trim() || '',
      status: 'approved',                    // AUTO-APPROVE for MVP (mock KYC)
      submittedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      note: 'MOCK KYC — Hackathon prototype only. Real KYC requires SEBI-compliant verification.'
    };

    await db.collection('kyc_records').doc(wallet).set(kycData);

    res.status(201).json({
      success: true,
      message: 'Mock KYC approved successfully',
      data: { kycStatus: 'approved', walletAddress: wallet, kycId }
    });
  } catch (err) {
    console.error('submitKYC error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/investor/kyc/:wallet — Check KYC status
const getKYCStatus = async (req, res) => {
  try {
    const db = getDb();
    const wallet = req.params.wallet.toLowerCase();
    const doc = await db.collection('kyc_records').doc(wallet).get();

    if (!doc.exists) {
      return res.json({
        success: true,
        data: { kycStatus: 'not_submitted', walletAddress: wallet }
      });
    }

    const data = doc.data();
    res.json({
      success: true,
      data: { kycStatus: data.status, walletAddress: wallet, kycId: data.kycId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/investor/transaction — Record a blockchain transaction
const recordTransaction = async (req, res) => {
  try {
    const db = getDb();
    const {
      txHash, walletAddress, msmeId, contractAddress,
      type,  // 'buy_tokens' | 'claim_dividend' | 'vote' | 'refund'
      amount, tokens
    } = req.body;

    const txId = `tx_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const txData = {
      txId, txHash,
      walletAddress: walletAddress.toLowerCase(),
      msmeId, contractAddress,
      type, amount: parseFloat(amount) || 0,
      tokens: parseFloat(tokens) || 0,
      polygonscanUrl: `https://mumbai.polygonscan.com/tx/${txHash}`,
      createdAt: new Date().toISOString(),
    };

    await db.collection('transactions').doc(txId).set(txData);

    res.status(201).json({ success: true, data: txData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/investor/portfolio/:wallet — Get investor portfolio
const getPortfolio = async (req, res) => {
  try {
    const db = getDb();
    const wallet = req.params.wallet.toLowerCase();

    const txSnapshot = await db.collection('transactions')
      .where('walletAddress', '==', wallet)
      .orderBy('createdAt', 'desc')
      .get();

    const transactions = txSnapshot.docs.map(d => d.data());

    // Group by MSME
    const holdings = {};
    for (const tx of transactions) {
      if (!holdings[tx.msmeId]) {
        holdings[tx.msmeId] = {
          msmeId: tx.msmeId,
          contractAddress: tx.contractAddress,
          tokensHeld: 0,
          totalInvested: 0,
          dividendsReceived: 0,
          tokenPrice: 0,
          currentValue: 0,
          transactions: []
        };
      }

      if (tx.type === 'buy_tokens') {
        holdings[tx.msmeId].tokensHeld += tx.tokens;
        holdings[tx.msmeId].totalInvested += tx.amount;

        const txTokenPrice = tx.tokens > 0 ? (tx.amount / tx.tokens) : 0;
        if (txTokenPrice > 0) {
          holdings[tx.msmeId].tokenPrice = txTokenPrice;
        }
      }

      if (tx.type === 'claim_dividend') {
        holdings[tx.msmeId].dividendsReceived += tx.amount;
      }

      holdings[tx.msmeId].transactions.push(tx);
    }

    for (const holding of Object.values(holdings)) {
      if (holding.tokensHeld > 0 && holding.tokenPrice > 0) {
        holding.currentValue = holding.tokensHeld * holding.tokenPrice;
      }
    }

    res.json({
      success: true,
      data: {
        walletAddress: wallet,
        totalInvestments: Object.keys(holdings).length,
        holdings: Object.values(holdings),
        allTransactions: transactions,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { submitKYC, getKYCStatus, recordTransaction, getPortfolio };