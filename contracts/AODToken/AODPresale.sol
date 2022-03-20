// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './AODTokenSale.sol';

contract AODPresale is AODTokenSale {
    //Start Date - March 1, 2022 (GMT)
    //token sale start date (when to start accepting entries)
    uint64 public constant START_DATE = 1646092800;

    //End Date - March 31, 2022 (GMT)
    //token sale end date (when to stop accepting entries)
    uint64 public constant END_DATE = 1648684800;

    //Vested Date - April 21, 2024 (GMT)
    //the timestamp when all accounts are fully vested
    uint64 public constant VESTED_DATE = 1713657600;

    //Lock Period - 3 months
    //the lock period to be applied after the token generated event
    //(after the lock period accounts can now withdraw)
    uint64 public constant LOCK_PERIOD = 7776000;

    //the BUSD price per AOD token
    //NOTE: ether is a unit of measurement to express wei
    uint256 public constant TOKEN_PRICE = 0.05 ether;

    //the min/max BUSD that can be used to purchase AOD
    uint256 public constant MINIMUM_BUSD_AMOUNT = 100 ether;
    uint256 public constant MAXIMUM_BUSD_AMOUNT = 1000 ether;

    //the total possoble locked AOD tokens that are allocated for this sale
    uint256 public constant TOTAL_POSSIBLE_LOCKED_TOKENS = 5000000 ether;

    //the total possoble vested AOD tokens that are allocated for this sale
    uint256 public constant TOTAL_POSSIBLE_VESTED_TOKENS = 45000000 ether;

    constructor(
        address aod,
        address busd,
        address fund
    )
        AODTokenSale(
            aod,
            busd,
            fund,
            START_DATE,
            END_DATE,
            VESTED_DATE,
            LOCK_PERIOD,
            TOKEN_PRICE,
            MINIMUM_BUSD_AMOUNT,
            MAXIMUM_BUSD_AMOUNT,
            TOTAL_POSSIBLE_LOCKED_TOKENS,
            TOTAL_POSSIBLE_VESTED_TOKENS
        )
    {}
}
