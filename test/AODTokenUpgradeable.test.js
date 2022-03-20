const { upgrades } = require('hardhat');
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

async function getSigners() {
  // Get signers
  const signers = await ethers.getSigners();

  // Deploy contracts
  const aodToken = await deployProxy('AODTokenUpgradeable');

  // Attach contracts
  for (let i = 0; i < signers.length; i++) {
    const aodTokenFactory = await ethers.getContractFactory(
      'AODToken',
      signers[i]
    );

    signers[i].aodToken = await aodTokenFactory.attach(aodToken.address);
  }

  return signers;
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return (
    '0x' +
    Buffer.from(
      ethers.utils.solidityKeccak256(['string'], [name]).slice(2),
      'hex'
    ).toString('hex')
  );
}

const cap = ethers.utils.parseEther('1000000000');

describe('AODTokenUpgradeable Tests', function () {
  before(async function () {
    const signers = await getSigners();

    const [owner, investor1, investor2] = signers;

    this.signers = {
      owner,
      investor1,
      investor2
    };
  });

  it('Should deploy contract with correct name and symbol', async function () {});
});
