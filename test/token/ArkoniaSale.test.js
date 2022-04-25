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

async function getSigners(token, vesting, sale) {
  //get the signers
  const signers = await ethers.getSigners();
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Token = await ethers.getContractFactory('ArkoniaToken', signers[i]);
    const Vesting = await ethers.getContractFactory('ArkoniaVesting', signers[i]);
    const Sale = await ethers.getContractFactory('ArkoniaSale', signers[i]);

    signers[i].withToken = await Token.attach(token.address);
    signers[i].withVesting = await Vesting.attach(vesting.address);
    signers[i].withSale = await Sale.attach(sale.address);
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

    const [owner, investor1, investor2, investor3, investor4] = await getSigners(
      this.contracts.token,
      this.contracts.vesting,
      this.contracts.sale
    );

    await owner.withToken.grantRole(getRole('MINTER_ROLE'), this.contracts.sale.address);
    await owner.withSale.setTokenPrice(ethers.utils.parseEther('0.5'));

    this.contracts.sale = owner.withSale.address;

    this.signers = {
      owner,
      investor1,
      investor2,
      investor3,
      investor4
    };
  });

  // todo: add tests
});
