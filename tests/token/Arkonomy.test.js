const { expect } = require('chai');
require('dotenv').config();

if (process.env.BLOCKCHAIN_NETWORK != 'hardhat') {
  console.error('Exited testing with network:', process.env.BLOCKCHAIN_NETWORK);
  process.exit(1);
}

async function deployProxy(name, ...params) {
  const factory = await ethers.getContractFactory(name);
  const contract = await upgrades.deployProxy(factory, [...params], {
    kind: 'uups'
  });

  await contract.deployed();

  return contract;
}

async function getSigners(token, treasury, economy) {
  //get the signers
  const signers = await ethers.getSigners();
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Token = await ethers.getContractFactory('ArkoniaToken', signers[i]);
    const Treasury = await ethers.getContractFactory('Treasury', signers[i]);
    const Economy = await ethers.getContractFactory('Arkonomy', signers[i]);
    signers[i].withToken = await Token.attach(token.address);
    signers[i].withTreasury = await Treasury.attach(treasury.address);
    signers[i].withEconomy = await Economy.attach(economy.address);
  }

  return signers;
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 'hex').toString('hex');
}

describe('Arkonomy Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    this.contracts = {};
    this.contracts.token = await deployProxy('ArkoniaToken', signers[0].address);
    this.contracts.treasury = await deployProxy('Treasury', signers[0].address);
    this.contracts.economy = await deployProxy(
      'Arkonomy',
      this.contracts.token.address,
      this.contracts.treasury.address,
      signers[0].address
    );

    const [owner, user1, user2, user3, user4, fund] = await getSigners(
      this.contracts.token,
      this.contracts.treasury,
      this.contracts.economy
    );

    //send some ether and tokens
    await owner.withEconomy.unpause();
    await fund.sendTransaction({
      to: owner.withEconomy.address,
      value: ethers.utils.parseEther('10')
    });

    //set owner roles
    await owner.withToken.grantRole(getRole('PAUSER_ROLE'), owner.address);
    await owner.withToken.grantRole(getRole('MINTER_ROLE'), owner.address);

    await owner.withToken.unpause();
    await owner.withToken.mint(owner.withEconomy.address, ethers.utils.parseEther('100'));

    this.signers = {
      owner,
      user1,
      user2,
      user3,
      user4
    };
  });

  it('Should have a balance', async function () {
    const { owner } = this.signers;

    expect(await owner.withEconomy.provider.getBalance(owner.withEconomy.address)).to.equal(ethers.utils.parseEther('10'));

    expect(await owner.withToken.balanceOf(owner.withEconomy.address)).to.equal(ethers.utils.parseEther('100'));

    expect(await owner.withEconomy.balanceEther()).to.equal(ethers.utils.parseEther('10'));

    expect(await owner.withEconomy.balanceToken()).to.equal(ethers.utils.parseEther('100'));
  });

  it('Should have a buy and sell price', async function () {
    const { owner } = this.signers;

    expect(await owner.withEconomy.buyingFor(ethers.utils.parseEther('10'))).to.equal(ethers.utils.parseEther('0.0000005'));

    expect(await owner.withEconomy.sellingFor(ethers.utils.parseEther('10'))).to.equal(ethers.utils.parseEther('0.000002'));
  });

  it('Should buy', async function () {
    const { owner, user1 } = this.signers;

    await owner.withEconomy.buy(user1.address, ethers.utils.parseEther('10'), {
      value: ethers.utils.parseEther('0.000002')
    });

    expect(await owner.withToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther('10'));

    expect(await owner.withEconomy.balanceEther()).to.equal(ethers.utils.parseEther('10.000001'));

    expect(await owner.provider.getBalance(owner.withEconomy.address)).to.equal(ethers.utils.parseEther('10.000001'));

    expect(await owner.provider.getBalance(owner.withTreasury.address)).to.equal(ethers.utils.parseEther('0.000001'));

    expect(await owner.withEconomy.balanceToken()).to.equal(ethers.utils.parseEther('90'));
  });

  it('Should sell', async function () {
    const { owner, user1 } = this.signers;

    await user1.withToken.approve(owner.withEconomy.address, ethers.utils.parseEther('1'));

    await owner.withEconomy.sell(user1.address, ethers.utils.parseEther('1'));

    expect(await owner.withToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther('9'));

    expect(await owner.withEconomy.balanceEther()).to.equal(ethers.utils.parseEther('10.000000949999995'));

    expect(await owner.provider.getBalance(owner.withEconomy.address)).to.equal(
      ethers.utils.parseEther('10.000000949999995')
    );

    expect(await owner.provider.getBalance(owner.withTreasury.address)).to.equal(ethers.utils.parseEther('0.000001'));

    expect(await owner.withEconomy.balanceToken()).to.equal(ethers.utils.parseEther('91'));
  });
});
