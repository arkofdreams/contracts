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

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// ============ Errors ============

error InvalidAmount();

// ============ Inferfaces ============

interface IERC20Capped is IERC20 {
  function cap() external returns(uint256);
}

// ============ Contract ============

contract Arkonomy is 
  AccessControl, 
  ReentrancyGuard,
  Pausable 
{
  using Address for address;
  using SafeMath for uint256;

  // ============ Events ============

  event ERC20Received(address indexed sender, uint256 amount);
  event ERC20Sent(address indexed recipient, uint256 amount);
  event DepositReceived(address from, uint256 amount);

  // ============ Constants ============

  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  //this is the contract address for $AOD
  IERC20Capped public immutable TOKEN;
  //this is the contract address for the $AOD treasury
  address public immutable TREASURY;
  //this is the token cap of $AOD
  uint256 public immutable TOKEN_CAP;

  // ============ Store ============

  //where 5000 = 50.00%
  uint16 private _interest = 5000;
  //where 20000 = 200.00%
  uint16 private _sellFor = 20000;
  //where 5000 = 50.00%
  uint16 private _buyFor = 5000;

  // ============ Deploy ============

  /**
   * @dev Grants `DEFAULT_ADMIN_ROLE` to the account that deploys the 
   * contract.
   */
  constructor(IERC20Capped token, address treasury) payable {
    //set up roles for the contract creator
    address sender = _msgSender();
    _setupRole(DEFAULT_ADMIN_ROLE, sender);
    _setupRole(PAUSER_ROLE, sender);
    //set the $AOD addresses
    TOKEN = token;
    TREASURY = treasury;
    //set the token cap
    TOKEN_CAP = token.cap();
    //start paused
    _pause();
  }

  /**
   * @dev The Ether received will be logged with {PaymentReceived} 
   * events. Note that these events are not fully reliable: it's 
   * possible for a contract to receive Ether without triggering this 
   * function. This only affects the reliability of the events, and not 
   * the actual splitting of Ether.
   *
   * To learn more about this see the Solidity documentation for
   * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
   * functions].
   */
  receive() external payable virtual {
    emit DepositReceived(_msgSender(), msg.value);
  }

  // ============ Read Methods ============

  /**
   * @dev Returns the ether balance
   */
  function balanceEther() public view returns(uint256) {
    return address(this).balance;
  }

  /**
   * @dev Returns the $AOD token balance
   */
  function balanceToken() public view returns(uint256) {
    return TOKEN.balanceOf(address(this));
  }

  /**
   * @dev Returns the ether amount we are willing to buy $AOD for
   */
  function buyingFor(uint256 amount) public view returns(uint256) {
    return _buyingFor(amount, balanceEther());
  }

  /**
   * @dev Returns the ether amount we are willing to sell $AOD for
   */
  function sellingFor(uint256 amount) public view returns(uint256) {
    return _sellingFor(amount, balanceEther());
  }

  // ============ Write Methods ============

  /**
   * @dev Buys `amount` of $AOD 
   */
  function buy(address recipient, uint256 amount) 
    public payable whenNotPaused nonReentrant
  {
    uint256 value = _sellingFor(amount, balanceEther() - msg.value);
    if (value == 0 
      || msg.value < value
      || balanceToken() < amount
    ) revert InvalidAmount();
    //we already received the ether
    //so just send the tokens
    SafeERC20.safeTransfer(TOKEN, recipient, amount);
    //send the interest
    Address.sendValue(
      payable(TREASURY),
      msg.value.mul(_interest).div(10000)
    );
    emit ERC20Sent(recipient, amount);
  }

  /**
   * @dev Sells `amount` of $AOD 
   */
  function sell(address recipient, uint256 amount) 
    public whenNotPaused nonReentrant 
  {
    //check allowance
    if(TOKEN.allowance(recipient, address(this)) < amount) 
      revert InvalidAmount();
    //send the ether
    Address.sendValue(payable(recipient), buyingFor(amount));
    //now accept the payment
    SafeERC20.safeTransferFrom(TOKEN, recipient, address(this), amount);
    emit ERC20Received(recipient, amount);
  }

  // ============ Admin Methods ============

  /**
   * @dev Sets the buy for percent
   */
  function buyFor(uint16 percent) 
    public payable onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    _buyFor = percent;
  }

  /**
   * @dev Sets the interest
   */
  function interest(uint16 percent) 
    public payable onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    _interest = percent;
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() public virtual onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Sets the sell for percent
   */
  function sellFor(uint16 percent) 
    public payable onlyRole(DEFAULT_ADMIN_ROLE) 
  {
    _sellFor = percent;
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() public virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  // ============ Internal Methods ============
  /**
   * @dev Returns the ether amount we are willing to buy $AOD for
   */
  function _buyingFor(uint256 amount, uint256 balance) internal view returns(uint256) {
    // (eth / cap) * amount
    return balance.mul(amount).mul(_buyFor).div(TOKEN_CAP).div(1000);
  }

  /**
   * @dev Returns the ether amount we are willing to sell $AOD for
   */
  function _sellingFor(uint256 amount, uint256 balance) internal view returns(uint256) {
    // (eth / cap) * amount
    return balance.mul(amount).mul(_sellFor).div(TOKEN_CAP).div(1000);
  }
}