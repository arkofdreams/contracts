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

//max of 1 billion will ever be minted
const cap = ethers.utils.parseEther('1000000000')
//now in unix seconds
const now = Math.floor(Date.now() / 1000)
const oneMonth = 60 * 60 * 24 * 30

describe('AODToken Tests', function () {
  before(async function() {
    this.smartWallets = []
    this.releasePeriod = oneMonth * 6
    this.releaseDate = now + this.releasePeriod
    this.vestedPeriod = oneMonth * 30
    this.vestedDate = now + this.vestedPeriod
    this.costPerAOD = ethers.utils.parseEther('0.05')
    this.totalAllocation = cap.mul(5).div(100)
    this.allocations = [
      cap.mul(1).div(100),
      cap.mul(2).div(100)
    ]

    this.signers = await getSigners()
    const [ owner ] = this.signers
    this.vestingWalletFactory = await ethers.getContractFactory('AODVestingWallet', owner)
  })

  it('Should be able to add stage', async function () {
    const [ owner ] = this.signers
    await owner.tokenSale.add(
      now,
      this.releasePeriod,
      this.vestedPeriod,
      this.costPerAOD,
      this.totalAllocation
    )

    const stage = await owner.tokenSale.info()
    expect(stage.startDate).to.equal(now)
    expect(stage.releaseDuration).to.equal(this.releasePeriod)
    expect(stage.vestingDuration).to.equal(this.vestedPeriod)
    expect(stage.tokenPrice).to.equal(this.costPerAOD)
    expect(stage.maxQuantity).to.equal(this.totalAllocation)
    expect(stage.allocated).to.equal(0)
  })

  it('Should be able to vest', async function () {
    const [ owner, investor1 ] = this.signers
    //mint tokens using the token sale from the aod token to the smart wallet
    await owner.tokenSale.vest(investor1.address, this.allocations[0])
    //get smart wallet address
    this.smartWallets.push(await this.vestingWalletFactory.attach(
      await owner.tokenSale.vested(investor1.address)
    ))
    expect(await this.smartWallets[0].start()).to.equal(now)
    expect(await this.smartWallets[0].duration()).to.equal(this.vestedPeriod)
    expect(await this.smartWallets[0].releaseTime()).to.equal(this.releaseDate)
    expect(await this.smartWallets[0].beneficiary()).to.equal(investor1.address)
    //check how much is in the smart wallet
    expect(await owner.aodToken.balanceOf(this.smartWallets[0].address))
      .to.equal(this.allocations[0])
    //investor should not be able to get anything now
    expect(
      //test error
      this.smartWallets[0]['release(address)'](owner.aodToken.address)
    ).to.be.revertedWith(
      'Current time is before release time'
    )
  })

  it('Should be able to buy', async function () {
    const [ owner, investor1, investor2 ] = this.signers
    //mint some BUSD to investor
    const busdBalance = this.allocations[1].mul(5).div(100)
    await owner.busdToken.mint(investor2.address, busdBalance)
    expect(await owner.busdToken.balanceOf(investor2.address)).to.equal(busdBalance)
    //allow the token sale to transfer funds
    await investor2.busdToken.approve(investor2.tokenSale.address, busdBalance);
    //mint tokens using the token sale from 
    //the aod token to the smart wallet
    await investor2.tokenSale.buy(this.allocations[1])
    expect(await owner.busdToken.balanceOf(investor2.address)).to.equal(0)
    expect(await owner.busdToken.balanceOf(owner.address)).to.equal(busdBalance)
    //get smart wallet address
    this.smartWallets.push(await this.vestingWalletFactory.attach(
      await owner.tokenSale.vested(investor2.address)
    ))
    expect(await this.smartWallets[1].start()).to.equal(now)
    expect(await this.smartWallets[1].duration()).to.equal(this.vestedPeriod)
    expect(await this.smartWallets[1].releaseTime()).to.equal(this.releaseDate)
    expect(await this.smartWallets[1].beneficiary()).to.equal(investor2.address)
    //check how much is in the smart wallet
    expect(await owner.aodToken.balanceOf(this.smartWallets[1].address))
      .to.equal(this.allocations[1])
    //investor should not be able to get anything now
    expect(
      //test error
      this.smartWallets[1]['release(address)'](owner.aodToken.address)
    ).to.be.revertedWith(
      'Current time is before release time'
    )
  })

  it('Should error when allocating above 5% total', async function () {
    const [ owner, investor1 ] = this.signers
    expect(
      owner.tokenSale.vest(investor1.address, cap.mul(3).div(100))
    ).to.be.revertedWith('Amount exceeds the max allocation') 
  })

  it('Should be able time travel 6 months later...', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.releaseDate + 1]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able get vesting for the last 6 months', async function () {  
    const [ owner, investor1, investor2 ] = this.signers
    //----------------------------------------------------------------//
    // Investor 1
    //release the funds
    await this.smartWallets[0]['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor1.address)).to.be.above(
      //formula: (1% of max allocation) * (6 months of 2.5 years)
      this.allocations[0].mul(this.releasePeriod).div(this.vestedPeriod)
    )
    //----------------------------------------------------------------//
    // Investor 2
    //release the funds
    await this.smartWallets[1]['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor2.address)).to.be.above(
      //formula: (1% of max allocation) * (6 months of 2.5 years)
      this.allocations[1].mul(this.releasePeriod).div(this.vestedPeriod)
    )
  })

  it('Should be able time travel 1 month later...', async function () {  
    //now fast forward one month
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.releaseDate + oneMonth + 1]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able get vesting for just the last month', async function () {
    const [ owner, investor1, investor2 ] = this.signers
    //----------------------------------------------------------------//
    // Investor 1  
    //release the funds
    this.smartWallets[0]['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor1.address)).to.be.above(
      //formula: (1% of max allocation ) * (7 months of 2.5 years)
      this.allocations[0].mul(this.releasePeriod + oneMonth).div(this.vestedPeriod)
    )
    //----------------------------------------------------------------//
    // Investor 2
    //release the funds
    this.smartWallets[1]['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor2.address)).to.be.above(
      //formula: (1% of max allocation ) * (7 months of 2.5 years)
      this.allocations[1].mul(this.releasePeriod + oneMonth).div(this.vestedPeriod)
    )
  })

  it('Should be able time travel 2.5 years later...', async function () {  
    //now fast forward to the end of the vesting
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.vestedDate + 1]); 
    await ethers.provider.send('evm_mine');
  });

  it('Should be able get the entire vesting', async function () {  
    const [ owner, investor1, investor2 ] = this.signers
    //----------------------------------------------------------------//
    // Investor 1
    //release the funds
    this.smartWallets[0]['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor1.address)).to.equal(
      this.allocations[0]
    )
    //----------------------------------------------------------------//
    // Investor 2
    //release the funds
    this.smartWallets[1]['release(address)'](owner.aodToken.address)
    //check the balance of the investor
    expect(await owner.aodToken.balanceOf(investor2.address)).to.equal(
      this.allocations[1]
    )
  })
})