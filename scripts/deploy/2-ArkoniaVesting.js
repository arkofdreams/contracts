//to run this on testnet:
// $ npx hardhat run scripts/deploy/2-ArkoniaVesting.js

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

async function main() {
  await hre.run('compile')
  //get network and admin
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const admin = new ethers.Wallet(network.accounts[0])
  const token = { address: network.contracts.token }

  console.log('Deploying ArkoniaVesting ...')
  const vesting = await deploy('ArkoniaVesting', token.address, admin.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('ArkoniaVesting deployed to:', vesting.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    vesting.address,
    `"${token.address}"`,
    `"${admin.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - ArkoniaVesting: VESTER_ROLE, PAUSER_ROLE')
  console.log('')
  console.log('Next Steps:')
  console.log('In ArkoniaToken contract, grant MINTER_ROLE to ArkoniaVesting')
  console.log(` - ${network.scanner}/address/${token.address}#writeContract`)
  console.log(` - grantRole( ${getRole('MINTER_ROLE')}, ${vesting.address} )`)
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});