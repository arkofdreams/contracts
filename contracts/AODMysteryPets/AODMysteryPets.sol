// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//                _             __   _____                               
//     /\        | |           / _| |  __ \                              
//    /  \   _ __| | __   ___ | |_  | |  | |_ __ ___  __ _ _ __ ___  ___ 
//   / /\ \ | '__| |/ /  / _ \|  _| | |  | | '__/ _ \/ _` | '_ ` _ \/ __|
//  / ____ \| |  |   <  | (_) | |   | |__| | | |  __/ (_| | | | | | \__ \
// /_/    \_\_|  |_|\_\  \___/|_|   |_____/|_|  \___|\__,_|_| |_| |_|___/
//
// LEARN MORE: http://www.arkofdreams.io/
//
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./ERC721Base.sol";

contract AODMysteryPets is ERC721Base, ReentrancyGuard {
  using Strings for uint256;
  using SafeMath for uint256;

  // ============ Constants ============
  
  // Start date of the private sale
  // Feb 4, 2022 12AM GTM
  uint64 public constant PRIVATE_SALE_DATE = 1644796800;

  // The private sale price per token
  uint256 public constant PRIVATE_SALE_PRICE = 0.04 ether;

  // Maximum amount that can be purchased per wallet
  uint8 public constant PRIVATE_SALE_MAX_PURCHASE = 5;
  
  // Start date of the presale sale
  // March 1, 2022 12AM GTM
  uint64 public constant PRESALE_DATE = 1646092800;

  // The private sale price per token
  uint256 public constant PRESALE_PRICE = 0.08 ether;

  // Maximum amount that can be purchased per wallet
  uint8 public constant PRESALE_MAX_PURCHASE = 5;
  
  // Start date of the token sale
  // March 15, 2022 12AM GTM
  uint64 public constant SALE_DATE = 1647302400;

  // The sale price per token
  uint256 public constant SALE_PRICE = 0.08 ether;

  // Maximum amount that can be purchased per wallet
  uint8 public constant SALE_MAX_PURCHASE = 0;

  // The amount of tokens to reserve
  uint16 public constant RESERVED = 30;

  // The provenance hash (the CID)
  string public PROVENANCE;

  // The offset to be used to determine what token id should get which CID
  uint16 public INDEX_OFFSET;

  // ============ Deploy ============

  /**
   * @dev Sets up ERC721Base. Permanently sets the IPFS CID
   */
  constructor(string memory uri) ERC721Base(
    "AOD Mystery Pets", 
    "AODMP",
    2222
  ) {
    // Set the initial base uri
    _setBaseTokenURI(uri);

    // Reserve pets
    address recipient = _msgSender();
    for(uint i = 0; i < RESERVED; i++) {
      _safeMint(recipient);
    }
  }

  // ============ Read Methods ============

  /**
   * @dev The URI for contract data ex. https://creatures-api.opensea.io/contract/opensea-creatures
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
  function contractURI() public view returns (string memory) {
    //ex. https://ipfs.io/ipfs/ + Qm123abc + /contract.json
    return string(
      abi.encodePacked(baseTokenURI(), PROVENANCE, "/contract.json")
    );
  }

  /**
   * @dev Combines the base token URI and the token CID to form a full 
   * token URI
   */
  function tokenURI(uint256 tokenId) 
    public view virtual override returns(string memory) 
  {
    require(_exists(tokenId), "URI query for nonexistent token");

    //if no offset
    if (INDEX_OFFSET == 0 || bytes(PROVENANCE).length == 0) {
      //use the placeholder
      return placeholderURI();
    }

    //for example, given offset is 2 and size is 8:
    // - token 5 = ((5 + 2) % 8) + 1 = 8
    // - token 6 = ((6 + 2) % 8) + 1 = 1
    // - token 7 = ((7 + 2) % 8) + 1 = 2
    // - token 8 = ((8 + 2) % 8) + 1 = 3
    uint256 index = tokenId.add(INDEX_OFFSET).mod(MAX_SUPPLY).add(1);
    //ex. https://ipfs.io/ + Qm123abc + / + 1000 + .json
    return string(
      abi.encodePacked(baseTokenURI(), PROVENANCE, "/", index.toString(), ".json")
    );
  }

  /**
   * @dev Returns the URI of the egg
   */
  function placeholderURI() public view virtual returns(string memory) {
    if (bytes(PROVENANCE).length > 0) {
      //use the placeholder
      return string(
        abi.encodePacked(baseTokenURI(), PROVENANCE, "/placeholder.json")
      );
    }

    //use the placeholder
    return "https://www.arkofdreams.io/assets/data/egg.json";
  }

  /**
   * @dev Returns index offset
   */
  function indexOffset() public view returns(uint16) {
    return INDEX_OFFSET;
  }

  // ============ Minting Methods ============

  /**
   * @dev Allows anyone to get a token that was approved by a 
   * `MINTER_ROLE`
   */
  function authorize(
    uint256 quantity, 
    address recipient, 
    bytes memory proof
  ) external payable nonReentrant {
    //make sure the minter signed this off
    require(hasRole(MINTER_ROLE, ECDSA.recover(
      ECDSA.toEthSignedMessageHash(
        keccak256(abi.encodePacked("authorized", recipient))
      ),
      proof
    )), "Invalid proof.");
    //now purchase token
    _buy(quantity, recipient);
  }

  /**
   * @dev Creates a new token for the sender. Its token ID will be 
   * automatically assigned (and available on the emitted 
   * {IERC721-Transfer} event), and the token URI autogenerated based 
   * on the base URI passed at construction.
   */
  function mint(uint256 quantity, address recipient) 
    external payable nonReentrant 
  {
    //now purchase token
    _buy(quantity, recipient);
  }

  /**
   * @dev Returns the current sale stage
   */
  function saleStage() public view returns(uint64, uint256, uint8) {
    uint32 timenow = uint32(block.timestamp);

    if (timenow >= SALE_DATE) {
      return (SALE_DATE, SALE_PRICE, SALE_MAX_PURCHASE);
    } else if (timenow >= PRESALE_DATE) {
      return (PRESALE_DATE, PRESALE_PRICE, PRESALE_MAX_PURCHASE);
    } else if (timenow >= PRIVATE_SALE_DATE) {
      return (PRIVATE_SALE_DATE, PRIVATE_SALE_PRICE, PRIVATE_SALE_MAX_PURCHASE);
    }

    return (0, 0, 0);
  }

  /**
   * @dev Allows the proceeds to be withdrawn. Also activates the RNG.
   */
  function withdraw() external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    //set the offset
    if (INDEX_OFFSET == 0) {
      INDEX_OFFSET = uint16(block.number - 1) % MAX_SUPPLY;
      if (INDEX_OFFSET == 0) {
        INDEX_OFFSET = 1;
      }
    }

    uint balance = address(this).balance;
    payable(_msgSender()).transfer(balance);
  }

  /**
   * @dev Purchases tokens
   */
  function _buy(uint256 quantity, address recipient) internal virtual {
    //make sure recipient is a valid address
    require(recipient != address(0), "Invalid recipient");
    //the quantity being minted should not exceed the max supply
    require(
      totalSupply().add(quantity) <= MAX_SUPPLY, 
      "Amount exceeds total allowable collection"
    );
    //get the current sale stage
    (uint64 saleDate, uint256 unitPrice, uint8 maxPurchase) = saleStage();
    //has the sale started?
    require(saleDate > 0, "Sale has not started");
    //is the quantity valid?
    require(quantity > 0, "Invalid Quantity");
    //the quantity here plus the current balance 
    //should be less than the max purchase amount
    require(
      maxPurchase == 0 || quantity.add(balanceOf(recipient)) <= maxPurchase, 
      "Cannot mint more than allowed"
    );
    //the value sent should be the price times quantity
    require(
      quantity.mul(unitPrice) <= msg.value, 
      "Amount sent is not correct"
    );
    //loop through quantity and mint
    for(uint i = 0; i < quantity; i++) {
      _safeMint(recipient);
    }
  }

  // ============ Metadata Methods ============

  /**
   * @dev Since we are using IPFS CID for the token URI, we can allow 
   * the changing of the base URI to toggle between services for faster 
   * speeds while keeping the metadata provably fair
   */
  function setBaseTokenURI(string memory uri) 
    external virtual onlyRole(CURATOR_ROLE) 
  {
    _setBaseTokenURI(uri);
  }

  /**
   * @dev This allows to defer the provenance at a later time
   */
  function setProvenance(string memory provenance) 
    external virtual onlyRole(CURATOR_ROLE)  
  {
    require(bytes(PROVENANCE).length == 0, "Provenance is already set");
    //make cid immutable
    PROVENANCE = provenance;
  }
}