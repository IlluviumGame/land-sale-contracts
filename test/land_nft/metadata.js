// LandERC721: Metadata related Tests

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
// enable chai-subset to allow containSubset, see https://www.chaijs.com/plugins/chai-subset/
//require("chai").use(require("chai-subset"));

// land data utils
const {
	generate_land_plot,
	generate_land_plot_metadata,
	plot_to_metadata,
} = require("./include/land_data_utils");

// deployment routines in use
const {
	land_nft_deploy,
} = require("./include/deployment_routines");

// run Metadata tests
contract("LandERC721: Metadata tests", function(accounts) {
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

	async function mint(token_id) {
		return await token.mint(to, token_id, {from: a0});
	}

	async function mint_with_meta(token_id) {
		return await token.mintWithMetadata(to, token_id, generate_land_plot_metadata(), {from: a0});
	}

	async function burn(token_id) {
		return await token.burn(token_id, {from: a0});
	}

	async function set_metadata(token_id, metadata = generate_land_plot_metadata()) {
		return await token.setMetadata(token_id, metadata, {from: a0});
	}

	function test_set_metadata(token_id, plot = generate_land_plot()) {
		const metadata = plot_to_metadata(plot);
		let receipt;
		beforeEach(async function() {
			receipt = await set_metadata(token_id, plot);
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
			expect(await token.getMetadata(token_id)).to.deep.equal(metadata);
		});
		describe("metadata view looks as expected", function () {
			let metadata_view;
			before(async function() {
				metadata_view = await token.viewMetadata(token_id);
			});
			it("regionId", async function() {
				expect(metadata_view.regionId).to.be.bignumber.that.equals(plot.regionId + "");
			});
			it("x", async function() {
				expect(metadata_view.x).to.be.bignumber.that.equals(plot.x + "");
			});
			it("y", async function() {
				expect(metadata_view.y).to.be.bignumber.that.equals(plot.y + "");
			});
			it("tierId", async function() {
				expect(metadata_view.tierId).to.be.bignumber.that.equals(plot.tierId + "");
			});
			it("size", async function() {
				expect(metadata_view.size).to.be.bignumber.that.equals(plot.size + "");
			});
			it("landmarkTypeId", async function() {
				expect(metadata_view.landmarkTypeId).to.be.bignumber.that.equals(plot.landmarkTypeId + "");
			});
			it("elementSites", async function() {
				expect(metadata_view.elementSites).to.be.bignumber.that.equals(plot.elementSites + "");
			});
			it("fuelSites", async function() {
				expect(metadata_view.fuelSites).to.be.bignumber.that.equals(plot.fuelSites + "");
			});
			it("number of element sites is as expected", async function() {
				const sites = metadata_view.sites.filter(s => s.typeId >= 1 && s.typeId <= 3);
				expect(sites.length).to.equal(plot.elementSites);
			});
			it("number of fuel sites is as expected", async function() {
				const sites = metadata_view.sites.filter(s => s.typeId >= 4 && s.typeId <= 6);
				expect(sites.length).to.equal(plot.fuelSites);
			});
		});
		it("plot location gets occupied as expected", async function() {
			const regionId = new BN(plot.regionId);
			const x = new BN(plot.x);
			const y = new BN(plot.y);
			const loc = regionId.shln(32).or(y.shln(16)).or(x);
			await expect(await token.plotLocations(loc)).to.be.bignumber.that.equals(token_id + "");
		});
	}

	async function remove_metadata(token_id) {
		return token.removeMetadata(token_id, {from: a0})
	}

	function test_remove_metadata(token_id, fn = remove_metadata) {
		let metadata, receipt;
		beforeEach(async function() {
			metadata = await token.getMetadata(token_id);
			receipt = await fn.call(this, token_id);
		});
		it('"MetadataRemoved" event is emitted', async function() {
			expectEvent(receipt, "MetadataRemoved", {
				_by: a0,
				_tokenId: token_id + "",
				_plot: metadata,
			});
		});
		it("metadata gets removed", async function () {
			expect(await token.hasMetadata(token_id)).to.be.false;
		});
		it("plot location gets erased as expected", async function() {
			const regionId = new BN(metadata.regionId);
			const x = new BN(metadata.x);
			const y = new BN(metadata.y);
			const loc = regionId.shln(32).or(y.shln(16)).or(x);
			await expect(await token.plotLocations(loc)).to.be.bignumber.that.is.zero;
		});
	}

	it("impossible to mint a token with a zero ID (plot location constraint)", async function() {
		await expectRevert(mint_with_meta(0), "zero ID");
		await mint_with_meta(1);
	});

	describe("metadata can be pre-set for non-existing token", function() {
		test_set_metadata(token_id);
	});
	describe("metadata can be updated for non-existing token", function() {
		beforeEach(async function() {
			await set_metadata(token_id);
		});
		test_set_metadata(token_id);
	});
	describe("metadata can be removed for non-existing token", function() {
		beforeEach(async function() {
			await set_metadata(token_id);
		});
		test_remove_metadata(token_id);
	});
	describe("metadata cannot be set/changed for existing token", function() {
		beforeEach(async function() {
			await mint_with_meta(token_id);
		});
		it("setMetadata reverts", async function() {
			await expectRevert(set_metadata(token_id), "token exists");
		});
	});
	describe("metadata cannot be removed for existing token", function() {
		beforeEach(async function() {
			await mint_with_meta(token_id);
		});
		it("removeMetadata reverts", async function() {
			await expectRevert(remove_metadata(token_id), "token exists");
		});
	});
	describe("burning a token removes its metadata", function() {
		beforeEach(async function() {
			await mint_with_meta(token_id);
		});
		test_remove_metadata(token_id, burn);
	});
	describe("impossible to mint a token without metadata", function() {
		it("mint reverts", async function() {
			await expectRevert(mint(token_id), "no metadata");
			await set_metadata(token_id);
			await mint(token_id);
		});
	});
	describe("impossible to register a plot with incorrect metadata version", function() {
		const plot1 = generate_land_plot();
		const plot2 = generate_land_plot();
		plot1.version = 0;
		plot2.version = 1;
		const metadata1 = plot_to_metadata(plot1);
		const metadata2 = plot_to_metadata(plot2);
		it("setMetadata reverts", async function() {
			await expectRevert(set_metadata(token_id, metadata1), "unsupported metadata version");
			await set_metadata(token_id, metadata2);
		});
	});
	describe("impossible to register a plot with incorrect region ID", function() {
		const plot1 = generate_land_plot();
		const plot2 = generate_land_plot();
		plot1.regionId = 8;
		plot2.regionId = 7;
		const metadata1 = plot_to_metadata(plot1);
		const metadata2 = plot_to_metadata(plot2);
		it("setMetadata reverts", async function() {
			await expectRevert(set_metadata(token_id, metadata1), "unsupported region");
			await set_metadata(token_id, metadata2);
		});
	});
	describe("impossible to register a plot with the size less than 24", function() {
		const plot1 = generate_land_plot();
		const plot2 = generate_land_plot();
		plot1.size = 23;
		plot2.size = 24;
		const metadata1 = plot_to_metadata(plot1);
		const metadata2 = plot_to_metadata(plot2);
		it("setMetadata reverts", async function() {
			await expectRevert(set_metadata(token_id, metadata1), "too small");
			await set_metadata(token_id, metadata2);
		});
	});
	describe("impossible to register a plot with incorrect landmark type", function() {
		const plot1 = generate_land_plot();
		const plot2 = generate_land_plot();
		plot1.landmarkTypeId = 8;
		plot2.landmarkTypeId = 7;
		const metadata1 = plot_to_metadata(plot1);
		const metadata2 = plot_to_metadata(plot2);
		it("setMetadata reverts", async function() {
			await expectRevert(set_metadata(token_id, metadata1), "unsupported landmark type");
			await set_metadata(token_id, metadata2);
		});
	});
	describe("impossible to register two plots in the same location", function() {
		const plot1 = generate_land_plot();
		const plot2 = generate_land_plot();
		plot2.regionId = plot1.regionId;
		plot2.x = plot1.x;
		plot2.y = plot1.y;
		const metadata1 = plot_to_metadata(plot1);
		const metadata2 = plot_to_metadata(plot2);
		beforeEach(async function() {
			await set_metadata(token_id, metadata1);
		});
		it("setMetadata reverts", async function() {
			await expectRevert(set_metadata(token_id, metadata2), "spot taken");
		});
	});
});
