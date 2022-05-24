//to run this on testnet:
// $ npx hardhat run scripts/deploy/3-ArkoniaSale.js

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
  const token = { address: network.contracts.token }
  const vesting = { address: network.contracts.vesting }

  console.log('Deploying ArkoniaSale ...')
  const sale = await deploy('ArkoniaSale', token.address, vesting.address)

  console.log('')
  console.log('-----------------------------------')
  console.log('ArkoniaSale deployed to:', sale.address)
  console.log(
    'npx hardhat verify --show-stack-traces --network',
    hardhat.config.defaultNetwork,
    sale.address,
    `"${token.address}"`,
    `"${vesting.address}"`
  )
  console.log('')
  console.log('-----------------------------------')
  console.log('Roles:')
  console.log(' - ArkoniaSale: Ownable (should pass on)')
  console.log('')
  console.log('Next Steps:')
  console.log('In ArkoniaVesting contract, grant VESTER_ROLE to ArkoniaSale')
  console.log(` - ${network.scanner}/address/${vesting.address}#writeContract`)
  console.log(` - grantRole( ${getRole('VESTER_ROLE')}, ${sale.address} )`)
  console.log('')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});