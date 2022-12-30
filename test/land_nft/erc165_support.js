// LandERC721: ERC165 Interface ID tests

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

// ERC165 tests runner helper by vittominacori
const {
	shouldSupportInterfaces,
} = require("../include/SupportsInterface.behavior");

// deployment routines in use
const {
	land_nft_deploy,
} = require("./include/deployment_routines");

// run ERC165 Interface ID tests
contract("LandERC721: ERC165 Interface ID tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	let token;
	beforeEach(async function() {
		token = await land_nft_deploy(a0);
	});

	describe("run vittominacori's shouldSupportInterfaces", function() {
		beforeEach(async function() {
			// shouldSupportInterfaces uses this.token shortcut to access token instance
			this.token = token;
		});
		shouldSupportInterfaces([
			"ERC721",
			"MintableERC721",
			"LandERC721Metadata",
			"ImmutableMintableERC721",
		]);
	});
});
