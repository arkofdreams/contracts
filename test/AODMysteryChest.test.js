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

function hashToken(tokenId, recipient) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(
      ['uint256', 'address'],
      [tokenId, recipient]
    ).slice(2),
    'hex'
  )
}

describe('AODMysteryChest Tests', function () {
  it('Should mint and lazy mint', async function () {
    const contractURI = 'https://ipfs.io/ipfs/QmbzCzGBDGc1VYhXBp7RxHbnKxWyssrPHLrKv2fXPz8gZs'
    const tokenURI = 'https://ipfs.io/ipfs/QmWhjjSQpBQ7Hmmo4XTLWTXtTqBfuWC4X1vjitdMWp6G8n'
    const [contractOwner, tokenOwner] = await getSigners(
      'AODMysteryChest',
      'Ark of Dreams Mystery Chest',
      'AODTC',
      contractURI,
      tokenURI
    )

    //----------------------------------------//
    // This is the minting
    const tokenId = 200
    //fast forward ... (go straight to the token owner)
    await contractOwner.withContract.mint(tokenId, tokenOwner.address)
    expect(await contractOwner.withContract.ownerOf(tokenId)).to.equal(tokenOwner.address)
    expect(await contractOwner.withContract.tokenURI(tokenId)).to.equal(tokenURI)

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
      await contractOwner.signMessage(messages[0]),
      await contractOwner.signMessage(messages[1])
    ]

    //let the contract owner lazy mint a token for the token owner
    await contractOwner.withContract.lazyMint(
      tokenId2,
      tokenOwner.address,
      signatures[0]
    )

    //let the token owner lazy mint a token for themself
    await tokenOwner.withContract.lazyMint(
      tokenId3,
      tokenOwner.address,
      signatures[1]
    )

    expect(await contractOwner.withContract.ownerOf(tokenId2)).to.equal(tokenOwner.address)
    expect(await contractOwner.withContract.ownerOf(tokenId3)).to.equal(tokenOwner.address)
  })

  it('Should stress lazy minting', async function () {
    const contractURI = 'https://ipfs.io/ipfs/QmbzCzGBDGc1VYhXBp7RxHbnKxWyssrPHLrKv2fXPz8gZs'
    const tokenURI = 'https://ipfs.io/ipfs/QmWhjjSQpBQ7Hmmo4XTLWTXtTqBfuWC4X1vjitdMWp6G8n'
    const [contractOwner, tokenOwner] = await getSigners(
      'AODMysteryChest',
      'Ark of Dreams Mystery Chest',
      'AODTC',
      contractURI,
      tokenURI
    )
  
    //----------------------------------------//
    // This is the lazy mint
    //define tokens
    const tokenId1 = 200
    const tokenId2 = 300
    const tokenId3 = 400

    //make a message (its a buffer)
    const messages = [
      hashToken(tokenId1, tokenOwner.address),
      hashToken(tokenId2, tokenOwner.address),
      hashToken(tokenId3, tokenOwner.address)
    ]

    //let the contract owner sign it (its a buffer)
    const signatures = [
      await contractOwner.signMessage(messages[0]),
      await contractOwner.signMessage(messages[1]),
      await contractOwner.signMessage(messages[2])
    ]

    //let the contract owner lazy mint a token for the token owner
    await contractOwner.withContract.lazyMint(
      tokenId1,
      tokenOwner.address,
      signatures[0]
    )

    //let the token owner lazy mint a token for themself
    await tokenOwner.withContract.lazyMint(
      tokenId2,
      tokenOwner.address,
      signatures[1]
    )

    //----------------------------------------//
    // This is the test
    expect(await contractOwner.withContract.ownerOf(tokenId1)).to.equal(tokenOwner.address)
    expect(await contractOwner.withContract.ownerOf(tokenId2)).to.equal(tokenOwner.address)
    expect(await contractOwner.withContract.tokenURI(tokenId1)).to.equal(tokenURI)
    expect(await contractOwner.withContract.tokenURI(tokenId2)).to.equal(tokenURI)

    //let the token owner mint a token that they already have
    expect(
      tokenOwner.withContract.lazyMint(
        tokenId1,
        tokenOwner.address,
        signatures[0]
      )
    ).to.be.revertedWith('ERC721: token already minted')

    //let the contract owner redeem a token for themself
    expect(
      contractOwner.withContract.lazyMint(
        tokenId2,
        contractOwner.address,
        signatures[1]
      )
    ).to.be.revertedWith('Invalid proof.')

    //let the contract owner redeem a token an unclaimed token for themself using a valid signature
    expect(
      contractOwner.withContract.lazyMint(
        tokenId3,
        contractOwner.address,
        signatures[2]
      )
    ).to.be.revertedWith('Invalid proof.')
  })

  it('Should stress minting', async function () {
    const contractURI = 'https://ipfs.io/ipfs/QmbzCzGBDGc1VYhXBp7RxHbnKxWyssrPHLrKv2fXPz8gZs'
    const tokenURI = 'https://ipfs.io/ipfs/QmWhjjSQpBQ7Hmmo4XTLWTXtTqBfuWC4X1vjitdMWp6G8n'
    const [contractOwner, tokenOwner] = await getSigners(
      'AODMysteryChest',
      'Ark of Dreams Mystery Chest',
      'AODTC',
      contractURI,
      tokenURI
    )

    //----------------------------------------//
    // This is the minting
    const tokenId = 200
    //fast forward ... (go straight to the token owner)
    await contractOwner.withContract.mint(tokenId, tokenOwner.address)
    expect(await contractOwner.withContract.ownerOf(tokenId)).to.equal(tokenOwner.address)
    expect(await contractOwner.withContract.tokenURI(tokenId)).to.equal(tokenURI)

    //----------------------------------------//
    // This is the test
    //try to mint the same token again
    expect(
      contractOwner.withContract.mint(tokenId, contractOwner.address)
    ).to.be.revertedWith('ERC721: token already minted')
  })

  it('Should support BEP721', async function () {
    const contractURI = 'https://ipfs.io/ipfs/QmbzCzGBDGc1VYhXBp7RxHbnKxWyssrPHLrKv2fXPz8gZs'
    const tokenURI = 'https://ipfs.io/ipfs/QmWhjjSQpBQ7Hmmo4XTLWTXtTqBfuWC4X1vjitdMWp6G8n'
    const [contractOwner, tokenOwner] = await getSigners(
      'AODMysteryChest',
      'Ark of Dreams Mystery Chest',
      'AODTC',
      contractURI,
      tokenURI
    )

    //----------------------------------------//
    // This is the minting
    const tokenId = 200
    //fast forward ... (go straight to the token owner)
    await contractOwner.withContract.mint(tokenId, tokenOwner.address)
    expect(await contractOwner.withContract.ownerOf(tokenId)).to.equal(tokenOwner.address)
    expect(await contractOwner.withContract.tokenURI(tokenId)).to.equal(tokenURI)

    //----------------------------------------//
    // This is the test
    expect(await contractOwner.withContract.name()).to.equal('Ark of Dreams Mystery Chest')
    expect(await contractOwner.withContract.symbol()).to.equal('AODTC')
    expect(await contractOwner.withContract.totalSupply()).to.equal(1)
    expect(await contractOwner.withContract.balanceOf(tokenOwner.address)).to.equal(1)
  })
})