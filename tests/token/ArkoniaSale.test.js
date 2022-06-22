const { upgrades } = require('hardhat');
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

async function getSigners(token, vesting, sale, usdc) {
  //get the signers
  const signers = await ethers.getSigners();
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Token = await ethers.getContractFactory('ArkoniaToken', signers[i]);
    const Vesting = await ethers.getContractFactory('ArkoniaVesting', signers[i]);
    const Sale = await ethers.getContractFactory('ArkoniaSale', signers[i]);
    const Usdc = await ethers.getContractFactory('MockERC20USDC', signers[i]);

    signers[i].withToken = await Token.attach(token.address);
    signers[i].withVesting = await Vesting.attach(vesting.address);
    signers[i].withSale = await Sale.attach(sale.address);
    signers[i].withUSDC = await Usdc.attach(usdc.address);
  }

  return signers;
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 'hex').toString('hex');
}

describe('ArkoniaSale Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();

    this.contracts = {};

    // ArkoniaToken is upgradeable so we used deployProxy instead
    this.contracts.token = await deployProxy('ArkoniaToken', signers[0].address);
    this.contracts.vesting = await deploy('ArkoniaVesting', this.contracts.token.address, signers[0].address);
    this.contracts.sale = await deploy('ArkoniaSale', this.contracts.token.address, this.contracts.vesting.address);
    this.contracts.usdc = await deploy('MockERC20USDC')

    const [owner, investor1, investor2, investor3, investor4] = await getSigners(
      this.contracts.token,
      this.contracts.vesting,
      this.contracts.sale,
      this.contracts.usdc
    );

    await owner.withToken.grantRole(getRole('MINTER_ROLE'), this.contracts.sale.address);
    await owner.withToken.grantRole(getRole('MINTER_ROLE'), this.contracts.vesting.address);
    await owner.withVesting.grantRole(getRole('PAUSER_ROLE'), owner.address);
    await owner.withVesting.grantRole(getRole('VESTER_ROLE'), this.contracts.sale.address);

    await owner.withUSDC.mint(investor4.address, ethers.utils.parseEther('25')) //1000 AOD

    this.contracts.sale = owner.withSale.address;

    this.signers = {
      owner,
      investor1,
      investor2,
      investor3,
      investor4
    };
  });

  it('Should error buying when sale it not staged', async function () {
    const { owner, investor1 } = this.signers;

    await expect(
      owner.withSale['buy(address,uint256)'](investor1.address, ethers.utils.parseEther('100000'), { value: ethers.utils.parseEther('1') })
    ).to.be.revertedWith('InvalidCall()');
  });

  it('Should set the vesting stage', async function () {
    const { owner } = this.signers;
    await owner.withSale.setTokenLimit(ethers.utils.parseEther('1000000'));
    await owner.withSale['setTokenPrice(uint256)'](ethers.utils.parseEther('0.00001'));
    await owner.withSale['setTokenPrice(address,uint256)'](
      owner.withUSDC.address, 
      ethers.utils.parseEther('0.025')
    );

    // May 1, 2024 12:00AM GMT
    await owner.withSale.setVestedDate(1714521600);

    expect(await owner.withSale.currentTokenLimit()).to.equal(ethers.utils.parseEther('1000000'));
    expect(await owner.withSale.currentTokenPrice()).to.equal(ethers.utils.parseEther('0.00001'));
    expect(await owner.withSale.currentVestedDate()).to.equal(1714521600);
  });

  it('Should buy tokens', async function () {
    const { owner, investor1, investor2, investor3, investor4 } = this.signers;

    await owner.withSale['buy(address,uint256)'](investor1.address, ethers.utils.parseEther('100000'), {
      value: ethers.utils.parseEther('1')
    });

    expect(
      (await owner.withVesting.vesting(investor1.address)).total
    ).to.equal(ethers.utils.parseEther('100000'));

    await owner.withSale['buy(address,uint256)'](investor2.address, ethers.utils.parseEther('200000'), {
      value: ethers.utils.parseEther('2')
    });

    expect((await owner.withVesting.vesting(investor2.address)).total).to.equal(ethers.utils.parseEther('200000'));

    await owner.withSale['buy(address,uint256)'](investor3.address, ethers.utils.parseEther('100000'), {
      value: ethers.utils.parseEther('1')
    });

    expect(
      (await owner.withVesting.vesting(investor3.address)).total
    ).to.equal(ethers.utils.parseEther('100000'));

    //approve
    await investor4.withUSDC.approve(
      owner.withSale.address,
      ethers.utils.parseEther('25')
    )

    //buy
    await owner.withSale['buy(address,address,uint256)'](
      owner.withUSDC.address,
      investor4.address, 
      ethers.utils.parseEther('1000')
    );

    expect(
      (await owner.withVesting.vesting(investor4.address)).total
    ).to.equal(ethers.utils.parseEther('1000'));
  });

  it('Should time travel to May 1, 2024', async function () {
    await ethers.provider.send('evm_mine');
    await ethers.provider.send('evm_setNextBlockTimestamp', [1714521601]);
    await ethers.provider.send('evm_mine');
  });

  it('should release all', async function () {
    const { owner, investor1, investor2, investor3 } = this.signers;

    await owner.withVesting.unpause()

    await owner.withVesting.release(investor1.address);
    await owner.withVesting.release(investor2.address);
    await owner.withVesting.release(investor3.address);

    expect(await owner.withToken.balanceOf(investor1.address)).to.equal(ethers.utils.parseEther('100000'));
    expect(await owner.withToken.balanceOf(investor2.address)).to.equal(ethers.utils.parseEther('200000'));
    expect(await owner.withToken.balanceOf(investor3.address)).to.equal(ethers.utils.parseEther('100000'));
  });

  it('Should withdraw', async function () {
    const { owner } = this.signers

    const startingBalance = parseFloat(
      ethers.utils.formatEther(await owner.getBalance())
    )

    await owner.withSale['withdraw(address)'](owner.address)
    
    expect(parseFloat(
      ethers.utils.formatEther(await owner.getBalance())
      //also less gas
    ) - startingBalance).to.be.above(3.99)

    await owner.withSale['withdraw(address,address)'](
      owner.withUSDC.address, 
      owner.address
    )

    expect(parseFloat(
      ethers.utils.formatEther(
        await owner.withUSDC.balanceOf(owner.address)
      )
    )).to.equal(25)
  })
});
