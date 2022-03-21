// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

contract AODMultisigWalletUpgradeable is
    Initializable,
    ContextUpgradeable,
    PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Custom roles
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');
    bytes32 public constant APPROVER_ROLE = keccak256('APPROVER_ROLE');
    bytes32 public constant REQUESTER_ROLE = keccak256('REQUESTER_ROLE');

    // Erc20 interface
    IERC20Upgradeable public BUSD;

    // The minimum approvals needed
    uint256 public approvals;

    // Transaction structure
    struct TX {
        address beneficiary;
        uint256 amount;
        uint256 approvals;
        bool executed;
        mapping(address => bool) approved;
    }

    // Mapping of id to tx
    mapping(uint256 => TX) public txs;

    /**
     * @dev Sets up roles and sets the BUSD contract address
     */
    function initialize(address busd) public initializer {
        __Context_init();
        __Pausable_init();
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        address sender = _msgSender();

        _setupRole(PAUSER_ROLE, sender);
        _setupRole(REQUESTER_ROLE, sender);
        _setupRole(DEFAULT_ADMIN_ROLE, sender);
        BUSD = IERC20Upgradeable(busd);
    }

    /**
     * @dev Approves a transaction
     */
    function approve(uint256 id) public virtual onlyRole(APPROVER_ROLE) {
        require(!paused(), 'Approving is paused');
        // Check if tx exists
        require(txs[id].amount > 0, 'Transaction does not exist');

        // Check if tx exists
        require(!txs[id].executed, 'Transaction already executed');

        // Require approver didnt already approve
        require(!txs[id].approved[_msgSender()], 'Already approved');

        // Add to the approval
        txs[id].approvals += 1;
        txs[id].approved[_msgSender()] = true;

        // If enough approvals
        if (!txs[id].executed && txs[id].approvals >= approvals) {
            // Go ahead and transfer it
            txs[id].executed = true;
            _safeTransfer(txs[id].beneficiary, txs[id].amount);
        }
    }

    /**
     * @dev Pauses all token transfers.
     */
    function pause() public virtual onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Makes a transaction request
     */
    function request(
        uint256 id,
        address beneficiary,
        uint256 amount
    ) public virtual onlyRole(REQUESTER_ROLE) {
        require(!paused(), 'Requesting is paused');
        //check to see if tx exists
        require(txs[id].amount == 0, 'Transaction exists');
        //create a new tx
        txs[id].amount = amount;
        txs[id].beneficiary = beneficiary;
        //if this sender is also an approver
        if (hasRole(APPROVER_ROLE, _msgSender())) {
            //then approve it
            approve(id);
        }
    }

    /**
     * @dev Sets the required approvals in order
     * for a transaction to be executed
     */
    function requiredApprovals(uint256 count) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        approvals = count;
    }

    /**
     * @dev Unpauses all token transfers.
     */
    function unpause() public virtual onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Safely transfers `amount` BUSD to `beneficiary`
     */
    function _safeTransfer(address beneficiary, uint256 amount) internal virtual {
        SafeERC20Upgradeable.safeTransfer(BUSD, beneficiary, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
