// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

contract AODVestingWallet is VestingWallet {
  // timestamp when token release is enabled
  uint256 private immutable _releaseTime;
  
  /**
   * @dev Set the beneficiary, start timestamp and vesting 
   * duration of the vesting wallet.
   */
  constructor(
    address beneficiary,
    uint64 start,
    uint64 duration,
    uint256 releaseTime_
  ) VestingWallet(beneficiary, start, duration) {
    _releaseTime = releaseTime_;
  }

  /**
   * @dev Release the native token (ether) that have already vested.
   */
  function release() public virtual override {
    require(
      block.timestamp >= releaseTime(), 
      "Current time is before release time"
    );
    super.release();
  }

  /**
   * @dev Release the tokens that have already vested.
   */
  function release(address token) public virtual override {
    require(
      block.timestamp >= releaseTime(), 
      "Current time is before release time"
    );
    super.release(token);
  }

  /**
   * @return the time when the tokens are released.
   */
  function releaseTime() public view virtual returns (uint256) {
    return _releaseTime;
  }
}