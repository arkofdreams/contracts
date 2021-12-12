// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./AODVestingWallet.sol";

/**
 * @dev {ERC20} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *  - a pauser role that allows to stop all token transfers
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and pauser
 * roles, as well as the default admin role, which will let it grant both minter
 * and pauser roles to other accounts.
 */
contract AODToken is 
  Context, 
  Pausable,
  AccessControlEnumerable, 
  ERC20Burnable, 
  ERC20Capped 
{
  bytes32 public constant BANNER_ROLE = keccak256("BANNER_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant VESTER_ROLE = keccak256("VESTER_ROLE");
  
  mapping(address => bool) private _blacklisted;
  mapping(address => AODVestingWallet) private _vested;
	
  event Blacklist(address indexed blacklisted, bool yesno);

  /**
   * @dev Modifier for banner
   */
  modifier isBanner() {
    require(hasRole(BANNER_ROLE, _msgSender()), "Must be a banner");
    _;
  }

  /**
   * @dev Modifier for minter
   */
  modifier isMinter() {
    require(hasRole(MINTER_ROLE, _msgSender()), "Must be a minter");
    _;
  }

  /**
   * @dev Modifier for minter
   */
  modifier isPauser() {
    require(hasRole(PAUSER_ROLE, _msgSender()), "Must be a pauser");
    _;
  }

  /**
   * @dev Sets the name and symbol. Sets the fixed supply. 
   * Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` 
   * to the account that deploys the contract.
   */
  constructor() 
    ERC20("Arkonia", "AOD")
    ERC20Capped(1000000000) 
  {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

    _setupRole(BANNER_ROLE, _msgSender());
    _setupRole(MINTER_ROLE, _msgSender());
    _setupRole(PAUSER_ROLE, _msgSender());
    _pause();
  }

  /**
   * @dev Blacklists or whitelists a `badactor` from 
   * sending or receiving funds 
   */
  function blacklist(address badactor,  bool yesno) public isBanner {
	  _blacklist(badactor, yesno);
  }

  /**
   * @dev Creates a vesting plan of `amount` for `beneficiary` starting
   * at `start` for `duration` long with an initial `release` date
   */
  function invest(
    address beneficiary,
    uint256 amount,
    uint64 start,
    uint64 duration,
    uint256 release
  ) public virtual {
    //make a new wallet and add it to the vested map
    _vested[beneficiary] = new AODVestingWallet(
      beneficiary, 
      start, 
      duration, 
      release
    );
    //add wallet role
    _setupRole(VESTER_ROLE, address(_vested[beneficiary]));
    //next mint tokens to the wallet just created
    mint(address(_vested[beneficiary]), amount);
  }

  /**
   * @dev Returns true `badactor` is blacklisted
   */
  function isBlacklisted(address badactor) public virtual view returns(bool) {
	  return _blacklisted[badactor];
  }

  /**
   * @dev Creates `amount` new tokens for `to`.
   */
  function mint(address to, uint256 amount) public virtual isMinter {
    _mint(to, amount);
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() public virtual isPauser {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public virtual isPauser {
    _unpause();
  }

  /**
   * @dev Returns the vested smart wallet address of the `beneficiary`
   */
  function vested(address beneficiary) 
    public virtual view returns(address) 
  {
    return address(_vested[beneficiary]);
  }

  /**
   * @dev Checks blacklist before token transfer
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    require(!_blacklisted[msg.sender], "Caller is blacklisted");
    require(!_blacklisted[from], "Sender is blacklisted");
    require(!_blacklisted[to], "Recipient is blacklisted");

    if (!hasRole(MINTER_ROLE, msg.sender) && !hasRole(VESTER_ROLE, from)) {
      require(!paused(), "Token transfer while paused");
    }

    super._beforeTokenTransfer(from, to, amount);
  }

  /**
   * @dev See {ERC20-_mint}.
   */
  function _mint(address account, uint256 amount) 
    internal virtual override(ERC20, ERC20Capped) 
  {
    super._mint(account, amount);
  }

  /**
   * @dev Internally blacklists or whitelists a `badactor`
   */
  function _blacklist(address badactor, bool yesno) internal {
    require(yesno && _blacklisted[badactor] != yesno, "Already blacklisted");
    require(!yesno && _blacklisted[badactor] != yesno, "Already whitelisted");
    _blacklisted[badactor] = yesno;
    emit Blacklist(badactor, yesno);
  }
}
