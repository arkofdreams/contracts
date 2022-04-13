// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
 * @dev BUSD mock token
 */
contract BUSDToken is AccessControlEnumerable, ERC20 {
  /**
   * @dev Sets the name and symbol. Grants `DEFAULT_ADMIN_ROLE` to
   * the account that deploys the contract.
   */
  constructor() ERC20("Binance USD", "BUSD") {
    //set up roles for contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  /**
   * @dev Creates `amount` new tokens.
   */
  function mint(address to, uint256 amount) public virtual {
    _mint(to, amount);
  }
}
