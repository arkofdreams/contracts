//to run this on testnet:
// $ npx hardhat run scripts/AODMysteryChest/mint.js

const hardhat = require('hardhat')

const tokenId = 1
const to = '0xD7D190cdC6A7053CD5Ee76E966a1b9056dbA4774'

async function main() {  
  const NFT = await hardhat.ethers.getContractFactory('AODMysteryChest')
  const network = hardhat.config.networks[hardhat.config.defaultNetwork];
  const provider = new hardhat.ethers.providers.JsonRpcProvider(network.url);
  const nft = await NFT.attach(network.contracts[0])

  const gasPrice = (await provider.getGasPrice()).mul(5).toString(); //wei
  const GgasPrice = Math.ceil(parseInt(gasPrice) / 1000000000)
  const gasLimit = Math.floor(GgasPrice * 21000)

  const tx = await nft.mint(tokenId, to, { gasPrice, gasLimit })
  console.log(tx)
  await tx.wait()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});