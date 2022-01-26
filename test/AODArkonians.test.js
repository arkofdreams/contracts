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
  const token = await deploy('AODToken')
  const arkonian = await deploy('AODArkonians', token.address)

  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const tokenFactory = await ethers.getContractFactory('AODToken', signers[i])
    const arkonianFactory = await ethers.getContractFactory('AODArkonians', signers[i])
    signers[i].token = await tokenFactory.attach(token.address)
    signers[i].arkonian = await arkonianFactory.attach(arkonian.address)
  }
  //In AODToken, grant admin role to AODArkonians
  await signers[0].token.grantRole(getRole('MINTER_ROLE'), arkonian.address)
  await signers[0].token.grantRole(getRole('MINTER_ROLE'), arkonian.address)
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

describe('AODArkonian Tests', function () {
  before(async function() {
    const signers = await getSigners()
    const [ owner, investor1, investor2 ] = signers
    const threeMonths = 1000 * 60 * 60 * 24 * 30 * 3
    this.cap = await owner.token.cap()
    this.stage = {
      //tge - three months later
      tge: Math.floor((Date.now() + threeMonths) / 1000), 
      //Vested Date - June 21, 2024
      vested: parseInt(await owner.arkonian.VESTED_DATE()), 
      //Lock Period - 6 months
      locked: parseInt(await owner.arkonian.LOCK_PERIOD()), 
      //Tokens for locked period
      lockedTokens: await owner.arkonian.TOTAL_POSSIBLE_LOCKED_TOKENS(),
      //Tokens given when fully vested
      vestedTokens: await owner.arkonian.TOTAL_POSSIBLE_VESTED_TOKENS()
    }
    this.stage.maxTokens = this.stage.lockedTokens.add(this.stage.vestedTokens)
    
    investor1.vestment = {
      aodAmount: this.stage.maxTokens.mul(60).div(100),
      lockedTokens: this.stage.maxTokens.mul(60).div(100).mul(1).div(10),
      vestingTokens: this.stage.maxTokens.mul(60).div(100).mul(9).div(10)
    }
    investor2.vestment = {
      aodAmount: this.stage.maxTokens.mul(40).div(100),
      lockedTokens: this.stage.maxTokens.mul(40).div(100).mul(1).div(10),
      vestingTokens: this.stage.maxTokens.mul(40).div(100).mul(9).div(10)
    }

    this.signers = { owner, investor1, investor2 }
  })

  it('Should be able to vest', async function () {
    const { owner, investor1 } = this.signers
    
    //vest investor 1 and get account details
    await owner.arkonian.vest(investor1.address, investor1.vestment.aodAmount)
    investor1.vestment.account = await owner.arkonian.account(investor1.address)
    expect(investor1.vestment.account.lockedTokens).to.equal(investor1.vestment.lockedTokens)
    expect(investor1.vestment.account.vestingTokens).to.equal(investor1.vestment.vestingTokens)
    expect(investor1.vestment.account.releasedTokens).to.equal(0)
    expect(investor1.vestment.account.active).to.equal(true)
  })

  it('Should error when investor vests again', async function () {
    const { owner, investor1 } = this.signers
    await expect(
      owner.arkonian.vest(investor1.address, investor1.vestment.aodAmount)
    ).to.be.revertedWith('Beneficiary already vested')
  })

  it('Should error when vesting more than allocated', async function () {
    const { owner, investor2 } = this.signers
    await expect(
      owner.arkonian.vest(investor2.address, this.stage.maxTokens.mul(60).div(100))
    ).to.be.revertedWith('Amount exceeds the available allocation')
  })

  it('Should error when trying to release tokens', async function () {
    const { investor1 } = this.signers
    await expect(
      investor1.arkonian.release()
    ).to.be.revertedWith('Token generation event not triggered yet')
  })

  it('Should return zero tokens vested', async function () {
    const { investor1 } = this.signers
    expect(
      parseInt(await investor1.arkonian.totalVestedAmount(investor1.address, 1713632400))
    ).to.equal(0)
    expect(
      parseInt(await investor1.arkonian.totalReleasableAmount(investor1.address, 1713632400))
    ).to.equal(0)
  })

  it('Should time travel to three months later', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.stage.tge]); 
    await ethers.provider.send('evm_mine');
  })
  
  it('Should trigger token generting event', async function () {
    const { owner, investor1 } = this.signers
    await owner.arkonian.trigger(this.stage.tge)
    this.tokenGeneratedEvent = this.stage.tge
    
    this.unlockDate = this.tokenGeneratedEvent + parseInt(await owner.arkonian.LOCK_PERIOD())
    this.duration = this.stage.vested - this.unlockDate
    investor1.vestment.tick = investor1.vestment.vestingTokens.div(this.duration)
  })

  it('Should calculate the correct vested amounts', async function () {
    const { investor1 } = this.signers
    
    //at the start amount should be zero
    expect(await investor1.arkonian.totalVestedAmount(investor1.address, this.stage.tge)).to.equal(0)
    expect(await investor1.arkonian.totalReleasableAmount(investor1.address, this.stage.tge)).to.equal(0)
    
    //at the tge amount should be zero
    expect(await investor1.arkonian.totalVestedAmount(investor1.address, this.tokenGeneratedEvent)).to.equal(0)
    expect(await investor1.arkonian.totalReleasableAmount(investor1.address, this.tokenGeneratedEvent)).to.equal(0)
    
    //at the tge+locked period amount should be the locked tokens
    expect(await investor1.arkonian.totalVestedAmount(investor1.address, this.unlockDate)).to.equal(0)
    expect(await investor1.arkonian.totalReleasableAmount(investor1.address, this.unlockDate)).to.equal(investor1.vestment.lockedTokens)

    //at one second after the locked period, amount should be fracitonal
    expect(await investor1.arkonian.totalVestedAmount(investor1.address, this.unlockDate + 1)).to.equal(investor1.vestment.tick)
    expect(await investor1.arkonian.totalReleasableAmount(investor1.address, this.unlockDate + 1)).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.tick))

    //at the end of the vesting period, amount should be all
    expect(await investor1.arkonian.totalVestedAmount(investor1.address, this.stage.vested)).to.equal(investor1.vestment.vestingTokens)
    expect(await investor1.arkonian.totalReleasableAmount(investor1.address, this.stage.vested)).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.vestingTokens))

    //at the end of the vesting period, amount should still be all
    expect(await investor1.arkonian.totalVestedAmount(investor1.address, this.stage.vested + 100)).to.equal(investor1.vestment.vestingTokens)
    expect(await investor1.arkonian.totalReleasableAmount(investor1.address, this.stage.vested + 100)).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.vestingTokens))
  })

  it('Should time travel to July 17, 2022', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.unlockDate]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to release (6 months)', async function () {
    const { investor1 } = this.signers
    await investor1.arkonian.release()
    expect(
      await investor1.token.balanceOf(investor1.address)
    ).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.tick))
  })

  it('Should time travel to June 21, 2024', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.stage.vested]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to release all tokens', async function () {
    const { investor1 } = this.signers
    await investor1.arkonian.release()
    expect(
      await investor1.token.balanceOf(investor1.address)
    ).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.vestingTokens))
  })
})