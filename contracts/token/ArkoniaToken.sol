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

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// ============ Errors ============

error InvalidCall();

// ============ Contract ============

contract ArkoniaToken is
  Initializable,
  ContextUpgradeable,
  PausableUpgradeable,
  AccessControlUpgradeable,
  ERC20BurnableUpgradeable,
  ERC20CappedUpgradeable,
  UUPSUpgradeable
{
  // ============ Constants ============
  
  //all custom roles
  bytes32 public constant BANNER_ROLE = keccak256("BANNER_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  // ============ Storage ============

  //mapping of address to blacklisted
  mapping(address => bool) private _blacklisted;
  //blacklist event
  event Blacklist(address indexed blacklisted, bool yesno);

  // ============ Deploy ============

  /**
   * @dev Sets the name and symbol. Sets the fixed supply.
   * Grants `DEFAULT_ADMIN_ROLE` to the specified admin.
   */
  
  function initialize(address admin) public initializer {
    __ERC20_init("Arkonia", "AOD");
    __ERC20Capped_init(1000000000 ether);
    __ERC20Burnable_init();

    __Context_init();
    __Pausable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    //set up roles for contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    //prevent unauthorized transfers
    _pause();
  }

  /**
   * @dev Required method for upgradeable contracts
   */

  // solhint-disable-next-line no-empty-blocks
  function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

  // ============ Read Methods ============

  /**
   * @dev Returns true `badactor` is blacklisted
   */
  function isBlacklisted(address badactor) 
    external view virtual returns (bool) 
  {
    return _blacklisted[badactor];
  }

  // ============ Write Methods ============

  /**
   * @dev Blacklists or whitelists a `badactor` from
   * sending or receiving funds
   */
  function blacklist(address badactor, bool yesno) 
    external virtual onlyRole(BANNER_ROLE) 
  {
    _blacklist(badactor, yesno);
  }

  /**
   * @dev Creates `amount` new tokens for `to`.
   */
  function mint(address to, uint256 amount) 
    external virtual onlyRole(MINTER_ROLE) 
  {
    _mint(to, amount);
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() 
    external virtual onlyRole(PAUSER_ROLE) 
  {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() 
    external virtual onlyRole(PAUSER_ROLE) 
  {
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
    if (_blacklisted[to]) revert InvalidCall();

    if (!hasRole(MINTER_ROLE, _msgSender()) 
      && !hasRole(MINTER_ROLE, from)
      && paused()
    ) revert InvalidCall();

    super._beforeTokenTransfer(from, to, amount);
  }

  /**
   * @dev Internally blacklists or whitelists a `badactor`
   */
  function _blacklist(address actor, bool bad) internal virtual {
    _blacklisted[actor] = bad;
    emit Blacklist(actor, bad);
  }

  /**
   * @dev See {ERC20-_mint}.
   */
  function _mint(address account, uint256 amount) 
    internal virtual override(ERC20Upgradeable, ERC20CappedUpgradeable) 
  {
    super._mint(account, amount);
  }
}
