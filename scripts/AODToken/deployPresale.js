//to run this on testnet:
// $ npx hardhat run scripts/AODToken/deployPresale.js

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

async function deploy(aod, busd, fund) {
  const TokenSale = await hardhat.ethers.getContractFactory('AODPresale')
  const sale = await TokenSale.deploy(aod, busd, fund)
  await sale.deployed()

  console.log('Token Sale contract deployed to (update .env):', sale.address)

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

  const network = hardhat.config.networks[hardhat.config.defaultNetwork]

  const sale = await deploy(
    network.contracts[1], //aod
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', //busd
    network.contracts[4] //fund
  )

  const provider = new hardhat.ethers.providers.JsonRpcProvider(network.url)
  const Token = await hardhat.ethers.getContractFactory('AODPresale')
  const token = await Token.attach(network.contracts[1])

  await grant('MINTER_ROLE', token, sale, provider)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});
