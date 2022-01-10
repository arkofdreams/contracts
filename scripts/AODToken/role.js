//to run this on testnet:
// $ npx hardhat run scripts/AODToken/role.js

function getRole(name) {
  if (!name || name === 'DEFAULT_ADMIN_ROLE') {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  return '0x' + Buffer.from(
    ethers.utils.solidityKeccak256(['string'], [name]).slice(2), 
    'hex'
  ).toString('hex')
}

console.log('REQUESTER_ROLE', getRole('REQUESTER_ROLE'))
console.log('APPROVER_ROLE', getRole('APPROVER_ROLE'))
console.log('MINTER_ROLE', getRole('MINTER_ROLE'))
console.log('PAUSER_ROLE', getRole('PAUSER_ROLE'))
console.log('BANNER_ROLE', getRole('BANNER_ROLE'))