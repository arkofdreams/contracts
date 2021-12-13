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

async function getSigners() {
  //get signers
  const signers = await ethers.getSigners()
  //deploy contracts
  const aodToken = await deploy('AODToken')
  const busdToken = await deploy('BUSDToken')
  const tokenSale = await deploy(
    'AODTokenSale', 
    aodToken.address, 
    busdToken.address, 
    signers[0].address
  )
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const aodTokenFactory = await ethers.getContractFactory('AODToken', signers[i])
    const busdTokenFactory = await ethers.getContractFactory('BUSDToken', signers[i])
    const tokenSaleFactory = await ethers.getContractFactory('AODTokenSale', signers[i])
    signers[i].aodToken = await aodTokenFactory.attach(aodToken.address)
    signers[i].busdToken = await busdTokenFactory.attach(busdToken.address)
    signers[i].tokenSale = await tokenSaleFactory.attach(tokenSale.address)
  }
  //In AODToken, grant admin role to AODTokenSale
  await signers[0].aodToken.grantRole(getRole('MINTER_ROLE'), tokenSale.address)
  await signers[0].aodToken.grantRole(getRole('DEFAULT_ADMIN_ROLE'), tokenSale.address)
  return signers
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(
    ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 
    'hex'
  ).toString('hex')

}

function getStats() {
  //max of 1 billion will ever be minted
  const cap = 1000000000
  //now in unix seconds
  const now = Math.floor(Date.now() / 1000)
  const oneMonth = 60 * 60 * 24 * 30

  return { cap, now, oneMonth }
}

describe('AODToken Tests', function () {
  it('Should mint to vesting wallet', async function () {
    const [ owner, investor ] = await getSigners()
    const { cap, now, oneMonth } = getStats()

    const releasePeriod = oneMonth * 6
    const releaseDate = now + releasePeriod
    const vestedPeriod = oneMonth * 30
    const vestedDate = now + vestedPeriod
    const privateSaleCostPerAOD = ethers.utils.parseEther('0.05')
    const privateSaleAllocation = cap * 0.05
    const investor1Allocation = cap * 0.01

    //add a stage
    await owner.tokenSale.addStage(
      now,
      releasePeriod,
      vestedPeriod,
      privateSaleCostPerAOD,
      privateSaleAllocation
    )

    //mint tokens using the token sale from 
    //the aod token to the smart wallet
    await owner.tokenSale.vest(investor.address, investor1Allocation)

    //get smart wallet address
    const smartWallet = await owner.tokenSale.vested(investor.address)
    const factory = await ethers.getContractFactory('AODVestingWallet', owner)
    const withWallet = await factory.attach(smartWallet)

    expect(await withWallet.start()).to.equal(now)
    expect(await withWallet.duration()).to.equal(vestedPeriod)
    expect(await withWallet.releaseTime()).to.equal(releaseDate)
    expect(await withWallet.beneficiary()).to.equal(investor.address)

    //check how much is in the smart wallet
    expect(await owner.aodToken.balanceOf(smartWallet)).to.equal(investor1Allocation)

    //investor should not be able to get anything now
    expect(
      //test error
      withWallet['release(address)'](owner.aodToken.address)
    ).to.be.revertedWith(
      'Current time is before release time'
    )
     
    //fast forward to 6 months later
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [releaseDate + 1]); 
    await ethers.provider.send('evm_mine');
    //release the funds
    await withWallet['release(address)'](owner.aodToken.address)
    
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor.address)).to.equal(
      //formula: (1% of max allocation )* (6 months of 2.5 years)
      Math.floor(investor1Allocation * (releasePeriod / vestedPeriod))
    )
    //now fast forward one month
    await ethers.provider.send('evm_setNextBlockTimestamp', [releaseDate + oneMonth + 1]); 
    await ethers.provider.send('evm_mine');
    //release the funds
    withWallet['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor.address)).to.equal(
      //formula: (1% of max allocation ) * (7 months of 2.5 years)
      Math.floor(investor1Allocation * ((releasePeriod + oneMonth) / vestedPeriod))
    )
  })
})