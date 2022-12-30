// ERC20: AccessControl (ACL) Tests

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
const {random_bn255} = require("../../scripts/include/bn_utils");

// ACL token features and roles
const {
	not,
	FEATURE_TRANSFERS,
	FEATURE_TRANSFERS_ON_BEHALF,
	FEATURE_OWN_BURNS,
	FEATURE_BURNS_ON_BEHALF,
	ROLE_TOKEN_CREATOR,
	ROLE_TOKEN_DESTROYER,
} = require("../../scripts/include/features_roles");

// deployment routines in use
const {
	erc20_deploy_restricted,
} = require("./include/deployment_routines");

// run AccessControl (ACL) tests
contract("ERC20: AccessControl (ACL) tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	let token;
	beforeEach(async function() {
		token = await erc20_deploy_restricted(a0, H0);
	});

	describe("ERC20Impl: ACL", function() {
		const by = a1;
		const from = H0;
		const to = a2;
		const value = 1;

		describe("after spender's approval", function() {
			beforeEach(async function() {
				await token.approve(by, MAX_UINT256, {from});
			});
			describe("when FEATURE_TRANSFERS_ON_BEHALF is enabled", function() {
				beforeEach(async function() {
					await token.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF, {from: a0});
				});
				it("transfer on behalf succeeds", async function() {
					await token.transferFrom(from, to, value, {from: by});
				});
			});
			describe("when FEATURE_TRANSFERS_ON_BEHALF is disabled", function() {
				beforeEach(async function() {
					await token.updateFeatures(not(FEATURE_TRANSFERS_ON_BEHALF), {from: a0});
				});
				it("transfer on behalf reverts", async function() {
					await expectRevert(token.transferFrom(from, to, value, {from: by}), "transfers on behalf are disabled");
				});
			});
			describe("when FEATURE_BURNS_ON_BEHALF is enabled", function() {
				beforeEach(async function() {
					await token.updateFeatures(FEATURE_BURNS_ON_BEHALF, {from: a0});
				});
				it("burn on behalf succeeds", async function() {
					await token.burn(from, value, {from: by});
				});
			});
			describe("when FEATURE_BURNS_ON_BEHALF is disabled", function() {
				beforeEach(async function() {
					await token.updateFeatures(not(FEATURE_BURNS_ON_BEHALF), {from: a0});
				});
				it("burn on behalf reverts", async function() {
					await expectRevert(token.burn(from, value, {from: by}), "burns on behalf are disabled");
				});
			});
		});

		describe("when FEATURE_TRANSFERS is enabled", function() {
			beforeEach(async function() {
				await token.updateFeatures(FEATURE_TRANSFERS, {from: a0});
			});
			it("direct transfer succeeds", async function() {
				await token.transfer(to, value, {from});
			});
		});
		describe("when FEATURE_TRANSFERS is disabled", function() {
			beforeEach(async function() {
				await token.updateFeatures(not(FEATURE_TRANSFERS), {from: a0});
			});
			it("direct transfer reverts", async function() {
				await expectRevert(token.transfer(to, value, {from}), "transfers are disabled");
			});
		});
		describe("when FEATURE_OWN_BURNS is enabled", function() {
			beforeEach(async function() {
				await token.updateFeatures(FEATURE_OWN_BURNS, {from: a0});
			});
			it("self burn succeeds", async function() {
				await token.burn(from, value, {from});
			});
		});
		describe("when FEATURE_OWN_BURNS is disabled", function() {
			beforeEach(async function() {
				await token.updateFeatures(not(FEATURE_OWN_BURNS), {from: a0});
			});
			it("self burn reverts", async function() {
				await expectRevert(token.burn(from, value, {from}), "burns are disabled");
			});
		});

		describe("when operator is TOKEN_CREATOR", function() {
			beforeEach(async function() {
				await token.updateRole(by, ROLE_TOKEN_CREATOR, {from: a0});
			});
			it("mint succeeds", async function() {
				await token.mint(to, value, {from: by});
			});
		});
		describe("when operator is not TOKEN_CREATOR", function() {
			beforeEach(async function() {
				await token.updateRole(by, not(ROLE_TOKEN_CREATOR), {from: a0});
			});
			it("mint reverts", async function() {
				await expectRevert(token.mint(to, value, {from: by}), "access denied");
			});
		});
		describe("when operator is TOKEN_DESTROYER", function() {
			beforeEach(async function() {
				await token.updateRole(by, ROLE_TOKEN_DESTROYER, {from: a0});
			});
			it("burn succeeds", async function() {
				await token.burn(from, value, {from: by});
			});
		});
		describe("when operator is not TOKEN_DESTROYER and FEATURE_BURNS_ON_BEHALF is enabled", function() {
			beforeEach(async function() {
				await token.updateFeatures(FEATURE_BURNS_ON_BEHALF, {from: a0});
				await token.updateRole(by, not(ROLE_TOKEN_DESTROYER), {from: a0});
			});
			it("burn reverts", async function() {
				await expectRevert(token.burn(from, value, {from: by}), "burn amount exceeds allowance");
			});
		});
	});
});
