//to run this on testnet:
// $ npx hardhat run scripts/AODMultisigWallet/deploy.js

const hardhat = require('hardhat')

async function main() {
  await hre.run('compile')
  const Wallet = await hardhat.ethers.getContractFactory('AODMultisigWallet')
  const wallet = await Wallet.deploy(
    //'0x8301f2213c0eed49a7e28ae4c3e91722919b8b47' //BUSD testnet
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' //BUSD mainnet
  )
  await wallet.deployed()
  
  console.log('Multisig Wallet contract deployed to (update .env):', wallet.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
});
