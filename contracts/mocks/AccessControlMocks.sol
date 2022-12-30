// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/AccessControl.sol";
import "../utils/UpgradeableAccessControl.sol";

/**
 * @title Access Control Mock
 *
 * @notice Used to test the AccessControl core functionality
 *
 * @author Basil Gorin
 */
contract AccessControlMock is AccessControl {
	// set contract owner to the deployer address
	constructor() AccessControl(msg.sender) {}
}

/**
 * @title Upgradeable Access Control Mock
 *
 * @notice Used to test the UpgradeableAccessControl core functionality
 *
 * @author Basil Gorin
 */
contract UpgradeableAccessControlMock is UpgradeableAccessControl {
	// v1 identifier
	string public v1;

	/**
	 * @dev UUPS initializer, sets the contract owner to have full privileges
	 *
	 * param _owner smart contract owner having full privileges
	 */
	function postConstruct() public virtual initializer {
		// execute parent initializer
		_postConstruct(msg.sender);

		// self init
		v1 = "v1";
	}
}

/**
 * @title Upgradeable Access Control Mock 2
 *
 * @notice Used to test the UpgradeableAccessControl core functionality
 *
 * @author Basil Gorin
 */
contract UpgradeableAccessControlMock2 is UpgradeableAccessControlMock {
	// v2 identifier
	string public v2;

	/**
	 * @dev UUPS initializer, sets the contract owner to have full privileges
	 *
	 * param _owner smart contract owner having full privileges
	 */
	function postConstruct() public virtual override initializer {
		// execute parent initializer
		_postConstruct(msg.sender);

		// self init
		v2 = "v2";
	}
}
