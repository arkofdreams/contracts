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
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 4,
      scanner: 'https://rinkeby.etherscan.io',
      opensea: 'https://testnets.opensea.io',
      accounts: [process.env.BLOCKCHAIN_RINKEBY_PRIVATE_KEY],
      contracts: {
        token: '0x84C8a3F7ca005975C8303E5a9b6817Aaa29e732E',
        vesting: '0x251d30D2B81FDdd3e6BEA1F79726F391185bd2d0',
        sale: '0xd4A434D53ADD1c5107841D2D0AF942dc3067138c',
        usdc: '0x781f9c4193488d15435a3973676d033e5c713a9c'
      }
    },
    mumbai: {
      url: 'https://matic-mumbai.chainstacklabs.com',
      scanner: 'https://mumbai.polygonscan.com',
      accounts: [process.env.BLOCKCHAIN_MUMBAI_PRIVATE_KEY],
      contracts: {
        crystals: '0xf02270676e5f7f23980653610A45F68BA95AfA92',
        arkonian: '0x144208110AB962C16DCce4D69C22Af0bFC1EB2F2',
        store: '0x2d7e2eDeD73cF2955D3d30f7b09A092a3Ed30Ac8',
        rewards: '0xae616B8afE05107CEfac41958798e4F8548Fff38',
        chest: '0xA7E960c627fC8Db49B7151fD9F549BC15231EF4a'
      }
    },
    ethereum: {
      url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: 1,
      scanner: 'https://etherscan.io',
      opensea: 'https://opensea.io',
      accounts: [process.env.BLOCKCHAIN_ETHEREUM_PRIVATE_KEY],
      contracts: {
      }
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      scanner: 'https://polygonscan.com',
      accounts: [process.env.BLOCKCHAIN_POLYGON_PRIVATE_KEY],
      contracts: {
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
