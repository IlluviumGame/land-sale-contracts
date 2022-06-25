// Mint/Burn ERC721 Tests addon

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

// BN constants and utilities
const {random_bn256} = require("../../scripts/include/bn_utils");

// deployment routines in use
const {
	erc721_deploy,
	upgradeable_erc721_deploy,
} = require("./include/deployment_routines");

// run Mint/Burn ERC721 Tests addons
contract("ERC721: Mint/Burn Tests addons", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	function run_erc721_mint_burn_tests_addon(contract_name, deployment_fn) {
		describe(`${contract_name}: Mint/Burn Tests addons`, function() {
			let erc721;
			beforeEach(async function() {
				erc721 = await deployment_fn(a0);
			});

			const _by = a0;
			const _to = a1;
			const _from = a2;
			const _tokenId = random_bn256();
			describe("mint", function() {
				let receipt;
				beforeEach(async function() {
					receipt = await erc721.mint(_to, _tokenId, {from: _by});
				});
				it('should emit "Minted" event', async function() {
					expectEvent(receipt, "Minted", {_by, _to, _tokenId});
				});
			});
			describe("burn", function() {
				let receipt;
				beforeEach(async function() {
					await erc721.mint(_from, _tokenId, {from: _by});
					receipt = await erc721.burn(_tokenId, {from: _by});
				});
				it('should emit "Burnt" event', async function() {
					expectEvent(receipt, "Burnt", {_by, _from, _tokenId});
				});
			});
		});
	}

	run_erc721_mint_burn_tests_addon("ERC721Impl", erc721_deploy);
	run_erc721_mint_burn_tests_addon("UpgradeableERC721", upgradeable_erc721_deploy);
});
