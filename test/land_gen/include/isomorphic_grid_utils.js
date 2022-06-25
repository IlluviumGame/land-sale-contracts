// prints the plot information, including internal structure
function print_sites(plot_sites, grid_size, scale = 1) {
	// define a string containing the output print
	let s = "";

	// define the coordinate grid transformation function
	const f = (x) => Math.floor(x / scale);
	// apply H = f(grid_size) transformation
	const H = f(grid_size);
	// calculate the expected maximum amount of resource sites in one tile
	const C = Math.max(1, Math.floor(plot_sites.length / Math.pow(H, 2)));

	// do the printing
	for(let y = 0; y < H; y++) {
		for(let x = 0; x < H; x++) {
			// apply (x, y) => (f(x), f(y)) transformation to the sites coordinates
			const sites = plot_sites.filter(s => f(s.x) == x && f(s.y) == y);

			// are we in an "invalid" corner of the isomorphic grid
			const corner = is_corner(x, y, H);

			// print number of sites
			if(sites.length > 0) {
				const c = Math.ceil(sites.length / C).toString(36);
				s += c.length > 1? "*": c;
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

	// print the multiplier in the left-upper corner
	if(plot_sites.length > 0) {
		const multiplier_str = C.toString(16);
		s = multiplier_str + s.substring(multiplier_str.length);
	}

	// return the output
	return s;
}

// determines if (x, y) is outside an isomorphic grid of size H
function is_corner(x, y, H) {
	return 1 + x + y < H / 2 || 1 + x + y > 3 * H / 2 || x - y > H / 2 || y - x > H / 2;
}

// export public deployment API
module.exports = {
	print_sites,
	is_corner,
};
