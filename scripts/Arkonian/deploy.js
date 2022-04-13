// to run this on testnet:
// $ npx hardhat run scripts/Arkonian/deploy.js

const hardhat = require('hardhat')

const contractURI = 'https://ipfs.io/ipfs/bafkreigizta6x5opnctbr3balqoqwwh3fojy535jn5penn3rnowuhqy3li'

async function main() {
  await hre.run('compile')
  const Arkonian = await hardhat.ethers.getContractFactory('Arkonian')
  const arkonian = await Arkonian.deploy(contractURI)
  await arkonian.deployed()

  console.log('Arkonians contract deployed to (update .env):', arkonian.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});


// https://mumbai.polygonscan.com/address/0x577FBA882C2B952CFDDB81E97C0dC9a908ea9371