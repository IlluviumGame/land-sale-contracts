// Utility functions to create testing land plot data collection,
// and to work with the Merkle tree of this data collection

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// number utils
const {
	random_int,
	random_element,
} = require("../../include/number_utils");

// reimport Merkle tree related stuff
const {
	generate_tree,
	plot_to_leaf,
} = require("./merkle_tree_utils");

// reimport default sale params
const {
	DEFAULT_LAND_SALE_PARAMS,
} = require("./deployment_routines");

// reimport valid plot sizes to use
const {
	PLOT_SIZES,
	parse_plot,
} = require("../../land_nft/include/land_data_utils");

// isomorphic grid utils
const {
	is_corner,
} = require("../../land_gen/include/isomorphic_grid_utils");

// number of element sites for each tier
const element_sites = [0, 3, 6, 9, 12, 15];
// number of fuel sites for each tier
const fuel_sites = [0, 1, 3, 6, 9, 12];
// plot size for each tier
const plot_sizes = [50, 50, 50, 50, 50, 50];

/**
 * Generates the PlotData (sale data) array, and its Merkle tree related structures
 *
 * @param plots number of plots to generate, fn will generate an array of this size
 * @param sequences number of sequences to sell plots in
 * @param regions number of regions
 * @param region_size (x, y) limit
 * @param tiers number of tiers
 * @param plot_sizes possible square sizes to randomly pick from to generate a plot
 * @return Array<PlotData>, an array of PlotData structures, their hashes (Merkle leaves), Merkle tree, and root
 */
function generate_land(
	plots = 100_000,
	sequences = DEFAULT_LAND_SALE_PARAMS.full_sequences,
	regions = 7,
	region_size = 500,
	tiers = 5,
	plot_sizes = PLOT_SIZES
) {
	if(plots > 20_000) {
		log.debug("generating %o land plots, this may take a while", plots);
	}

	// allocate the array of `plots` size
	const land_plots = new Array(plots);

	// generate the array contents
	for(let i = 0; i < plots; i++) {
		land_plots[i] = {
			tokenId: i + 1,
			sequenceId: Math.floor(sequences * i / plots),
			regionId: random_int(1, 1 + regions),
			x: i % region_size,
			y: Math.floor(i / region_size),
			tierId: random_int(1, 1 + tiers),
			size: random_element(plot_sizes),
		};
	}

	// generate an array of the leaves for a Merkle tree, the tree itself, and its root
	const {tree, root, leaves} = generate_tree(land_plots);

	// return all the cool stuff
	return {plots: land_plots, leaves, tree, root, sequences, regions, tiers, plot_sizes};
}

// prints the plot information, including internal structure
function print_plot(plot, print_sites = true, scale = 2) {
	// short header
	let s = `(${plot.x}, ${plot.y}, ${plot.regionId}) ${plot.size}x${plot.size} Tier ${plot.tierId}`;
	if(!plot.sites) {
		return s;
	}

	// expand header
	const types = new Array(8);
	for(let i = 0; i < types.length; i++) {
		types[i] = plot.sites.filter(s => s.typeId == i).length;
	}
	const element_sites = types[1] + types[2] + types[3];
	const fuel_sites = types[4] + types[5] + types[6];
	s += `: ${element_sites}/${fuel_sites} (${types[1]}/${types[2]}/${types[3]}/${types[4]}/${types[5]}/${types[6]})`;

	if(!print_sites) {
		s += `// ${plot.landmarkTypeId}`;
		return s;
	}

	// print the internal land plot structure
	s += "\n";
	s += print_site_type(plot.landmarkTypeId);
	// define the coordinate grid transformation function
	const f = (x) => Math.floor(x / scale);
	// apply H = f(size) transformation
	const H = f(plot.size);
	for(let y = 0; y < H; y++) {
		for(let x = y == 0? 1: 0; x < H; x++) {
			// apply (x, y) => (f(x), f(y)) transformation to the sites coordinates
			const sites = plot.sites.filter(s => f(s.x) == x && f(s.y) == y);

			// are we in an "invalid" corner of the isomorphic grid
			const corner = is_corner(x, y, H);

			// print coinciding sites in the "invalid" area
			if(corner && sites.length > 1) {
				s += "x";
			}
			// print site in the "invalid" area
			else if(corner && sites.length > 0) {
				s += "X";
			}
			// print coinciding sites
			else if(sites.length > 1) {
				s += "*";
			}
			// print regular site
			else if(sites.length > 0) {
				const site = sites[0];
				s += print_site_type(site.typeId);
			}
			// print an "invalid" corner of the isomorphic grid
			else if(corner) {
				s += " ";
			}
			// print valid area of the isomorphic grid
			else {
				s += ".";
			}
		}
		s += "\n";
	}

	return s;
}

// prints site type as a single symbol
function print_site_type(typeId) {
	typeId = parseInt(typeId);
	switch(typeId) {
		case 0: return ".";  // No landmark/site
		case 1: return "C";  // Carbon
		case 2: return "S";  // Silicon
		case 3: return "H";  // Hydrogen
		case 4: return "c";  // Crypton
		case 5: return "h";  // Hyperion
		case 6: return "s";  // Solon
		case 7: return "A";  // Arena (Landmark only)
		default: return "U"; // Unknown
	}
}


/**
 * Converts PlotData struct into an array
 *
 * @param plot PlotData (sale data) struct
 * @return ABI compatible array representing the PlotData struct
 */
function plot_to_metadata(plot) {
	return Object.values(plot).map(v => stringify(v));
}

/**
 * Parses the PlotData data struct internals into Number and BN (string representation)
 *
 * @param plot PlotData data struct
 * @return {{tokenId: number, sequenceId: number, regionId: number, x: number, y: number, tierId: number, size: number}}
 */
function parse_plot_data(plot) {
	return Object.assign({}, {
		tokenId: parseInt(plot.tokenId),
		sequenceId: parseInt(plot.sequenceId),
		regionId: parseInt(plot.regionId),
		x: parseInt(plot.x),
		y: parseInt(plot.y),
		tierId: parseInt(plot.tierId),
		size: parseInt(plot.size),
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
	element_sites,
	fuel_sites,
	plot_sizes,
	parse_plot,
	parse_plot_data,
	generate_land,
	print_plot,
	generate_tree,
	plot_to_leaf,
	plot_to_metadata,
}
