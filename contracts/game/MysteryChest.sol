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

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

//implementation of ERC721
import "ercx/contracts/token/ERC721/extensions/ERC721Supply.sol";
import "ercx/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "ercx/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "ercx/contracts/token/ERC721/extensions/ERC721Operators.sol";
import "ercx/contracts/token/ERC721/extensions/ERC721ContractURIStorage.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Context.sol";

// ============ Contract ============

contract MysteryChest is 
  Context, 
  AccessControl, 
  ERC721Supply,
  ERC721Burnable, 
  ERC721Pausable,
  ERC721Operators,
  ERC721ContractURIStorage,
  IERC721Metadata
{
  // ============ Constants ============

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  // ============ Storage ============

  string private _tokenURI;

  // ============ Deploy ============

  constructor(string memory uri, string memory fixedURI, address admin) {
    //setup roles
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    _setupRole(PAUSER_ROLE, admin);
    //set contract uri
    _setContractURI(uri);
    //set fixed token uri
    _tokenURI = fixedURI;
  }

  // ============ Read Methods ============

  /**
   * @dev Returns the string literal name
   */
  function name() external pure virtual override returns (string memory) {
    return "Arkonian Mystery Chest";
  }

  /**
   * @dev Symbol the string literal symbol
   */
  function symbol() external pure virtual override returns (string memory) {
    return "AMYSTERY";
  }

  /**
   * @dev See {IERC721Metadata-tokenURI}.
   */
  function tokenURI(
    uint256 tokenId
  ) external view virtual override isToken(tokenId) returns(string memory) {
    return _tokenURI;
  }

  // ============ Write Methods ============

  /**
   * @dev Allows anyone to self mint a token
   */
  function redeem(
    uint256 tokenId,
    address recipient,
    bytes calldata proof
  ) external virtual {
    //make sure the minter signed this off
    require(
      hasRole(
        MINTER_ROLE,
        ECDSA.recover(
          ECDSA.toEthSignedMessageHash(
            keccak256(abi.encodePacked(tokenId, recipient))
          ), proof
        )
      ),
      "Invalid proof."
    );
    //mint first and wait for errors
    _safeMint(recipient, tokenId, "");
  }

  // ============ Admin Methods ============

  /**
   * @dev Allows admin to mint
   */
  function mint(uint256 tokenId, address recipient) 
    external virtual onlyRole(MINTER_ROLE) 
  {
    //mint first and wait for errors
    _safeMint(recipient, tokenId, "");
  }

  /**
   * @dev Pauses all token transfers.
   *
   * See {ERC721Pausable} and {Pausable-_pause}.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function pause() public virtual onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   *
   * See {ERC721Pausable} and {Pausable-_unpause}.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function unpause() public virtual onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  // ============ Linear Overrides ============

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override(ERC721, ERC721Pausable, ERC721Supply) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(AccessControl, ERC721, IERC165)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}