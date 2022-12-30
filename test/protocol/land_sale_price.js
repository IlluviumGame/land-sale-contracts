// LandSale: Price Formula Test
// This test verifies the price formula p(t) = p0 * 2 ^ (-t / t0)

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

// BN utils
const {
	draw_percent,
	to_percent,
	print_percent,
} = require("../../scripts/include/bn_utils");

// land data utils
const {
	generate_land,
} = require("./include/land_data_utils");

// land sale utils
const {
	price_formula_percent,
	price_formula_exp,
	price_formula_sol,
} = require("./include/land_sale_utils");

// log utils
const {
	write_info,
} = require("./include/log_utils");

// deployment routines in use
const {
	DEFAULT_LAND_SALE_PARAMS,
	land_sale_deploy,
	land_sale_init,
} = require("./include/deployment_routines");

// run land sale price formula test
contract("LandSale: Price Formula Test", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	const p0 = DEFAULT_LAND_SALE_PARAMS.start_prices[5];
	const t0 = DEFAULT_LAND_SALE_PARAMS.halving_time;
	const t_max = DEFAULT_LAND_SALE_PARAMS.seq_duration;
	const t_step = 14;

	describe("when sale is deployed", function() {
		// deploy and initialize the sale
		let land_sale;
		beforeEach(async function() {
			({land_sale} = await land_sale_deploy(a0));
		});

		it("The JavaScript price_formula_sol() matches the Solidity LandSale.price() [ @skip-on-coverage ]", async function() {
			log.info("checking JavaScript price_formula_sol(%o-%o) matches Solidity LandSale.price(%o-%o)", 0, t_max, 0, t_max);
			write_info("[");
			for(let t = 0; t < t_max; t++) {
				expect(
					await land_sale.price(p0, t0, t),
					`price_formula_sol(${t}) mismatch with LandSale.price(${t})`
				).to.be.bignumber.that.equals(price_formula_sol(p0, t0, t));
				if(!(t % Math.floor(t_max / 100))) {
					write_info(".");
				}
			}
			write_info("]\n");
		});
		it("The JavaScript price_formula_sol() matches the Solidity LandSale.price() (low complexity)", async function() {
			log.info("checking JavaScript price_formula_sol(%o-%o) matches Solidity LandSale.price(%o-%o)", 0, t_max, 0, t_max);
			write_info("[");
			for(let t = 0; t < t_max; t += t_step) {
				expect(
					await land_sale.price(p0, t0, t),
					`price_formula_sol(${t}) mismatch with LandSale.price(${t})`
				).to.be.bignumber.that.equals(price_formula_sol(p0, t0, t));
				if(!(Math.floor(t / t_step) % Math.floor(t_max / t_step / 100))) {
					write_info(".");
				}
			}
			write_info("]\n");
		});

		describe("when sale is initialized (token price calculation)", function() {
			let sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, open_sequences, full_sequences, start_prices;
			beforeEach(async function() {
				({sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, open_sequences, full_sequences, start_prices} =
					await land_sale_init(a0, land_sale));
			});

			it("tokenPriceAt() throws before sale has started", async function() {
				await expectRevert(land_sale.tokenPriceAt(0, 0, sale_start - 1), "invalid time");
			});
			it("tokenPriceAt() throws after sale has ended", async function() {
				await expectRevert(land_sale.tokenPriceAt(0, 0, sale_end), "invalid time");
			});
			it("tokenPriceAt() throws before sequence has started", async function() {
				await expectRevert(land_sale.tokenPriceAt(1, 0, sale_start + seq_offset - 1), "invalid sequence");
			});
			it("tokenPriceAt() throws after sequence has ended", async function() {
				await expectRevert(land_sale.tokenPriceAt(1, 0, sale_start + seq_offset + seq_duration), "invalid sequence");
			});
			it("tokenPriceAt() throws for a tier with no initial price set", async function() {
				await expectRevert(land_sale.tokenPriceAt(0, 6, sale_start), "invalid tier");
			});
			it("tokenPriceAt() is equal to the start price for zero time offset", async function() {
				for(let tier_id = 0; tier_id < start_prices.length; tier_id++) {
					for(let sequence_id = 0; sequence_id < open_sequences; sequence_id++) {
						log.debug("sequenceId: %o, tierId: %o, t: zero", sequence_id, tier_id);
						expect(
							await land_sale.tokenPriceAt(sequence_id, tier_id, sale_start + sequence_id * seq_offset),
							`unexpected price for sequenceId: ${sequence_id}, tierId: ${tier_id}, t: zero`
						).to.be.bignumber.that.equals(start_prices[tier_id]);
					}
				}
			});
			it("tokenPriceAt() is equal to the half of the start price for halving time offset", async function() {
				await land_sale_init(a0, land_sale, sale_start, sale_end, halving_time, 1, seq_duration, seq_offset, start_prices);
				for(let tier_id = 0; tier_id < start_prices.length; tier_id++) {
					for(let sequence_id = 0; sequence_id < full_sequences; sequence_id++) {
						log.debug("sequenceId: %o, tierId: %o, t: halving", sequence_id, tier_id);
						expect(
							await land_sale.tokenPriceAt(sequence_id, tier_id, sale_start + sequence_id * seq_offset + halving_time),
							`unexpected price for sequenceId: ${sequence_id}, tierId: ${tier_id}, t: halving`
						).to.be.bignumber.that.equals(start_prices[tier_id].divn(2));
					}
				}
			});
			it("tokenPriceAt() decreases only when time_flow_quantum passes [ @skip-on-coverage ]", async function() {
				// pick random tier and one sequence
				const random_plot = generate_land(1).plots[0];
				const tier_id = random_plot.tierId;
				const sequence_id = random_plot.sequenceId;
				const seq_start = sale_start + sequence_id * seq_offset;

				let p0 = start_prices[tier_id];
				log.info("sequenceId: %o, tierId: %o, t: %o-%o", sequence_id, tier_id, 1, seq_duration);
				write_info("[");
				for(let t = 1; t < seq_duration; t++) {
					if(t % time_flow_quantum > 0) {
						expect(
							await land_sale.tokenPriceAt(sequence_id, tier_id, seq_start + t),
							`unexpected price for sequenceId: ${sequence_id}, tierId: ${tier_id}, t: ${t}`
						).to.be.bignumber.that.equals(p0);
					}
					else {
						const p1 = price_formula_sol(start_prices[tier_id], halving_time, t, time_flow_quantum);
						expect(p1, `price decrease expected at t % time_flow_quantum: ${t}`).to.be.bignumber.that.is.lessThan(p0);
						p0 = p1;
						expect(
							await land_sale.tokenPriceAt(sequence_id, tier_id, seq_start + t),
							`unexpected price for sequenceId: ${sequence_id}, tierId: ${tier_id}, t: ${t}`
						).to.be.bignumber.that.equals(p0);
					}
					if(!(t % Math.floor(seq_duration / 100))) {
						write_info(".");
					}
				}
				write_info("]\n");
			});
			it("tokenPriceAt() decreases only when time_flow_quantum passes (low complexity)", async function() {
				// pick random tier and one sequence
				const random_plot = generate_land(1).plots[0];
				const tier_id = random_plot.tierId;
				const sequence_id = random_plot.sequenceId;
				const seq_start = sale_start + sequence_id * seq_offset;

				let p0 = start_prices[tier_id];
				log.info("sequenceId: %o, tierId: %o, t: %o-%o", sequence_id, tier_id, 1, seq_duration);
				write_info("[");
				for(let t = 1; t < seq_duration; t += t_step) {
					if(t_step < time_flow_quantum && t % time_flow_quantum > (t - t_step) % time_flow_quantum) {
						expect(
							await land_sale.tokenPriceAt(sequence_id, tier_id, seq_start + t),
							`unexpected price for sequenceId: ${sequence_id}, tierId: ${tier_id}, t: ${t}`
						).to.be.bignumber.that.equals(p0);
					}
					else {
						const p1 = price_formula_sol(start_prices[tier_id], halving_time, t, time_flow_quantum);
						expect(p1, `price decrease expected at t % time_flow_quantum: ${t}`).to.be.bignumber.that.is.lessThan(p0);
						p0 = p1;
						expect(
							await land_sale.tokenPriceAt(sequence_id, tier_id, seq_start + t),
							`unexpected price for sequenceId: ${sequence_id}, tierId: ${tier_id}, t: ${t}`
						).to.be.bignumber.that.equals(p0);
					}
					if(!(Math.floor(t / t_step) % Math.floor(seq_duration / t_step / 100))) {
						write_info(".");
					}
				}
				write_info("]\n");
			});
		});
	});

	it("local price_formula(t) monotonically decreases over time t [ @skip-on-coverage ]", async function() {
		let pt = p0;
		for(let t = 0; t < t_max; t++) {
			const p = price_formula_exp(p0, t0, t);
			const percent = to_percent(p, p0);

			const log_level = t % t_step == 0 || t == t_max - 1? "info": "debug";
			log[log_level]("%os\t %o", t, draw_percent(percent));

			expect(p, `p(${t}) exceeded p(${t - 1})!`).to.be.bignumber.that.is.lte(pt);
			pt = p;
		}
	});
	it("local price_formula(t) monotonically decreases over time t (low complexity)", async function() {
		let pt = p0;
		for(let t = 0; t < t_max; t += t_step) {
			const p = price_formula_exp(p0, t0, t);
			const percent = to_percent(p, p0);

			const log_level = t % (10 * t_step) == 0 || t == t_max - 1? "info": "debug";
			log[log_level]("%os\t %o", t, draw_percent(percent));

			expect(p, `p(${t}) exceeded p(${t - 1})!`).to.be.bignumber.that.is.lte(pt);
			pt = p;
		}
	});
	it("price(t) monotonically decreases over time t [ @skip-on-coverage ]", async function() {
		let pt = p0;
		for(let t = 0; t < t_max; t++) {
			// since the JavaScript price_formula_sol() matches the Solidity LandSale.price()
			// we can use JS implementation instead of sale.price()
			const p = price_formula_sol(p0, t0, t);
			const percent = to_percent(p, p0);

			const log_level = t % t_step == 0 || t == t_max - 1? "info": "debug";
			log[log_level]("%os\t %o", t, draw_percent(percent));

			expect(p, `p(${t}) exceeded p(${t - 1})!̉`).to.be.bignumber.that.is.lte(pt);
			pt = p;
		}
	});
	it("price(t) monotonically decreases over time t (low complexity)", async function() {
		let pt = p0;
		for(let t = 0; t < t_max; t += t_step) {
			// since the JavaScript price_formula_sol() matches the Solidity LandSale.price()
			// we can use JS implementation instead of sale.price()
			const p = price_formula_sol(p0, t0, t);
			const percent = to_percent(p, p0);

			const log_level = t % (10 * t_step) == 0 || t == t_max - 1? "info": "debug";
			log[log_level]("%os\t %o", t, draw_percent(percent));

			expect(p, `p(${t}) exceeded p(${t - 1})!̉`).to.be.bignumber.that.is.lte(pt);
			pt = p;
		}
	});
	it("maximum exp/sol (JS/Solidity) price(t) difference is at most 0.5% [ @skip-on-coverage ]", async function() {
		let max_error = 0;
		for(let t = 0; t < t_max; t++) {
			// local price: JS calculated
			const p_local = price_formula_exp(p0, t0, t);
			// remote price: Solidity calculated
			// since the JavaScript price_formula_sol() matches the Solidity LandSale.price()
			// we can use JS implementation instead of sale.price()
			const p_remote = price_formula_sol(p0, t0, t);

			const percent_local = to_percent(p_local, p0);
			const percent_remote = to_percent(p_remote, p0)

			const delta = p_local.sub(p_remote).abs();
			const percent_error = to_percent(delta, p_local);

			const log_level = t % t_step == 0 || t == t_max - 1? "info": "debug";
			log[log_level](
				"%os\t %o remote; local: %o (%o error)",
				t,
				draw_percent(percent_remote),
				print_percent(percent_local),
				print_percent(percent_error)
			);

			// expect(percent_error, `negative error for t = ${t}`).to.be.at.least(0);
			expect(percent_error, `error too big for t = ${t}`).to.be.at.most(0.5);
			max_error = Math.max(max_error, percent_error);
		}
		log.info("maximum error: %o", print_percent(max_error));
	});
	it("maximum exp/sol (JS/Solidity) price(t) difference is at most 0.5% (low complexity)", async function() {
		let max_error = 0;
		for(let t = 0; t < t_max; t += t_step) {
			// local price: JS calculated
			const p_local = price_formula_exp(p0, t0, t);
			// remote price: Solidity calculated
			// since the JavaScript price_formula_sol() matches the Solidity LandSale.price()
			// we can use JS implementation instead of sale.price()
			const p_remote = price_formula_sol(p0, t0, t);

			const percent_local = to_percent(p_local, p0);
			const percent_remote = to_percent(p_remote, p0)

			const delta = p_local.sub(p_remote).abs();
			const percent_error = to_percent(delta, p_local);

			const log_level = t % (10 * t_step) == 0 || t == t_max - 1? "info": "debug";
			log[log_level](
				"%os\t %o remote; local: %o (%o error)",
				t,
				draw_percent(percent_remote),
				print_percent(percent_local),
				print_percent(percent_error)
			);

			// expect(percent_error, `negative error for t = ${t}`).to.be.at.least(0);
			expect(percent_error, `error too big for t = ${t}`).to.be.at.most(0.5);
			max_error = Math.max(max_error, percent_error);
		}
		log.info("maximum error: %o", print_percent(max_error));
	});
	it("maximum percent/sol (JS/Solidity) price(t) difference is at most 0.5% [ @skip-on-coverage ]", async function() {
		const dt = DEFAULT_LAND_SALE_PARAMS.time_flow_quantum;

		let max_error = 0;
		for(let t = 0; t < t_max; t += dt) {
			// local price: JS calculated
			const p_local = price_formula_percent(p0, dt, 0.02, t);
			// remote price: Solidity calculated
			// since the JavaScript price_formula_sol() matches the Solidity LandSale.price()
			// we can use JS implementation instead of sale.price()
			const p_remote = price_formula_sol(p0, t0, t, dt);

			const percent_local = to_percent(p_local, p0);
			const percent_remote = to_percent(p_remote, p0);

			const delta = p_local.sub(p_remote).abs();
			const percent_error = to_percent(delta, p_local);

			const log_level = t % t_step == 0 || t == t_max - 1? "info": "debug";
			log[log_level](
				"%os\t %o remote; local: %o (%o error)",
				t,
				draw_percent(percent_remote),
				print_percent(percent_local),
				print_percent(percent_error)
			);

			// expect(percent_error, `negative error for t = ${t}`).to.be.at.least(0);
			expect(percent_error, `error too big for t = ${t}`).to.be.at.most(0.5);
			max_error = Math.max(max_error, percent_error);
		}
		log.info("maximum error: %o", print_percent(max_error));
	});
	it("maximum percent/sol (JS/Solidity) price(t) difference is at most 0.5% (low complexity)", async function() {
		const dt = DEFAULT_LAND_SALE_PARAMS.time_flow_quantum;

		let max_error = 0;
		for(let t = 0; t < t_max; t += t_step * dt) {
			// local price: JS calculated
			const p_local = price_formula_percent(p0, dt, 0.02, t);
			// remote price: Solidity calculated
			// since the JavaScript price_formula_sol() matches the Solidity LandSale.price()
			// we can use JS implementation instead of sale.price()
			const p_remote = price_formula_sol(p0, t0, t, dt);

			const percent_local = to_percent(p_local, p0);
			const percent_remote = to_percent(p_remote, p0);

			const delta = p_local.sub(p_remote).abs();
			const percent_error = to_percent(delta, p_local);

			const log_level = t % (10 * t_step) == 0 || t == t_max - 1? "info": "debug";
			log[log_level](
				"%os\t %o remote; local: %o (%o error)",
				t,
				draw_percent(percent_remote),
				print_percent(percent_local),
				print_percent(percent_error)
			);

			// expect(percent_error, `negative error for t = ${t}`).to.be.at.least(0);
			expect(percent_error, `error too big for t = ${t}`).to.be.at.most(0.5);
			max_error = Math.max(max_error, percent_error);
		}
		log.info("maximum error: %o", print_percent(max_error));
	});
});
