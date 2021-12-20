//to run this on testnet:
// $ npx hardhat run scripts/AODToken/testnet/deploy.js

const hardhat = require('hardhat')

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(
    ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 
    'hex'
  ).toString('hex')

}

async function deploy(...args) {
  const TokenSale = await hardhat.ethers.getContractFactory('AODTestnetSale')
  const sale = await TokenSale.deploy(...args)
  await sale.deployed()

  console.log('Token Sale contract deployed to (update .env):', sale.address)
  console.log('Token Sale args:', args)

  return sale;
}

async function grant(role, aod, sale, provider) {
  const gasPrice = (await provider.getGasPrice()).mul(5).toString(); //wei
  const GgasPrice = Math.ceil(parseInt(gasPrice) / 1000000000)
  const gasLimit = Math.floor(GgasPrice * 21000)

  const tx = await aod.grantRole(
    getRole(role), 
    sale.address, 
    { gasPrice, gasLimit }
  )
  console.log('Granting', role, tx)
  await tx.wait()
}

async function main() {
  await hre.run('compile')

  if (hardhat.config.defaultNetwork != 'testnet') {
    console.error('This script can only run in testnet')
    process.exit(1);
  }

  const network = hardhat.config.networks[hardhat.config.defaultNetwork]

  const now = Math.floor(Date.now() / 1000)

  const sale = await deploy(
    network.contracts[1], //aod
    '0x8301f2213c0eed49a7e28ae4c3e91722919b8b47', //busd
    '0xf036E404a2780fa46958e4a131d3B67855d3cA11', //fund wallet
    now + (60 * 10), //start
    now + (60 * 20), //end
    60 * 10,
    now + (60 * 60), //vested
  )

  const provider = new hardhat.ethers.providers.JsonRpcProvider(network.url)
  const Token = await hardhat.ethers.getContractFactory('AODTestnetSale')
  const token = await Token.attach(network.contracts[1])

  await grant('MINTER_ROLE', token, sale, provider)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});
