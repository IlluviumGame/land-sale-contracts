// Chainlink Land Sale Price Oracle Tests

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

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

// Chai test helpers
const {
	assert,
	expect,
} = require("chai");

// number utils
const {
	random_int,
} = require("../include/number_utils");

// deployment routines in use
const {
	land_sale_price_oracle_deploy,
	land_sale_price_oracle_deploy_pure,
	chainlink_aggregator_deploy_mock,
} = require("./include/deployment_routines");

// run land sale tests
contract("LandSalePriceOracleV1: Chainlink Feed Tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3, a4, a5] = accounts;

	describe("deployment / proxy initialization", function() {
		let aggregator;
		beforeEach(async function() {
			aggregator = await chainlink_aggregator_deploy_mock(a0);
		});
		it("fails if Chainlink aggregator address is not set", async function() {
			await expectRevert(land_sale_price_oracle_deploy_pure(a0, ZERO_ADDRESS), "aggregator address is not set");
		});
		describe("fails if Chainlink aggregator returns invalid data", function() {
			it("fails if Chainlink aggregator returns invalid roundId", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(0, 1, 1, 1, 1, {from: a0});
				await expectRevert(land_sale_price_oracle_deploy_pure(a0, aggregator.address), "unexpected aggregator response");
			});
			it("fails if Chainlink aggregator returns invalid answer", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, 0, 1, 1, 1, {from: a0});
				await expectRevert(land_sale_price_oracle_deploy_pure(a0, aggregator.address), "unexpected aggregator response");
			});
			it("fails if Chainlink aggregator returns invalid startedAt", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, 1, 0, 1, 1, {from: a0});
				await expectRevert(land_sale_price_oracle_deploy_pure(a0, aggregator.address), "unexpected aggregator response");
			});
			it("fails if Chainlink aggregator returns invalid updatedAt", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, 1, 1, 0, 1, {from: a0});
				await expectRevert(land_sale_price_oracle_deploy_pure(a0, aggregator.address), "unexpected aggregator response");
			});
			it("fails if Chainlink aggregator returns invalid answeredRoundId", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, 1, 1, 1, 0, {from: a0});
				await expectRevert(land_sale_price_oracle_deploy_pure(a0, aggregator.address), "unexpected aggregator response");
			});
			it("succeeds otherwise", async function() {
				const oracle = await land_sale_price_oracle_deploy_pure(a0, aggregator.address);
				expect(await oracle.aggregator()).to.be.equal(aggregator.address);
			});
		});
	});

	describe("when oracle is deployed", function() {
		const old_ans_threshold = 30 * 3600;

		let oracle, aggregator;
		beforeEach(async function() {
			({oracle, aggregator} = await land_sale_price_oracle_deploy(a0));
		});

		it("default `oldAnswerThreshold` value is 30 hours", async function() {
			expect(await oracle.oldAnswerThreshold()).to.be.bignumber.that.equals(old_ans_threshold + "");
		});
		describe("setting the `oldAnswerThreshold`: setOldAnswerThreshold()", function() {
			const lower_bound = 3600;
			const upper_bound = 7 * 24 * 3600;

			it("fails if new value is too low", async function() {
				await expectRevert(oracle.setOldAnswerThreshold(lower_bound, {from: a0}), "threshold too low");
			});
			it("fails if new value is too high", async function() {
				await expectRevert(oracle.setOldAnswerThreshold(upper_bound, {from: a0}), "threshold too high");
			});
			describe("succeeds otherwise (lower bound)", function() {
				const value = lower_bound + 1;

				let receipt;
				beforeEach(async function() {
					receipt = await oracle.setOldAnswerThreshold(value, {from: a0});
				});
				it('"OldAnswerThresholdUpdated" event is emitted', async function() {
					expectEvent(receipt, "OldAnswerThresholdUpdated", {
						_by: a0,
						_oldVal: old_ans_threshold + "",
						_newVal: value + "",
					});
				});
				it("oldAnswerThreshold value is updated", async function() {
					expect(await oracle.oldAnswerThreshold()).to.be.bignumber.that.equals(value + "");
				});
			});
			describe("succeeds otherwise (upper bound)", function() {
				const value = upper_bound - 1;

				let receipt;
				beforeEach(async function() {
					receipt = await oracle.setOldAnswerThreshold(value, {from: a0});
				});
				it('"OldAnswerThresholdUpdated" event is emitted', async function() {
					expectEvent(receipt, "OldAnswerThresholdUpdated", {
						_by: a0,
						_oldVal: old_ans_threshold + "",
						_newVal: value + "",
					});
				});
				it("oldAnswerThreshold value is updated", async function() {
					expect(await oracle.oldAnswerThreshold()).to.be.bignumber.that.equals(value + "");
				});
			});
		});
		describe("ILV/ETH conversion(ethToIlv)", function() {
			it("fails if roundId != answeredInRound", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(2, -1, MAX_UINT256, MAX_UINT256, 1, {from: a0});
				await expectRevert(oracle.ethToIlv(1), "invalid answer");
			});
			it("fails if startedAt > updatedAt", async function() {
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, -1, 1_000_001, 1_000_000, 1, {from: a0});
				await expectRevert(oracle.ethToIlv(1), "invalid answer");
			});
			it("fails if updatedAt is too old", async function() {
				await aggregator.setNow256(1_108_000, {from: a0}); // 30 hours ahead
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, -1, 1_000_000, 1_000_000, 1, {from: a0});
				await expectRevert(oracle.ethToIlv(1), "answer is too old");
			});
			it("fails if updatedAt is in the future", async function() {
				await oracle.setNow256(1_000_000, {from: a0});
				// roundId, answer, startedAt, updatedAt, answeredInRound
				await aggregator.setMockedValues(1, -1, 1_000_001, 1_000_001, 1, {from: a0});
				await expectRevert(oracle.ethToIlv(1), "invalid answer");
			});
			it("succeeds otherwise", async function() {
				await aggregator.setRate(1, 5, {from: a0});
				expect(await oracle.ethToIlv(1)).to.be.bignumber.that.equals("5");
			});
			it("succeeds otherwise (random value)", async function() {
				const ethOut = random_int(1, 1_000_000);
				const ilvIn = random_int(1, 1_000_000);
				await aggregator.setRate(ethOut, ilvIn, {from: a0});
				expect(await oracle.ethToIlv(ethOut)).to.be.bignumber.that.equals(ilvIn + "");
			});
		});
	});
});
