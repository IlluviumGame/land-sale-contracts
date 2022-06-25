// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../lib/LandBlobLib.sol";

/**
 * @title Land Blob Library Mock
 *
 * @notice Used to test Land Blob Library, by exposing its internal functions
 *
 * @author Basil Gorin
 */
contract LandBlobLibMock {
	/**
	 * @dev Simplified version of StringUtils.atoi to convert a bytes string
	 *      to unsigned integer using ten as a base
	 * @dev Stops on invalid input (wrong character for base ten) and returns
	 *      the position within a string where the wrong character was encountered
	 *
	 * @dev Throws if input string contains a number bigger than uint256
	 *
	 * @param a numeric string to convert
	 * @param offset an index to start parsing from, set to zero to parse from the beginning
	 * @return i a number representing given string
	 * @return p an index where the conversion stopped
	 */
	function atoi(bytes calldata a, uint8 offset) public pure returns (uint256 i, uint8 p) {
		// delegate to internal impl
		return LandBlobLib.atoi(a, offset);
	}

	/**
	 * @dev Parses a bytes string formatted as `{tokenId}:{metadata}`, containing `tokenId`
	 *      and `metadata` encoded as decimal strings
	 *
	 * @dev Throws if either `tokenId` or `metadata` strings are numbers bigger than uint256
	 * @dev Doesn't validate the `{tokenId}:{metadata}` format, would extract any first 2 decimal
	 *      numbers split with any separator, for example (see also land_blob_lib_test.js):
	 *      `{123}:{467}` => (123, 467)
	 *      `123:467` => (123, 467)
	 *      `123{}467` => (123, 467)
	 *      `b123abc467a` => (123, 467)
	 *      `b123abc467a8910` => (123, 467)
	 *      ` 123 467 ` => (123, 467)
	 *      `123\n467` => (123, 467)
	 *      `[123,467]` => (123, 467)
	 *      `[123; 467]` => (123, 467)
	 *      `(123, 467)` => (123, 467)
	 *      `(123, 467, 8910)` => (123, 467)
	 *      `{123.467}` => (123, 467)
	 *      `{123.467.8910}` => (123, 467)
	 *      `123` => (123, 0)
	 *      `abc123` => (123, 0)
	 *      `123abc` => (123, 0)
	 *      `{123}` => (123, 0)
	 *      `{123:}` => (123, 0)
	 *      `{:123}` => (123, 0)
	 *      `{,123}` => (123, 0)
	 *      `\n123` => (123, 0)
	 *      `{123,\n}` => (123, 0)
	 *      `{\n,123}` => (123, 0)
	 *      `(123, 0)` => (123, 0)
	 *      `0:123` => (0, 123)
	 *      `0:123:467` => (0, 123)
	 *      `0; 123` => (0, 123)
	 *      `(0, 123)` => (0, 123)
	 *      `(0, 123, 467)` => (0, 123)
	 *      `0,123` => (0, 123)
	 *      `0,123,467` => (0, 123)
	 *      `0.123` => (0, 123)
	 *      `0.123.467` => (0, 123)
	 *      `` => throws (no tokenId found)
	 *      `abc` => throws (no tokenId found)
	 *      `{}` => throws (no tokenId found)
	 *      `0` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `{0}` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `{0}:{0}` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `{0}:` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `(0, 0, 123)` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `:0` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `\n0` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *      `\n0\n0\n123` => (0, 0) - note: doesn't throw, even though zero tokenId is not valid
	 *
	 * @param mintingBlob bytes string input formatted as `{tokenId}:{metadata}`
	 * @return tokenId extracted `tokenId` as an integer
	 * @return metadata extracted `metadata` as an integer
	 */
	function parseMintingBlob(bytes calldata mintingBlob) public pure returns (uint256 tokenId, uint256 metadata) {
		// delegate to internal impl
		return LandBlobLib.parseMintingBlob(mintingBlob);
	}
}
