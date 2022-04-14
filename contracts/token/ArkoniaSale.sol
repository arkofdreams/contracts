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

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ============ Errors ============

error InvalidCall();

// ============ Interfaces ============

interface IMintableToken is IERC20 {
  function mint(address to, uint256 amount) external;
}

interface IVesting is IERC20 {
  /**
   * @dev Allow an admin to manually vest a `beneficiary` for an `amount`
   */
  function vest(
    address beneficiary, 
    uint256 amount, 
    uint256 startDate, 
    uint256 endDate
  ) external;
}

// ============ Contract ============

contract ArkoniaSale {
  // ============ Constants ============

  IMintableToken public immutable TOKEN;
  IVesting public immutable VESTING;

  // ============ Storage ============

  //the MATIC price per token
  uint256 public currentTokenPrice;
  //the token limit that can be sold
  uint256 public currentTokenLimit;
  //the total tokens that are currently allocated
  uint256 public currentTokenAllocated;
  //the total amount of MATIC that has been withdrawn
  uint256 public currentTotalWithdrawn;
  //mapping of address to ether collected
  mapping(address => uint256) public etherCollected;

  // ============ Deploy ============

  /**
   * @dev Sets the `token`, `treasury` and `economy` addresses. Grants 
   * `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
   */
  constructor(IMintableToken token, IVesting vesting) {
    TOKEN = token;
    VESTING = vesting;
  }

  // ============ Write Methods ============

  /**
   * @dev Allows anyone to invest during the current stage for an `amount`
   */
  function buy(address beneficiary, uint256 amount) 
    external payable nonReentrant 
  {
    if (!canVest(amount)
      //calculate eth amount = 1000 * 0.000005 ether
      || msg.value < ((amount * currentTokenPrice) / 1 ether)
    ) revert InvalidVesting();

    //track ether collected for refund
    etherCollected[beneficiary] += msg.value;
    //last start vesting
    _vest(beneficiary, amount);
  }
}