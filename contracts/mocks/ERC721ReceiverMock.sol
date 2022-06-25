// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interfaces/ERC721Spec.sol";

/**
 * @title ERC721 Receiver Mock
 *
 * @notice Zeppelin-based ERC721 Receiver Mock simulates an ERC721 receiver interface,
 *      used for testing purposes - to send ERC721 safely;
 *
 * @author Basil Gorin
 */
contract ERC721ReceiverMock is ERC721TokenReceiver {
	enum Error {
		None,
		RevertWithMessage,
		RevertWithoutMessage,
		Panic
	}

	bytes4 private immutable _retval;
	Error private immutable _error;

	event Received(address operator, address from, uint256 tokenId, bytes data, uint256 gas);

	constructor(bytes4 retval, Error error) {
		_retval = retval;
		_error = error;
	}

	function onERC721Received(
		address operator,
		address from,
		uint256 tokenId,
		bytes memory data
	) public override returns (bytes4) {
		if (_error == Error.RevertWithMessage) {
			revert("ERC721ReceiverMock: reverting");
		} else if (_error == Error.RevertWithoutMessage) {
			revert();
		} else if (_error == Error.Panic) {
			uint256 a = uint256(0) / uint256(0);
			a;
		}
		emit Received(operator, from, tokenId, data, gasleft());
		return _retval;
	}
}
