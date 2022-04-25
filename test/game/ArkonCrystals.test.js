const { expect } = require('chai');

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

async function getSigners(key, name, ...params) {
  //deploy the contract
  const contract = await deploy(name, ...params);
  //get the signers
  const signers = await ethers.getSigners();
  return await bindContract(key, name, contract, signers);
}

async function bindContract(key, name, contract, signers) {
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Contract = await ethers.getContractFactory(name, signers[i]);
    signers[i][key] = await Contract.attach(contract.address);
  }

  return signers;
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 'hex').toString('hex');
}

describe('ArkonCrystals Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();
    const [admin, holder1, holder2, holder3, holder4] = await getSigners('withToken', 'ArkonCrystals', signers[0].address);

    //grant admin to all roles
    await admin.withToken.grantRole(getRole('MINTER_ROLE'), admin.address);
    await admin.withToken.grantRole(getRole('PAUSER_ROLE'), admin.address);

    this.signers = {
      admin,
      holder1,
      holder2,
      holder3,
      holder4
    };
  });

  it('Should mint', async function () {
    const { admin, holder1 } = this.signers;

    await admin.withToken.mint(holder1.address, ethers.utils.parseEther('10'));
    expect(await admin.withToken.balanceOf(holder1.address)).to.equal(ethers.utils.parseEther('10'));
  });

  it('Should transfer', async function () {
    const { admin, holder1, holder2 } = this.signers;

    await holder1.withToken.transfer(holder2.address, ethers.utils.parseEther('5'));
    expect(await admin.withToken.balanceOf(holder1.address)).to.equal(ethers.utils.parseEther('5'));

    expect(await admin.withToken.balanceOf(holder2.address)).to.equal(ethers.utils.parseEther('5'));
  });

  it('Should not transfer when paused', async function () {
    const { admin, holder1, holder2 } = this.signers;
    await admin.withToken.pause();
    await expect(holder1.withToken.transfer(holder2.address, ethers.utils.parseEther('5'))).to.revertedWith(
      'Token transfer while paused'
    );
  });

  it('Should not mint when paused', async function () {
    const { admin, holder1 } = this.signers;
    await expect(admin.withToken.mint(holder1.address, ethers.utils.parseEther('10'))).to.revertedWith('Pausable: paused');
  });
});
