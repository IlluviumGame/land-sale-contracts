// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../token/UpgradeableERC721.sol";

/**
 * @title Zeppelin ERC721 Mock
 *
 * @notice Zeppelin ERC721 Mock simulates an NFT token, used for testing purposes;
 *      it still has restricted access to the mint() function
 *
 * @author Basil Gorin
 */
contract UpgradeableERC721Mock is UpgradeableERC721 {
	/**
	 * @inheritdoc IdentifiableToken
	 */
	uint256 public override TOKEN_UID = 0x5c1ffff5909ddefd4412fc7e5c5596fb67bd289d64e1ae9f4322be69ac82dc0b;

	/**
	 * @dev "Constructor replacement" for upgradeable, must be execute immediately after deployment
	 *      see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers
	 *
	 * @param _name token name (ERC721Metadata)
	 * @param _symbol token symbol (ERC721Metadata)
	 */
	function postConstruct(string memory _name, string memory _symbol) public virtual initializer {
		// execute all parent initializers in cascade
		UpgradeableERC721._postConstruct(_name, _symbol, msg.sender);
	}
}

/**
 * @title Zeppelin ERC721 Mock
 *
 * @notice Zeppelin ERC721 Mock simulates an NFT token, used for testing purposes;
 *      it still has restricted access to the mint() function
 *
 * @author Basil Gorin
 */
contract UpgradeableERC721Mock2 is UpgradeableERC721Mock {
	// add version!
	string public version;

	/**
	 * @dev "Constructor replacement" for upgradeable, must be execute immediately after deployment
	 *      see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers
	 *
	 * @param _name token name (ERC721Metadata)
	 * @param _symbol token symbol (ERC721Metadata)
	 */
	function postConstruct(string memory _name, string memory _symbol) public virtual override initializer {
		// execute all parent initializers in cascade
		super._postConstruct(_name, _symbol, msg.sender);

		// set thee version!
		version = "Version 2 (Upgraded)!";
	}
}
