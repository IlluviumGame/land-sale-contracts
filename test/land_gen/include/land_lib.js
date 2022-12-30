// LandLib.sol: JS Implementation

/**
 * @title Land Library
 *
 * @notice A library defining data structures related to land plots (used in Land ERC721 token),
 *      and functions transforming these structures between view and internal (packed) representations,
 *      in both directions.
 *
 * @notice Due to some limitations Solidity has (ex.: allocating array of structures in storage),
 *      and due to the specific nature of internal land structure
 *      (landmark and resource sites data is deterministically derived from a pseudo random seed),
 *      it is convenient to separate data structures used to store metadata on-chain (store),
 *      and data structures used to present metadata via smart contract ABI (view)
 *
 * @notice Introduces helper functions to detect and deal with the resource site collisions
 *
 * @author Basil Gorin
 */
class LandLib {
	/**
	 * @dev Tightly packs `PlotStore` data struct into uint256 representation
	 *
	 * @param store `PlotStore` data struct to pack
	 * @return packed `PlotStore` data struct packed into uint256
	 */
	static pack(store) {
		return web3.utils.toBN(store.version).shln(248).maskn(256)
			.or(web3.utils.toBN(store.regionId).shln(240).maskn(248))
			.or(web3.utils.toBN(store.x).shln(224).maskn(240))
			.or(web3.utils.toBN(store.y).shln(208).maskn(224))
			.or(web3.utils.toBN(store.tierId).shln(200).maskn(208))
			.or(web3.utils.toBN(store.size).shln(184).maskn(200))
			.or(web3.utils.toBN(store.landmarkTypeId).shln(176).maskn(184))
			.or(web3.utils.toBN(store.elementSites).shln(168).maskn(176))
			.or(web3.utils.toBN(store.fuelSites).shln(160).maskn(168))
			.or(web3.utils.toBN(store.seed).maskn(160));
	}

	/**
	 * @dev Unpacks `PlotStore` data struct from uint256 representation
	 *
	 * @param packed uint256 packed `PlotStore` data struct
	 * @return store unpacked `PlotStore` data struct
	 */
	static unpack(packed) {
		return {
			version:        packed.shrn(248).maskn(8).toNumber(),
			regionId:       packed.shrn(240).maskn(8).toNumber(),
			x:              packed.shrn(224).maskn(16).toNumber(),
			y:              packed.shrn(208).maskn(16).toNumber(),
			tierId:         packed.shrn(200).maskn(8).toNumber(),
			size:           packed.shrn(184).maskn(16).toNumber(),
			landmarkTypeId: packed.shrn(176).maskn(8).toNumber(),
			elementSites:   packed.shrn(168).maskn(8).toNumber(),
			fuelSites:      packed.shrn(160).maskn(8).toNumber(),
			seed:           packed.maskn(160).toString()
		};
	}

	/**
	 * @dev Expands `PlotStore` data struct into a `PlotView` view struct
	 *
	 * @dev Derives internal land structure (resource sites the plot has)
	 *      from Number of Element/Fuel Sites, Plot Size, and Seed;
	 *      Generator Version is not currently used
	 *
	 * @param store on-chain `PlotStore` data structure to expand
	 * @return `PlotView` view struct, expanded from the on-chain data
	 */
	static plotView(store) {
		// copy most of the fields as is, derive resource sites array inline
		return {
			regionId:       store.regionId,
			x:              store.x,
			y:              store.y,
			tierId:         store.tierId,
			size:           store.size,
			landmarkTypeId: store.landmarkTypeId,
			elementSites:   store.elementSites,
			fuelSites:      store.fuelSites,
			// derive the resource sites from Number of Element/Fuel Sites, Plot Size, and Seed
			sites:          LandLib.getResourceSites(store.seed, store.elementSites, store.fuelSites, store.size, 2)
		};
	}

