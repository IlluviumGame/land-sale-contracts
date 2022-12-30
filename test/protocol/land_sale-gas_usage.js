// LandSale: gas usage tests

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

// web3 utils
const toWei = web3.utils.toWei;

// block utils
const {
	extract_gas,
	extract_gas_cost,
} = require("../include/block_utils");

// number utils
const {
	random_element,
} = require("../include/number_utils");

// BN utils
const {
	sum_bn,
	print_amt,
	print_symbols,
} = require("../../scripts/include/bn_utils");

// land data utils
const {
	generate_land,
	plot_to_leaf,
	plot_to_metadata,
} = require("./include/land_data_utils");

// land sale utils
const {
	price_formula_sol,
} = require("./include/land_sale_utils");

// deployment routines in use
const {
	land_sale_deploy,
	land_sale_init,
} = require("./include/deployment_routines");

// run gas usage tests
contract("LandSale: Gas Usage", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3, a4, a5] = accounts;

	// deploy the sale
	let land_sale, land_nft, sIlv, aggregator;
	beforeEach(async function() {
		({land_sale, land_nft, sIlv, aggregator} = await land_sale_deploy(a0));
	});
	// initialize the sale
	let sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices;
	beforeEach(async function() {
		({sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices} = await land_sale_init(a0, land_sale));
	});
	// generate land plots and setup the merkle tree
	const {plots, tree, root, sequences, tiers} = generate_land(200);
	beforeEach(async function() {
		await land_sale.setInputDataRoot(root, {from: a0});
	});
	// setup the pricing oracle
	const eth_out = new BN(1);
	const ilv_in = new BN(4);
	beforeEach(async function() {
		await aggregator.setRate(eth_out, ilv_in, {from: a0});
	});
	// define a buyer and supply him with sILV tokens
	const buyer = a1;
	beforeEach(async function() {
		const eth_balance = await balance.current(buyer);
		await sIlv.mint(buyer, eth_balance.mul(ilv_in).div(eth_out), {from: a0});
		await sIlv.approve(land_sale.address, MAX_UINT256, {from: buyer});
	});
	// sale beneficiary (push withdraw)
	const beneficiary = a2;
	// treasury to withdraw to (pull withdraw)
	const treasury = a3;

	/**
	 * Adjusts sale time to the one required to buy a plot
	 * @param tier_id a tier ID to buy a plot in
	 * @param t_seq when we'd like to buy (within a sequence)
	 */
	async function prepare(tier_id, t_seq = 0) {
		// find the plot in the specified tier
		const plot = plots.find(p => p.tierId == tier_id);

		// calculate the supporting data to pass to buyL1()/buyL2()
		const metadata = plot_to_metadata(plot);
		const leaf = plot_to_leaf(plot);
		const proof = tree.getHexProof(leaf);

		// determine timings:
		// when this sequence starts and ends
		const seq_start = sale_start + seq_offset * plot.sequenceId
		const seq_end = seq_start + seq_duration;
		// when we'd like to buy (absolute unix timestamp)
		const t = seq_start + t_seq;

		// determine pricing:
		// starting price for the selected tier
		const p0 = start_prices[plot.tierId];
		// p = p(t) - price at the moment `t`
		const p = price_formula_sol(p0, halving_time, t_seq, time_flow_quantum);
		// price in ETH and in sILV based on the oracle data
		const price_eth = p;
		const price_sIlv = p.mul(ilv_in).div(eth_out);

		// set the time to `t`
		await land_sale.setNow32(t, {from: a0});

		// return all the calculations
		return {plot, metadata, proof, seq_start, seq_end, t, price_eth, price_sIlv};
	}

	// run the suite
	let receipt;
	function consumes_no_more_than(gas, used) {
		// tests marked with @skip-on-coverage will are removed from solidity-coverage,
		// see yield-solcover.js, see https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md
		it(`consumes no more than ${gas} gas  [ @skip-on-coverage ]`, async function() {
			const gasUsed = used? used: extract_gas(receipt);
			expect(gasUsed).to.be.lte(gas);
			if(gas - gasUsed > gas / 20) {
				console.log("only %o gas was used while expected up to %o", gasUsed, gas);
			}
		});
	}

	function gas_usage_buyL1(tier_id, use_sIlv, set_beneficiary, expected_gas) {
		describe(`buying Tier ${tier_id} plot with${use_sIlv? "out": ""} ETH with${set_beneficiary? "": "out"} the beneficiary set`, function() {
			beforeEach(async function() {
				if(set_beneficiary) {
					await land_sale.setBeneficiary(beneficiary, {from: a0});
				}
				// prepare the buy transaction
				const {plot, proof, price_eth} = await prepare(tier_id);
				// in a Dutch auction model dust ETH will be usually present
				const value = use_sIlv? 0: price_eth.addn(1);
				receipt = await land_sale.buyL1(plot, proof, {from: buyer, value});
			});
			consumes_no_more_than(expected_gas);
		});
	}
	gas_usage_buyL1(1, false, false, 328093);
	gas_usage_buyL1(2, false, false, 388270);
	gas_usage_buyL1(3, false, false, 523077);
	gas_usage_buyL1(4, false, false, 700960);
	gas_usage_buyL1(5, false, false, 752043);

	gas_usage_buyL1(1, false, true, 337609);
	gas_usage_buyL1(2, false, true, 396570);
	gas_usage_buyL1(3, false, true, 523077);
	gas_usage_buyL1(4, false, true, 700960);
	gas_usage_buyL1(5, false, true, 753091);

	gas_usage_buyL1(1, true, false, 374296);
	gas_usage_buyL1(2, true, false, 434474);
	gas_usage_buyL1(3, true, false, 569282);
	gas_usage_buyL1(4, true, false, 747168);
	gas_usage_buyL1(5, true, false, 798252);

	gas_usage_buyL1(1, true, true, 374296);
	gas_usage_buyL1(2, true, true, 434474);
	gas_usage_buyL1(3, true, true, 569282);
	gas_usage_buyL1(4, true, true, 747168);
	gas_usage_buyL1(5, true, true, 798252);
});
