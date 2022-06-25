// Utility functions to create testing land plot data

// number utils
const {
	random_int,
	random_element,
} = require("../../include/number_utils");

// BN utils
const {
	toBN,
	random_bits,
} = require("../../../scripts/include/bn_utils");

// valid plot sizes to use in various tests
const PLOT_SIZES = [29, 30, 39, 40, 49, 50, 59, 60, 79, 80, 99, 100, 119, 120];

/**
 * Generates the Land plot data object
 *
 * @param regions number of regions
 * @param region_size (x, y) limit
 * @param tiers number of tiers
 * @param plot_sizes possible square sizes to randomly pick from to generate a plot
 * @return PlotData object
 */
function generate_land_plot(
	regions = 7,
	region_size = 500,
	tiers = 5,
	plot_sizes = PLOT_SIZES
) {
	return {
		version: 1,
		regionId: random_int(1, 1 + regions),
		x: random_int(1, 10_000),
		y: random_int(1, 10_000),
		tierId: random_int(1, 1 + tiers),
		size: random_element(plot_sizes),
		landmarkTypeId: random_int(0, 8),
		elementSites: random_int(3, 16),
		fuelSites: random_int(1, 13),
		seed: random_bits(160).toString(),
	};
}

/**
 * Generates the Land plot data object as an array ready to be passed into the smart contract
 *
 * @return PlotData object values as an array
 */
function generate_land_plot_metadata(regions, region_size, tiers, plot_sizes) {
	return plot_to_metadata(generate_land_plot(regions, region_size, tiers, plot_sizes));
}

/**
 * Converts Plot data struct into an array
 *
 * @param plot Plot data struct
 * @return ABI compatible array representing the Plot data struct
 */
function plot_to_metadata(plot) {
	return Object.values(plot).map(v => stringify(v));
}

/**
 * Parses the Plot data struct internals into Number and BN (string representation)
 *
 * @param plot Plot data struct
 * @return {{version: number, regionId: number, x: number, y: number, tierId: number, size: number, landmarkTypeId: number, elementSites: number, fuelSites: number, seed: string}}
 */
function parse_plot(plot) {
	return Object.assign({}, {
		version: parseInt(plot.version),
		regionId: parseInt(plot.regionId),
		x: parseInt(plot.x),
		y: parseInt(plot.y),
		tierId: parseInt(plot.tierId),
		size: parseInt(plot.size),
		landmarkTypeId: parseInt(plot.landmarkTypeId),
		elementSites: parseInt(plot.elementSites),
		fuelSites: parseInt(plot.fuelSites),
		seed: toBN(plot.seed).toString(),
	});
}

// converts all primitives inside the array to string
function stringify(arr) {
	if(Array.isArray(arr)) {
		return arr.map(v => stringify(v));
	}

	return arr + "";
}

// export public utils API
module.exports = {
	PLOT_SIZES,
	generate_land_plot,
	generate_land_plot_metadata,
	plot_to_metadata,
	parse_plot,
}
