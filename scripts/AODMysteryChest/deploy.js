//to run this on testnet:
// $ npx hardhat run scripts/AODMysteryChest/deploy.js

const hardhat = require('hardhat')

const contractURI = 'https://ipfs.io/ipfs/QmbzCzGBDGc1VYhXBp7RxHbnKxWyssrPHLrKv2fXPz8gZs'
const tokenURI = 'https://ipfs.io/ipfs/QmWhjjSQpBQ7Hmmo4XTLWTXtTqBfuWC4X1vjitdMWp6G8n'

async function main() {
  await hre.run('compile')
  const NFT = await hardhat.ethers.getContractFactory('AODMysteryChest')
  const nft = await NFT.deploy(
    'Ark of Dreams Treasure Chest',
    'AODTC',
    contractURI,
    tokenURI
  )
  await nft.deployed()
  console.log('NFT contract deployed to (update .env):', nft.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});
