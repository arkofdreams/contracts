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
    uint64 releaseDuration;
    uint64 vestingDuration;
    uint256 tokenPrice;
    uint256 maxQuantity;
    uint256 allocated;
  }
  //list of sale stages
  Stage[] private _stages;
  //mapping of beneficiary to vesting waller
  mapping(address => AODVestingWallet) private _vested;

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
   * @dev Adds a stage
   */
  function add(
    uint64 startDate,
    uint64 releaseDuration,
    uint64 vestingDuration,
    uint256 tokenPrice,
    uint256 maxQuantity
  ) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    require(tokenPrice > 0, "Token must have a price");
    _stages.push(Stage(
      startDate, 
      releaseDuration, 
      vestingDuration, 
      tokenPrice, 
      maxQuantity,
      0
    ));
  }

  /**
   * @dev Returns the current stage index
   */
  function current() public view returns(uint) {
    uint64 endDate;
    for (uint i = 0; i < _stages.length; i++) {
      endDate = _stages[i].startDate + _stages[i].vestingDuration;
      if (_stages[i].startDate <= block.timestamp 
        && block.timestamp <= endDate
      ) {
        return i + 1;
      }
    }

    return 0;
  }

  /**
   * @dev Returns the current stage data
   */
  function info() public view returns(Stage memory) {
    Stage memory stage;
    uint index = current();
    if (index > 0) {
      stage = _stages[index - 1];
    }
    return stage;
  }

  /**
   * @dev Allows anyone to invest during the current stage for an `amount`
   */
  function buy(uint256 aodAmount) external virtual {
    uint stage = current();
    require(stage > 0, "Not for sale");
    require(
      (_stages[stage - 1].allocated + aodAmount) <= _stages[stage - 1].maxQuantity, 
      "Amount exceeds the max allocation"
    );
    //calculate busd amount
    uint256 busdAmount = (aodAmount * _stages[stage - 1].tokenPrice) / 1 ether;
    require(busdAmount > 0, "Amount is too small");
    address beneficiary = _msgSender();
    //us first :)
    require(
      BUSD.allowance(beneficiary, address(this)) >= busdAmount, 
      "Contract not approved to transfer BUSD"
    );
    SafeERC20.safeTransferFrom(BUSD, beneficiary, _fund, busdAmount);
    
    //make a new wallet and add it to the vested map
    _vested[beneficiary] = new AODVestingWallet(
      beneficiary, 
      _stages[stage - 1].startDate, 
      _stages[stage - 1].vestingDuration, 
      _stages[stage - 1].releaseDuration
    );
    //add wallet role
    address(AOD).functionCall(
      abi.encodeWithSelector(
        AOD.grantRole.selector, 
        VESTER_ROLE,
        address(_vested[beneficiary])
      ), 
      "Low-level grantRole failed"
    );
    //next mint tokens to the wallet just created
    address(AOD).functionCall(
      abi.encodeWithSelector(
        AOD.mint.selector, 
        address(_vested[beneficiary]), 
        aodAmount
      ), 
      "Low-level mint failed"
    );
    //add amount to the allocated
    _stages[stage - 1].allocated += aodAmount;
  }

  /**
   * @dev Allow an admin to manually vest a `beneficiary` for an `amount`
   */
  function vest(address beneficiary, uint256 amount) 
    public virtual onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    uint stage = current();
    require(stage > 0, "Not for sale");
    require(
      (_stages[stage - 1].allocated + amount) <= _stages[stage - 1].maxQuantity, 
      "Amount exceeds the max allocation"
    );

    //make a new wallet and add it to the vested map
    _vested[beneficiary] = new AODVestingWallet(
      beneficiary, 
      _stages[stage - 1].startDate, 
      _stages[stage - 1].vestingDuration, 
      _stages[stage - 1].releaseDuration
    );
    //add wallet role
    address(AOD).functionCall(
      abi.encodeWithSelector(
        AOD.grantRole.selector, 
        VESTER_ROLE,
        address(_vested[beneficiary])
      ), 
      "Low-level grantRole failed"
    );
    //next mint tokens to the wallet just created
    address(AOD).functionCall(
      abi.encodeWithSelector(
        AOD.mint.selector, 
        address(_vested[beneficiary]), 
        amount
      ), 
      "Low-level mint failed"
    );
    //add amount to the allocated
    _stages[stage - 1].allocated += amount;
  }

  /**
   * @dev Returns the vested smart wallet address of the `beneficiary`
   */
  function vested(address beneficiary) 
    public virtual view returns(address) 
  {
    return address(_vested[beneficiary]);
  }
}