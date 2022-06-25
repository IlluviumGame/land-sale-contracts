// Land Generator: Isomorphic Grid Tests
// Verifies Resource Sites positioning on the isomorphic grid
// Used land_lib.js instead of LandLib.sol
// This test file should not be part of the solidity-coverage since it doesn't run any Solidity code

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// Chai test helpers
const {
	assert,
	expect,
} = require("chai");

// number utils
const {
	random_int,
	random_element,
} = require("../include/number_utils");

// land data utils
const {
	PLOT_SIZES,
	element_sites,
	fuel_sites,
	generate_land,
	plot_to_metadata,
} = require("../protocol/include/land_data_utils");

// isomorphic grid utils
const {
	print_sites,
	is_corner,
} = require("./include/isomorphic_grid_utils");

// log utils
const {
	write_info,
} = require("../protocol/include/log_utils");

// LandLib.sol: JS implementation
const {
	get_resource_sites: get_resource_sites_js,
} = require("./include/land_lib");

/*
// deployment routines in use
const {
	land_lib_deploy,
} = require("./include/deployment_routines");
*/

// run Land Generator: Isomorphic Grid Tests
contract("LandLib: [Land Gen] Isomorphic Grid Tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

/*
	// deploy the LandLib
	let land_lib;
	before(async function() {
		land_lib = await land_lib_deploy(a0);
	});

	async function get_resource_sites(seed, element_sites, fuel_sites, grid_size, site_size = 2) {
		return (await land_lib.getResourceSites(seed, element_sites, fuel_sites, grid_size, site_size))
			.map(site => Object.assign({}, {
				typeId: parseInt(site.typeId),
				x: parseInt(site.x),
				y: parseInt(site.y),
			})).sort((s1, s2) => (s1.y * grid_size + s1.x) - (s2.y * grid_size + s2.x));
	}
*/
	function get_resource_sites(seed, element_sites, fuel_sites, grid_size, site_size = 2) {
		return get_resource_sites_js(seed, element_sites, fuel_sites, grid_size, site_size)
			.sort((s1, s2) => (s1.y * grid_size + s1.x) - (s2.y * grid_size + s2.x));
	}

	it("it is possible to generate site maps of zero length", async function() {
		const resource_sites = await get_resource_sites(0, 0, 0, 8);
		expect(resource_sites.length).to.equal(0);
	});
	it("it is possible to generate site maps with one element site only", async function() {
		const resource_sites = await get_resource_sites(0, 1, 0, 12);
		expect(resource_sites.length, "no sites or more than one site").to.equal(1);
		expect(resource_sites[0].typeId).to.be.closeTo(2, 1);
	});
	it("it is possible to generate site maps with one fuel site only", async function() {
		const resource_sites = await get_resource_sites(0, 0, 1, 12);
		expect(resource_sites.length, "no sites or more than one site").to.equal(1);
		expect(resource_sites[0].typeId).to.be.closeTo(5, 1);
	});

	/**
	 * Performs an isomorphic grid test
	 *
	 * @param tier_id used to derive amounts of resource sites to generate
	 * @param grid_size size of the grid
	 * @param plots number of iterations, number of plots to generate
	 * @param site_size implied size of the resource site
	 * @param landmark_size implied size of the landmark site (used to check free area in the plot center)
	 */
	function isomorphic_gen_test(
		tier_id,
		grid_size,
		plots = 100,
		site_size = 2,
		landmark_size = 4
	) {
		// generate the resource sites for `plots` plots
		const site_maps = new Array(plots);
		let all_sites;
		before(async function() {
			log.info("generating %o site maps for tier %o, grid size %o, site size %o", site_maps.length, tier_id, grid_size, site_size);
			write_info("[");
			for(let seed = 0; seed < site_maps.length; seed++) {
				site_maps[seed] = await get_resource_sites(seed, element_sites[tier_id], fuel_sites[tier_id], grid_size, site_size);
				if(!(seed % Math.floor(site_maps.length / 100))) {
					write_info(".");
				}
			}
			write_info("]\n");
			all_sites = site_maps.flat();
			log.info("all sites map:\n" + print_sites(all_sites, grid_size));
			for(let type_id = 1; type_id <= 6; type_id++) {
				const sites = all_sites.filter(site => site.typeId == type_id);
				log.debug("resource type %o sites map:\n" + print_sites(sites, grid_size), type_id);
			}
		});

		// expects there are no coinciding resource sites in the collection
		function expect_no_collision(resource_sites) {
			resource_sites.forEach((s0, i) => {
				// all the colliding sites
				const collided_sites = resource_sites.filter(
					(s1, j) => j > i
						&& Math.abs(s0.x - s1.x) < site_size
						&& Math.abs(s0.y - s1.y) < site_size
				);

				// first collision if any
				const s1 = collided_sites.find(() => true);
				const x1 = s1? s1.x: -1;
				const y1 = s1? s1.y: -1;

				// do chai expect there are no collisions
				expect(
					collided_sites.length,
					`resource sites collision at ${i} (${s0.x}, ${s0.y})/(${x1}, ${y1})`
				).to.equal(0);
			})
		}

		// expects no resource sites are placed outside the isomorphic grid
		function expect_no_corner(resource_sites) {
			// for each coordinate occupied by the resource
			for(let i = 0; i < site_size; i++) {
				for(let j = 0; j < site_size; j++) {
					// find the resource sites outside the isomorphic grid (in the corners)
					const sites_in_corners = resource_sites.filter(s => is_corner(s.x + i, s.y + j, grid_size));
					// do chai expect there are no such sites
					expect(sites_in_corners.length, `corner collision (${i}, ${j})`).to.equal(0);
				}
			}
		}

		// expects no resource sites are placed in the grid center, and center is free to place a landmark
		function expect_free_center(resource_sites) {
			const x0 = Math.floor(grid_size / 2 - landmark_size / 2); // y0 = x0
			const x1 = Math.ceil(grid_size / 2 + landmark_size / 2); // y1 = x1
			const sites_in_center = resource_sites.filter(s => s.x >= x0 && s.x < x1 && s.y >= x0 && s.y < x1);
			expect(sites_in_center.length).to.equal(0);
		}

		// expects resource sites locations (x, y) look random on the isomorphic grid
		function expect_looks_random(resource_sites, depth = 100) {
			// normalized grid size: how many resource site squares it includes
			const normalized_size = grid_size /site_size;
			if(normalized_size < 8) {
				log.debug("grid size is too small, test skipped");
				return;
			}

			// size of the isomorphic grid, tiles
			const S = grid_size * (1 + grid_size / 2);
			if(resource_sites.length / S  < 0.1) {
				log.debug("too few resource sites, test skipped");
				return;
			}

			// allowed diff is 50% for smaller plots, 25% for bigger plots
			const d = Math.ceil(resource_sites.length / Math.floor(normalized_size / 4));

			for(let k = 0; k < depth; k++) {
				// take random rectangle of width `w`, height `h`, at position (x, y) on the plot
				const w = site_size * random_int(3, grid_size / site_size);
				const h = site_size * random_int(3, grid_size / site_size);
				const x = random_int(0, grid_size - w);
				const y = random_int(0, grid_size - h);

				// estimate number of rectangle tiles on the isomorphic grid
				let c = w * h;
				for(let i = x; i < x + w; i++) {
					for(let j = y; j < y + h; j++) {
						if(is_corner(i, j, grid_size)) {
							c--;
						}
					}
				}

				// estimate average number of sites rectangle would have
				const f = Math.ceil(resource_sites.length * c / S);
				// calculate actual number of sites rectangle has
				const s = resource_sites.filter(s => s.x >= x && s.x < x + w && s.y >= y && s.y < y + h).length;

				log.debug(
					"grid %o/%o rect (%o, %o) %o x %o; diff: %o / %o – %o",
					grid_size, site_size, x, y, w, h, s, Math.max(0, f - d), Math.min(resource_sites.length, f + d)
				);

				// compare the two, expect the difference to be lower than allowed difference of total number of sites
				expect(
					Math.abs(f - s),
					`grid ${grid_size}/${site_size} rect (${x}, ${y}) ${w} x ${h} s = ${c} diff: ${s} / ${f}`
				).to.be.lessThanOrEqual(d);
			}
		}

		// do the tests (no collisions, sites are positioned inside isomorphic grid, randomness, etc.)
		it(`there are no resource site collisions tier ${tier_id}, grid size ${grid_size} [ @skip-on-coverage ]`, async function() {
			site_maps.forEach(resource_sites => {
				expect_no_collision(resource_sites);
			});
		});
		it(`resource sites distribution for tier ${tier_id}, grid size ${grid_size} is inside the isomorphic grid [ @skip-on-coverage ]`, async function() {
			expect_no_corner(all_sites);
		});
		it(`there are no resource sites in the center of the grid, tier ${tier_id}, grid size ${grid_size} [ @skip-on-coverage ]`, async function() {
			expect_free_center(all_sites);
		});
		it(`resource sites distribution for tier ${tier_id}, grid size ${grid_size} looks random [ @skip-on-coverage ]`, async function() {
			expect_looks_random(all_sites);
		});
		for(let type_id = 1; type_id <= 6; type_id++) {
			it(`resource type ${type_id} distribution for tier ${tier_id}, grid size ${grid_size} looks random [ @skip-on-coverage ]`, async function() {
				expect_looks_random(all_sites.filter(site => site.typeId == type_id));
			});
		}
	}

	// for a small grid sizes we can only test lower tiers dut to plot size limit
	[16, 17, 18, 19].forEach(grid_size => {
		describe(`when grid size is ${grid_size}`, function() {
			// lower tier(s)
			[1, 2].forEach(tier_id => {
				isomorphic_gen_test(tier_id, grid_size, 10_000);
			});
		});
	});

	// grid sizes: use the default PLOT_SIZES together with an extended set
	[...new Set(PLOT_SIZES.concat([
		20, 21, 22, 23, 24,
		32, 33, 34, 35, 36,
		47, 48, 49, 50, 51, 52, // approved grid size is 50x50
		59, 60, 61, 62, 63, 64,
		79, 80,
		99, 100,
		119, 120,
		127, 128
	]))].sort().forEach(grid_size => {
		describe(`when grid size is ${grid_size}`, function() {
			// all the tier(s)
			[1, 2, 3, 4, 5].forEach(tier_id => {
				isomorphic_gen_test(tier_id, grid_size, 10_000);
			});
		});
	});
});
