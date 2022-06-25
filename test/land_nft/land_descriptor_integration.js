// LandERC721: land descriptor integration related Tests

// Zeppelin test helpers
const {
	BN,
	constants,
	expectEvent,
	expectRevert,
} = require("@openzeppelin/test-helpers");
const {
	assert,
	expect,
} = require("chai");
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = constants;

// number utils
const {
	print_n,
} = require("../include/number_utils");

// land data utils
const {
	generate_land_plot,
	generate_land_plot_metadata,
	plot_to_metadata,
} = require("./include/land_data_utils");

// deployment routines in use
const {
	land_nft_deploy,
	land_descriptor_deploy,
} = require("./include/deployment_routines");

// run land descriptor integration tests
contract("LandERC721: land descriptor integration tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3] = accounts;

	// deploy token
	let token;
	beforeEach(async function() {
		token = await land_nft_deploy(a0);
	});

	// default token owner address and token_id to use
	const to = a1;
	const token_id = 1;

	describe("when a token is minted", function() {
		// mint the token to play with
		beforeEach(async function() {
			await token.mintWithMetadata(to, token_id, generate_land_plot_metadata(), {from: a0});
		});

		const baseURI = "base://uri.sys.dot/no-sense/";
		const tokenURI = "token://uri.sys.dot/no-sense/1";
		const tokenSVG = "svg://x-base64-encoded==";

		function token_URI_behaves_as_usual() {
			describe("when base URI and token URI are not set", function() {
				it("tokenURI returns empty string", async function() {
					expect(await token.tokenURI(token_id)).to.equal("");
				});
			});
			describe("when base URI is set", function() {
				beforeEach(async function() {
					await token.setBaseURI(baseURI, {from: a0});
				});
				it("tokenURI returns non-empty non-SVG string", async function() {
					expect(await token.tokenURI(token_id)).to.equal(baseURI + token_id);
				});
			});
			describe("when token URI is set", function() {
				beforeEach(async function() {
					await token.setTokenURI(token_id, tokenURI, {from: a0});
				});
				it("tokenURI returns non-empty non-SVG string", async function() {
					expect(await token.tokenURI(token_id)).to.equal(tokenURI);
				});
			});
		}

		describe("when land descriptor is not set, tokenURI() behaves as usual", function() {
			beforeEach(async function() {
				await token.setLandDescriptor(ZERO_ADDRESS, {from: a0});
			});
			token_URI_behaves_as_usual();
		});
		describe("when land descriptor is set", function() {
			let descriptor;
			beforeEach(async function() {
				descriptor = await land_descriptor_deploy(a0);
				await token.setLandDescriptor(descriptor.address, {from: a0});
			});
			describe("when land descriptor returns empty string, tokenURI() behaves as usual", function() {
				beforeEach(async function() {
					await descriptor.setTokenURIOverride("", {from: a0});
				});
				token_URI_behaves_as_usual();
			});
			describe("when land descriptor returns non-empty string, tokenURI() gets overridden", function() {
				beforeEach(async function() {
					await descriptor.setTokenURIOverride(tokenSVG, {from: a0});
				});
				describe("when base URI and token URI are not set", function() {
					it("tokenURI returns non-empty SVG string", async function() {
						expect(await token.tokenURI(token_id)).to.equal(tokenSVG);
					});
				});
				describe("when base URI is set", function() {
					beforeEach(async function() {
						await token.setBaseURI(baseURI, {from: a0});
					});
					it("tokenURI returns non-empty SVG string", async function() {
						expect(await token.tokenURI(token_id)).to.equal(tokenSVG);
					});
				});
				describe("when token URI is set", function() {
					beforeEach(async function() {
						await token.setTokenURI(token_id, tokenURI, {from: a0});
					});
					it("tokenURI returns non-empty SVG string", async function() {
						expect(await token.tokenURI(token_id)).to.equal(tokenSVG);
					});
				});
			});
		});
	});
	describe("when token is not minted and land descriptor is set", function() {
		let descriptor;
		beforeEach(async function() {
			descriptor = await land_descriptor_deploy(a0);
			await token.setLandDescriptor(descriptor.address, {from: a0});
		});
		it("tokenURI() throws", async function() {
			await expectRevert(token.tokenURI(token_id), "token doesn't exist");
		});
	});
});
