// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//                _             __   _____                               
//     /\        | |           / _| |  __ \                              
//    /  \   _ __| | __   ___ | |_  | |  | |_ __ ___  __ _ _ __ ___  ___ 
//   / /\ \ | '__| |/ /  / _ \|  _| | |  | | '__/ _ \/ _` | '_ ` _ \/ __|
//  / ____ \| |  |   <  | (_) | |   | |__| | | |  __/ (_| | | | | | \__ \
// /_/    \_\_|  |_|\_\  \___/|_|   |_____/|_|  \___|\__,_|_| |_| |_|___/
//
// Connecting your real world to the metaverse
// http://www.arkofdreams.io/
//

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

// ============ Errors ============

error InvalidCall();

// ============ Contract ============

contract Treasury is 
  Context, 
  Pausable, 
  AccessControlEnumerable, 
  ReentrancyGuard 
{
  // ============ Events ============

  event FundsReceived(address sender, uint256 amount);
  event FundsRequested(uint256 id);
  event RequestCancelled(uint256 id);
  event FundsApprovedFrom(address approver, uint256 id);
  event FundsApproved(uint256 id);
  event FundsWithdrawn(uint256 id);
  
  // ============ Constants ============

  //custom roles
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
  bytes32 public constant REQUESTER_ROLE = keccak256("REQUESTER_ROLE");

  // ============ Structures ============

  //approval structure
  struct Approval {
    //max amount that can be approved
    uint256 max;
    //required approvals
    uint8 required;
    //cooldown between requests
    uint64 cooldown;
    //the next date we can make a request
    uint64 next;
  }

  //transaction structure
  struct TX {
    uint8 tier;
    address beneficiary;
    uint256 amount;
    string uri;
    uint256 approvals;
    bool withdrawn;
    bool cancelled;
    mapping(address => bool) approved;
  }

  // ============ Storage ============

  //mapping of tier to approval
  mapping(uint8 => Approval) public approvalTiers;

  //mapping of id to tx
  mapping(uint256 => TX) public txs;

  // ============ Deploy ============

  /**
   * @dev Sets up roles and approval tiers
   */
  constructor(address admin) payable {
    //setup roles
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    //hard code tiers
    //250 MATIC - 2 approvers - 1 day
    approvalTiers[1] = Approval(250 ether, 2, 86400, 0);
    //2,000 MATIC - 3 approvers - 7 days
    approvalTiers[2] = Approval(2000 ether, 3, 604800, 0);
    //5,000 MATIC - 4 approvers - 30 days
    approvalTiers[3] = Approval(5000 ether, 4, 2592000, 0);
  }

  /**
   * @dev The Ether received will be logged with {PaymentReceived} 
   * events. Note that these events are not fully reliable: it's 
   * possible for a contract to receive Ether without triggering this 
   * function. This only affects the reliability of the events, and not 
   * the actual splitting of Ether.
   *
   * To learn more about this see the Solidity documentation for
   * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
   * functions].
   */
  receive() external payable virtual {
    emit FundsReceived(_msgSender(), msg.value);
  }

  // ============ Read Methods ============

  /**
   * @dev Returns true if tx is approved
   */
  function isApproved(uint256 id) public view returns(bool) {
    return txs[id].approvals >= approvalTiers[txs[id].tier].required;
  }

  /**
   * @dev Determine the tier of a given amount
   */
  function tier(uint256 amount) public view virtual returns(uint8) {
    for (uint8 i = 1; i <= 4; i++) {
      //if amount is less than the max tier
      if (amount <= approvalTiers[i].max) {
        return i;
      }
    }

    return 0;
  }

  // ============ Write Methods ============

  /**
   * @dev Approves a transaction
   */
  function approve(uint256 id) public virtual onlyRole(APPROVER_ROLE) {
    if (paused()
      //check if tx exists
      || txs[id].amount == 0
      //check if cancelled
      || txs[id].cancelled
      //check if withdrawn
      || txs[id].withdrawn
    ) revert InvalidCall();

    address sender = _msgSender();
    //require approver didnt already approve
    if(txs[id].approved[sender]) revert InvalidCall();
    //add to the approval
    txs[id].approvals += 1; 
    txs[id].approved[sender] = true;

    //emit approved
    emit FundsApprovedFrom(sender, id);

    if (isApproved(id)) {
      //emit approved
      emit FundsApproved(id);
    }
  }

  /**
   * @dev Cancels a transaction request
   */
  function cancel(uint256 id) public virtual onlyRole(REQUESTER_ROLE) {
    if (paused()
      //check if tx exists
      || txs[id].amount == 0
      //check if cancelled
      || txs[id].cancelled
      //check if approvals
      || txs[id].approvals > 0
    ) revert InvalidCall();

    //okay cancel it
    txs[id].cancelled = true;
    //update the cooldown
    approvalTiers[txs[id].tier].next = uint64(block.timestamp);
    //emit cancelled
    emit RequestCancelled(id);
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
    uint256 amount,
    string memory uri
  ) public virtual onlyRole(REQUESTER_ROLE) {
    if (paused()
      //check if amount is more than the balance
      || amount > address(this).balance
      //check to see if tx exists
      || txs[id].amount > 0
      //check for valid address
      || beneficiary == address(0) 
      || beneficiary == address(this)
    ) revert InvalidCall();

    //what tier level is this?
    uint8 level = tier(amount);
    //check to see if a tier is found
    if(approvalTiers[level].max == 0) revert InvalidCall();
    //get the time now
    uint64 timenow = uint64(block.timestamp);
    //the time should be greater than the last approved plus the cooldown
    if(timenow < approvalTiers[level].next) revert InvalidCall();

    //create a new tx
    txs[id].uri = uri;
    txs[id].tier = level;
    txs[id].amount = amount;
    txs[id].beneficiary = beneficiary;
    
    //emit funds requested before approved
    emit FundsRequested(id);

    //if this sender is also an approver
    if (hasRole(APPROVER_ROLE, _msgSender())) {
      //then approve it
      approve(id);
    }

    //update the next time they can make a request
    approvalTiers[level].next = timenow + approvalTiers[level].cooldown;
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev Allows transactions to be withdrawn
   */
  function withdraw(uint256 id) external nonReentrant {
    //check for approved funds
    if (txs[id].amount == 0
      //check to see if withdrawn already
      || txs[id].withdrawn
      //check if amount is less than the balance
      || txs[id].amount > address(this).balance
      //is it even approved?
      || !isApproved(id)
    ) revert InvalidCall();

    //go ahead and transfer it
    txs[id].withdrawn = true;
    Address.sendValue(payable(txs[id].beneficiary), txs[id].amount);

    //emit withdrawn
    emit FundsWithdrawn(id);
  }
}