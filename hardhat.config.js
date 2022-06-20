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
    case 'rinkeby':
    case 'ethereum':
      return process.env.BLOCKCHAIN_ETHEREUM_SCANNER_KEY;
    case 'mumbai':
    case 'polygon':
      return process.env.BLOCKCHAIN_POLYGON_SCANNER_KEY;
    default:
      return '';
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
    mumbai: {
      url: "https://matic-mumbai.chainstacklabs.com",
      scanner: 'https://mumbai.polygonscan.com',
      accounts: [process.env.BLOCKCHAIN_MUMBAI_PRIVATE_KEY],
      contracts: {
        treasury: process.env.BLOCKCHAIN_MUMBAI_TREASURY_ADDRESS,
        token: process.env.BLOCKCHAIN_MUMBAI_ARKONIA_TOKEN_ADDRESS,
        vesting: process.env.BLOCKCHAIN_MUMBAI_ARKONIA_VESTING_ADDRESS,
        sale: process.env.BLOCKCHAIN_MUMBAI_ARKONIA_SALE_ADDRESS,
        arkonomy: process.env.BLOCKCHAIN_MUMBAI_ARKONONMY_ADDRESS,
        crystal: process.env.BLOCKCHAIN_MUMBAI_ARKON_CRYSTALS_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_MUMBAI_ARKONIAN_ADDRESS,
        store: process.env.BLOCKCHAIN_MUMBAI_ARK_STORE_ADDRESS,
        rewards: process.env.BLOCKCHAIN_MUMBAI_ARK_REWARDS_ADDRESS,
        chest: process.env.BLOCKCHAIN_MUMBAI_MYSTERY_CHEST_ADDRESS
      }
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      scanner: 'https://polygonscan.com',
      accounts: [process.env.BLOCKCHAIN_POLYGON_PRIVATE_KEY],
      contracts: {
        treasury: process.env.BLOCKCHAIN_POLYGON_TREASURY_ADDRESS,
        token: process.env.BLOCKCHAIN_POLYGON_ARKONIA_TOKEN_ADDRESS,
        vesting: process.env.BLOCKCHAIN_POLYGON_ARKONIA_VESTING_ADDRESS,
        sale: process.env.BLOCKCHAIN_POLYGON_ARKONIA_SALE_ADDRESS,
        arkonomy: process.env.BLOCKCHAIN_POLYGON_ARKONONMY_ADDRESS,
        crystal: process.env.BLOCKCHAIN_POLYGON_ARKON_CRYSTALS_ADDRESS,
        arkonian: process.env.BLOCKCHAIN_POLYGON_ARKONIAN_ADDRESS,
        store: process.env.BLOCKCHAIN_POLYGON_ARK_STORE_ADDRESS,
        rewards: process.env.BLOCKCHAIN_POLYGON_ARK_REWARDS_ADDRESS,
        chest: process.env.BLOCKCHAIN_POLYGON_MYSTERY_CHEST_ADDRESS
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
    tests: './tests',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 20000
  },
  gasReporter: {
    currency: 'USD',
    //token: 'BNB', //comment this out if you want ETH
    coinmarketcap: process.env.BLOCKCHAIN_CMC_KEY,
    gasPrice: 50
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: getApiKey()
  }
};
