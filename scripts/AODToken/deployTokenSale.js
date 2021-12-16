//to run this on testnet:
// $ npx hardhat run scripts/AODToken/deployTokenSale.js

const hardhat = require('hardhat')

const cap = ethers.utils.parseEther('1000000000')

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
  const TokenSale = await hardhat.ethers.getContractFactory('AODTokenSale')
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

async function addStage(sale, info, provider) {
  const gasPrice = (await provider.getGasPrice()).mul(5).toString(); //wei
  const GgasPrice = Math.ceil(parseInt(gasPrice) / 1000000000)
  const gasLimit = Math.floor(GgasPrice * 21000)

  const {
    startDate,
    releasePeriod,
    vestedPeriod,
    BUSDcostPerAOD,
    totalAllocation
  } = info

  const start = Math.floor((new Date(startDate)).getTime() / 1000)
  const costPer = hardhat.ethers.utils.parseEther(String(BUSDcostPerAOD))
  let total;
  if (totalAllocation < 1) {
    total = cap.mul(totalAllocation * 100).div(100)
  } else {
    total = hardhat.ethers.utils.parseEther(String(totalAllocation))
  }

  const tx = await sale.add(
    start,
    releasePeriod,
    vestedPeriod,
    costPer,
    total,
    { gasPrice, gasLimit }
  )

  console.log('Adding sale stage on', start.toString(), tx)
  await tx.wait()
}

async function main() {
  await hre.run('compile')
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const provider = new hardhat.ethers.providers.JsonRpcProvider(network.url)
  const Token = await hardhat.ethers.getContractFactory('AODToken')
  const token = await Token.attach(network.contracts[1])

  const sale = await deploy(
    network.contracts[1], 
    network.contracts[2], 
    network.wallet.fund
  )

  await grant('MINTER_ROLE', token, sale, provider)
  await grant('DEFAULT_ADMIN_ROLE', token, sale, provider)

  await addStage(sale, {
    label: 'Private Sale',
    startDate: 'Dec 18, 2021 00:00:00',
    releasePeriod: 60 * 60 * 24 * 30 * 6, //6 mon
    vestedPeriod: 60 * 60 * 24 * 30 * 30, //2.5 yrs
    BUSDcostPerAOD: 0.05, //0.05 BUSD
    totalAllocation: 0.05 //5% of 1 billion
  }, provider)

  await addStage(sale, {
    label: 'Presale Sale',
    startDate: 'January 01, 2022 00:00:00',
    releasePeriod: 60 * 60 * 24 * 30 * 6, //6 mon
    vestedPeriod: 60 * 60 * 24 * 30 * 24, //2 yrs
    BUSDcostPerAOD: 0.05, //0.05 BUSD
    totalAllocation: 0.05 //5% of 1 billion
  }, provider)

  await addStage(sale, {
    label: 'Community Sale',
    startDate: 'January 15, 2022 00:00:00',
    releasePeriod: 0, //none
    vestedPeriod: 60 * 60 * 24 * 30 * 6, //6 mon
    BUSDcostPerAOD: 0.05, //0.05 BUSD
    totalAllocation: 0.05 //5% of 1 billion
  }, provider)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});
