// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../protocol/LandSalePriceOracleV1.sol";

/**
 * @title Chainlink Land Sale Price Oracle Mock
 *
 * @notice Supports the Land Sale with the ETH/ILV conversion required
 *
 * @dev Enables oracle price override, playing with current timestamp
 *
 * @author Basil Gorin
 */
contract LandSalePriceOracleV1Mock is LandSalePriceOracleV1 {
	// override the value calculated based on the feed
	uint256 public ethToIlvOverride;

	/// @dev overridden value to use as now32()
	uint256 private _now256;

	/// @dev overrides now256()
	function setNow256(uint256 value) public {
		_now256 = value;
	}

	/**
	 * @inheritdoc LandSalePriceOracleV1
	 */
	function postConstruct(address _aggregator) public override initializer {
		super.postConstruct(_aggregator);
		ethToIlvOverride = type(uint256).max;
	}

	/**
	 * @dev Testing time-dependent functionality may be difficult;
	 *      we override time in the helper test smart contract (mock)
	 *
	 * @return `block.timestamp` in mainnet, custom values in testnets (if overridden)
	 */
	function now256() public view override returns (uint256) {
		return _now256 > 0? _now256: super.now256();
	}

	// overrides the `ethToIlv` completely and forces it to always return the value specified
	function setEthToIlvOverride(uint256 _ethToIlvOverride) public {
		ethToIlvOverride = _ethToIlvOverride;
	}

	/**
	 * @inheritdoc LandSalePriceOracle
	 */
	function ethToIlv(uint256 _ethOut) public view virtual override returns (uint256 _ilvIn) {
		return ethToIlvOverride < type(uint256).max? ethToIlvOverride: super.ethToIlv(_ethOut);
	}
}
