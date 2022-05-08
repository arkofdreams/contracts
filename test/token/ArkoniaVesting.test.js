const { expect } = require('chai');
require('dotenv').config();

if (process.env.BLOCKCHAIN_NETWORK != 'hardhat') {
  console.error('Exited testing with network:', process.env.BLOCKCHAIN_NETWORK);
  process.exit(1);
}

async function deploy(name, ...params) {
  //deploy the contract
  const ContractFactory = await ethers.getContractFactory(name);
  const contract = await ContractFactory.deploy(...params);
  await contract.deployed();

  return contract;
}

async function deployProxy(name, ...params) {
  const factory = await ethers.getContractFactory(name);
  const contract = await upgrades.deployProxy(factory, [...params], {
    kind: 'uups'
  });

  await contract.deployed();

  return contract;
}

async function getSigners(token, vesting) {
  //get the signers
  const signers = await ethers.getSigners();
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Token = await ethers.getContractFactory('ArkoniaToken', signers[i]);
    const Vesting = await ethers.getContractFactory('ArkoniaVesting', signers[i]);

    signers[i].withToken = await Token.attach(token.address);
    signers[i].withVesting = await Vesting.attach(vesting.address);
  }

  return signers;
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 'hex').toString('hex');
}

describe('ArkoniaVesting Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    this.contracts = {};
    this.contracts.token = await deployProxy('ArkoniaToken', signers[0].address);
    this.contracts.vesting = await deploy('ArkoniaVesting', this.contracts.token.address, signers[0].address);

    const [owner, investor1, investor2, investor3, investor4] = await getSigners(
      this.contracts.token,
      this.contracts.vesting
    );

    await owner.withToken.grantRole(getRole('MINTER_ROLE'), this.contracts.vesting.address);
    await owner.withVesting.grantRole(getRole('VESTER_ROLE'), owner.address);

    this.contracts.vesting = owner.withVesting.address;

    this.signers = {
      owner,
      investor1,
      investor2,
      investor3,
      investor4
    };
    this.now = Math.floor(Date.now() / 1000)
  });

  it('Should vest', async function () {
    const { owner, investor1, investor2 } = this.signers
    await owner.withVesting.vest(
      investor1.address, 
      ethers.utils.parseEther('100'),
      this.now,
      this.now + (3600 * 24 * 30)
    )

    const info1 = await owner.withVesting.vesting(investor1.address)

    expect(info1.startDate).to.equal(this.now)
    expect(info1.endDate).to.equal(this.now + (3600 * 24 * 30))
    expect(info1.total).to.equal(ethers.utils.parseEther('100'))

    expect(
      await owner.withVesting.totalVestedAmount(
        investor1.address,
        this.now + (3600 * 24 * 30)
      )
    ).to.equal(ethers.utils.parseEther('100'))

    //------

    await owner.withVesting.vest(
      investor2.address, 
      ethers.utils.parseEther('200'),
      this.now,
      this.now + (3600 * 24 * 15)
    )
  
    const info2 = await owner.withVesting.vesting(investor2.address)

    expect(info2.startDate).to.equal(this.now)
    expect(info2.endDate).to.equal(this.now + (3600 * 24 * 15))
    expect(info2.total).to.equal(ethers.utils.parseEther('200'))
    
    expect(
      await owner.withVesting.totalVestedAmount(
        investor2.address,
        this.now + (3600 * 24 * 15)
      )
    ).to.equal(ethers.utils.parseEther('200'))
  })

  it('Should time travel 15 days', async function () {  
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_increaseTime', [3600 * 24 * 15]); 
    await ethers.provider.send('evm_mine');
  })

  it('Should release', async function () {
    const { owner, investor1, investor2 } = this.signers

    await owner.withVesting.release(investor1.address)
    expect(await owner.withToken.balanceOf(investor1.address)).to.be.above(
      ethers.utils.parseEther('50')
    )

    //-------

    await owner.withVesting.release(investor2.address)
    expect(await owner.withToken.balanceOf(investor2.address)).to.equal(
      ethers.utils.parseEther('200')
    )
  })
});
