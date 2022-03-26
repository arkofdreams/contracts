const { upgrades } = require('hardhat');
const { expect } = require('chai');
require('dotenv').config();

if (process.env.BLOCKCHAIN_NETWORK != 'hardhat') {
  console.error('Exited testing with network:', process.env.BLOCKCHAIN_NETWORK);
  process.exit(1);
}

async function deploy(name, ...params) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...params);
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

async function upgradeVersion(prevContractAddress) {
  const factoryV2 = await ethers.getContractFactory(
    'AODMultisigWalletUpgradeableV2'
  );

  const walletUpgradeableV2 = await upgrades.upgradeProxy(
    prevContractAddress,
    factoryV2,
    {
      kind: 'uups'
    }
  );

  return walletUpgradeableV2;
}

async function getSigners() {
  // Get signers
  const signers = await ethers.getSigners();

  // Deploy contracts
  const busd = await deploy('BUSDToken');
  const walletUpgradeable = await deployProxy(
    'AODMultisigWalletUpgradeable',
    busd.address
  );

  // Attach contracts
  for (let i = 0; i < signers.length; i++) {
    const walletFactory = await ethers.getContractFactory(
      'AODMultisigWalletUpgradeable',
      signers[i]
    );
    const busdFactory = await ethers.getContractFactory(
      'BUSDToken',
      signers[i]
    );
    signers[i].walletUpgradeable = await walletFactory.attach(
      walletUpgradeable.address
    );
    signers[i].busd = await busdFactory.attach(busd.address);
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

describe('AODMultisigUpgradeable Tests', function () {
  before(async function () {
    const [
      owner,
      requester,
      receiver,
      approver1,
      approver2,
      approver3,
      approver4,
      approver5
    ] = await getSigners();

    await owner.busd.mint(
      owner.walletUpgradeable.address,
      ethers.utils.parseEther('1000000')
    );
    await owner.walletUpgradeable.grantRole(
      getRole('REQUESTER_ROLE'),
      requester.address
    );
    await owner.walletUpgradeable.grantRole(
      getRole('REQUESTER_ROLE'),
      approver1.address
    );
    await owner.walletUpgradeable.grantRole(
      getRole('APPROVER_ROLE'),
      approver1.address
    );
    await owner.walletUpgradeable.grantRole(
      getRole('APPROVER_ROLE'),
      approver2.address
    );
    await owner.walletUpgradeable.grantRole(
      getRole('APPROVER_ROLE'),
      approver3.address
    );
    await owner.walletUpgradeable.grantRole(
      getRole('APPROVER_ROLE'),
      approver4.address
    );
    await owner.walletUpgradeable.grantRole(
      getRole('APPROVER_ROLE'),
      approver5.address
    );

    this.signers = {
      owner,
      requester,
      receiver,
      approver1,
      approver2,
      approver3,
      approver4,
      approver5
    };
  });

  it('Should request tx', async function () {
    const { requester, receiver } = this.signers;
    await requester.walletUpgradeable.request(
      1,
      receiver.address,
      ethers.utils.parseEther('100')
    );
    const tx = await requester.walletUpgradeable.txs(1);
    expect(tx.beneficiary).to.equal(receiver.address);
    expect(tx.amount).to.equal(ethers.utils.parseEther('100'));
    expect(tx.approvals).to.equal(0);
    expect(tx.executed).to.equal(false);
  });

  it('Should error when using the same tx id', async function () {
    const { requester, receiver } = this.signers;
    await expect(
      requester.walletUpgradeable.request(
        1,
        receiver.address,
        ethers.utils.parseEther('100')
      )
    ).to.be.revertedWith('Transaction exists');
  });

  it('Should request tx, have 1 approved and transferred', async function () {
    const { approver1, receiver } = this.signers;
    await approver1.walletUpgradeable.request(
      2,
      receiver.address,
      ethers.utils.parseEther('100')
    );
    const tx = await receiver.walletUpgradeable.txs(2);
    expect(tx.beneficiary).to.equal(receiver.address);
    expect(tx.amount).to.equal(ethers.utils.parseEther('100'));
    expect(tx.approvals).to.equal(1);
    expect(tx.executed).to.equal(true);
    expect(await receiver.busd.balanceOf(receiver.address)).to.equal(
      ethers.utils.parseEther('100')
    );
  });

  it('Should now require 2 approvals', async function () {
    const { owner, approver1, approver2, receiver } = this.signers;
    await owner.walletUpgradeable.requiredApprovals(2);
    await approver1.walletUpgradeable.approve(1);

    let tx = await receiver.walletUpgradeable.txs(1);
    expect(tx.beneficiary).to.equal(receiver.address);
    expect(tx.amount).to.equal(ethers.utils.parseEther('100'));
    expect(tx.approvals).to.equal(1);
    expect(tx.executed).to.equal(false);
    expect(await receiver.busd.balanceOf(receiver.address)).to.equal(
      ethers.utils.parseEther('100')
    );

    await approver2.walletUpgradeable.approve(1);

    tx = await receiver.walletUpgradeable.txs(1);
    expect(tx.beneficiary).to.equal(receiver.address);
    expect(tx.amount).to.equal(ethers.utils.parseEther('100'));
    expect(tx.approvals).to.equal(2);
    expect(tx.executed).to.equal(true);
    expect(await receiver.busd.balanceOf(receiver.address)).to.equal(
      ethers.utils.parseEther('200')
    );
  });

  it('Should not allow approving already executed tx', async function () {
    const { approver4 } = this.signers;
    await expect(approver4.walletUpgradeable.approve(1)).to.be.revertedWith(
      'Transaction already executed'
    );
  });

  it('Should not allow duplicate approving', async function () {
    const { approver1, receiver } = this.signers;
    await approver1.walletUpgradeable.request(
      3,
      receiver.address,
      ethers.utils.parseEther('100')
    );
    const tx = await receiver.walletUpgradeable.txs(3);
    expect(tx.beneficiary).to.equal(receiver.address);
    expect(tx.amount).to.equal(ethers.utils.parseEther('100'));
    expect(tx.approvals).to.equal(1);

    await expect(approver1.walletUpgradeable.approve(3)).to.be.revertedWith(
      'Already approved'
    );
  });

  it('Should deploy new version', async function () {
    const { owner } = this.signers;
    await upgradeVersion(owner.walletUpgradeable.address);
  });

  it('Should save previous approvals state', async function () {
    const { owner } = this.signers;
    expect(await owner.walletUpgradeable.approvals()).to.equal(2);
  });

  it('Should add another one required approvals', async function () {
    const { owner } = this.signers;
    await owner.walletUpgradeable.requiredApprovals(2);

    expect(await owner.walletUpgradeable.approvals()).to.equal(3);
  });
});
