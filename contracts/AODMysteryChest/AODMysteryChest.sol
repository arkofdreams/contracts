// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//implementation of ERC721
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol';

import '@openzeppelin/contracts/access/AccessControlEnumerable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/Context.sol';

import './BEP721/BEP721.sol';
import './OpenSea/ERC721OpenSea.sol';

contract AODMysteryChest is Context, AccessControlEnumerable, ERC721Burnable, ERC721Pausable, BEP721, ERC721OpenSea {
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

    string private _tokenURI;

    /*
     * bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
     */
    bytes4 internal constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    /**
     * @dev Modifier for minter
     */
    modifier isMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), 'Must be a minter');
        _;
    }

    /**
     * @dev Modifier for minter
     */
    modifier isPauser() {
        require(hasRole(PAUSER_ROLE, _msgSender()), 'Must be a pauser');
        _;
    }

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _contractURI,
        string memory tokenURI_
    ) ERC721(_name, _symbol) ERC721OpenSea(_contractURI) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
        _tokenURI = tokenURI_;
    }

    /**
     * @dev Allows anyone to self mint a token
     */
    function lazyMint(
        uint256 tokenId,
        address recipient,
        bytes calldata proof
    ) external virtual {
        //make sure the minter signed this off
        require(
            hasRole(
                MINTER_ROLE,
                ECDSA.recover(ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(tokenId, recipient))), proof)
            ),
            'Invalid proof.'
        );
        //mint first and wait for errors
        _safeMint(recipient, tokenId);
        //add to supply
        _addSupply(1);
    }

    /**
     * @dev Creates a new token `tokenId` for `recipient`. Assigns `uri` to `tokenId`
     *
     * See {ERC721-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(uint256 tokenId, address recipient) public virtual isMinter {
        //mint first and wait for errors
        _safeMint(recipient, tokenId);
        //add to supply
        _addSupply(1);
    }

    /**
     * @dev override; super defined in ERC721; Specifies the name by
     *      which other contracts will recognize the BEP-721 token
     */
    function name() public view virtual override(IBEP721, ERC721) returns (string memory) {
        return super.name();
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
    function pause() public virtual isPauser {
        _pause();
    }

    /**
     * @dev override; super defined in ERC721; A concise name for the token,
     *      comparable to a ticker symbol
     */
    function symbol() public view virtual override(IBEP721, ERC721) returns (string memory) {
        return super.symbol();
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), 'Token does not exist');
        return _tokenURI;
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
    function unpause() public virtual isPauser {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable, ERC721, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
