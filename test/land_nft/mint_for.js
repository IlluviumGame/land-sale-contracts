// LandERC721: IMX mintFor tests

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

// land data utils
const {
	generate_land_plot,
	plot_to_metadata,
	parse_plot,
} = require("./include/land_data_utils");

// LandLib.sol: JS implementation
const {
	pack,
	unpack,
} = require("../land_gen/include/land_lib");

// deployment routines in use
const {
	land_nft_deploy,
} = require("./include/deployment_routines");

// run IMX mintFor tests
contract("LandERC721: IMX mintFor tests", function(accounts) {
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

	async function mint_for(metadata, amount = 1) {
		const minting_blob = web3.utils.asciiToHex(`{${token_id}}:{${metadata.toString(10)}}`);
		return await token.mintFor(to, amount, minting_blob, {from: a0});
	}

	it("mintFor fails if rudimentary amount is zero", async function() {
		await expectRevert(mint_for(pack(generate_land_plot()), 0), "quantity must be equal to one");
	});
	it("mintFor fails if rudimentary amount is bigger than one", async function() {
		await expectRevert(mint_for(pack(generate_land_plot()), 2), "quantity must be equal to one");
	});
	it("mintFor fails if blueprint is zero (metadata version constraint)", async function() {
		await expectRevert(mint_for(new BN(0)), "unsupported metadata version");
	});
	it("mintFor fails if blueprint is 0x0100... (zero plot size constraint)", async function() {
		await expectRevert(mint_for(new BN(2).pow(new BN(248))), "too small");
	});
	describe("when plot is minted via mintFor", function() {
		const plot = generate_land_plot();
		const metadata = plot_to_metadata(plot);
		let receipt;
		beforeEach(async function() {
			receipt = await mint_for(pack(plot));
		});

		it('"Transfer" event is emitted', async function() {
			expectEvent(receipt, "Transfer", {
				from: ZERO_ADDRESS,
				to: to,
				tokenId: token_id + "",
			});
		});
		it('"MetadataUpdated" event is emitted', async function() {
			expectEvent(receipt, "MetadataUpdated", {
				_by: a0,
				_tokenId: token_id + "",
				_plot: metadata,
			});
		});
		it("metadata gets written", async function () {
			expect(await token.hasMetadata(token_id)).to.be.true;
		});
		it("metadata gets written as expected", async function () {
			const parsed = parse_plot(await token.getMetadata(token_id));
			expect(parsed).to.deep.equal(plot);
		});
	});
});
