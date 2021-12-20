// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./../AODTokenSale.sol";

contract AODTestnetSale is AODTokenSale {
  //Start Date - Dec 20, 2021 13:30:00
  //token sale start date (when to start accepting entries)
  uint64 constant public START_DATE = 1639978200;
  
  //End Date - Dec 20, 2021 14:00:00
  //token sale end date (when to stop accepting entries)
  uint64 constant public END_DATE = 1639980000;
  
  //Vested Date - Dec 20, 2021 15:00:00
  //the timestamp when all accounts are fully vested
  uint64 constant public VESTED_DATE = 1639983600;
  
  //Lock Period - 10 minutes
  //the lock period to be applied after the token generated event
  //(after the lock period accounts can now withdraw)
  uint64 constant public LOCK_PERIOD = 600;
  
  //the BUSD price per AOD token
  //NOTE: ether is a unit of measurement to express wei
  uint256 constant public TOKEN_PRICE = 0.025 ether;
  
  //the total possoble locked AOD tokens that are allocated for this sale
  uint256 constant public TOTAL_POSSIBLE_LOCKED_TOKENS =  5000000 ether;
  
  //the total possoble vested AOD tokens that are allocated for this sale
  uint256 constant public TOTAL_POSSIBLE_VESTED_TOKENS = 45000000 ether;

  constructor(address aod, address busd, address fund) AODTokenSale(
    aod,
    busd,
    fund,
    START_DATE, 
    END_DATE, 
    VESTED_DATE, 
    LOCK_PERIOD, 
    TOKEN_PRICE, 
    TOTAL_POSSIBLE_LOCKED_TOKENS, 
    TOTAL_POSSIBLE_VESTED_TOKENS
  ) {}
}