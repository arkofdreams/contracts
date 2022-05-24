//to run this on testnet:
// $ npx hardhat run scripts/deploy/4-ArkonCrystals.js

const hardhat = require('hardhat')

async function deploy(name, ...params) {
  //deploy the contract
  const ContractFactory = await ethers.getContractFactory(name)
  const contract = await ContractFactory.deploy(...params)
  await contract.deployed()

  return contract
}

async function main() {
  await hre.run('compile')
  //get network and admin
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const admin = new ethers.Wallet(network.accounts[0])

  console.log('Deploying ArkonCrystals ...')
  const token = await deploy('ArkonCrystals', admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('ArkonCrystals deployed to:', token.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    token.address,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - ArkonCrystals: MINTER_ROLE, BURNER_ROLE, PAUSER_ROLE')
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});