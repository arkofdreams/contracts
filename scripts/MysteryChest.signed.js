//to run this on testnet:
// $ npx hardhat run scripts/MysteryChest.signed.js

const fs = require('fs')
const path = require('path')
const hardhat = require('hardhat')
const winners = require('../data/MysteryChest.winners.json')

function hashToken(tokenId, recipient) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(
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
  const results = {}

  //make a message
  for (let i = 0; i < winners.length; i++) {
    const message = hashToken(i + 1, winners[i])
    const signature = await signer.signMessage(message)
    if (!results[winners[i]]) results[winners[i]] = []
    results[winners[i]].push(signature.replace('0', i + 1))
  }

  //write to file
  fs.writeFileSync(
    path.resolve(__dirname, '../data/MysteryChest.signed.json'),
    JSON.stringify(results, null, 2)
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
})