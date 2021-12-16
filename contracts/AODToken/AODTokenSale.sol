// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./AODVestingWallet.sol";

interface IAOD is IERC20 {
  function mint(address to, uint256 amount) external;
  function grantRole(bytes32 role, address account) external;
}

/**
 * @dev 
 * 1. Deploy AODToken
 * 2. Deploy AODTokenSale
 * 3. In AODToken, grant admin role to AODTokenSale
 */
contract AODTokenSale is Context, AccessControlEnumerable {
  //so we can invoke mint function in vest and invest
  using Address for address;
  event ERC20Released(address indexed token, uint256 amount);
  //AODToken vester role
  bytes32 public constant VESTER_ROLE = keccak256("VESTER_ROLE");
  //this is where the BUSD will go
  address private _fund;
  //these are the tokens we are swapping
  IAOD public AOD;
  IERC20 public BUSD;
  //a data struct for a sale stage
  struct Stage {
    uint64 startDate;
    uint64 vestedDate;
    uint64 generatedDate;
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
    bool active;
    uint16 tokenSaleStage;
  }

  Stage[2] public stages = [
    //private sale
    Stage(
      //Start Date - Dec 21, 2021
      1640016000, 
      //Vested Date - June 21, 2024
      1718899200, 
      //Generated Date - not started
      0,
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
    ),
    //presale
    Stage(
      //Start Date - Jan 17, 2021
      1642348800, 
      //Vested Date - April 21, 2024
      1713632400,  
      //Generated Date - not started
      0,
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
    )
  ];

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
  function buy(uint256 aodAmount) external virtual {
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
    for (uint16 i = 0; i < stages.length; i++) {
      if (stages[i].startDate <= block.timestamp 
        && block.timestamp <= stages[i].vestedDate
      ) {
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
  function release(address beneficiary) public virtual {
    uint256 releasable = vestedAmount(beneficiary, uint64(block.timestamp)) - accounts[beneficiary].releasedTokens;
    accounts[beneficiary].releasedTokens += releasable;
    emit ERC20Released(address(AOD), releasable);
    SafeERC20.safeTransfer(AOD, beneficiary, releasable);
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
   * @dev Calculates the amount of tokens that has already vested. 
   * Default implementation is a linear vesting curve.
   */
  function vestedAmount(address beneficiary, uint64 timestamp) 
    public view virtual returns (uint256) 
  {
    return _vestingSchedule(beneficiary, timestamp);
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
      "Amount exceeds the max allocation"
    );
    //split the AOD amount by 10%
    uint256 lockedTokens = aodAmount * 1 ether / 10 ether;
    uint256 vestingTokens = aodAmount * 9 ether / 10 ether;
    //now add the account
    accounts[beneficiary] = Account(
      busdAmount,
      lockedTokens,
      vestingTokens,
      0, true,
      stage
    );

    //next mint tokens to the wallet just created
    address(AOD).functionCall(
      abi.encodeWithSelector(AOD.mint.selector, address(this), aodAmount), 
      "Low-level mint failed"
    );
    //add amount to the allocated
    stages[stage - 1].allocated += aodAmount;
  }

  /**
   * @dev Virtual implementation of the vesting formula. This returns 
   * the amout vested, as a function of time, for an asset given its 
   * total historical allocation.
   */
  function _vestingSchedule(
    address beneficiary, 
    uint64 timestamp
  ) internal view virtual returns (uint256) {
    Account memory _account = accounts[beneficiary];
    Stage memory stage = stages[_account.tokenSaleStage];
    //if no tge or time now is less than tge
    if (stage.generatedDate == 0 || timestamp < stage.generatedDate) {
      return 0;
    //if time now is more than the vesteddate
    } else if (timestamp > stage.vestedDate) {
      return _account.vestingTokens;
    } else {
      uint64 duration = stage.vestedDate - stage.generatedDate;
      uint64 elapsed = timestamp - stage.generatedDate;
      return _account.vestingTokens * (elapsed / duration);
    }
  }
}