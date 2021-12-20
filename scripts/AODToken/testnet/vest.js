//to run this on testnet:
// $ npx hardhat run scripts/AODToken/testnet/vest.js

const hardhat = require('hardhat')

async function estimateGas(provider, multiplier = 3) {
  const gasPrice = (await provider.getGasPrice()).mul(multiplier).toString(); //wei
  const GgasPrice = Math.ceil(parseInt(gasPrice) / 1000000000)
  const gasLimit = Math.floor(GgasPrice * 21000)
  return { gasPrice, gasLimit }
}

async function main() {
  const network = hardhat.config.networks[hardhat.config.defaultNetwork]
  const provider = new hardhat.ethers.providers.JsonRpcProvider(network.url)

  const TokenSale = await hardhat.ethers.getContractFactory('AODTestnetSale')
  const tokenSale = await TokenSale.attach(network.contracts[3])

  await tokenSale.vest(
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 
    ethers.utils.parseEther('10000000'),
    await estimateGas(provider)
  )
  
  console.log('Vested')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
})
