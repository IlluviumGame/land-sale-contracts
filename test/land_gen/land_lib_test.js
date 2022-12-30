// LandLib.sol vs land_lib.js JS Implementation Tests
// Verifies LandLib.sol: JS implementation versus native LandLib.sol

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// Chai test helpers
const {
	assert,
	expect,
} = require("chai");
// enable chai-bn plugin
require('chai').use(require('chai-bn')(web3.utils.BN));

// number utils
const {
	random_int,
	random_element,
} = require("../include/number_utils");

// BN utils
const {
	random_bn256,
} = require("../../scripts/include/bn_utils");

// land data utils
const {
	generate_land_plot,
	generate_land_plot_metadata,
	plot_to_metadata,
	parse_plot,
} = require("../land_nft/include/land_data_utils");

// LandLib.sol: JS implementation
const {
	pack,
	unpack,
	next_rnd_uint,
	get_coords,
	get_resource_sites,
} = require("./include/land_lib");

// deployment routines in use
const {
	land_lib_deploy,
} = require("./include/deployment_routines");

// run LandLib.sol vs land_lib.js JS Implementation Tests
contract("LandLib.sol vs land_lib.js: JS Implementation tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	// deploy the LandLib
	let land_lib;
	before(async function() {
		land_lib = await land_lib_deploy(a0);
	});

	// depth of the tests performed
	const ROUNDS = 1_000;

	async function pack_sol(store) {
		return await land_lib.pack(store);
	}

	async function unpack_sol(packed) {
		return parse_plot(await land_lib.unpack(packed));
	}

	async function next_rnd_uint_sol(seed, offset, options) {
		const result = await land_lib.nextRndUint16(seed, offset, options);
		return {seed: result.nextSeed, rndVal: result.rndVal.toNumber()};
	}

	async function get_coords_sol(seed, length, size) {
		const result = await land_lib.getCoords(seed, length, size);
		return {seed: result.nextSeed, coords: result.coords.map(v => v.toNumber())};
	}

	async function get_resource_sites_sol(seed, element_sites, fuel_sites, grid_size, site_size = 2) {
		return (await land_lib.getResourceSites(seed, element_sites, fuel_sites, grid_size, site_size))
			.map(site => Object.assign({}, {
				typeId: parseInt(site.typeId),
				x: parseInt(site.x),
				y: parseInt(site.y),
			}));
	}

	async function sort_sol(arr) {
		return (await land_lib.sort(arr)).map(x => parseInt(x));
	}

	async function test_pack(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const plot = generate_land_plot();
			const packed_js = pack(plot);
			const packed_sol = await pack_sol(plot);
			log.debug("input: %o", plot);
			log.debug("packed_js: %o", packed_js.toString(16));
			log.debug("packed_sol: %o", packed_sol.toString(16));
			expect(packed_js).to.be.bignumber.that.equals(packed_sol);
		}
	}

	async function test_unpack(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const packed = random_bn256();
			const plot_js = unpack(packed);
			const plot_sol = await unpack_sol(packed);
			log.debug("input: %o", packed.toString(16));
			log.debug("plot_js (unpacked): %o", plot_js);
			log.debug("plot_sol (unpacked): %o", plot_sol);
			expect(plot_js).to.deep.equal(plot_sol);
		}
	}

	async function test_next_rnd_uint(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const seed = random_bn256();
			const offset = random_int(0, 10);
			const options = random_int(2, 10_000);
			const rnd_int_js = next_rnd_uint(seed, offset, options);
			const rnd_int_sol = await next_rnd_uint_sol(seed, offset, options);
			log.debug("input: %o", {seed: seed.toString(), offset, options});
			log.debug("rnd_int_js: %o", {seed: rnd_int_js.seed.toString(16), rndVal: rnd_int_js.rndVal});
			log.debug("rnd_int_sol: %o", {seed: rnd_int_sol.seed.toString(16), rndVal: rnd_int_sol.rndVal});
			expect(rnd_int_js).to.deep.equal(rnd_int_sol);
		}
	}

	async function test_get_coords(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const seed = random_bn256();
			const length = random_int(3, 30);
			const size = random_int(1_000, 20_000);
			const coords_js = get_coords(seed, length, size);
			const coords_sol = await get_coords_sol(seed, length, size);
			log.debug("input: %o", {seed: seed.toString(), length, size});
			log.debug("coords_js: %o", {seed: coords_js.seed.toString(16), coords: coords_js.coords});
			log.debug("coords_sol: %o", {seed: coords_sol.seed.toString(16), coords: coords_sol.coords});
			expect(coords_js).to.deep.equal(coords_sol);
		}
	}

	async function test_get_resource_sites(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const seed = random_bn256();
			const element_sites = random_int(1, 16);
			const resource_sites = random_int(1, 13);
			const grid_size = random_int(32, 129);
			const site_size = random_int(2, 3);
			const sites_js = get_resource_sites(seed, element_sites, resource_sites, grid_size, site_size);
			const sites_sol = await get_resource_sites_sol(seed, element_sites, resource_sites, grid_size, site_size);
			log.debug("input: %o", {seed: seed.toString(16), element_sites, resource_sites, grid_size, site_size});
			log.debug("sites_js: %o", sites_js);
			log.debug("sites_sol: %o", sites_sol);
			expect(sites_js).to.deep.equal(sites_sol);
		}
	}

	async function test_sort(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const arr = Array.from({length: i}, () => random_int(0, 2 * rounds));
			const sorted_sol = await sort_sol(arr);
			const sorted_js = arr.slice().sort((a, b) => a - b);
			log.debug("input: %o", arr.join(","));
			log.debug("sorted_sol: %o", sorted_sol.join(","));
			log.debug("sorted_js: %o", sorted_js.join(","));
			expect(sorted_sol).to.deep.equal(sorted_js);
		}
	}

	it("pack [ @skip-on-coverage ]", async function() {
		await test_pack();
	});
	it("pack (low complexity)", async function() {
		await test_pack(ROUNDS / 100);
	});
	it("unpack [ @skip-on-coverage ]", async function() {
		await test_unpack();
	});
	it("unpack (low complexity)", async function() {
		await test_unpack(ROUNDS / 100);
	});
	it("nextRndUint [ @skip-on-coverage ]", async function() {
		await test_next_rnd_uint();
	});
	it("nextRndUint (low complexity)", async function() {
		await test_next_rnd_uint(ROUNDS / 100);
	});
	it("getCoords [ @skip-on-coverage ]", async function() {
		await test_get_coords();
	});
	it("getCoords (low complexity)", async function() {
		await test_get_coords(ROUNDS / 100);
	});
	it("getResourceSites [ @skip-on-coverage ]", async function() {
		await test_get_resource_sites();
	});
	it("getResourceSites (low complexity)", async function() {
		await test_get_resource_sites(ROUNDS / 100);
	});
	it("sort [ @skip-on-coverage ]", async function() {
		await test_sort(ROUNDS / 5);
	});
	it("sort (low complexity)", async function() {
		await test_sort(ROUNDS / 100);
	});
});
