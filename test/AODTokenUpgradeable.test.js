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

  await signers[0].aodToken.grantRole(
    getRole('MINTER_ROLE'),
    signers[1].address
  );

  await signers[0].aodToken.grantRole(
    getRole('BANNER_ROLE'),
    signers[2].address
  );

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

describe.only('AODTokenUpgradeable Tests', function () {
  before(async function () {
    const signers = await getSigners();

    const [owner, minter, banner, investor1, investor2, badactor1] = signers;

    this.signers = {
      owner,
      minter,
      banner,
      investor1,
      investor2,
      badactor1
    };
  });

  it('Should deploy contract with correct name and symbol', async function () {
    const { owner } = this.signers;

    expect(await owner.aodToken.name()).to.equal('Arkonia');
    expect(await owner.aodToken.symbol()).to.equal('AOD');
  });

  it('Should be able minter to mint tokens', async function () {
    const { minter, investor1 } = this.signers;

    await minter.aodToken.mint(
      investor1.address,
      ethers.utils.parseEther('1000')
    );

    expect(await investor1.aodToken.balanceOf(investor1.address)).to.equal(
      ethers.utils.parseEther('1000')
    );
    expect(await investor1.aodToken.totalSupply()).to.equal(
      ethers.utils.parseEther('1000')
    );
  });

  it('Should error if non-minter mints', async function () {
    const { investor1, investor2 } = this.signers;

    await expect(
      investor1.aodToken.mint(
        investor2.address,
        ethers.utils.parseEther('1000')
      )
    ).to.be.reverted;
  });

  it('Should be able banner to ban an address', async function () {
    const { banner, badactor1 } = this.signers;

    await banner.aodToken.blacklist(badactor1.address, true);

    expect(await banner.aodToken.isBlacklisted(badactor1.address)).to.equal(
      true
    );
  });

  it('Should error if a blacklisted address mints', async function () {
    const { minter, badactor1 } = this.signers;

    await expect(
      minter.aodToken.mint(badactor1.address, ethers.utils.parseEther('1000'))
    ).to.be.revertedWith('Recipient is blacklisted');
  });

  it('Should banner be able to whitelist a blacklisted address', async function () {
    const { banner, badactor1 } = this.signers;

    await banner.aodToken.blacklist(badactor1.address, false);

    expect(await banner.aodToken.isBlacklisted(badactor1.address)).to.equal(
      false
    );
  });

  it('Should a whitelisted address be able to mint again', async function () {
    const { minter, badactor1 } = this.signers;

    await minter.aodToken.mint(
      badactor1.address,
      ethers.utils.parseEther('1000')
    );

    expect(await badactor1.aodToken.balanceOf(badactor1.address)).to.equal(
      ethers.utils.parseEther('1000')
    );
  });
});
