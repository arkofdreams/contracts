//to run this on testnet:
// $ npx hardhat run scripts/AODToken/testnet/view.js

const hardhat = require('hardhat')

async function main() {
  const TokenSale = await hardhat.ethers.getContractFactory('AODTestnetSale')
  const tokenSale = await TokenSale.attach(
    hardhat.config.networks[hardhat.config.defaultNetwork].contracts[3]
  )

  console.log('tge', (await tokenSale.tokenGeneratedEvent()).toString()) //1639985597
  console.log('vested date', (await tokenSale.vestedDate()).toString())  //1639988420

  const account = await tokenSale.account('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

  const timestamp = 1639988420
  const totalVested = await tokenSale.totalVestedAmount('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', timestamp)
  const totalReleasable = await tokenSale.totalReleasableAmount('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', timestamp)

  console.log('account info', {
    busdAmount: account.busdAmount.toString(),
    lockedTokens: parseInt(account.lockedTokens.toString()) / parseInt(ethers.utils.parseEther('1')),
    vestingTokens:  parseInt(account.vestingTokens.toString()) / parseInt(ethers.utils.parseEther('1')),
    releasedTokens: account.releasedTokens.toString(),
    unlocked: account.unlocked,
    active: account.active
  })
  console.log('total vested', parseInt(totalVested) / parseInt(ethers.utils.parseEther('1')))
  console.log('total releasable', parseInt(totalReleasable) / parseInt(ethers.utils.parseEther('1')))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
})
