// LandSale: 10,000 Land plots Sale Simulation
// Following simulation executes 10,000 sale scenario:
// buyers buy a single land plot,
// try to buy more than allowed, etc

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

// Chai test helpers
const {
	assert,
	expect,
} = require("chai");

// block utils
const {
	extract_gas,
	extract_gas_cost,
} = require("../include/block_utils");

// number utils
const {
	random_int,
	random_element,
} = require("../include/number_utils");

// BN utils
const {
	sum_bn,
	print_amt,
	print_symbols,
} = require("../../scripts/include/bn_utils");

// LandLib.sol: JS implementation
const {
	pack,
	unpack,
	plot_view,
} = require("../land_gen/include/land_lib");

// land data utils
const {
	parse_plot,
	generate_land,
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

// run 10k sale simulation
contract("LandSale: 10,000 Sale Simulation", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;
	// participants – rest of the accounts (including a1, a2)
	const participants = accounts.slice(3);

	// sILV balance of each of the participants
	const sIlv_balance = new BN(10_000).pow(new BN(18));

	// define constants to generate plots
	const ITEMS_ON_SALE = 10_000;

	// generate the land sale data
	log.debug("generating %o land plots", ITEMS_ON_SALE);
	const {plots, leaves, tree, root} = generate_land(ITEMS_ON_SALE);
	log.info("generated %o land plots", ITEMS_ON_SALE);

	// deploy and initialize the sale,
	// register the Merkle root within the sale
	let land_sale, land_nft, sIlv, aggregator;
	let sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices;
	let num_of_sequences;
	beforeEach(async function() {
		// deploy smart contracts required
		({land_sale, land_nft, sIlv, aggregator} = await land_sale_deploy(a0));

		// mint same amount of sILV for each participant,
		// and approve the sale to take the sILV when buying
		for(let participant of participants) {
			await sIlv.mint(participant, sIlv_balance, {from: a0});
			await sIlv.approve(land_sale.address, sIlv_balance, {from: participant});
		}

		// initialize the sale
		({sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices} =
			await land_sale_init(a0, land_sale));
		await land_sale.setInputDataRoot(root, {from: a0});

		// calculate the rest of the params
		num_of_sequences = Math.floor((sale_end - sale_start + seq_offset - seq_duration) / seq_offset);
	});

	// simulation executor
	async function sale_sim_test(limit = ITEMS_ON_SALE) {
		// verify limit is in valid bounds
		assert(limit <= ITEMS_ON_SALE, "sale limit exceeds ITEMS_ON_SALE");
		assert(
			plots.reduce((accumulator, currentVal) => Math.max(accumulator, currentVal.sequenceId), 0) < num_of_sequences,
			"generated land has more sequences than sale is capable of selling"
		);

		// for this simulation we will be working with all the available accounts
		// which are going to buy the land at random [in random quantities]
		const len = participants.length;

		// introduce aux vars to track progress for each account
		// note: BN is mutable, new BN(BN) doesn't create a new instance!
		const tokens_bought = participants.map(_ => 0);
		const eth_spent = participants.map(_ => new BN(0));
		const sIlv_spent = participants.map(_ => new BN(0));
		const gas_used = participants.map(_ => new BN(0));
		const gas_costs = participants.map(_ => new BN(0));
		// initial ETH and sILV balances of the participants
		const eth_balances = new Array(len);
		for(let i = 0;  i < len; i++) {
			// get an idea of the ETH balance participant has
			eth_balances[i] = await balance.current(participants[i]);
		}
		const sIlv_balances = participants.map(_ => sIlv_balance.clone()); // use clone, not new BN(BN)!

		// ETH/sILV price
		const eth_out = await aggregator.ethOut();
		const ilv_in = await aggregator.ilvIn();

		// verify initial token balances are zero
		for(let i = 0; i < len; i++) {
			expect(
				await land_nft.balanceOf(participants[i]),
				`non-zero initial token balance for account ${i}`
			).to.be.bignumber.that.is.zero;
		}
		expect(
			await land_nft.totalSupply(),
			"non-zero initial total token supply"
		).to.be.bignumber.that.is.zero;

		// cumulative pause duration, total time sale was paused
		let pause_duration = 0;

		// execute `limit` steps (up to `ITEMS_ON_SALE`)
		for(let i = 0; i < limit; i++) {
			// pick random buyer for the tx
			const {e: buyer, i: idx} = random_element(participants, false);
			// buying with ETH with the 90% probability, sILV 10% probability
			const eth = Math.random() < 0.9;
			// sending the dust ETH with the 10% probability
			const dust_eth = Math.random() < 0.1;
			// pause/resume the sale with 5% probability
			const pause_for = Math.random() < 0.05? random_int(1, seq_duration): 0;

			// get the plot and its Merkle proof for the current step `i`
			const plot = plots[i];
			const metadata = plot_to_metadata(plot);
			const proof = tree.getHexProof(leaves[i]);

			// calculate the timestamp for the current step `i`
			const t = sale_start + Math.floor((sale_end - sale_start) * i / ITEMS_ON_SALE);
			// timestamp offset within a sequence
			const t_seq = t - sale_start - seq_offset * plot.sequenceId;

			// estimate the price
			const p0 = start_prices[plot.tierId];
			const p = price_formula_sol(p0, halving_time, t_seq, time_flow_quantum);
			const price_eth = p;
			const price_sIlv = p.mul(ilv_in).div(eth_out);

			log.debug("sim_step %o %o", i, {
				to_id: idx,
				token_id: plot.tokenId,
				seq_id: plot.sequenceId,
				tier_id: plot.tierId,
				initial_price: p0 + "",
				pause_duration: pause_duration + pause_for,
				t_own: t,
				t_seq,
				price_eth: price_eth + "",
				price_sIlv: price_sIlv + "",
				buying_with: eth? "ETH": "sILV",
			});

			// verify time bounds for the sequence
			assert(t_seq < seq_duration, "time is out of sequence bounds");

			// set the time to `t`
			await land_sale.setNow32(t + pause_duration, {from: a0});
			// do pause/resume if required
			if(pause_for > 0) {
				await land_sale.pause({from: a0});
				pause_duration += pause_for;
				await land_sale.setNow32(t + pause_duration, {from: a0});
				await land_sale.resume({from: a0});
			}
			// and buy after the (optional) pause
			const value = eth? dust_eth? price_eth.addn(1): price_eth: 0;
			const receipt = await land_sale.buyL2(plot, proof, {from: buyer, value});
			// minted plot contains randomness and cannot be fully guessed,
			// we enrich it from the actual minted plot
			const _plot = parse_plot(Object.assign({...receipt.logs[0].args["_plot"]}, plot))
			expectEvent(receipt, "PlotBoughtL2", {
				_by: buyer,
				_tokenId: plot.tokenId + "",
				_sequenceId: plot.sequenceId + "",
				_plot: plot_to_metadata(_plot),
				_plotPacked: pack(_plot),
				_eth: price_eth,
				_sIlv: eth? "0": price_sIlv,
			});

			// update the buyer's and global stats
			tokens_bought[idx]++;
			gas_used[idx].iaddn(extract_gas(receipt)); // inline addition!
			gas_costs[idx].iadd(await extract_gas_cost(receipt)); // inline addition!
			if(eth) {
				eth_spent[idx].iadd(price_eth);
			}
			else {
				sIlv_spent[idx].iadd(price_sIlv);
			}

			// log the progress via debug/info log level
			const level = (i + 1) % 10 == 0 || i == limit - 1? "info": "debug";
			log[level](
				"%o\ttokens bought: [%o]; %o\tETH spent: [%o]; %o\tsILV spent: [%o]",
				i + 1,
				print_symbols(tokens_bought, Math.ceil(limit / len)),
				print_amt(sum_bn(eth_spent)),
				print_symbols(eth_spent),
				print_amt(sum_bn(sIlv_spent)),
				print_symbols(sIlv_spent),
			);
		}

		// verify final balances are as expected
		for(let i = 0; i < len; i++) {
			// token balances
			expect(
				await land_nft.balanceOf(participants[i]),
				`non-zero final token balance for account ${i}`
			).to.be.bignumber.that.equals("0");
			// ETH balances
			expect(
				await balance.current(participants[i]),
				`unexpected final ETH balance for account ${i}`
			).to.be.bignumber.that.equals(eth_balances[i].sub(eth_spent[i]).sub(gas_costs[i]));
			// sILV balances
			expect(
				await sIlv.balanceOf(participants[i]),
				`unexpected final sILV balance for account ${i}`
			).to.be.bignumber.that.equals(sIlv_balances[i].sub(sIlv_spent[i]));
		}
		// token supply
		expect(
			await land_nft.totalSupply(),
			"non-zero final total token supply"
		).to.be.bignumber.that.equals("0")
		// ETH sale contract balance
		expect(
			await balance.current(land_sale.address),
			"unexpected sale ETH balance"
		).to.be.bignumber.that.equals(sum_bn(eth_spent));
		// sILV sale contract balance
		expect(
			await sIlv.balanceOf(land_sale.address),
			"unexpected sale sILV balance"
		).to.be.bignumber.that.equals(sum_bn(sIlv_spent));

		log.info("Execution complete.")
		log.info("Cumulative gas cost for buying %o plots: %o", limit, print_amt(sum_bn(gas_used), 1));
	}

	// low complexity test executes in coverage
	it("10,000 plots sale simulation (low complexity)", async function() {
		await sale_sim_test(1000);
	});
	// tests marked with @skip-on-coverage will are removed from solidity-coverage,
	// see yield-solcover.js, see https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md
	it("10,000 plots sale simulation [ @skip-on-coverage ]", async function() {
		await sale_sim_test();
	});

});
