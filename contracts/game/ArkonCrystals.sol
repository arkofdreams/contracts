// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//                _             __   _____                               
//     /\        | |           / _| |  __ \                              
//    /  \   _ __| | __   ___ | |_  | |  | |_ __ ___  __ _ _ __ ___  ___ 
//   / /\ \ | '__| |/ /  / _ \|  _| | |  | | '__/ _ \/ _` | '_ ` _ \/ __|
//  / ____ \| |  |   <  | (_) | |   | |__| | | |  __/ (_| | | | | | \__ \
// /_/    \_\_|  |_|\_\  \___/|_|   |_____/|_|  \___|\__,_|_| |_| |_|___/
//
// Connecting your real world to the metaverse
// http://www.arkofdreams.io/
//

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// ============ Errors ============

error InvalidCall();

// ============ Contract ============

contract ArkonCrystals is Pausable, AccessControl, ERC20 {

  // ============ Constants ============

  //all custom roles
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  // ============ Deploy ============

  /**
   * @dev Sets the name and symbol. Grants `DEFAULT_ADMIN_ROLE`
   * to the admin
   */
  constructor(address admin) ERC20("ArkonCrystals", "ARKON") {
    //set up roles for contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    _setupRole(PAUSER_ROLE, admin);
  }

  // ============ Write Methods ============

  /**
   * @dev Destroys `amount` tokens from the caller.
   *
   * See {ERC20-_burn}.
   */
  function burn(uint256 amount) external virtual {
    _burn(_msgSender(), amount);
  }

  /**
   * @dev Destroys `amount` tokens from `account`, deducting from the caller's
   * allowance.
   *
   * See {ERC20-_burn} and {ERC20-allowance}.
   *
   * Requirements:
   *
   * - the caller must have allowance for ``accounts``'s tokens of at least
   * `amount`.
   */
  function burnFrom(address account, uint256 amount) external virtual {
    address operator = _msgSender();
    if (!hasRole(BURNER_ROLE, operator)) {
      uint256 currentAllowance = allowance(account, operator);
      require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
      unchecked {
        _approve(account, operator, currentAllowance - amount);
      }
    }

    _burn(account, amount);
  }

  // ============ Admin Methods ============

  /**
   * @dev Creates `amount` new tokens for `to`.
   */
  function mint(
    address to, 
    uint256 amount
  ) external whenNotPaused onlyRole(MINTER_ROLE) {
    _mint(to, amount);
  }
  
  /**
   * @dev Allows anyone to redeem with a proof
   */
  function redeem(
    address to, 
    uint256 amount,
    bytes memory proof
  ) external whenNotPaused {
    //make sure the minter signed this off
    if (!hasRole(MINTER_ROLE, ECDSA.recover(
      ECDSA.toEthSignedMessageHash(
        keccak256(abi.encodePacked("redeem", to, amount))
      ),
      proof
    ))) revert InvalidCall();
    //mint out
     _mint(to, amount);
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() external virtual onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() external virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  // ============ Internal Methods ============

  /**
   * @dev Checks blacklist before token transfer
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    if (!hasRole(MINTER_ROLE, _msgSender()) && !hasRole(MINTER_ROLE, from)) {
      require(!paused(), "Token transfer while paused");
    }

    super._beforeTokenTransfer(from, to, amount);
  }
}