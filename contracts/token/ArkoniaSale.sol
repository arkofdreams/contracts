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
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ============ Errors ============

error InvalidCall();

// ============ Interfaces ============

interface IMintableToken is IERC20 {
  function mint(address to, uint256 amount) external;
}

interface IVesting is IERC20 {
  function vest(
    address beneficiary, 
    uint256 amount, 
    uint256 startDate, 
    uint256 endDate
  ) external;
}

// ============ Contract ============

contract ArkoniaSale is Ownable, ReentrancyGuard {
  // ============ Constants ============

  //the token being vested
  IMintableToken public immutable TOKEN;
  //the vesting rules
  IVesting public immutable VESTING;

  // ============ Storage ============

  //the MATIC price per token
  uint256 public currentTokenPrice;
  //the token limit that can be sold
  uint256 public currentTokenLimit;
  //the total tokens that are currently allocated
  uint256 public currentTokenAllocated;
  //the end date of vesting for future purchases
  uint256 public currentVestedDate;

  // ============ Deploy ============

  /**
   * @dev Sets the `token`, `treasury` and `economy` addresses. Grants 
   * `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
   */
  constructor(IMintableToken token, IVesting vesting) {
    TOKEN = token;
    VESTING = vesting;
  }

  // ============ Read Methods ============

  /**
   * @dev Returns true if can buy
   */
  function purchaseable(uint256 amount) public view returns(bool) {
    // if no amount
    return amount > 0 
      //if no price
      && currentTokenPrice > 0 
      //if no limit
      && currentTokenLimit > 0 
      //if the amount exceeds the token limit
      || (currentTokenAllocated + amount) <= currentTokenLimit;
  }

  // ============ Write Methods ============

  /**
   * @dev Allows anyone to invest during the current stage for an `amount`
   */
  function buy(address beneficiary, uint256 amount) 
    external payable nonReentrant 
  {
    if (!purchaseable(amount)
      //calculate eth amount = 1000 * 0.000005 ether
      || msg.value < ((amount * currentTokenPrice) / 1 ether)
    ) revert InvalidCall();

    //last start vesting
    VESTING.vest(beneficiary, amount, block.timestamp, currentVestedDate);
    //add to allocated
    currentTokenAllocated += amount;
  }

  // ============ Admin Methods ============

  /**
   * @dev Sets the current token limit
   */
  function setTokenLimit(uint256 limit) external onlyOwner {
    currentTokenLimit = limit;
  }

  /**
   * @dev Sets the current token price
   */
  function setTokenPrice(uint256 price) external onlyOwner {
    currentTokenPrice = price;
  }

  /**
   * @dev Sets the current vested date
   */
  function setVestedDate(uint256 date) external onlyOwner {
    currentVestedDate = date;
  }
}