// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../token/LandDescriptorImpl.sol";

/**
 * @title Land Descriptor Mock
 *
 * @dev Allows to override `tokenURI`
 *
 * @author Basil Gorin
 */
contract LandDescriptorMock is LandDescriptorImpl {
	/// @dev Defines if tokenURI() should be overridden
	bool private _tokenURIOverride;

	/// @dev Overrides tokenURI() if `_tokenURIOverride` is true
	string private _tokenURIValue;

	/// @dev Sets tokenURI() override
	function setTokenURIOverride(string calldata _value) public {
		_tokenURIOverride = true;
		_tokenURIValue = _value;
	}

	/// @dev Removes tokenURI() override
	function removeTokenURIOverride() public {
		_tokenURIOverride = false;
	}

	/**
	 * @inheritdoc LandDescriptorImpl
	 */
	function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
		// override tokenURI if required, delegate to super otherwise
		return _tokenURIOverride? _tokenURIValue: super.tokenURI(_tokenId);
	}
}
