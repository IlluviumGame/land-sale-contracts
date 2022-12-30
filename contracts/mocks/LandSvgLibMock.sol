// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../lib/LandSvgLib.sol";

/**
 * @title Land SVG Library Mock
 *
 * @notice Used to test Land SVG Library, by exposing it's internal function
 *
 * @author Yuri Fernandes
 */
 contract LandSvgLibMock {

     /**
	 * @dev Calculates string for the land name based on plot data.
	 *
	 * @param _regionId PlotView.regionId
	 * @param _x PlotView.x coordinate
	 * @param _y PlotView.y coordinate
	 * @return SVG name attribute
	 */
     function generateLandName(uint8 _regionId, uint16 _x, uint16 _y) public pure returns (string memory) {
         return LandSvgLib.generateLandName(_regionId, _x, _y);
     }
 }