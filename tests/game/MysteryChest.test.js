const { expect } = require('chai');
require('dotenv').config()

if (process.env.BLOCKCHAIN_NETWORK != 'hardhat') {
  console.error('Exited testing with network:', process.env.BLOCKCHAIN_NETWORK)
  process.exit(1);
}

async function getSigners(name, ...params) {
  //deploy the contract
  const ContractFactory = await ethers.getContractFactory(name)
  const contract = await ContractFactory.deploy(...params)
  await contract.deployed()
  //get the signers
  const signers = await ethers.getSigners()
  //attach contracts
  for (let i = 0; i < signers.length; i++) {
    const Contract = await ethers.getContractFactory(name, signers[i])
    signers[i].withContract = await Contract.attach(contract.address)
  }

  return signers
}

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 'hex').toString('hex');
}

function hashToken(tokenId, recipient) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(
      ['uint256', 'address'],
      [tokenId, recipient]
    ).slice(2),
    'hex'
  )
}

describe('MysteryChest Tests', function () {
  before(async function () {
    const signers = await ethers.getSigners();
    const contractURI = 'https://ipfs.io/ipfs/QmbzCzGBDGc1VYhXBp7RxHbnKxWyssrPHLrKv2fXPz8gZs'
    const tokenURI = 'https://ipfs.io/ipfs/QmWhjjSQpBQ7Hmmo4XTLWTXtTqBfuWC4X1vjitdMWp6G8n'
    const [ admin, tokenOwner ] = await getSigners('MysteryChest', contractURI, tokenURI, signers[0].address)

    await admin.withContract.grantRole(getRole('MINTER_ROLE'), signers[0].address)

    this.signers = { admin, tokenOwner }
    this.tokenURI = tokenURI
  });

  it('Should mint and lazy mint', async function () {
    const { admin, tokenOwner } = this.signers

    //----------------------------------------//
    // This is the minting
    const tokenId = 200
    //fast forward ... (go straight to the token owner)
    await admin.withContract.mint(tokenId, tokenOwner.address)
    expect(await admin.withContract.ownerOf(tokenId)).to.equal(tokenOwner.address)
    expect(await admin.withContract.tokenURI(tokenId)).to.equal(this.tokenURI)

    //----------------------------------------//
    // This is the lazy minting
    //define tokens
    const tokenId2 = 300
    const tokenId3 = 400

    //make a message (its a buffer)
    const messages = [
      hashToken(tokenId2, tokenOwner.address),
      hashToken(tokenId3, tokenOwner.address)
    ]
    //let the contract owner sign it (its a buffer)
    const signatures = [
      await admin.signMessage(messages[0]),
      await admin.signMessage(messages[1])
    ]

    //let the contract owner lazy mint a token for the token owner
    await admin.withContract.redeem(
      tokenId2,
      tokenOwner.address,
      signatures[0]
    )

    //let the token owner lazy mint a token for themself
    await tokenOwner.withContract.redeem(
      tokenId3,
      tokenOwner.address,
      signatures[1]
    )

    expect(await admin.withContract.ownerOf(tokenId2)).to.equal(tokenOwner.address)
    expect(await admin.withContract.ownerOf(tokenId3)).to.equal(tokenOwner.address)
  })
})