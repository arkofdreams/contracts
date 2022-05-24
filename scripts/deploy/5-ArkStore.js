//to run this on testnet:
// $ npx hardhat run scripts/deploy/5-ArkStore.js

const hardhat = require('hardhat')

async function deploy(name, ...params) {
  //deploy the contract
  const ContractFactory = await ethers.getContractFactory(name)
  const contract = await ContractFactory.deploy(...params)
  await contract.deployed()

  return contract
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(
    ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 
    'hex'
  ).toString('hex')
}

const contractURI = 'ipfs://QmdJtLY2wRsTRFDCgTqw2hyospVYk91QqpWR9C7eBDTckU'
const baseURI = 'https://www.arkofdreams.io/data/store/'

async function main() {
  await hre.run('compile')
  //get network and admin
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const admin = new ethers.Wallet(network.accounts[0])
  const crystals = { address: network.contracts.crystal }

  console.log('Deploying ArkStore ...')
  const store = await deploy('ArkStore', contractURI, baseURI, admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('ArkStore deployed to:', store.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    store.address,
    `"${contractURI}"`,
    `"${baseURI}"`,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - ArkStore: MINTER_ROLE, CURATOR_ROLE, FUNDER_ROLE, PAUSER_ROLE')
  console.log('')
  console.log('-----------------------------------')
  console.log('Next Steps:')
  console.log('In ArkonCrystals contract, grant BURNER_ROLE to ArkStore')
  console.log(` - ${network.scanner}/address/${crystals.address}#writeContract`)
  console.log(` - grantRole( ${getRole('BURNER_ROLE')}, ${store.address} )`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});