	/**
	 * @dev Based on the random seed, tier ID, and plot size, determines the
	 *      internal land structure (resource sites the plot has)
	 *
	 * @dev Function works in a deterministic way and derives the same data
	 *      for the same inputs; the term "random" in comments means "pseudo-random"
	 *
	 * @param seed random seed to consume and derive the internal structure
	 * @param elementSites number of element sites plot has
	 * @param fuelSites number of fuel sites plot has
	 * @param gridSize plot size `N` of the land plot to derive internal structure for
	 * @param siteSize implied size `n` of the resource sites
	 * @return sites randomized array of resource sites
	 */
	static getResourceSites(
		seed,
		elementSites,
		fuelSites,
		gridSize,
		siteSize
	) {
		// derive the total number of sites
		const totalSites = parseInt(elementSites) + parseInt(fuelSites);

		// denote the grid (plot) size `N`
		// denote the resource site size `n`

		// transform coordinate system (1): normalization (x, y) => (x / n, y / n)
		// if `N` is odd this cuts off border coordinates x = N - 1, y = N - 1
		let normalizedSize = Math.floor(gridSize / siteSize);

		// after normalization (1) is applied, isomorphic grid becomes effectively larger
		// due to borders capturing effect, for example if N = 4, and n = 2:
		//      | .. |                                              |....|
		// grid |....| becomes |..| normalized which is effectively |....|
		//      |....|         |..|                                 |....|
		//      | .. |                                              |....|
		// transform coordinate system (2): cut the borders, and reduce grid size to be multiple of 2
		// if `N/2` is odd this cuts off border coordinates x = N/2 - 1, y = N/2 - 1
		normalizedSize = ((normalizedSize - 2) >> 1) << 1;

		// define coordinate system: an isomorphic grid on a square of size [size, size]
		// transform coordinate system (3): pack an isomorphic grid on a rectangle of size [size, 1 + size / 2]
		// transform coordinate system (4): (x, y) -> y * size + x (two-dimensional Cartesian -> one-dimensional segment)
		// define temporary array to determine sites' coordinates
		let coords;
		// generate site coordinates in a transformed coordinate system (on a one-dimensional segment)
		// cut off four elements in the end of the segment to reserve space in the center for a landmark
		({seed, coords} = LandLib.getCoords(seed, totalSites, normalizedSize * (1 + (normalizedSize >> 1)) - 4));

		// allocate number of sites required
		const sites = new Array(totalSites);

		// define the variables used inside the loop outside the loop to help compiler optimizations
		// site type ID
		let typeId;
		// site coordinates (x, y)
		let x;
		let y;

		// determine the element and fuel sites one by one
		for(let i = 0; i < totalSites; i++) {
			// determine next random number in the sequence, and random site type from it
			({seed, rndVal: typeId} = LandLib.nextRndUint(seed, i < elementSites? 1: 4, 3));

			// determine x and y
			// reverse transform coordinate system (4): x = size % i, y = size / i
			// (back from one-dimensional segment to two-dimensional Cartesian)
			x = coords[i] % normalizedSize;
			y = Math.floor(coords[i] / normalizedSize);

			// reverse transform coordinate system (3): unpack isomorphic grid onto a square of size [size, size]
			// fix the "(0, 0) left-bottom corner" of the isomorphic grid
			if(2 * (1 + x + y) < normalizedSize) {
				x += normalizedSize >> 1;
				y += 1 + (normalizedSize >> 1);
			}
			// fix the "(size, 0) right-bottom corner" of the isomorphic grid
			else if(2 * x > normalizedSize && 2 * x > 2 * y + normalizedSize) {
				x -= normalizedSize >> 1;
				y += 1 + (normalizedSize >> 1);
			}

			// move the site from the center (four positions near the center) to a free spot
			if(x >= (normalizedSize >> 1) - 1 && x <= normalizedSize >> 1
			&& y >= (normalizedSize >> 1) - 1 && y <= normalizedSize >> 1) {
				// `x` is aligned over the free space in the end of the segment
				// x += normalizedSize / 2 + 2 * (normalizedSize / 2 - x) + 2 * (normalizedSize / 2 - y) - 4;
				x += (5 * normalizedSize >> 1) - 2 * (x + y) - 4;
				// `y` is fixed over the free space in the end of the segment
				y = normalizedSize >> 1;
			}

			// if `N/2` is odd recover previously cut off border coordinates x = N/2 - 1, y = N/2 - 1
			// if `N` is odd recover previously cut off border coordinates x = N - 1, y = N - 1
			const offset = Math.floor(gridSize / siteSize) % 2 + gridSize % siteSize;

			// based on the determined site type and coordinates, allocate the site
			sites[i] = {
				typeId: typeId,
				// reverse transform coordinate system (2): recover borders (x, y) => (x + 1, y + 1)
				// if `N/2` is odd recover previously cut off border coordinates x = N/2 - 1, y = N/2 - 1
				// reverse transform coordinate system (1): (x, y) => (n * x, n * y), where n is site size
				// if `N` is odd recover previously cut off border coordinates x = N - 1, y = N - 1
				x: (1 + x) * siteSize + offset,
				y: (1 + y) * siteSize + offset
			};
		}

		// return the result
		return sites;
	}

	/**
	 * @dev Based on the random seed and tier ID determines the landmark type of the plot.
	 *      Random seed is consumed for tiers 3 and 4 to randomly determine one of three
	 *      possible landmark types.
	 *      Tier 5 has its landmark type predefined (arena), lower tiers don't have a landmark.
	 *
	 * @dev Function works in a deterministic way and derives the same data
	 *      for the same inputs; the term "random" in comments means "pseudo-random"
	 *
	 * @param seed random seed to consume and derive the landmark type based on
	 * @param tierId tier ID of the land plot
	 * @return landmarkTypeId landmark type defined by its ID
	 */
	static getLandmark(seed, tierId) {
		// depending on the tier, land plot can have a landmark
		// tier 3 has an element landmark (1, 2, 3)
		if(tierId == 3) {
			// derive random element landmark
			return 1 + seed % 3;
		}
		// tier 4 has a fuel landmark (4, 5, 6)
		if(tierId == 4) {
			// derive random fuel landmark
			return 4 + seed % 3;
		}
		// tier 5 has an arena landmark
		if(tierId == 5) {
			// 7 - arena landmark
			return 7;
		}

		// lower tiers (0, 1, 2) don't have any landmark
		// tiers greater than 5 are not defined
		return 0;
	}

