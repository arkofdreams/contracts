// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @dev {ERC20} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - ability to blacklist addresses
 *  - a minter role that allows for token minting (creation)
 *  - a pauser role that allows to stop all token transfers
 *
 * This contract uses {AccessControl} to lock permissioned functions
 * using the different roles.
 *
 * The account that deploys the contract will be granted the minter,
 * banner and pauser roles, as well as the default admin role, which
 * will let it grant both minter and pauser roles to other accounts.
 */
contract AODTokenUpgradeable is
  Initializable,
  ContextUpgradeable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable,
  ERC20BurnableUpgradeable,
  ERC20CappedUpgradeable,
  UUPSUpgradeable
{
  // All custom roles
  bytes32 public constant BANNER_ROLE = keccak256("BANNER_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  // Mapping of address to blacklisted
  mapping(address => bool) private _blacklisted;

  // Blacklist event
  event Blacklist(address indexed blacklisted, bool yesno);

  /**
   * @dev Sets the name and symbol. Sets the fixed supply.
   * Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE`
   * to the account that deploys the contract.
   */
  function initialize() public initializer {
    __ERC20_init("Arkonia", "AOD");
    __ERC20Capped_init(1000000000 ether);
    __ERC20Burnable_init();
    __Context_init();
    __Pausable_init();
    __AccessControlEnumerable_init();
    __UUPSUpgradeable_init();

    address sender = _msgSender();

    // Set up roles for contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, sender);
    _setupRole(BANNER_ROLE, sender);
    _setupRole(MINTER_ROLE, sender);
    _setupRole(PAUSER_ROLE, sender);

    // Prevent unauthorized transfers
    _pause();
  }

  /**
   * @dev Blacklists or whitelists a `badactor` from
   * sending or receiving funds
   */
  function blacklist(address badactor, bool yesno) public virtual onlyRole(BANNER_ROLE) {
    _blacklist(badactor, yesno);
  }

  /**
   * @dev Returns true `badactor` is blacklisted
   */
  function isBlacklisted(address badactor) public view virtual returns (bool) {
    return _blacklisted[badactor];
  }

  /**
   * @dev Creates `amount` new tokens for `to`.
   */
  function mint(address to, uint256 amount) public virtual onlyRole(MINTER_ROLE) {
    _mint(to, amount);
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() public virtual onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev Checks blacklist before token transfer
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    require(!_blacklisted[_msgSender()], "Caller is blacklisted");
    require(!_blacklisted[from], "Sender is blacklisted");
    require(!_blacklisted[to], "Recipient is blacklisted");

    if (!hasRole(MINTER_ROLE, _msgSender()) && !hasRole(MINTER_ROLE, from)) {
      require(!paused(), "Token transfer while paused");
    }

    super._beforeTokenTransfer(from, to, amount);
  }

  /**
   * @dev Internally blacklists or whitelists a `badactor`
   */
  function _blacklist(address badactor, bool yesno) internal virtual {
    require(yesno && _blacklisted[badactor] != yesno, "Already blacklisted");
    require(!yesno && _blacklisted[badactor] != yesno, "Already whitelisted");
    _blacklisted[badactor] = yesno;
    emit Blacklist(badactor, yesno);
  }

  /**
   * @dev See {ERC20-_mint}.
   */
  function _mint(address account, uint256 amount) internal virtual override(ERC20Upgradeable, ERC20CappedUpgradeable) {
    super._mint(account, amount);
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
