//to run this on testnet:
// $ npx hardhat run scripts/AODMysteryChest/sign.js

const hardhat = require('hardhat')
const winners = require('../../data/AODMysteryChest.winners.json')

function hashToken(tokenId, recipient) {
  return Buffer.from(
    hardhat.ethers.utils.solidityKeccak256(
      ['uint256', 'address'],
      [tokenId, recipient]
    ).slice(2),
    'hex'
  )
}

async function main() {
  //sign message wallet PK
  const wallet = hardhat.config.networks[hardhat.config.defaultNetwork].accounts[0]
  const signer = new ethers.Wallet(wallet)

  console.log('address, key')
  //make a message
  for (let i = 0; i < winners.length; i++) {
    const message = hashToken(i + 1, winners[i])
    const signature = await signer.signMessage(message)
    console.log(`${winners[i]}, ${signature}`)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
})
