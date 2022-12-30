// LandSale: AccessControl (ACL) Tests

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

// land data utils
const {
	generate_land,
	plot_to_leaf,
} = require("./include/land_data_utils");

// ACL token features and roles
const {
	not,
	FEATURE_L1_SALE_ACTIVE,
	FEATURE_L2_SALE_ACTIVE,
	ROLE_PAUSE_MANAGER,
	ROLE_DATA_MANAGER,
	ROLE_SALE_MANAGER,
	ROLE_WITHDRAWAL_MANAGER,
	ROLE_RESCUE_MANAGER,
} = require("../../scripts/include/features_roles");

// deployment routines in use
const {
	erc20_deploy,
	DEFAULT_LAND_SALE_PARAMS,
	land_sale_init,
	land_sale_deploy_restricted,
} = require("./include/deployment_routines");

// run AccessControl (ACL) tests
contract("LandSale: AccessControl (ACL) tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3, a4, a5] = accounts;

	// default buyer
	const buyer = a1;
	// default operator
	const from = a2;
	// default beneficiary
	const beneficiary = a3;

	describe("when sale is deployed", function() {
		let land_sale, land_nft, sIlv, oracle;
		beforeEach(async function() {
			({land_sale, land_nft, sIlv, oracle} = await land_sale_deploy_restricted(a0));
		});

		// setting the input data root: setInputDataRoot()
		{
			// supporting data
			const {root} = generate_land(1);
			// fn to test
			const setInputDataRoot = async() => await land_sale.setInputDataRoot(root, {from});
			// ACL tests
			describe("when sender has ROLE_DATA_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, ROLE_DATA_MANAGER, {from: a0});
				});
				it("sender can set input data root: setInputDataRoot()", async function() {
					await setInputDataRoot();
				});
			});
			describe("when sender doesn't have ROLE_DATA_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, not(ROLE_DATA_MANAGER), {from: a0});
				});
				it("sender can't set input data root: setInputDataRoot()", async function() {
					await expectRevert(setInputDataRoot(), "access denied");
				});
			});
		}

		// initialization and partial initialization: initialize()
		{
			// supporting data
			const {sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices} = DEFAULT_LAND_SALE_PARAMS;
			// fn to test
			const init = async() => await land_sale.initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices, {from});
			// ACL tests
			describe("when sender has ROLE_SALE_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, ROLE_SALE_MANAGER, {from: a0});
				});
				it("sender can initialize the sale: initialize()", async function() {
					await init();
				});
			});
			describe("when sender doesn't have ROLE_SALE_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, not(ROLE_SALE_MANAGER), {from: a0});
				});
				it("sender can't initialize the sale: initialize()", async function() {
					await expectRevert(init(), "access denied");
				});
			});
		}

		// pausing and resuming: pause() and resume()
		{
			// functions to test
			const pause = async() => await land_sale.pause({from});
			const resume = async() => await land_sale.resume({from});
			// ACL tests
			describe("when sender has ROLE_PAUSE_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, ROLE_PAUSE_MANAGER, {from: a0});
				});
				it("sender can pause the sale: pause()", async function() {
					await pause();
				});
			});
			describe("when sender doesn't have ROLE_PAUSE_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, not(ROLE_PAUSE_MANAGER), {from: a0});
				});
				it("sender can't pause the sale: pause()", async function() {
					await expectRevert(pause(), "access denied");
				});
			});
			describe("when sale is paused", function() {
				beforeEach(async function() {
					await land_sale.pause({from: a0})
				});
				describe("when sender has ROLE_PAUSE_MANAGER permission", function() {
					beforeEach(async function() {
						await land_sale.updateRole(from, ROLE_PAUSE_MANAGER, {from: a0});
					});
					it("sender can resume the sale: resume()", async function() {
						await resume();
					});
				});
				describe("when sender doesn't have ROLE_PAUSE_MANAGER permission", function() {
					beforeEach(async function() {
						await land_sale.updateRole(from, not(ROLE_PAUSE_MANAGER), {from: a0});
					});
					it("sender can't resume the sale: resume()", async function() {
						await expectRevert(resume(), "access denied");
					});
				});
			});
		}

		// setting the beneficiary: setBeneficiary()
		{
			// fn to test
			const setBeneficiary = async() => await land_sale.setBeneficiary(beneficiary, {from});
			// ACL tests
			describe("when sender has ROLE_WITHDRAWAL_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, ROLE_WITHDRAWAL_MANAGER, {from: a0});
				});
				it("sender can set beneficiary: setBeneficiary()", async function() {
					await setBeneficiary();
				});
			});
			describe("when sender doesn't have ROLE_WITHDRAWAL_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, not(ROLE_WITHDRAWAL_MANAGER), {from: a0});
				});
				it("sender can't set beneficiary: setBeneficiary()", async function() {
					await expectRevert(setBeneficiary(), "access denied");
				});
			});
		}

		// rescuing ERC20 tokens lost in the sale smart contract: rescueErc20
		describe("when non-sILV ERC20 tokens are lost in the sale contract", function() {
			// deploy the ERC20 token (not an sILV)
			let token;
			beforeEach(async function() {
				token = await erc20_deploy(a0, H0);
				await token.transfer(land_sale.address, 1, {from: H0});
			});

			// fn to test
			const rescueErc20 = async() => await land_sale.rescueErc20(token.address, H0, 1, {from});
			// ACL tests
			describe("when sender has ROLE_RESCUE_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, ROLE_RESCUE_MANAGER, {from: a0});
				});
				it("sender can rescue lost tokens: rescueErc20()", async function() {
					await rescueErc20();
				});
			});
			describe("when sender doesn't have ROLE_RESCUE_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, not(ROLE_RESCUE_MANAGER), {from: a0});
				});
				it("sender can't rescue lost tokens: rescueErc20()", async function() {
					await expectRevert(rescueErc20(), "access denied");
				});
			});
		});

		// buying a plot: buyL1(), buyL2()
		describe("when sale is initialized, and input data root is set", function() {
			// initialize the sale
			let sale_start, seq_offset, start_prices;
			beforeEach(async function() {
				({sale_start, seq_offset, start_prices} = await land_sale_init(a0, land_sale));
			});
			// generate land plot and setup the merkle tree
			const plot = {
				tokenId: 1,
				sequenceId: 0,
				regionId: 1,
				x: 1,
				y: 1,
				tierId: 1,
				size: 90,
			};
			const leaf = plot_to_leaf(plot);
			beforeEach(async function() {
				await land_sale.setInputDataRoot(leaf, {from: a0});
				await land_sale.setNow32(sale_start + seq_offset * plot.sequenceId);
			});

			// functions to test
			const buyL1 = async() => await land_sale.buyL1(plot, [], {from: buyer, value: start_prices[plot.tierId]});
			const buyL2 = async() => await land_sale.buyL2(plot, [], {from: buyer, value: start_prices[plot.tierId]});
			// ACL tests
			describe("when FEATURE_L1_SALE_ACTIVE is enabled", function() {
				beforeEach(async function() {
					await land_sale.updateFeatures(FEATURE_L1_SALE_ACTIVE, {from: a0});
				});
				it("buyL1() succeeds", async function() {
					await buyL1();
				});
			});
			describe("when FEATURE_L1_SALE_ACTIVE is disabled", function() {
				beforeEach(async function() {
					await land_sale.updateFeatures(not(FEATURE_L1_SALE_ACTIVE), {from: a0});
				});
				it("buyL1() reverts", async function() {
					await expectRevert(buyL1(), "L1 sale disabled");
				});
			});
			describe("when FEATURE_L2_SALE_ACTIVE is enabled", function() {
				beforeEach(async function() {
					await land_sale.updateFeatures(FEATURE_L2_SALE_ACTIVE, {from: a0});
				});
				it("buyL2() succeeds", async function() {
					await buyL2();
				});
			});
			describe("when FEATURE_L2_SALE_ACTIVE is disabled", function() {
				beforeEach(async function() {
					await land_sale.updateFeatures(not(FEATURE_L2_SALE_ACTIVE), {from: a0});
				});
				it("buyL2() reverts", async function() {
					await expectRevert(buyL2(), "L2 sale disabled");
				});
			});
		});

		// funds withdrawal: withdraw()
		describe("when some plots were bought", function() {
			// initialize the sale
			let sale_start, seq_offset, start_prices;
			beforeEach(async function() {
				({sale_start, seq_offset, start_prices} = await land_sale_init(a0, land_sale));
			});
			// generate land plot and setup the merkle tree
			const plot = {
				tokenId: 1,
				sequenceId: 0,
				regionId: 1,
				x: 1,
				y: 1,
				tierId: 1,
				size: 90,
			};
			const leaf = plot_to_leaf(plot);
			beforeEach(async function() {
				await land_sale.setInputDataRoot(leaf, {from: a0});
				await land_sale.setNow32(sale_start + seq_offset * plot.sequenceId);
			});
			// buy the plot
			beforeEach(async function() {
				await land_sale.updateFeatures(FEATURE_L1_SALE_ACTIVE, {from: a0});
				await land_sale.buyL1(plot, [], {from: buyer, value: start_prices[plot.tierId]});
			});

			// fn to test
			const withdraw = async() => await land_sale.withdraw(false, {from});
			// ACL tests
			describe("when sender has ROLE_WITHDRAWAL_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, ROLE_WITHDRAWAL_MANAGER, {from: a0});
				});
				it("sender can withdraw the funds: withdraw()", async function() {
					await withdraw();
				});
			});
			describe("when sender doesn't have ROLE_WITHDRAWAL_MANAGER permission", function() {
				beforeEach(async function() {
					await land_sale.updateRole(from, not(ROLE_WITHDRAWAL_MANAGER), {from: a0});
				});
				it("sender can't withdraw the funds: withdraw()", async function() {
					await expectRevert(withdraw(), "access denied");
				});
			});
		});
	});
});
