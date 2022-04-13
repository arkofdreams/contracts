require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Get API key based on the BLOCKCHAIN_NETWORK in the .env file
function getApiKey() {
  switch (process.env.BLOCKCHAIN_NETWORK) {
    case "testnet":
    case "mainnet":
      return process.env.BLOCKCHAIN_SCANNER_KEY;
    case "mumbai":
    case "polygon":
      return process.env.BLOCKCHAIN_POLYGONSCAN_API_KEY;
    default:
      return "";
  }
}

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
        // Set this to false if you want localhost to mimick a real blockchain
        auto: true,
        interval: 5000
      },
      // We have to set this before all event dates e.g. private sale, presale
      initialDate: new Date('January 1, 2021 00:00:00').toString()
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: [process.env.BLOCKCHAIN_LOCALHOST_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_LOCALHOST_FUND_ADDRESS
      },
      contracts: {
        mysteryChest: process.env.BLOCKCHAIN_LOCALHOST_MYSTERY_CHEST_ADDRESS,
        token: process.env.BLOCKCHAIN_LOCALHOST_TOKEN_ADDRESS,
        privateSale: process.env.BLOCKCHAIN_LOCALHOST_PRIVATE_SALE_ADDRESS,
        preSale: process.env.BLOCKCHAIN_LOCALHOST_PRE_SALE_ADDRESS,
        multisig: process.env.BLOCKCHAIN_LOCALHOST_MULTISIG_ADDRESS,
        team: process.env.BLOCKCHAIN_LOCALHOST_TEAM_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_LOCALHOST_ARKONIAN_ADDRESS
      }
    },
    testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: [process.env.BLOCKCHAIN_TESTNET_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_TESTNET_FUND_ADDRESS
      },
      contracts: {
        mysteryChest: process.env.BLOCKCHAIN_TESTNET_MYSTERY_CHEST_ADDRESS,
        token: process.env.BLOCKCHAIN_TESTNET_TOKEN_ADDRESS,
        privateSale: process.env.BLOCKCHAIN_TESTNET_PRIVATE_SALE_ADDRESS,
        preSale: process.env.BLOCKCHAIN_TESTNET_PRE_SALE_ADDRESS,
        multisig: process.env.BLOCKCHAIN_TESTNET_MULTISIG_ADDRESS,
        team: process.env.BLOCKCHAIN_TESTNET_TEAM_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_TESTNET_ARKONIAN_ADDRESS
      }
    },
    mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [process.env.BLOCKCHAIN_MAINNET_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_MAINNET_FUND_ADDRESS
      },
      contracts: {
        mysteryChest: process.env.BLOCKCHAIN_MAINNET_MYSTERY_CHEST_ADDRESS,
        token: process.env.BLOCKCHAIN_MAINNET_TOKEN_ADDRESS,
        privateSale: process.env.BLOCKCHAIN_MAINNET_PRIVATE_SALE_ADDRESS,
        preSale: process.env.BLOCKCHAIN_MAINNET_PRE_SALE_ADDRESS,
        multisig: process.env.BLOCKCHAIN_MAINNET_MULTISIG_ADDRESS,
        team: process.env.BLOCKCHAIN_MAINNET_TEAM_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_MAINNET_ARKONIAN_ADDRESS
      }
    },
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com/v1/' + process.env.BLOCKCHAIN_MATIC_RPC_API_KEY,
      accounts: [process.env.BLOCKCHAIN_MUMBAI_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_MUMBAI_FUND_ADDRESS
      },
      contracts: {
        mysteryChest: process.env.BLOCKCHAIN_MUMBAI_MYSTERY_CHEST_ADDRESS,
        token: process.env.BLOCKCHAIN_MUMBAI_TOKEN_ADDRESS,
        privateSale: process.env.BLOCKCHAIN_MUMBAI_PRIVATE_SALE_ADDRESS,
        preSale: process.env.BLOCKCHAIN_MUMBAI_PRE_SALE_ADDRESS,
        multisig: process.env.BLOCKCHAIN_MUMBAI_MULTISIG_ADDRESS,
        team: process.env.BLOCKCHAIN_MUMBAI_TEAM_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_MUMBAI_ARKONIAN_ADDRESS
      }
    },
    polygon: {
      url: 'https://rpc-mainnet.maticvigil.com/v1/' + process.env.BLOCKCHAIN_MATIC_RPC_API_KEY,
      accounts: [process.env.BLOCKCHAIN_POLYGON_PRIVATE_KEY],
      wallets: {
        fund: process.env.BLOCKCHAIN_POLYGON_FUND_ADDRESS
      },
      contracts: {
        mysteryChest: process.env.BLOCKCHAIN_POLYGON_MYSTERY_CHEST_ADDRESS,
        token: process.env.BLOCKCHAIN_POLYGON_TOKEN_ADDRESS,
        privateSale: process.env.BLOCKCHAIN_POLYGON_PRIVATE_SALE_ADDRESS,
        preSale: process.env.BLOCKCHAIN_POLYGON_PRE_SALE_ADDRESS,
        multisig: process.env.BLOCKCHAIN_POLYGON_MULTISIG_ADDRESS,
        team: process.env.BLOCKCHAIN_POLYGON_TEAM_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_POLYGON_ARKONIAN_ADDRESS
      }
    }
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 20000
  },
  gasReporter: {
    currency: 'USD',
    token: 'BNB', //comment this out if you want ETH
    coinmarketcap: process.env.BLOCKCHAIN_CMC_KEY,
    gasPrice: 200
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: getApiKey(),
  }
};
