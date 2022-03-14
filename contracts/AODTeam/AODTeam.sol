// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IAOD is IERC20 {
  function mint(address to, uint256 amount) external;
}

contract AODTeam is 
  Context, 
  Pausable, 
  AccessControlEnumerable, 
  ReentrancyGuard 
{
  //so we can invoke mint function in vest and invest
  using Address for address;

  // ============ Constants ============
  
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  //Vested Date - April 21, 2024 (GMT)
  //the timestamp when all accounts are fully vested
  uint64 constant public VESTED_DATE = 1713657600;
  
  //Lock Period - 6 months
  //the lock period to be applied after the token generated event
  //(after the lock period accounts can now withdraw)
  uint64 constant public LOCK_PERIOD = 15552000;
  
  //the total possoble locked AOD tokens that are allocated for this sale
  uint256 constant public TOTAL_POSSIBLE_LOCKED_TOKENS =  90000000 ether;
  
  //the total possoble vested AOD tokens that are allocated for this sale
  uint256 constant public TOTAL_POSSIBLE_VESTED_TOKENS = 10000000 ether;
  
  // ============ Events ============

  event ERC20Released(address indexed token, uint256 amount);

  // ============ Structs ============

  //a data struct for an account
  struct Account {
    //the amount of AOD tokens locked
    uint256 lockedTokens;
    //the amount of AOD tokens vesting
    uint256 vestingTokens;
    //the amount of AOD tokens already released
    uint256 releasedTokens;
    //whether if they already unlocked a token
    bool unlocked;
    //patch for a quirk to determine an account vs the default values
    bool active;
  }

  // ============ Storage ============

  //these are the tokens we are swapping
  IAOD public AOD;

  //the timestamp of the token generated event
  uint64 public tokenGeneratedEvent;
  //the total AOD tokens that are currently allocated
  uint256 public currentlyAllocated;
  
  //mapping of address to token sale stage
  mapping(address => Account) public accounts;

  // ============ Deploy ============

  /**
   * @dev sets the tokens `aod` and `busd` to be swapped. Grants 
   * `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
   */
  constructor(address aod) {
    //set up roles for the contract creator
    address sender = _msgSender();
    _setupRole(DEFAULT_ADMIN_ROLE, sender);
    _setupRole(PAUSER_ROLE, sender);
    //set the AOD interface
    AOD = IAOD(aod);
  }

  // ============ Read Methods ============

  /**
   * @dev Returns the vested smart wallet address of the `beneficiary`
   */
  function account(address beneficiary) 
    public virtual view returns(Account memory) 
  {
    return accounts[beneficiary];
  }

  /**
   * @dev Calculates the amount of tokens that are releasable. 
   * Default implementation is a linear vesting curve.
   */
  function totalReleasableAmount(address beneficiary, uint64 timestamp) 
    public view virtual returns (uint256) 
  {
    uint amount = totalVestedAmount(beneficiary, timestamp);
    if (tokenGeneratedEvent > 0) {
      //the unlock date should be after the lock period
      uint64 unlockDate = tokenGeneratedEvent + LOCK_PERIOD;
      //if the time is greater than the unlock date
      if (timestamp >= unlockDate) {
        amount += accounts[beneficiary].lockedTokens;
      }
    }
    
    return amount - accounts[beneficiary].releasedTokens;
  }

  /**
   * @dev Calculates the amount of tokens that has already vested. 
   * Default implementation is a linear vesting curve.
   */
  function totalVestedAmount(address beneficiary, uint64 timestamp) 
    public view virtual returns (uint256) 
  {
    //if no tge or time now is less than tge
    if (tokenGeneratedEvent == 0) {
      //no tokens releasable
      return 0;
    } 
    //get the beneficiary account info
    Account memory _account = accounts[beneficiary];
    //if time now is more than the vested date
    if (timestamp > VESTED_DATE) {
      //release all the tokens
      return _account.vestingTokens;
    }
    //the start clock should be after the lock period
    uint64 start = tokenGeneratedEvent + LOCK_PERIOD;
    //if time is less than the start clock
    if (timestamp < start) {
      //no tokens releasable
      return 0;
    }
    //determine the vesting duration in seconds
    uint64 duration = VESTED_DATE - start;
    //determine the elapsed time that has passed
    uint64 elapsed = timestamp - start;
    //this is the max possible tokens we can release
    //total vesting tokens * elapsed / duration
    return (_account.vestingTokens * elapsed) / duration;
  }

  // ============ Write Methods ============

  /**
   * @dev Pauses all token transfers.
   */
  function pause() public virtual onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Release the tokens that have already vested.
   *
   * Emits a {TokensReleased} event.
   */
  function release() public virtual nonReentrant {
    require(!paused(), "Releasing while paused");
    //wait for tge
    require(tokenGeneratedEvent > 0, "Token generation event not triggered yet");
    address beneficiary = _msgSender();
    //releasable calc by total releaseable amount - amount already released
    uint256 releasable = totalReleasableAmount(beneficiary, uint64(block.timestamp));
    require(releasable > 0, "No tokens releasable");
    //already account for the new tokens
    accounts[beneficiary].releasedTokens += releasable;
    //next mint tokens
    address(AOD).functionCall(
      abi.encodeWithSelector(
        AOD.mint.selector, 
        beneficiary, 
        releasable
      ), 
      "Low-level mint failed"
    );
    //unlocked tokens are now unlocked
    accounts[beneficiary].unlocked = true;
    //finally emit released
    emit ERC20Released(address(AOD), releasable);
  }

  /**
   * @dev Triggers the TGE
   */
  function trigger(uint64 timestamp) public virtual onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    require(
      tokenGeneratedEvent == 0, 
      "Token generation event already triggered"
    );

    require(timestamp <= VESTED_DATE, "Timestamp out of bounds");
    tokenGeneratedEvent = timestamp;
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev Allow an admin to manually vest a `beneficiary` for an `amount`
   */
  function vest(address beneficiary, uint256 aodAmount) 
    public virtual onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    //check if vested
    require(!accounts[beneficiary].active, "Beneficiary already vested");
    //check if aodAmount
    require(aodAmount > 0, "AOD amount missing");
    //calc new allocation
    uint256 newAllocation = currentlyAllocated + aodAmount;
    //calc max tokens that can be allocated
    uint256 maxAllocation = TOTAL_POSSIBLE_LOCKED_TOKENS + TOTAL_POSSIBLE_VESTED_TOKENS;
    require(newAllocation <= maxAllocation, "Amount exceeds the available allocation");
    //split the AOD amount by 10%
    uint256 lockedTokens = aodAmount * 1 ether / 10 ether;
    uint256 vestingTokens = aodAmount * 9 ether / 10 ether;
    //now add the account
    accounts[beneficiary] = Account(
      lockedTokens,
      vestingTokens,
      0, false, true
    );
    //add amount to the allocated
    currentlyAllocated += aodAmount;
  }

  // ============ Emergency Methods ============

  /**
   * @dev This contract should not hold any funds in the first place. 
   * This method exists to transfer out stuck funds.
   */
  function emergencyTransfer(address to, uint256 amount) 
    external virtual onlyRole(DEFAULT_ADMIN_ROLE)
  {
    Address.sendValue(payable(to), amount);
  }

  /**
   * @dev This contract should not hold any funds in the first place. 
   * This method exists to transfer out stuck funds.
   */
  function emergencyERC20Transfer(address erc20, address to, uint256 amount) 
    external virtual onlyRole(DEFAULT_ADMIN_ROLE)
  {
    SafeERC20.safeTransfer(IERC20(erc20), to, amount);
  }
}