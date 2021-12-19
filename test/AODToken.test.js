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
const oneEther = ethers.utils.parseEther('1')
const stages = {
  pri: {
    //Start Date - Dec 21, 2021
    start: 1640016000, 
    //Vested Date - June 21, 2024
    vested: 1718899200, 
    //Lock Period - 6 months
    locked: 15552000, 
    //BUSD per AOD
    cost: ethers.utils.parseEther('0.025'),
    //Tokens for locked period
    lockedTokens: ethers.utils.parseEther('5000000'),
    //Tokens given when fully vested
    vestedTokens: ethers.utils.parseEther('45000000')
  },
  pre: {
    //Start Date - Jan 17, 2022
    start: 1642348800, 
    //Vested Date - April 21, 2024
    vested: 1713632400,  
    //Lock Period - 3 months
    locked: 7776000, 
    //BUSD per AOD
    cost: ethers.utils.parseEther('0.05'),
    //Tokens for locked period
    lockedTokens: ethers.utils.parseEther('5000000'),
    //Tokens given when fully vested
    vestedTokens: ethers.utils.parseEther('45000000')
  }
}

describe('AODToken Tests', function () {
  before(async function() {
    const signers = await getSigners()
    const [
      owner, 
      investor1, investor2, investor3, investor4, 
      investor5, investor6, investor7, investor8
    ] = signers
    investor1.vestment = {
      aodAmount: cap.mul(1).div(100),
      lockedTokens: cap.mul(1).div(100).mul(1).div(10),
      vestingTokens: cap.mul(1).div(100).mul(9).div(10)
    }
    investor2.vestment = {
      aodAmount: cap.mul(2).div(100),
      lockedTokens: cap.mul(2).div(100).mul(1).div(10),
      vestingTokens: cap.mul(2).div(100).mul(9).div(10)
    }
    investor3.vestment = {
      aodAmount: cap.mul(2).div(100),
      busdAmount: cap.mul(2).div(100).mul(25).div(1000), //0.0025
      lockedTokens: cap.mul(2).div(100).mul(1).div(10),
      vestingTokens: cap.mul(2).div(100).mul(9).div(10)
    }
    investor4.vestment = {
      aodAmount: cap.mul(1).div(100),
      busdAmount: cap.mul(1).div(100).mul(25).div(1000), //0.0025
      lockedTokens: cap.mul(1).div(100).mul(1).div(10),
      vestingTokens: cap.mul(1).div(100).mul(9).div(10)
    }

    investor5.vestment = {
      aodAmount: cap.mul(1).div(100),
      lockedTokens: cap.mul(1).div(100).mul(1).div(10),
      vestingTokens: cap.mul(1).div(100).mul(9).div(10)
    }
    investor6.vestment = {
      aodAmount: cap.mul(2).div(100),
      lockedTokens: cap.mul(2).div(100).mul(1).div(10),
      vestingTokens: cap.mul(2).div(100).mul(9).div(10)
    }
    investor7.vestment = {
      aodAmount: cap.mul(2).div(100),
      busdAmount: cap.mul(2).div(100).mul(5).div(100), //0.05
      lockedTokens: cap.mul(2).div(100).mul(1).div(10),
      vestingTokens: cap.mul(2).div(100).mul(9).div(10)
    }
    investor8.vestment = {
      aodAmount: cap.mul(1).div(100),
      busdAmount: cap.mul(1).div(100).mul(5).div(100), //0.05
      lockedTokens: cap.mul(1).div(100).mul(1).div(10),
      vestingTokens: cap.mul(1).div(100).mul(9).div(10)
    }

    this.signers = {
      owner, 
      investor1, investor2, investor3, investor4, 
      investor5, investor6, investor7, investor8
    }
  })

  it('Should time travel to Dec 21, 2021', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [stages.pri.start]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to vest in private sale', async function () {
    const { owner, investor1, investor2 } = this.signers
    
    //vest investor 1 and get account details
    await owner.tokenSale.vest(investor1.address, investor1.vestment.aodAmount)
    investor1.vestment.account = await owner.tokenSale.account(investor1.address)
    expect(investor1.vestment.account.busdAmount).to.equal(0)
    expect(investor1.vestment.account.lockedTokens).to.equal(investor1.vestment.lockedTokens)
    expect(investor1.vestment.account.vestingTokens).to.equal(investor1.vestment.vestingTokens)
    expect(investor1.vestment.account.releasedTokens).to.equal(0)
    expect(investor1.vestment.account.tokenSaleStage).to.equal(1)
    expect(investor1.vestment.account.active).to.equal(true)
    
    //vest investor 2 and get account details
    await owner.tokenSale.vest(investor2.address, investor2.vestment.aodAmount)
    investor2.vestment.account = await owner.tokenSale.account(investor2.address)
    expect(investor2.vestment.account.busdAmount).to.equal(0)
    expect(investor2.vestment.account.lockedTokens).to.equal(investor2.vestment.lockedTokens)
    expect(investor2.vestment.account.vestingTokens).to.equal(investor2.vestment.vestingTokens)
    expect(investor2.vestment.account.releasedTokens).to.equal(0)
    expect(investor2.vestment.account.tokenSaleStage).to.equal(1)
    expect(investor2.vestment.account.active).to.equal(true)
  })

  it('Should error when investor vests again in private sale', async function () {
    const { owner, investor1 } = this.signers
    await expect(
      owner.tokenSale.vest(investor1.address, investor1.vestment.aodAmount)
    ).to.be.revertedWith('Beneficiary already vested')
  })

  it('Should error when vesting more than allocated in private sale', async function () {
    const { owner, investor3 } = this.signers
    await expect(
      owner.tokenSale.vest(investor3.address, cap.mul(3).div(100))
    ).to.be.revertedWith('Amount exceeds the available allocation')
  })

  it('Should error when trying to release tokens in private sale', async function () {
    const { investor1 } = this.signers
    await expect(
      investor1.tokenSale.release()
    ).to.be.revertedWith('Token generation event not triggered yet')
  })

  it('Should return zero tokens vested', async function () {
    const { investor1 } = this.signers
    expect(
      parseInt(await investor1.tokenSale.totalVestedAmount(investor1.address, 1713632400))
    ).to.equal(0)
    expect(
      parseInt(await investor1.tokenSale.totalReleasableAmount(investor1.address, 1713632400))
    ).to.equal(0)
  })

  it('Should be able to buy in private sale', async function () {
    const { owner, investor3 } = this.signers
    
    //mint some BUSD to investor
    await owner.busdToken.mint(investor3.address, investor3.vestment.busdAmount)
    
    expect(
      await owner.busdToken.balanceOf(investor3.address)
    ).to.equal(investor3.vestment.busdAmount)
    //allow the token sale to transfer funds
    await investor3.busdToken.approve(
      investor3.tokenSale.address, 
      investor3.vestment.busdAmount
    );
    //investor 3 buys and get account details
    await investor3.tokenSale.buy(investor3.vestment.aodAmount)
    investor3.vestment.account = await owner.tokenSale.account(investor3.address)
    expect(investor3.vestment.account.busdAmount).to.equal(investor3.vestment.busdAmount)
    expect(investor3.vestment.account.lockedTokens).to.equal(investor3.vestment.lockedTokens)
    expect(investor3.vestment.account.vestingTokens).to.equal(investor3.vestment.vestingTokens)
    expect(investor3.vestment.account.releasedTokens).to.equal(0)
    expect(investor3.vestment.account.tokenSaleStage).to.equal(1)
    expect(investor3.vestment.account.active).to.equal(true)

    //check if owner has busd
    expect(await owner.busdToken.balanceOf(owner.address)).to.equal(investor3.vestment.busdAmount)
  })

  it('Should error when investor buys again in private sale', async function () {
    const { owner, investor3 } = this.signers
    await expect(
      owner.tokenSale.vest(investor3.address, investor3.vestment.aodAmount)
    ).to.be.revertedWith('Beneficiary already vested')
  })

  it('Should error when buying more than allocated in private sale', async function () {
    const { owner, investor4 } = this.signers
    await owner.busdToken.mint(investor4.address, investor4.vestment.busdAmount)
    await expect(
      owner.tokenSale.vest(investor4.address, investor4.vestment.aodAmount)
    ).to.be.revertedWith('Amount exceeds the available allocation')
  })

  it('Should time travel to Jan 17, 2022', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [stages.pre.start]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to vest in presale', async function () {
    const { owner, investor5, investor6 } = this.signers
    
    //vest investor 5 and get account details
    await owner.tokenSale.vest(investor5.address, investor5.vestment.aodAmount)
    investor5.vestment.account = await owner.tokenSale.account(investor5.address)
    expect(investor5.vestment.account.busdAmount).to.equal(0)
    expect(investor5.vestment.account.lockedTokens).to.equal(investor5.vestment.lockedTokens)
    expect(investor5.vestment.account.vestingTokens).to.equal(investor5.vestment.vestingTokens)
    expect(investor5.vestment.account.releasedTokens).to.equal(0)
    expect(investor5.vestment.account.tokenSaleStage).to.equal(2)
    expect(investor5.vestment.account.active).to.equal(true)
    
    //vest investor 6 and get account details
    await owner.tokenSale.vest(investor6.address, investor6.vestment.aodAmount)
    investor6.vestment.account = await owner.tokenSale.account(investor6.address)
    expect(investor6.vestment.account.busdAmount).to.equal(0)
    expect(investor6.vestment.account.lockedTokens).to.equal(investor6.vestment.lockedTokens)
    expect(investor6.vestment.account.vestingTokens).to.equal(investor6.vestment.vestingTokens)
    expect(investor6.vestment.account.releasedTokens).to.equal(0)
    expect(investor6.vestment.account.tokenSaleStage).to.equal(2)
    expect(investor6.vestment.account.active).to.equal(true)
  })

  it('Should error when investor vests again in presale', async function () {
    const { owner, investor5 } = this.signers
    await expect(
      owner.tokenSale.vest(investor5.address, investor5.vestment.aodAmount)
    ).to.be.revertedWith('Beneficiary already vested')
  })
  
  it('Should error when vesting more than allocated in presale', async function () {
    const { owner, investor7 } = this.signers
    await expect(
      owner.tokenSale.vest(investor7.address, cap.mul(3).div(100))
    ).to.be.revertedWith('Amount exceeds the available allocation')
  })

  it('Should error when trying to release tokens in presale', async function () {
    const { investor1, investor5 } = this.signers
    await expect(
      investor1.tokenSale.release()
    ).to.be.revertedWith('Token generation event not triggered yet')
    await expect(
      investor5.tokenSale.release()
    ).to.be.revertedWith('Token generation event not triggered yet')
  })
  
  it('Should be able to buy in presale', async function () {
    const { owner, investor3, investor7 } = this.signers
    
    //mint some BUSD to investor
    await owner.busdToken.mint(investor7.address, investor7.vestment.busdAmount)
    
    expect(
      await owner.busdToken.balanceOf(investor7.address)
    ).to.equal(investor7.vestment.busdAmount)
    //allow the token sale to transfer funds
    await investor7.busdToken.approve(
      investor7.tokenSale.address, 
      investor7.vestment.busdAmount
    );
    //investor 7 buys and get account details
    await investor7.tokenSale.buy(investor7.vestment.aodAmount)
    investor7.vestment.account = await owner.tokenSale.account(investor7.address)
    expect(investor7.vestment.account.busdAmount).to.equal(investor7.vestment.busdAmount)
    expect(investor7.vestment.account.lockedTokens).to.equal(investor7.vestment.lockedTokens)
    expect(investor7.vestment.account.vestingTokens).to.equal(investor7.vestment.vestingTokens)
    expect(investor7.vestment.account.releasedTokens).to.equal(0)
    expect(investor7.vestment.account.tokenSaleStage).to.equal(2)
    expect(investor7.vestment.account.active).to.equal(true)
  
    //check if owner has busd
    expect(await owner.busdToken.balanceOf(owner.address)).to.equal(
      investor7.vestment.busdAmount.add(investor3.vestment.busdAmount)
    )
  })
  
  it('Should error when investor buys again in presale', async function () {
    const { owner, investor7 } = this.signers
    await expect(
      owner.tokenSale.vest(investor7.address, investor7.vestment.aodAmount)
    ).to.be.revertedWith('Beneficiary already vested')
  })
  
  it('Should error when buying more than allocated in presale', async function () {
    const { owner, investor8 } = this.signers
    await owner.busdToken.mint(investor8.address, investor8.vestment.busdAmount)
    await expect(
      owner.tokenSale.vest(investor8.address, investor8.vestment.aodAmount)
    ).to.be.revertedWith('Amount exceeds the available allocation')
  })
  
  it('Should trigger token generting event', async function () {
    const { owner, investor1, investor5 } = this.signers
    await owner.tokenSale.trigger()
    this.tokenGeneratedEvent = parseInt(await owner.tokenSale.tokenGeneratedEvent())
    
    const stage1 = await owner.tokenSale.stages(0)
    this.privateUnlockDate = this.tokenGeneratedEvent + parseInt(stage1.lockPeriod)
    this.privateDuration = stages.pri.vested - this.privateUnlockDate
    investor1.vestment.tick = investor1.vestment.vestingTokens.div(this.privateDuration)

    const stage2 = await owner.tokenSale.stages(1)
    this.presaleUnlockDate = this.tokenGeneratedEvent + parseInt(stage2.lockPeriod)
    this.presaleDuration = stages.pre.vested - this.presaleUnlockDate
    investor5.vestment.tick = investor5.vestment.vestingTokens.div(this.presaleDuration)
  })

  it('Should calculate the correct vested amounts for private', async function () {
    const { investor1 } = this.signers
    
    //at the start amount should be zero
    expect(await investor1.tokenSale.totalVestedAmount(investor1.address, stages.pri.start)).to.equal(0)
    expect(await investor1.tokenSale.totalReleasableAmount(investor1.address, stages.pri.start)).to.equal(0)
    
    //at the tge amount should be zero
    expect(await investor1.tokenSale.totalVestedAmount(investor1.address, this.tokenGeneratedEvent)).to.equal(0)
    expect(await investor1.tokenSale.totalReleasableAmount(investor1.address, this.tokenGeneratedEvent)).to.equal(0)
    
    //at the tge+locked period amount should be the locked tokens
    expect(await investor1.tokenSale.totalVestedAmount(investor1.address, this.privateUnlockDate)).to.equal(0)
    expect(await investor1.tokenSale.totalReleasableAmount(investor1.address, this.privateUnlockDate)).to.equal(investor1.vestment.lockedTokens)

    //at one second after the locked period, amount should be fracitonal
    expect(await investor1.tokenSale.totalVestedAmount(investor1.address, this.privateUnlockDate + 1)).to.equal(investor1.vestment.tick)
    expect(await investor1.tokenSale.totalReleasableAmount(investor1.address, this.privateUnlockDate + 1)).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.tick))

    //at the end of the vesting period, amount should be all
    expect(await investor1.tokenSale.totalVestedAmount(investor1.address, stages.pri.vested)).to.equal(investor1.vestment.vestingTokens)
    expect(await investor1.tokenSale.totalReleasableAmount(investor1.address, stages.pri.vested)).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.vestingTokens))

    //at the end of the vesting period, amount should still be all
    expect(await investor1.tokenSale.totalVestedAmount(investor1.address, stages.pri.vested + 100)).to.equal(investor1.vestment.vestingTokens)
    expect(await investor1.tokenSale.totalReleasableAmount(investor1.address, stages.pri.vested + 100)).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.vestingTokens))
  })

  it('Should calculate the correct vested amounts for presale', async function () {
    const { investor5 } = this.signers
    
    //at the start amount should be zero
    expect(await investor5.tokenSale.totalVestedAmount(investor5.address, stages.pre.start)).to.equal(0)
    expect(await investor5.tokenSale.totalReleasableAmount(investor5.address, stages.pre.start)).to.equal(0)
    
    //at the tge amount should be zero
    expect(await investor5.tokenSale.totalVestedAmount(investor5.address, this.tokenGeneratedEvent)).to.equal(0)
    expect(await investor5.tokenSale.totalReleasableAmount(investor5.address, this.tokenGeneratedEvent)).to.equal(0)
    
    //at the tge+locked period amount should be the locked tokens
    expect(await investor5.tokenSale.totalVestedAmount(investor5.address, this.presaleUnlockDate)).to.equal(0)
    expect(await investor5.tokenSale.totalReleasableAmount(investor5.address, this.presaleUnlockDate)).to.equal(investor5.vestment.lockedTokens)

    //at one second after the locked period, amount should be fracitonal
    expect(await investor5.tokenSale.totalVestedAmount(investor5.address, this.presaleUnlockDate + 1)).to.equal(investor5.vestment.tick)
    expect(await investor5.tokenSale.totalReleasableAmount(investor5.address, this.presaleUnlockDate + 1)).to.equal(investor5.vestment.lockedTokens.add(investor5.vestment.tick))

    //at the end of the vesting period, amount should be all
    expect(await investor5.tokenSale.totalVestedAmount(investor5.address, stages.pre.vested)).to.equal(investor5.vestment.vestingTokens)
    expect(await investor5.tokenSale.totalReleasableAmount(investor5.address, stages.pre.vested)).to.equal(investor5.vestment.lockedTokens.add(investor5.vestment.vestingTokens))

    //at the end of the vesting period, amount should still be all
    expect(await investor5.tokenSale.totalVestedAmount(investor5.address, stages.pre.vested + 100)).to.equal(investor5.vestment.vestingTokens)
    expect(await investor5.tokenSale.totalReleasableAmount(investor5.address, stages.pre.vested + 100)).to.equal(investor5.vestment.lockedTokens.add(investor5.vestment.vestingTokens))
  })

  it('Should time travel to April 17, 2022', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.presaleUnlockDate]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to release presale (3 months)', async function () {
    const { investor1, investor5 } = this.signers
    await investor5.tokenSale.release()
    expect(
      await investor5.aodToken.balanceOf(investor5.address)
    ).to.be.below(investor5.vestment.lockedTokens.add(investor5.vestment.tick.mul(2)))

    await expect(
      investor1.tokenSale.release()
    ).to.be.revertedWith('No tokens releasable')
  })

  it('Should time travel to July 17, 2022', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [this.privateUnlockDate]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to release private sale (6 months)', async function () {
    const { investor1 } = this.signers
    await investor1.tokenSale.release()
    expect(
      await investor1.aodToken.balanceOf(investor1.address)
    ).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.tick))
  })

  it('Should time travel to April 21, 2024', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [stages.pre.vested]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to release all tokens in presale', async function () {
    const { investor5 } = this.signers
    await investor5.tokenSale.release()
    expect(
      await investor5.aodToken.balanceOf(investor5.address)
    ).to.equal(investor5.vestment.lockedTokens.add(investor5.vestment.vestingTokens))
  })

  it('Should time travel to June 21, 2024', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [stages.pri.vested]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should be able to release all tokens in private sale', async function () {
    const { investor1 } = this.signers
    await investor1.tokenSale.release()
    expect(
      await investor1.aodToken.balanceOf(investor1.address)
    ).to.equal(investor1.vestment.lockedTokens.add(investor1.vestment.vestingTokens))
  })
})