const fs = require('fs');
const path = require('path');
const os = require('os');

// reimport some utilities for SVG generation test
const {
	generate_land_plot_metadata,
} = require("../../land_nft/include/land_data_utils.js");
const {
	print_plot,
} = require("../../protocol/include/land_data_utils");
const {
	random_int,
} = require("../../include/number_utils");
const {assert} = require('console');

// Some constants
const MIN_GRID_SIZE = 32;

// Saves SVG string to .svg file
function save_svg_to_file(svg_name, svg_data) {
	const tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), "land-sale"));
	const file_path = path.resolve(tmp_dir, `./${svg_name}.svg`);
	fs.writeFileSync(file_path, svg_data);
	return file_path;
}

// Generate `n` random integers for a randomized plot_sizes
function gen_random_plot_sizes(from = MIN_GRID_SIZE, to, n, plot_sizes = []) {
	assert(from >= MIN_GRID_SIZE, `Minimum grid size is ${MIN_GRID_SIZE}`);

	let random_number;
	for(let i = 0; i < n; i++) {
		random_number = random_int(from, to)
		if(plot_sizes.includes(random_number)) {
			i--;
			continue;
		}
		plot_sizes.push(random_number);
	}
	return plot_sizes.sort();
}

// export public utils API
module.exports = {
	generate_land_plot_metadata,
	save_svg_to_file,
	print_plot,
	gen_random_plot_sizes,
	MIN_GRID_SIZE,
}
