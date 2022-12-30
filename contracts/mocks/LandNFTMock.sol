// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../token/LandERC721.sol";

/**
 * @title Land NFT Mock
 *
 * @notice LandERC721 mock allows to disable supported ERC165 interfaces
 *
 * @author Basil Gorin
 */
contract LandNFTMock is LandERC721 {
	/**
	 * @dev Creates/deploys Land NFT Mock instance
	 *
	 * @param _name token name (ERC721Metadata)
	 * @param _symbol token symbol (ERC721Metadata)
	 */
	constructor(string memory _name, string memory _symbol) {
		// deproxify it
		postConstruct(_name, _symbol);
	}

	/**
	 * @dev Interfaces which should not be reported as supported ones by `supportsInterface`
	 */
	mapping(bytes4 => bool) private excludedInterfaces;

	/// @dev Allows to override supportsInterface behaviour by excluding the interface
	function excludeInterface(bytes4 interfaceId, bool value) public {
		excludedInterfaces[interfaceId] = value;
	}

	/**
	 * @inheritdoc IERC165
	 */
	function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
		// calculate based on inherited interfaces taking into account excluded interfaces
		return !excludedInterfaces[interfaceId] && super.supportsInterface(interfaceId);
	}
}
