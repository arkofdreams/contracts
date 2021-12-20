// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./../AODTokenSale.sol";

contract AODTestnetSale is AODTokenSale {
  //the BUSD price per AOD token
  //NOTE: ether is a unit of measurement to express wei
  uint256 constant public TOKEN_PRICE = 0.025 ether;
  
  //the total possoble locked AOD tokens that are allocated for this sale
  uint256 constant public TOTAL_POSSIBLE_LOCKED_TOKENS =  5000000 ether;
  
  //the total possoble vested AOD tokens that are allocated for this sale
  uint256 constant public TOTAL_POSSIBLE_VESTED_TOKENS = 45000000 ether;

  constructor(
    address aod, 
    address busd, 
    address fund, 
    uint64 start, 
    uint64 end, 
    uint64 locked, 
    uint64 vested
  ) AODTokenSale(
    aod,
    busd,
    fund,
    start, 
    end, 
    vested, 
    locked, 
    TOKEN_PRICE, 
    TOTAL_POSSIBLE_LOCKED_TOKENS, 
    TOTAL_POSSIBLE_VESTED_TOKENS
  ) {}
}