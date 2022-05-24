//to run this on testnet:
// $ npx hardhat run scripts/deploy/8-MysteryChest.js

const hardhat = require('hardhat')

async function deploy(name, ...params) {
  //deploy the contract
  const ContractFactory = await ethers.getContractFactory(name)
  const contract = await ContractFactory.deploy(...params)
  await contract.deployed()

  return contract
}

const contractURI = 'ipfs://QmTgfQvcgndBERCrhkQpcJp2YJKR7A8qBKEEZoGMSJ47Yk'
const fixedURI = 'ipfs://QmQEZo9zozz2achM9EF3qX8wYGiC6YBtswio2uwa7dTBum'

async function main() {
  await hre.run('compile')
  //get network and admin
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const admin = new ethers.Wallet(network.accounts[0])

  console.log('Deploying MysteryChest ...')
  const chest = await deploy('MysteryChest', contractURI, fixedURI, admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('MysteryChest deployed to:', chest.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    chest.address,
    `"${contractURI}"`,
    `"${fixedURI}"`,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - MysteryChest: MINTER_ROLE, PAUSER_ROLE')
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});