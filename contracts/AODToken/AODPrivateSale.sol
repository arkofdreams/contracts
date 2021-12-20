// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./AODTokenSale.sol";

contract AODPrivateSale is AODTokenSale {
  //Start Date - Dec 21, 2021 (GMT)
  //token sale start date (when to start accepting entries)
  uint64 constant public START_DATE = 1640044800;
  
  //End Date - Jan 16, 2022 (GMT)
  //token sale end date (when to stop accepting entries)
  uint64 constant public END_DATE = 1642291200;
  
  //Vested Date - June 21, 2024
  //the timestamp when all accounts are fully vested
  uint64 constant public VESTED_DATE = 1718928000;
  
  //Lock Period - 6 months
  //the lock period to be applied after the token generated event
  //(after the lock period accounts can now withdraw)
  uint64 constant public LOCK_PERIOD = 15552000;
  
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