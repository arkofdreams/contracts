const { expect } = require('chai');
require('dotenv').config();

if (process.env.BLOCKCHAIN_NETWORK != 'hardhat') {
  console.error('Exited testing with network:', process.env.BLOCKCHAIN_NETWORK);
  process.exit(1);
}

async function timeTravelTo(seconds) {
  await ethers.provider.send('evm_mine');
  await ethers.provider.send('evm_setNextBlockTimestamp', [seconds]);
  await ethers.provider.send('evm_mine');
}

async function getSigners(name, ...params) {
  // Deploy contract
  const ContractFactory = await ethers.getContractFactory(name);
  const contract = await ContractFactory.deploy(...params);
  await contract.deployed();

  // Get the signers
  const signers = await ethers.getSigners();

  // Attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Contract = await ethers.getContractFactory(name, signers[i]);
    signers[i].withContract = await Contract.attach(contract.address);
  }

  return signers;
}

describe('AODMysteryPets Tests', function () {
  before(async function () {
    this.uri = 'https://gateway.pinata.cloud/ipfs/';
    this.provenance = 'QmWeGPZFsKiYLNMuuwJcWCzAfHXuMN53FtwY4Wbij8ZVHG';

    const [contractOwner, tokenOwner1, tokenOwner2] = await getSigners(
      'AODMysteryPets',
      this.uri
    );

    this.signers = {
      contractOwner,
      tokenOwner1,
      tokenOwner2
    };
  });

  it('Should get contract uri', async function () {
    const { contractOwner } = this.signers;

    await contractOwner.withContract.setProvenance(this.provenance);

    expect(await contractOwner.withContract.contractURI()).to.equal(
      `${this.uri}${this.provenance}/contract.json`
    );
  });

  it('Should not mint', async function () {
    const { tokenOwner1 } = this.signers;
    await expect(
      tokenOwner1.withContract.mint(3, tokenOwner1.address, {
        value: ethers.utils.parseEther('0.12')
      })
    ).to.be.revertedWith('Sale has not started');
  });

  it('Should error when getting token URI', async function () {
    const { contractOwner } = this.signers;
    await expect(contractOwner.withContract.tokenURI(31)).to.be.revertedWith(
      'URI query for nonexistent token'
    );
  });

  it('Should time travel to Feb 14, 2022', async function () {
    await timeTravelTo(1644796800);
  });

  it('Should mint', async function () {
    const { contractOwner, tokenOwner1 } = this.signers;

    await tokenOwner1.withContract.mint(1, tokenOwner1.address, {
      value: ethers.utils.parseEther('0.08')
    });
    await tokenOwner1.withContract.mint(2, tokenOwner1.address, {
      value: ethers.utils.parseEther('0.16')
    });
    expect(await contractOwner.withContract.ownerOf(31)).to.equal(
      tokenOwner1.address
    );
    expect(await contractOwner.withContract.ownerOf(32)).to.equal(
      tokenOwner1.address
    );
    expect(await contractOwner.withContract.ownerOf(33)).to.equal(
      tokenOwner1.address
    );
  });

  it('Should not allow to mint more than 5', async function () {
    const { tokenOwner1 } = this.signers;
    await expect(
      tokenOwner1.withContract.mint(3, tokenOwner1.address, {
        value: ethers.utils.parseEther('0.24')
      })
    ).to.be.revertedWith('Cannot mint more than allowed');
  });

  it('Should withdraw', async function () {
    const { contractOwner, dao, bbbb } = this.signers;

    expect(await contractOwner.withContract.INDEX_OFFSET()).to.equal(0);

    // const startingDAOBalance = parseFloat(
    //   ethers.utils.formatEther(await dao.getBalance())
    // );

    // const startingBBBBBalance = parseFloat(
    //   ethers.utils.formatEther(await bbbb.getBalance())
    // );

    await contractOwner.withContract.withdraw();

    // expect(
    //   parseFloat(
    //     ethers.utils.formatEther(await dao.getBalance())
    //     //also less gas (0.24 / 2)
    //   ) - startingDAOBalance
    // ).to.be.above(0.12);

    // expect(
    //   parseFloat(
    //     ethers.utils.formatEther(await bbbb.getBalance())
    //     //also less gas (0.24 / 2)
    //   ) - startingBBBBBalance
    // ).to.be.above(0.12);

    expect(await contractOwner.withContract.INDEX_OFFSET()).to.be.above(0);
  });

  it('Should get the correct token URIs', async function () {
    const { contractOwner } = this.signers;

    const max = parseInt(await contractOwner.withContract.MAX_SUPPLY());
    const offset = parseInt(await contractOwner.withContract.INDEX_OFFSET());

    for (i = 6; i <= 10; i++) {
      const index = ((i + offset) % max) + 1;
      expect(await contractOwner.withContract.tokenURI(i)).to.equal(
        `${this.uri}${this.provenance}/${index}.json`
      );
    }
  });
});
