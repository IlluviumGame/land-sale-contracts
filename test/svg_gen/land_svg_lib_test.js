// Land SVG Generator: Land Descriptor Tests
// Verifies Land SVG generator

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// Zeppelin test helpers
const {
	BN,
	expectRevert,
} = require("@openzeppelin/test-helpers");
const {
	expect,
} = require("chai");

// SVG gen utils
const {
	generate_land_plot_metadata,
	save_svg_to_file,
	print_plot,
	gen_random_plot_sizes,
} = require("./include/svg_gen_utils");

// deployment routines in use
const {
	land_descriptor_deploy,
	land_svg_lib_mock_deploy,
	land_nft_deploy,
} = require("./include/deployment_routines");

// JS implementation for SVG generator
const {
	LandDescriptor,
	generateLandName,
} = require("./include/land_svg_lib");

// max gas limit
const MAX_UINT64 = new BN('2').pow(new BN('64')).sub(new BN('1'));

// run LandDescriptor tests
contract("LandDescriptor: Land SVG Generator Tests", function(accounts) {
	// extract accounts to be used:
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	const [a0, H0] = accounts;

	// grid (plot) sizes (provide at least one `plot_size` of each parity)
	// define plot_sizes to be used in coverage and normal runs (both)
	const plot_sizes_coverage = [48, 49];
	const plot_sizes = [50, 51, 52];

	// randomize plot sizes
	const max_plot_size = 120;
	const rnd_plot_sizes = 5;

	// Define token IDs
	const token_ids = new Array(plot_sizes_coverage.length + plot_sizes.length + rnd_plot_sizes).fill(0).map((_, i) => i + 1);

	// Custom generate_land_plots with the plot_sizes option
	function generate_land_plots(plot_sizes) {
		const land_plots = [];
		for(const size of plot_sizes) {
			land_plots.push(generate_land_plot_metadata(undefined, undefined, undefined, [size]));
		}
		return land_plots;
	}

	// Extract SVG string from Land Descriptor return data
	function get_svg_string(token_uri) {
		const svg_base64 = JSON.parse(
			new Buffer.from(token_uri.split(" ")[1], "base64").toString("ascii"))["image"]
			.split(",")[1];
		return new Buffer.from(svg_base64, "base64").toString("ascii");
	}

	// Attach `n` random plot sizes to fixed ones
	function attach_random_plot_sizes(to, n, fixed_plot_sizes) {
		return gen_random_plot_sizes(undefined, to, n, fixed_plot_sizes);
	}

	// Generate additional random plot sizes
	// Generate on the outer scope so it's available for all other scopes
	const extended_plot_sizes = attach_random_plot_sizes(max_plot_size, rnd_plot_sizes, plot_sizes);

	// deploy LandDescriptor
	let land_descriptor;
	// Deploy LandERC721 - Required to test LandDescriptor
	let land_nft;
	beforeEach(async() => {
		// Deploy LandDescriptor
		land_descriptor = await land_descriptor_deploy(a0);

		// Deploy LandERC721
		land_nft = await land_nft_deploy(a0);

		// set the LandDescriptor implementation
		await land_nft.setLandDescriptor(land_descriptor.address, {from: a0});

		// Generate some land plot NFTs
		// Mint NFTs on `land_nft` ERC721 contract given metadata
		let land_plots = generate_land_plots(plot_sizes_coverage.concat(extended_plot_sizes));
		for(let i = 0; i < token_ids.length; i++) {
			await land_nft.mintWithMetadata(H0, token_ids[i], land_plots[i], {from: a0});
		}
	});

	describe(`Test LandSvgLib functions`, function () {
		let land_svg_lib_mock;

		beforeEach(async () => {
			// Deploy LandSvgLibMock
			land_svg_lib_mock = await land_svg_lib_mock_deploy(a0);
		});

		function test_generate_land_name(region_id, x = 0, y = 0) {
			it(`Generate Land Name for regionId: ${region_id}, x: ${x} and y: ${y}`, async () => {
				if (region_id >= 1 && region_id <= 7) {
					// Call solidity function
					return_data_sol = await land_svg_lib_mock.generateLandName(region_id, x, y);

					// Get JS Implementation output
					return_data_js = generateLandName(region_id, x, y);

					expect(return_data_sol).to.be.equal(return_data_js);
				} else {
					// Call solidity function
					return_data_sol = land_svg_lib_mock.generateLandName(region_id, x, y);

					// Expect revertion with "Invalid region ID"
					await expectRevert(return_data_sol, "Invalid region ID");
				}
			});
		}

		// land names with regionId equal to 0 or 8 (or greater) should revert
		[0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(region_id => test_generate_land_name(region_id));
	});

	describe(`Generate Land SVGs for token IDs: ${token_ids} through LandERC721 contract`, function() {
		function test_token_URI(token_id, skip_on_coverage = false) {
			it(`gen Land SVG file for ${token_id}${skip_on_coverage ? " [ @skip-on-coverage ]" : ""}`, async () => {
				// Estimate gas cost
				const gas_eta = await land_nft.tokenURI.estimateGas(token_id, {gas: MAX_UINT64});
				log.info(`Estimated gas amount for ${token_id} SVG generation: ${gas_eta}`);
	
				// Log Resource sites info
				if(log.getLevel() <= log.levels.DEBUG) {
					const resource_sites = plot.sites;
					log.debug("Site list:");
					for(const site of resource_sites) {
						log.debug(`Resource type: ${site.typeId} (${site.typeId < 4? "element": "fuel"})`);
						log.debug(`Coordinates: (${site.x}, ${site.y})\n`);
					}
				}
				// Get plot for tokenID and generate SVG using JS impl
				const plot_view = await land_nft.viewMetadata(token_id);
				const return_data_js = LandDescriptor.tokenURI(plot_view);
	
				// Print sites to make sure the SVG positioning is correct
				log.debug(print_plot(plot_view));
	
				// Get token SVG string from LandERC721
				const return_data_sol = await land_nft.tokenURI(token_id, {gas: MAX_UINT64});
	
				// Check if it's equal to the one generated directly from Land Descriptor
				expect(return_data_sol).to.be.equal(return_data_js);
	
				// Generate Land SVG and write to file
				const path = save_svg_to_file(
					`land_svg_token_id_${token_id}_gridsize_${plot_view.size}`, get_svg_string(return_data_sol));
				log.info("SVG saved to %o", path);
			});
		}
		
		// Test Land SVG generation for all token IDs
		token_ids.slice(0, plot_sizes_coverage.length).forEach(token_id => test_token_URI(token_id));

		// Test Land SVG generation for all token IDs [ @skip-on-coverage ]
		token_ids.slice(plot_sizes_coverage.length).forEach(token_id => test_token_URI(token_id, true));
	});
});
