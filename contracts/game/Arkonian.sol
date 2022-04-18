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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";

// ============ Errors ============

error InvalidRecipient();

// ============ Contract ============

contract Arkonian is 
  Ownable, 
  AccessControlEnumerable, 
  ERC721Burnable,
  ERC721Pausable
{
  using Strings for uint256;

  // ============ Constants ============

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

  // ============ Storage ============

  //immutable contract uri
  string private _contractURI;
  //base token URI
  string private _baseTokenURI;
  //total supply
  uint256 private _totalSupply;

  // ============ Deploy ============

  /**
   * @dev Initializes ERC721B; Sets the contract URI
   */
  constructor(string memory uri) ERC721("Arkonian", "ARKONIAN") {
    _contractURI = uri;

    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(PAUSER_ROLE, _msgSender());
  }

  // ============ Read Methods ===========

  /**
   * @dev The base URI for token data ex. https://creatures-api.opensea.io/api/creature/
   * Example Usage:
   *  Strings.strConcat(baseTokenURI(), Strings.uint2str(tokenId))
   */
  function baseTokenURI() public view returns (string memory) {
    return _baseTokenURI;
  }

  /**
   * @dev The URI for contract data ex. https://creatures-api.opensea.io/contract/opensea-creatures/contract.json
   * Example Format:
   * {
   *   "name": "OpenSea Creatures",
   *   "description": "OpenSea Creatures are adorable aquatic beings primarily for demonstrating what can be done using the OpenSea platform. Adopt one today to try out all the OpenSea buying, selling, and bidding feature set.",
   *   "image": "https://openseacreatures.io/image.png",
   *   "external_link": "https://openseacreatures.io",
   *   "seller_fee_basis_points": 100, # Indicates a 1% seller fee.
   *   "fee_recipient": "0xA97F337c39cccE66adfeCB2BF99C1DdC54C2D721" # Where seller fees will be paid to.
   * }
   */
  function contractURI() external view returns (string memory) {
    return _contractURI;
  }

  /**
   * @dev See {IERC721Metadata-tokenURI}.
   */
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "ERC721: URI query for nonexistent token");
    return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
  }

  /**
   * @dev Shows the overall amount of tokens generated in the contract
   */
  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  // ============ Admin Methods ===========

  /**
   * @dev Creates a new token for the `recipient`
   */
  function mint(address recipient, uint256 tokenId) external onlyRole(MINTER_ROLE) {
    //make sure recipient is a valid address
    if (recipient == address(0)) revert InvalidRecipient();
    //mint
    _safeMint(recipient, tokenId);
    //increment supply
    _totalSupply += 1;
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
  function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Setting base token uri would be acceptable if using IPFS CIDs
   */
  function setBaseURI(string memory uri) internal virtual {
    _baseTokenURI = uri;
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
  function unpause() external onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  // ============ Linear Overrides ===========

  /**
   * @dev Describes linear override for `supportsInterface` used in
   * both `AccessControlEnumerable` and `ERC721`
   */
  function supportsInterface(bytes4 interfaceId) public view override(AccessControlEnumerable, ERC721) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev Describes linear override for `_beforeTokenTransfer` used in
   * both `ERC721` and `Arkonians`
   */
  function _burn(uint256 tokenId) internal override {
    super._burn(tokenId);
    _totalSupply -= 1;
  }

  /**
   * @dev Describes linear override for `_beforeTokenTransfer` used in
   * both `ERC721` and `ERC721Pausable`
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal override(ERC721, ERC721Pausable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }
}
