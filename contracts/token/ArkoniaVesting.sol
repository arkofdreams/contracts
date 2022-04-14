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

// ============ Interfaces ============

interface IMintableToken is IERC20 {
  function mint(address to, uint256 amount) external;
}

// ============ Errors ============

error InvalidCall();

// ============ Contract ============

contract ArkoniaVesting is Pausable, AccessControlEnumerable, ReentrancyGuard {
  //used in release()
  using Address for address;

  // ============ Events ============

  event ERC20Released(
    address indexed token, 
    address indexed beneficiary, 
    uint256 amount
  );

  event EtherRefunded(address indexed beneficiary, uint256 amount);

  // ============ Structs ============

  struct Vesting {
    //the start date of when to start vesting
    uint256 startDate;
    //the end date of when to fulfill vesting
    uint256 endDate;
    //total amount of tokens vesting
    uint256 total;
    //amount of tokens already released
    uint256 released;
  }

  // ============ Constants ============

  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant VESTER_ROLE = keccak256("VESTER_ROLE");

  //this is the contract address for $ARKONIA
  IMintableToken public immutable TOKEN;

  // ============ Store ============

  //mapping of address to Vesting
  mapping(address => Vesting) public vesting;

  // ============ Deploy ============

  /**
   * @dev Sets the `token`, `treasury` and `economy` addresses. Grants 
   * `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
   */
  constructor(IMintableToken token, address admin) {
    //set up roles for the admin
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    //set the $AOD address
    TOKEN = token;
  }

  // ============ Read Methods ============

  /**
   * @dev Calculates the amount of tokens that are releasable. 
   * Default implementation is a linear vesting curve.
   */
  function totalReleasableAmount(address beneficiary, uint64 timestamp) 
    public view returns (uint256) 
  {
    uint amount = totalVestedAmount(beneficiary, timestamp);
    return amount - vesting[beneficiary].released;
  }

  /**
   * @dev Calculates the amount of tokens that has already vested. 
   * Default implementation is a linear vesting curve.
   */
  function totalVestedAmount(address beneficiary, uint64 timestamp) 
    public view returns (uint256) 
  {
    //if vesting date is not set
    if (vesting[beneficiary].endDate == 0) {
      //nothing can be vested
      return 0;
    }

    //if time now is more than the vested date
    if (timestamp > vesting[beneficiary].endDate) {
      //release all the tokens
      return vesting[beneficiary].total;
    }

    //determine the vesting duration in seconds
    uint256 duration = vesting[beneficiary].endDate - vesting[beneficiary].startDate;
    //determine the elapsed time that has passed
    uint256 elapsed = timestamp - vesting[beneficiary].startDate;
    //this is the max possible tokens we can release
    //total vesting tokens * elapsed / duration
    return (vesting[beneficiary].total * elapsed) / duration;
  }

  // ============ Write Methods ============

  /**
   * @dev Release $ARKONIA that have already vested.
   *
   * Emits a {TokensReleased} event.
   */
  function release(address beneficiary) public nonReentrant {
    //if paused or not unlocked yet
    if (paused()) revert InvalidCall();

    //releasable calc by total releaseable amount - amount already released
    uint256 releasable = totalReleasableAmount(
      beneficiary, 
      uint64(block.timestamp)
    );
    if (releasable == 0) revert InvalidCall();
    //already account for the new tokens
    vesting[beneficiary].released += releasable;
    //next mint tokens
    address(TOKEN).functionCall(
      abi.encodeWithSelector(
        TOKEN.mint.selector, 
        beneficiary, 
        releasable
      ), 
      "Low-level mint failed"
    );
    //finally emit released
    emit ERC20Released(address(TOKEN), beneficiary, releasable);
  }

  // ============ Admin Methods ============

  /**
   * @dev Pauses all token transfers.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev Allow an admin to manually vest a `beneficiary` for an `amount`
   */
  function vest(
    address beneficiary, 
    uint256 amount, 
    uint256 startDate, 
    uint256 endDate
  ) public onlyRole(VESTER_ROLE) {
    // if no amount or refunding
    if (amount == 0) revert InvalidCall();
    //now add to the beneficiary
    vesting[beneficiary] = Vesting(startDate, endDate, amount, 0);
  }
}