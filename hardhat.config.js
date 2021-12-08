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
  defaultNetwork: process.env.NETWORK,
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
      accounts: [
        //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        //we are adding 4 more accounts that will be used in the deploy populate script
        //0x2546bcd3c84621e976d8185a91a922ae77ecec30
        'ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0',
        //0xbda5747bfd65f08deb54cb465eb87d40e51b197e
        '689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd',
        //0xdd2fd4581271e230360230f9337d5c0430bf44c0
        'de9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0',
        //0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199
        'df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e'
      ],
      contracts: [process.env.LOCALHOST_CONTRACT_ADDRESS]
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.MUMBAI_PRIVATE_KEY],
      contracts: [process.env.MUMBAI_CONTRACT_ADDRESS]
    },
    ropsten: {
      url: "https://eth-ropsten.alchemyapi.io/v2/YoNVLItXnYnhbJkzY9PMEAyOYn5dDGpn",
      accounts: [process.env.ROPSTEN_PRIVATE_KEY],
      contracts: [process.env.ROPSTEN_CONTRACT_ADDRESS]
    },
    polygon: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [process.env.POLYGON_PRIVATE_KEY],
      contracts: [process.env.POLYGON_CONTRACT_ADDRESS],
      gasPrice: 50000000000,//50 GWEI
      gasMultiplier: 2
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
    sources: "./src/contracts",
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
    coinmarketcap: process.env.CMC_KEY,
    gasPrice: 200,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: 'ABPFU2QY761DJ5GAE21SA5JST9FMSIQ35M'
  }
};
