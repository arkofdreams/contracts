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
  //the timestamp of the token generated event
  uint64 public tokenGeneratedEvent;
  //this is where the BUSD will go
  address private _fund;
  //these are the tokens we are swapping
  IAOD public AOD;
  IERC20 public BUSD;
  //a data struct for a sale stage
  struct Stage {
    uint64 startDate;
    uint64 vestedDate;
    uint64 lockPeriod;
    uint256 tokenPrice;
    uint256 lockedTokens;
    uint256 vestedTokens;
    uint256 allocated;
  }
  //a data struct for an account
  struct Account {
    uint256 busdAmount;
    uint256 lockedTokens;
    uint256 vestingTokens;
    uint256 releasedTokens;
    uint16 tokenSaleStage;
    bool unlocked;
    bool active;
  }

  Stage[2] public stages;

  //mapping of address to token sale stage
  mapping(address => Account) public accounts;

  /**
   * @dev sets the tokens `aod` and `busd` to be swapped. Grants 
   * `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
   */
  constructor(address aod, address busd, address fund) {
    //set up roles for the contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    //set the fund address
    _fund = fund;
    //set the AOD and BUSD interface
    AOD = IAOD(aod);
    BUSD = IERC20(busd);
    //add private sale stage
    stages[0] = Stage(
      //Start Date - Dec 21, 2021
      1640016000, 
      //Vested Date - June 21, 2024
      1718899200, 
      //Lock Period - 6 months
      15552000, 
      //BUSD per AOD
      0.025 ether, 
      //Tokens for locked period
      5000000 ether, 
      //Tokens given when fully vested
      45000000 ether, 
      //NOTE: ether is a unit of measurement to express wei
      //total amount currently allocated
      0
    );
    //add presale stage
    stages[1] = Stage(
      //Start Date - Jan 17, 2022
      1642348800, 
      //Vested Date - April 21, 2024
      1713632400,  
      //Lock Period - 3 months
      7776000, 
      //BUSD per AOD
      0.05 ether, 
      //Tokens for locked period
      5000000 ether, 
      //Tokens given when fully vested
      45000000 ether,
      //NOTE: ether is a unit of measurement to express wei
      //total amount currently allocated
      0
    );
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
    //get current stage
    uint16 stage = current();
    //check for valid stage
    require(stage > 0, "Not for sale");
    //calculate busd amount
    uint256 busdAmount = (aodAmount * stages[stage - 1].tokenPrice) / 1 ether;
    require(busdAmount > 0, "Amount is too small");
    address beneficiary = _msgSender();
    //start vesting
    _vest(beneficiary, aodAmount, busdAmount);
    //now accept the payment
    require(
      BUSD.allowance(beneficiary, address(this)) >= busdAmount, 
      "Contract not approved to transfer BUSD"
    );
    SafeERC20.safeTransferFrom(BUSD, beneficiary, _fund, busdAmount);
  }

  /**
   * @dev Returns the current stage index
   */
  function current() public view returns(uint16) {
    //iterate reversely
    for (uint16 i = uint16(stages.length) - 1; i >= 0; i--) {
      if (stages[i].startDate <= block.timestamp) {
        return i + 1;
      }
    }

    return 0;
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
  function trigger() public virtual onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    require(
      tokenGeneratedEvent == 0, 
      "Token generation event already triggered"
    );
    tokenGeneratedEvent = uint64(block.timestamp);
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
      //get the beneficiary account info
      Account memory _account = accounts[beneficiary];
      //get the beneficiary stage info
      Stage memory stage = stages[_account.tokenSaleStage - 1];
      //the unlock date should be after the lock period
      uint64 unlockDate = tokenGeneratedEvent + stage.lockPeriod;
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
    //get the beneficiary stage info
    Stage memory stage = stages[_account.tokenSaleStage - 1];
    //if time now is more than the vesteddate
    if (timestamp > stage.vestedDate) {
      //release all the tokens
      return _account.vestingTokens;
    }
    //the start clock should be after the lock period
    uint64 start = tokenGeneratedEvent + stage.lockPeriod;
    //if time is less than the start clock
    if (timestamp < start) {
      //no tokens releasable
      return 0;
    }
    //determine the vesting duration in seconds
    uint64 duration = stage.vestedDate - start;
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
    //get current stage
    uint16 stage = current();
    //check for valid stage
    require(stage > 0, "Not for sale");
    //calc max tokens that can be allocated
    uint256 maxAllocation = stages[stage - 1].lockedTokens + stages[stage - 1].vestedTokens;
    require(
      (stages[stage - 1].allocated + aodAmount) <= maxAllocation, 
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
      0, stage,
      false, true
    );

    //next mint tokens to the wallet just created
    address(AOD).functionCall(
      abi.encodeWithSelector(AOD.mint.selector, address(this), aodAmount), 
      "Low-level mint failed"
    );
    //add amount to the allocated
    stages[stage - 1].allocated += aodAmount;
  }
}