// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../token/ERC721Impl.sol";

/**
 * @title ERC721 Mock
 *
 * @notice Zeppelin-based ERC721 Mock simulates an NFT token, used for testing purposes;
 *      it still has restricted access to the mint() function
 *
 * @author Basil Gorin
 */
contract ERC721Mock is ERC721Impl {
	/**
	 * @inheritdoc IdentifiableToken
	 */
	uint256 public override TOKEN_UID = 0x805d1eb685f9eaad4306ed05ef803361e9c0b3aef93774c4b118255ab3f9c7d1;

	/**
	 * @dev Creates/deploys an NFT Mock instance
	 *
	 * @param _name token name (ERC721Metadata)
	 * @param _symbol token symbol (ERC721Metadata)
	 */
	constructor(string memory _name, string memory _symbol) ERC721Impl(_name, _symbol) {}

	// allows to modify TOKEN_UID
	function setUid(uint256 _uid) public {
		TOKEN_UID = _uid;
	}

}
