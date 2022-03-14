//to run this on testnet:
// $ npx hardhat run scripts/Arkonians/deploy.js

const hardhat = require('hardhat')

const contractURI = 'https://ipfs.io/ipfs/bafkreigizta6x5opnctbr3balqoqwwh3fojy535jn5penn3rnowuhqy3li'

async function main() {
  await hre.run('compile')
  const NFT = await hardhat.ethers.getContractFactory('Arkonians')
  const nft = await NFT.deploy(contractURI)
  await nft.deployed()
  console.log('NFT contract deployed to (update .env):', nft.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});


// https://mumbai.polygonscan.com/address/0x577FBA882C2B952CFDDB81E97C0dC9a908ea9371