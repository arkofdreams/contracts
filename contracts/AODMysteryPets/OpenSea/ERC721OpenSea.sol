// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//interface of a OpenSea compliant contract
import './interfaces/IERC721OpenSea.sol';

/**
 * @dev Abstract of an OpenSea compliant contract
 */
abstract contract ERC721OpenSea is IERC721OpenSea {
    string private _baseTokenURI;

    /**
     * @dev The base URI for token data ex. https://creatures-api.opensea.io/api/creature/
     * Example Usage:
     *  Strings.strConcat(baseTokenURI(), Strings.uint2str(tokenId))
     */
    function baseTokenURI() public view returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Setting base token uri would be acceptable if using IPFS CIDs
     */
    function _setBaseTokenURI(string memory uri) internal virtual {
        _baseTokenURI = uri;
    }
}
