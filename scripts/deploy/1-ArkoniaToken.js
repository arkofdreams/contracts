//to run this on testnet:
// $ npx hardhat run scripts/deploy/1-ArkoniaToken.js

const hardhat = require('hardhat')
const { getImplementationAddress } = require('@openzeppelin/upgrades-core')

async function deployProxy(name, ...params) {
  const factory = await ethers.getContractFactory(name);
  const contract = await upgrades.deployProxy(factory, [...params], {
    kind: 'uups'
  });

  await contract.deployed();

  return contract;
}

async function main() {
  await hre.run('compile')
  //get network and admin
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const provider = new hardhat.ethers.providers.JsonRpcProvider(network.url)
  const admin = new ethers.Wallet(network.accounts[0])

  console.log('Deploying ArkoniaToken ...')
  const token = await deployProxy('ArkoniaToken', admin.address)
  const tokenAddress = await getImplementationAddress(provider, token.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('ArkoniaToken deployed to:', token.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    tokenAddress,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - ArkoniaToken: MINTER_ROLE, PAUSER_ROLE')
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});