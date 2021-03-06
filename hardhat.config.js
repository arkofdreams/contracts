require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: process.env.BLOCKCHAIN_NETWORK,
  networks: {
    hardhat: {
      chainId: 1337,
      mining: {
        //set this to false if you want localhost to mimick a real blockchain
        auto: true,
        interval: 5000
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.BLOCKCHAIN_LOCALHOST_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_LOCALHOST_FUND_ADDRESS
      },
      contracts: [
        process.env.BLOCKCHAIN_LOCALHOST_MYSTERY_CHEST_ADDRESS,
        process.env.BLOCKCHAIN_LOCALHOST_TOKEN_ADDRESS,
        process.env.BLOCKCHAIN_LOCALHOST_PRIVATE_SALE_ADDRESS,
        process.env.BLOCKCHAIN_LOCALHOST_PRE_SALE_ADDRESS,
        process.env.BLOCKCHAIN_LOCALHOST_MULTISIG_ADDRESS,
        process.env.BLOCKCHAIN_LOCALHOST_ARKONIANS_ADDRESS
      ]
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [process.env.BLOCKCHAIN_TESTNET_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_TESTNET_FUND_ADDRESS
      },
      contracts: [
        process.env.BLOCKCHAIN_TESTNET_MYSTERY_CHEST_ADDRESS,
        process.env.BLOCKCHAIN_TESTNET_TOKEN_ADDRESS,
        process.env.BLOCKCHAIN_TESTNET_PRIVATE_SALE_ADDRESS,
        process.env.BLOCKCHAIN_TESTNET_PRE_SALE_ADDRESS,
        process.env.BLOCKCHAIN_TESTNET_MULTISIG_ADDRESS,
        process.env.BLOCKCHAIN_TESTNET_ARKONIANS_ADDRESS
      ]
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: [process.env.BLOCKCHAIN_MAINNET_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_MAINNET_FUND_ADDRESS
      },
      contracts: [
        process.env.BLOCKCHAIN_MAINNET_MYSTERY_CHEST_ADDRESS,
        process.env.BLOCKCHAIN_MAINNET_TOKEN_ADDRESS,
        process.env.BLOCKCHAIN_MAINNET_PRIVATE_SALE_ADDRESS,
        process.env.BLOCKCHAIN_MAINNET_PRE_SALE_ADDRESS,
        process.env.BLOCKCHAIN_MAINNET_MULTISIG_ADDRESS,
        process.env.BLOCKCHAIN_MAINNET_ARKONIANS_ADDRESS
      ]
    },
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  },
  gasReporter: {
    currency: 'USD',
    token: 'BNB', //comment this out if you want ETH
    coinmarketcap: process.env.BLOCKCHAIN_CMC_KEY,
    gasPrice: 200,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.BLOCKCHAIN_SCANNER_KEY
  }
};
