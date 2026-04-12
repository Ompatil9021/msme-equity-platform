require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const mumbaiRpcUrl = process.env.POLYGON_MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";
const mumbaiAccounts = deployerPrivateKey ? [deployerPrivateKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    mumbai: {
      url: mumbaiRpcUrl,
      accounts: mumbaiAccounts,
      chainId: 80001,
    }
  }
};