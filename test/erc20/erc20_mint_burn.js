// Mint/Burn ERC20 Tests addon

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
const {random_bn} = require("../../scripts/include/bn_utils");

// deployment routines in use
const {
	erc20_deploy,
	NAME,
	SYMBOL,
	DECIMALS,
	S0,
} = require("./include/deployment_routines");

// run Mint/Burn ERC20 Tests addons
contract("ERC20: Mint/Burn Tests addons", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	let erc20;
	beforeEach(async function() {
		erc20 = await erc20_deploy(a0, H0);
	});

	function run_erc20_mint_burn_tests_addon(S0, H0, a1, a2) {
		const by = a0;
		const to = a1;
		const from = H0;
		const value = random_bn(1, S0);
		describe("mint", function() {
			let receipt;
			beforeEach(async function() {
				receipt = await erc20.mint(to, value, {from: by});
			});
			it('should emit "Minted" event', async function() {
				expectEvent(receipt, "Minted", {by, to, value});
			});
		});
		describe("burn", function() {
			let receipt;
			beforeEach(async function() {
				receipt = await erc20.burn(from, value, {from: by});
			});
			it('should emit "Burnt" event', async function() {
				expectEvent(receipt, "Burnt", {by, from, value});
			});
		});
	}

	run_erc20_mint_burn_tests_addon(S0, H0, a1, a2);
});
