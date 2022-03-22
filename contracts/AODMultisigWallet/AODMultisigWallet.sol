// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract AODMultisigWallet is Context, Pausable, AccessControlEnumerable, ReentrancyGuard {
  //custom roles
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
  bytes32 public constant REQUESTER_ROLE = keccak256("REQUESTER_ROLE");

  //erc20 interface
  IERC20 public BUSD;
  //the minimum approvals needed
  uint256 public approvals;
  //transaction structure
  struct TX {
    address beneficiary;
    uint256 amount;
    uint256 approvals;
    bool executed;
    mapping(address => bool) approved;
  }

  //mapping of id to tx
  mapping(uint256 => TX) public txs;

  /**
   * @dev Sets up roles and sets the BUSD contract address
   */
  constructor(address busd) {
    address sender = _msgSender();
    _setupRole(PAUSER_ROLE, sender);
    _setupRole(REQUESTER_ROLE, sender);
    _setupRole(DEFAULT_ADMIN_ROLE, sender);
    BUSD = IERC20(busd);
  }

  /**
   * @dev Approves a transaction
   */
  function approve(uint256 id) public virtual onlyRole(APPROVER_ROLE) {
    require(!paused(), "Approving is paused");
    //check if tx exists
    require(txs[id].amount > 0, "Transaction does not exist");
    //check if tx exists
    require(!txs[id].executed, "Transaction already executed");
    //require approver didnt already approve
    require(!txs[id].approved[_msgSender()], "Already approved");
    //add to the approval
    txs[id].approvals += 1;
    txs[id].approved[_msgSender()] = true;
    //if enough approvals
    if (!txs[id].executed && txs[id].approvals >= approvals) {
      //go ahead and transfer it
      txs[id].executed = true;
      _safeTransfer(txs[id].beneficiary, txs[id].amount);
    }
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() public virtual onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Makes a transaction request
   */
  function request(
    uint256 id,
    address beneficiary,
    uint256 amount
  ) public virtual onlyRole(REQUESTER_ROLE) {
    require(!paused(), "Requesting is paused");
    //check to see if tx exists
    require(txs[id].amount == 0, "Transaction exists");
    //create a new tx
    txs[id].amount = amount;
    txs[id].beneficiary = beneficiary;
    //if this sender is also an approver
    if (hasRole(APPROVER_ROLE, _msgSender())) {
      //then approve it
      approve(id);
    }
  }

  /**
   * @dev Sets the required approvals in order
   * for a transaction to be executed
   */
  function requiredApprovals(uint256 count) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    approvals = count;
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev Safely transfers `amount` BUSD to `beneficiary`
   */
  function _safeTransfer(address beneficiary, uint256 amount) internal virtual {
    SafeERC20.safeTransfer(BUSD, beneficiary, amount);
  }
}