	/**
	 * @dev Derives an array of integers with no duplicates from the random seed;
	 *      each element in the array is within [0, size) bounds and represents
	 *      a two-dimensional Cartesian coordinate point (x, y) presented as one-dimensional
	 *
	 * @dev Function works in a deterministic way and derives the same data
	 *      for the same inputs; the term "random" in comments means "pseudo-random"
	 *
	 * @dev The input seed is considered to be already used to derive some random value
	 *      from it, therefore the function derives a new one by hashing the previous one
	 *      before generating the random value; the output seed is "used" - output random
	 *      value is derived from it
	 *
	 * @param seed random seed to consume and derive coordinates from
	 * @param length number of elements to generate
	 * @param size defines array element bounds [0, size)
	 * @return nextSeed next pseudo-random "used" seed
	 * @return coords the resulting array of length `n` with random non-repeating elements
	 *      in [0, size) range
	 */
	static getCoords(
		seed,
		length,
		size
	) {
		// allocate temporary array to store (and determine) sites' coordinates
		const coords = new Array(length);

		// generate site coordinates one by one
		for(let i = 0; i < coords.length; i++) {
			// get next number and update the seed
			({seed, rndVal: coords[i]} = LandLib.nextRndUint(seed, 0, size));
		}

		// sort the coordinates
		coords.sort((a, b) => a - b);

		// find the if there are any duplicates, and while there are any
		for(let i = LandLib.findDup(coords); i >= 0; i = LandLib.findDup(coords)) {
			// regenerate the element at duplicate position found
			({seed, rndVal: coords[i]} = LandLib.nextRndUint(seed, 0, size));
			// sort the coordinates again
			// TODO: check if this doesn't degrade the performance significantly (note the pivot in quick sort)
			coords.sort((a, b) => a - b);
		}

		// shuffle the array to compensate for the sorting made before
		seed = LandLib.shuffle(seed, coords);

		// return the updated used seed, and generated coordinates
		return {seed, coords};
	}

	/**
	 * @dev Based on the random seed, generates next random seed, and a random value
	 *      not lower than given `offset` value and able to have `options` different
	 *      possible values
	 *
	 * @dev The input seed is considered to be already used to derive some random value
	 *      from it, therefore the function derives a new one by hashing the previous one
	 *      before generating the random value; the output seed is "used" - output random
	 *      value is derived from it
	 *
	 * @param seed random seed to consume and derive next random value from
	 * @param offset the minimum possible output
	 * @param options number of different possible values to output
	 * @return nextSeed next pseudo-random "used" seed
	 * @return rndVal random value in the [offset, offset + options) range
	 */
	static nextRndUint(
		seed,
		offset,
		options
	) {
		// generate next random seed first
		seed = web3.utils.toBN(web3.utils.soliditySha3(seed));

		// derive random value with the desired properties from
		// the newly generated seed
		const rndVal = offset + seed.mod(web3.utils.toBN(options)).toNumber();

		// return the result as tuple
		return {seed, rndVal};
	}

	/**
	 * @dev Finds first pair of repeating elements in the array
	 *
	 * @dev Assumes the array is sorted ascending:
	 *      returns `-1` if array is strictly monotonically increasing,
	 *      index of the first duplicate found otherwise
	 *
	 * @param arr an array of elements to check
	 * @return index found duplicate index, or `-1` if there are no repeating elements
	 */
	static findDup(arr) {
		// iterate over the array [1, n], leaving the space in the beginning for pair comparison
		for(let i = 1; i < arr.length; i++) {
			// verify if there is a strict monotonically increase violation
			if(arr[i - 1] >= arr[i]) {
				// return its index if yes
				return i - 1;
			}
		}

		// return `-1` if no violation was found - array is strictly monotonically increasing
		return -1;
	}

	/**
	 * @dev Shuffles an array if integers by making random permutations
	 *      in the amount equal to the array size
	 *
	 * @dev The input seed is considered to be already used to derive some random value
	 *      from it, therefore the function derives a new one by hashing the previous one
	 *      before generating the random value; the output seed is "used" - output random
	 *      value is derived from it
	 *
	 * @param seed random seed to consume and derive next random value from
	 * @param arr an array to shuffle
	 * @return nextSeed next pseudo-random "used" seed
	 */
	static shuffle(seed, arr) {
		// define index `j` to permute with loop index `i` outside the loop to help compiler optimizations
		let j;

		// iterate over the array one single time
		for(let i = 0; i < arr.length; i++) {
			// determine random index `j` to swap with the loop index `i`
			({seed, rndVal: j} = LandLib.nextRndUint(seed, 0, arr.length));

			// do the swap
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}

		// return the updated used seed
		return seed;
	}
}

// export public deployment API
module.exports = {
	pack: LandLib.pack,
	unpack: LandLib.unpack,
	plot_view: LandLib.plotView,
	get_resource_sites: LandLib.getResourceSites,
	get_coords: LandLib.getCoords,
	next_rnd_uint: LandLib.nextRndUint,
};
