// LandSalePriceOracle: AccessControl (ACL) Tests

// Zeppelin test helpers
const {
	BN,
	balance,
	constants,
	expectEvent,
	expectRevert,
} = require("@openzeppelin/test-helpers");
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = constants;

// ACL token features and roles
const {
	not,
	ROLE_PRICE_ORACLE_MANAGER,
} = require("../../scripts/include/features_roles");

// deployment routines in use
const {
	land_sale_price_oracle_deploy,
} = require("./include/deployment_routines");

// run AccessControl (ACL) tests
contract("LandSalePriceOracle: AccessControl (ACL) tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3, a4, a5] = accounts;

	// default operator
	const from = a1;

	describe("when oracle is deployed", function() {
		let oracle, aggregator;
		beforeEach(async function() {
			({oracle, aggregator} = await land_sale_price_oracle_deploy(a0));
		});

		// setting the old answer threshold: setOldAnswerThreshold()
		{
			// fn to test
			const setOldAnswerThreshold = async() => await oracle.setOldAnswerThreshold(30 * 3600, {from});
			// ACL tests
			describe("when sender has ROLE_PRICE_ORACLE_MANAGER permission", function() {
				beforeEach(async function() {
					await oracle.updateRole(from, ROLE_PRICE_ORACLE_MANAGER, {from: a0});
				});
				it("sender can set the oldAnswerThreshold: setOldAnswerThreshold()", async function() {
					await setOldAnswerThreshold();
				});
			});
			describe("when sender doesn't have ROLE_PRICE_ORACLE_MANAGER permission", function() {
				beforeEach(async function() {
					await oracle.updateRole(from, not(ROLE_PRICE_ORACLE_MANAGER), {from: a0});
				});
				it("sender can't set the oldAnswerThreshold: setOldAnswerThreshold()", async function() {
					await expectRevert(setOldAnswerThreshold(), "access denied");
				});
			});
		}
	});
});
