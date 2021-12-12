const { expect } = require('chai');
require('dotenv').config()

if (process.env.BLOCKCHAIN_NETWORK != 'hardhat') {
  console.error('Exited testing with network:', process.env.BLOCKCHAIN_NETWORK)
  process.exit(1);
}

async function deploy(name, ...params) {
  const factory = await ethers.getContractFactory(name)
  const contract = await factory.deploy(...params)
  await contract.deployed()
  return contract
}

async function getSigners(name, ...params) {
  //deploy the contract
  const contract = await deploy(name, ...params)
  //get the signers
  const signers = await ethers.getSigners()
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Contract = await ethers.getContractFactory(name, signers[i])
    signers[i].withContract = await Contract.attach(contract.address)
  }

  return signers
}

describe('AODToken Tests', function () {
  it('Should mint to vesting wallet', async function () {
    const [ owner, investor ] = await getSigners('AODToken')
    const tokenAddress = owner.withContract.address
    //max of 1 billion will ever be minted
    const cap = 1000000000
    //now in unix seconds
    const now = Math.floor(Date.now() / 1000)
    //start time in unix seconds
    const start = now
    const oneMonth = 60 * 60 * 24 * 30
    const sixMonths = oneMonth * 6
    //duration in seconds (30 months or 2.5 years)
    const duration = sixMonths * 5
    //release time in unix seconds (6 months)
    const release = now + sixMonths
    //mint tokens to the smart wallet
    await owner.withContract.vest(
      investor.address,
      cap * 0.01,
      start,
      duration,
      release
    )

    //get smart contract address
    const smartWallet = await owner.withContract.vested(investor.address)

    //get functions for the smart wallet
    const factory = await ethers.getContractFactory('AODVestingWallet', owner)
    const withWallet = await factory.attach(smartWallet)

    expect(await withWallet.start()).to.equal(start)
    expect(await withWallet.duration()).to.equal(duration)
    expect(await withWallet.releaseTime()).to.equal(release)
    expect(await withWallet.beneficiary()).to.equal(investor.address)

    //check how much is in the smart wallet
    expect(
      await owner.withContract.balanceOf(smartWallet)
    ).to.equal(1000000000 * 0.01)

    //investor should not be able to get anything now
    expect(
      //test error
      withWallet['release(address)'](tokenAddress)
    ).to.be.revertedWith(
      'Current time is before release time'
    )
     
    //fast forward to 6 months later
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [release + 1]); 
    await ethers.provider.send('evm_mine');
    //release the funds
    await withWallet['release(address)'](tokenAddress)
    
    //check the balance of the investor
    expect(await owner.withContract.balanceOf(investor.address)).to.equal(
      //formula: (1% of max allocation )* (6 months of 2.5 years)
      Math.floor((1000000000 * 0.01) * (sixMonths / duration))
    )
    //now fast forward one month
    await ethers.provider.send('evm_setNextBlockTimestamp', [release + oneMonth + 1]); 
    await ethers.provider.send('evm_mine');
    //release the funds
    withWallet['release(address)'](tokenAddress)
    //check the balance of the investor
    expect(await owner.withContract.balanceOf(investor.address)).to.equal(
      //formula: (1% of max allocation ) * (7 months of 2.5 years)
      Math.floor((1000000000 * 0.01) * ((sixMonths + oneMonth) / duration))
    )
  })
})