// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IAOD is IERC20 {
  function mint(address to, uint256 amount) external;
}

contract AODTokenSale is Context, AccessControlEnumerable, ReentrancyGuard {
  //so we can invoke mint function in vest and invest
  using Address for address;
  event ERC20Released(address indexed token, uint256 amount);
  //this is where the BUSD will go
  address private _fund;
  //these are the tokens we are swapping
  IAOD public AOD;
  IERC20 public BUSD;

  //token sale start date (when to start accepting entries)
  uint64 public startDate;
  //token sale end date (when to stop accepting entries)
  uint64 public endDate;
  //the timestamp when all accounts are fully vested
  uint64 public vestedDate;
  //the timestamp of the token generated event
  uint64 public tokenGeneratedEvent;
  //the lock period to be applied after the token generated event
  //(after the lock period accounts can now withdraw)
  uint64 public lockPeriod;
  //the BUSD price per AOD token
  uint256 public tokenPrice;
  //the total possoble locked AOD tokens that are allocated for this sale
  uint256 public totalPossibleLockedTokens;
  //the total possoble vested AOD tokens that are allocated for this sale
  uint256 public totalPossibleVestedTokens;
  //the total AOD tokens that are currently allocated
  uint256 public currentlyAllocated;
  
  //a data struct for an account
  struct Account {
    //the amount of BUSD they used to purchase AOD
    uint256 busdAmount;
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

  //mapping of address to token sale stage
  mapping(address => Account) public accounts;

  /**
   * @dev sets the tokens `aod` and `busd` to be swapped. Grants 
   * `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
   */
  constructor(
    address aod, 
    address busd, 
    address fund,
    uint64 _startDate,
    uint64 _endDate,
    uint64 _vestedDate,
    uint64 _lockPeriod,
    uint256 _tokenPrice,
    uint256 _lockedTokens,
    uint256 _vestedTokens
  ) {
    //set up roles for the contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    //set the fund address
    _fund = fund;
    //set the AOD and BUSD interface
    AOD = IAOD(aod);
    BUSD = IERC20(busd);

    startDate = _startDate;
    endDate = _endDate;
    vestedDate = _vestedDate;
    lockPeriod = _lockPeriod;
    tokenPrice = _tokenPrice;
    totalPossibleLockedTokens = _lockedTokens;
    totalPossibleVestedTokens = _vestedTokens;
  }

  /**
   * @dev Returns the vested smart wallet address of the `beneficiary`
   */
  function account(address beneficiary) 
    public virtual view returns(Account memory) 
  {
    return accounts[beneficiary];
  }

  /**
   * @dev Allows anyone to invest during the current stage for an `amount`
   */
  function buy(uint256 aodAmount) external virtual nonReentrant {
    //check if aodAmount
    require(aodAmount > 0, "AOD amount missing");
    //check for valid stage
    require(canVest(), "Not for sale");
    //calculate busd amount
    uint256 busdAmount = (aodAmount * tokenPrice) / 1 ether;
    require(busdAmount > 0, "Amount is too small");
    address beneficiary = _msgSender();
    //check allowance
    require(
      BUSD.allowance(beneficiary, address(this)) >= busdAmount, 
      "Contract not approved to transfer BUSD"
    );
    //now accept the payment
    SafeERC20.safeTransferFrom(BUSD, beneficiary, _fund, busdAmount);
    //last start vesting
    _vest(beneficiary, aodAmount, busdAmount);
  }

  /**
   * @dev Returns true if user can vest
   */
  function canVest() public view returns(bool) {
    uint64 timenow = uint64(block.timestamp);
    return startDate <= timenow && timenow <= endDate;
  }

  /**
   * @dev Release the tokens that have already vested.
   *
   * Emits a {TokensReleased} event.
   */
  function release() public virtual nonReentrant {
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
    tokenGeneratedEvent = timestamp;
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
      uint64 unlockDate = tokenGeneratedEvent + lockPeriod;
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
    //if time now is more than the vesteddate
    if (timestamp > vestedDate) {
      //release all the tokens
      return _account.vestingTokens;
    }
    //the start clock should be after the lock period
    uint64 start = tokenGeneratedEvent + lockPeriod;
    //if time is less than the start clock
    if (timestamp < start) {
      //no tokens releasable
      return 0;
    }
    //determine the vesting duration in seconds
    uint64 duration = vestedDate - start;
    //determine the elapsed time that has passed
    uint64 elapsed = timestamp - start;
    //this is the max possible tokens we can release
    //total vesting tokens * elapsed / duration
    return (_account.vestingTokens * elapsed) / duration;
  }

  /**
   * @dev Allow an admin to manually vest a `beneficiary` for an `amount`
   */
  function vest(address beneficiary, uint256 aodAmount) 
    public virtual onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    //check for valid stage
    require(canVest(), "Not for sale");
    _vest(beneficiary, aodAmount, 0); 
  }

  /**
   * @dev Vest a `beneficiary` for an `aodAmount` and track how much
   * `busdAmount` was paid
   */
  function _vest(
    address beneficiary, 
    uint256 aodAmount, 
    uint256 busdAmount
  ) internal virtual {
    //check if vested
    require(!accounts[beneficiary].active, "Beneficiary already vested");
    //check if aodAmount
    require(aodAmount > 0, "AOD amount missing");
    //calc max tokens that can be allocated
    uint256 maxAllocation = totalPossibleLockedTokens + totalPossibleVestedTokens;
    require(
      (currentlyAllocated + aodAmount) <= maxAllocation, 
      "Amount exceeds the available allocation"
    );
    //split the AOD amount by 10%
    uint256 lockedTokens = aodAmount * 1 ether / 10 ether;
    uint256 vestingTokens = aodAmount * 9 ether / 10 ether;
    //now add the account
    accounts[beneficiary] = Account(
      busdAmount,
      lockedTokens,
      vestingTokens,
      0, false, true
    );

    //next mint tokens to the wallet just created
    address(AOD).functionCall(
      abi.encodeWithSelector(AOD.mint.selector, address(this), aodAmount), 
      "Low-level mint failed"
    );
    //add amount to the allocated
    currentlyAllocated += aodAmount;
  }
}