// LandSale: Business Logic Tests

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
	random_hex,
	random_bn,
} = require("../../scripts/include/bn_utils");

// land data utils
const {
	element_sites,
	fuel_sites,
	parse_plot,
	generate_land,
	print_plot,
	plot_to_leaf,
	plot_to_metadata,
} = require("./include/land_data_utils");

// land sale utils
const {
	price_formula_sol,
} = require("./include/land_sale_utils");

// ERC165 interfaces
const {
	INTERFACE_IDS,
} = require("../include/SupportsInterface.behavior");

// LandLib.sol: JS implementation
const {
	pack,
	unpack,
	plot_view,
} = require("../land_gen/include/land_lib");

// deployment routines in use
const {
	erc20_deploy,
	usdt_deploy,
	sIlv_mock_deploy,
	land_nft_deploy_restricted,
	land_nft_deploy_mock,
	DEFAULT_LAND_SALE_PARAMS,
	land_sale_init,
	land_sale_deploy,
	land_sale_deploy_pure,
	land_sale_price_oracle_deploy,
	land_sale_delegate_deploy,
} = require("./include/deployment_routines");

// run land sale tests
contract("LandSale: Business Logic Tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3, a4, a5] = accounts;

	describe("deployment / proxy initialization", function() {
		it("fails if target NFT contract is not set", async function() {
			const sIlvContract = await sIlv_mock_deploy(a0);
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, ZERO_ADDRESS, sIlvContract.address, oracle.address), "target contract is not set");
		});
		it("fails if sILV contract is not set", async function() {
			const targetContract = await land_nft_deploy_restricted(a0);
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, ZERO_ADDRESS, oracle.address), "sILV contract is not set");
		});
		it("fails if price oracle contract is not set", async function() {
			const targetContract = await land_nft_deploy_restricted(a0);
			const sIlvContract = await sIlv_mock_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, sIlvContract.address, ZERO_ADDRESS), "oracle address is not set");
		});
		it("fails if target NFT contract doesn't have ERC721 interface", async function() {
			const targetContract = await land_nft_deploy_mock(a0, INTERFACE_IDS.ERC721); // mess up the ERC721 interface
			const sIlvContract = await sIlv_mock_deploy(a0);
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, sIlvContract.address, oracle.address), "unexpected target type");
		});
		it("fails if target NFT contract doesn't have MintableERC721 interface", async function() {
			const targetContract = await land_nft_deploy_mock(a0, INTERFACE_IDS.MintableERC721); // mess up the MintableERC721 interface
			const sIlvContract = await sIlv_mock_deploy(a0);
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, sIlvContract.address, oracle.address), "unexpected target type");
		});
		it("fails if target NFT contract doesn't have LandERC721Metadata interface", async function() {
			const targetContract = await land_nft_deploy_mock(a0, INTERFACE_IDS.LandERC721Metadata); // mess up the LandERC721Metadata interface
			const sIlvContract = await sIlv_mock_deploy(a0);
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, sIlvContract.address, oracle.address), "unexpected target type");
		});
		it("fails if sILV contract is not an ERC20 (balanceOf fails)", async function() {
			const targetContract = await land_nft_deploy_restricted(a0);
			const erc20Contract = await sIlv_mock_deploy(a0);
			await erc20Contract.setBalanceOfOverride(MAX_UINT256, {from: a0}); // mess up the balanceOf response
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, erc20Contract.address, oracle.address), "sILV.balanceOf failure");
		});
		it("fails if sILV contract is not an ERC20 (zero transfer fails)", async function() {
			const targetContract = await land_nft_deploy_restricted(a0);
			const erc20Contract = await sIlv_mock_deploy(a0);
			await erc20Contract.setTransferSuccessOverride(false, {from: a0}); // mess up the transfer response
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, erc20Contract.address, oracle.address), "sILV.transfer failure");
		});
		it("fails if sILV contract is not an ERC20 (zero transferFrom fails)", async function() {
			const targetContract = await land_nft_deploy_restricted(a0);
			const erc20Contract = await sIlv_mock_deploy(a0);
			await erc20Contract.setTransferFromSuccessOverride(false, {from: a0}); // mess up the transferFrom response
			const {oracle} = await land_sale_price_oracle_deploy(a0);
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, erc20Contract.address, oracle.address), "sILV.transferFrom failure");
		});
		it("fails if price oracle contract doesn't have LandSaleOracle interface", async function() {
			const targetContract = await land_nft_deploy_restricted(a0);
			const sIlvContract = await sIlv_mock_deploy(a0);
			const oracle = await sIlv_mock_deploy(a0); // mess up the oracle
			await expectRevert(land_sale_deploy_pure(a0, targetContract.address, sIlvContract.address, oracle.address), "unexpected oracle type");
		});
		describe("succeeds otherwise", function() {
			let land_sale, land_nft, sIlv, oracle;
			beforeEach(async function() {
				land_nft = await land_nft_deploy_restricted(a0);
				sIlv = await sIlv_mock_deploy(a0);
				({oracle} = await land_sale_price_oracle_deploy(a0));
				land_sale = await land_sale_deploy_pure(a0, land_nft.address, sIlv.address, oracle.address);
			});
			it("target NFT contract gets set as expected", async function() {
				expect(await land_sale.targetNftContract()).to.be.equal(land_nft.address);
			});
			it("sILV contract gets set as expected", async function() {
				expect(await land_sale.sIlvContract()).to.be.equal(sIlv.address);
			});
			it("oracle contract gets set as expected", async function() {
				expect(await land_sale.priceOracle()).to.be.equal(oracle.address);
			});
			it("input data Merkle root is not set", async function() {
				expect(await land_sale.root()).to.equal(ZERO_BYTES32);
			});
			it("saleStart is not set", async function() {
				expect(await land_sale.saleStart()).to.be.bignumber.that.is.zero;
			});
			it("saleEnd is not set", async function() {
				expect(await land_sale.saleEnd()).to.be.bignumber.that.is.zero;
			});
			it("halvingTime is not set", async function() {
				expect(await land_sale.halvingTime()).to.be.bignumber.that.is.zero;
			});
			it("seqDuration is not set", async function() {
				expect(await land_sale.seqDuration()).to.be.bignumber.that.is.zero;
			});
			it("seqOffset is not set", async function() {
				expect(await land_sale.seqOffset()).to.be.bignumber.that.is.zero;
			});
			it("pausedAt is not set", async function() {
				expect(await land_sale.pausedAt()).to.be.bignumber.that.is.zero;
			});
			it("pauseDuration is not set", async function() {
				expect(await land_sale.pauseDuration()).to.be.bignumber.that.is.zero;
			});
			it("startPrices are not set", async function() {
				expect(await land_sale.getStartPrices()).to.deep.equal([]);
			});
			it("beneficiary is not set", async function() {
				expect(await land_sale.beneficiary()).to.equal(ZERO_ADDRESS);
			});
			it("sale is not active", async function() {
				expect(await land_sale.isActive()).to.be.false;
			});
			it("current time func now32() behaves correctly", async function() {
				const latest_block = await web3.eth.getBlock("latest");
				expect(await land_sale.now32()).to.be.bignumber.that.equals(latest_block.timestamp + "");
			});
		})
	});

	describe("when sale is deployed", function() {
		// deploy the sale
		let land_sale, land_nft, sIlv, oracle, aggregator;
		beforeEach(async function() {
			({land_sale, land_nft, sIlv, oracle, aggregator} = await land_sale_deploy(a0));
		});

		describe("setting the input data root: setInputDataRoot()", function() {
			const {plots, leaves, tree, root} = generate_land(10);
			beforeEach(async function() {
				await land_sale.setInputDataRoot(root, {from: a0});
			});
			it("allows validating random plot data entry from the Merkle tree set: isPlotValid", async function() {
				const i = 3;
				expect(await land_sale.isPlotValid(plots[i], tree.getHexProof(leaves[i]))).to.be.true;
			});
			it("doesn't allow to buy a plot (inactive sale)", async function() {
				await expectRevert(land_sale.buyL1(
					plots[0],
					tree.getHexProof(leaves[0]),
					{from: a1, value: DEFAULT_LAND_SALE_PARAMS.start_prices[5]}
				), "inactive sale");
			});
		});

		describe("initialization and partial initialization: initialize()", function() {
			const sale_initialize = async (
				sale_start = 0xFFFF_FFFF,
				sale_end = 0xFFFF_FFFF,
				halving_time = 0xFFFF_FFFF,
				time_flow_quantum = 0xFFFF_FFFF,
				seq_duration = 0xFFFF_FFFF,
				seq_offset = 0xFFFF_FFFF,
				start_prices = [(new BN(2).pow(new BN(96))).subn(1)] // 0xFFFFFFFF_FFFFFFFF_FFFFFFFF
			) => await land_sale.initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices, {from: a0});

			const flatten = (array) => array.map(e => e + "");

			const {sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices} = DEFAULT_LAND_SALE_PARAMS;
			describe("initialization: initialize()", function() {
				let receipt;
				beforeEach(async function() {
					receipt = await sale_initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices);
				});
				it("sets saleStart as expected", async function() {
					expect(await land_sale.saleStart()).to.be.bignumber.that.equals(sale_start + "");
				});
				it("sets saleEnd as expected", async function() {
					expect(await land_sale.saleEnd()).to.be.bignumber.that.equals(sale_end + "");
				});
				it("sets halvingTime as expected", async function() {
					expect(await land_sale.halvingTime()).to.be.bignumber.that.equals(halving_time + "");
				});
				it("sets timeFlowQuantum as expected", async function() {
					expect(await land_sale.timeFlowQuantum()).to.be.bignumber.that.equals(time_flow_quantum + "");
				});
				it("sets seqDuration as expected", async function() {
					expect(await land_sale.seqDuration()).to.be.bignumber.that.equals(seq_duration + "");
				});
				it("sets seqOffset as expected", async function() {
					expect(await land_sale.seqOffset()).to.be.bignumber.that.equals(seq_offset + "");
				});
				it("sets startPrices as expected", async function() {
					expect(flatten(await land_sale.getStartPrices())).to.deep.equal(flatten(start_prices));
				});
				it('emits "Initialized" event', async function() {
					expectEvent(receipt, "Initialized", {
						_by: a0,
						_saleStart: sale_start + "",
						_saleEnd: sale_end + "",
						_halvingTime: halving_time + "",
						_timeFlowQuantum: time_flow_quantum + "",
						_seqDuration: seq_duration + "",
						_seqOffset: seq_offset + "",
						// _startPrices: start_prices, // this doesn't work: use the next line instead
					});
					expect(flatten(receipt.logs[0].args["_startPrices"])).to.deep.equal(flatten(start_prices));
				});
			});
			describe("partial initialization: initialize()", function() {
				it(`when saleStart is "unset" (0xFFFFFFFF) it remains unchanged`, async function() {
					await sale_initialize(undefined, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices);
					expect(await land_sale.saleStart()).to.be.bignumber.that.is.zero;
					expect(await land_sale.saleEnd(), "saleEnd didn't change").to.be.bignumber.that.equals(sale_end + "");
				});
				it(`when saleEnd is "unset" (0xFFFFFFFF) it remains unchanged`, async function() {
					await sale_initialize(sale_start, undefined, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices);
					expect(await land_sale.saleEnd()).to.be.bignumber.that.is.zero;
					expect(await land_sale.halvingTime(), "halvingTime didn't change").to.be.bignumber.that.equals(halving_time + "");
				});
				it(`when halvingTime is "unset" (0xFFFFFFFF) it remains unchanged`, async function() {
					await sale_initialize(sale_start, sale_end, undefined, time_flow_quantum, seq_duration, seq_offset, start_prices);
					expect(await land_sale.halvingTime()).to.be.bignumber.that.is.zero;
					expect(await land_sale.timeFlowQuantum(), "timeFlowQuantum didn't change").to.be.bignumber.that.equals(time_flow_quantum + "");
				});
				it(`when timeFlowQuantum is "unset" (0xFFFFFFFF) it remains unchanged`, async function() {
					await sale_initialize(sale_start, sale_end, halving_time, undefined, seq_duration, seq_offset, start_prices);
					expect(await land_sale.timeFlowQuantum()).to.be.bignumber.that.is.zero;
					expect(await land_sale.seqDuration(), "seqDuration didn't change").to.be.bignumber.that.equals(seq_duration + "");
				});
				it(`when seqDuration is "unset" (0xFFFFFFFF) it remains unchanged`, async function() {
					await sale_initialize(sale_start, sale_end, halving_time, time_flow_quantum, undefined, seq_offset, start_prices);
					expect(await land_sale.seqDuration()).to.be.bignumber.that.is.zero;
					expect(await land_sale.seqOffset(), "seqOffset didn't change").to.be.bignumber.that.equals(seq_offset + "");
				});
				it(`when seqOffset is "unset" (0xFFFFFFFF) it remains unchanged`, async function() {
					await sale_initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, undefined, start_prices);
					expect(await land_sale.seqOffset()).to.be.bignumber.that.is.zero;
					expect(flatten(await land_sale.getStartPrices()), "startPrices didn't change").to.deep.equal(flatten(start_prices));
				});
				it(`when startPrices is "unset" ([0xFFFFFFFFFFFFFFFFFFFFFFFF]) it remains unchanged`, async function() {
					await sale_initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, undefined);
					expect(await land_sale.getStartPrices()).to.deep.equal([]);
					expect(await land_sale.saleStart(), "saleStart didn't change").to.be.bignumber.that.equals(sale_start + "");
				});
			});
		});

		describe("setting the beneficiary: setBeneficiary()", function() {
			function set_and_check(beneficiary) {
				let receipt
				beforeEach(async function() {
					receipt = await land_sale.setBeneficiary(beneficiary, {from: a0});
				});
				it('"BeneficiaryUpdated" event is emitted', async function() {
					expectEvent(receipt, "BeneficiaryUpdated", {
						_by: a0,
						_beneficiary: beneficiary,
					});
				});
				it("beneficiary set as expected", async function() {
					expect(await land_sale.beneficiary()).to.equal(beneficiary);
				});
			}
			describe("setting the beneficiary", function() {
				set_and_check(a1);
				describe("updating the beneficiary", function() {
					set_and_check(a2);
				});
				describe("removing the beneficiary", function() {
					set_and_check(ZERO_ADDRESS);
				});
			});
		});

		describe("rescuing ERC20 tokens lost in the sale smart contract", function() {
			function run_non_sIlv_test_suite(erc20_compliant) {
				// deploy the ERC20 token (not an sILV)
				let token;
				beforeEach(async function() {
					token = erc20_compliant? await erc20_deploy(a0, H0): await usdt_deploy(a0, H0);
				});

				// loose the tokens
				const value = random_bn(2, 1_000_000_000);
				let receipt;
				beforeEach(async function() {
					receipt = await token.transfer(land_sale.address, value, {from: H0});
				});
				it('ERC20 "Transfer" event is emitted', async function() {
					expectEvent(receipt, "Transfer", {
						from: H0,
						to: land_sale.address,
						value: value,
					});
				});
				it("land sale contract balance increases as expected", async function() {
					expect(await token.balanceOf(land_sale.address)).to.be.bignumber.that.equals(value);
				});

				function rescue(total_value, rescue_value = total_value) {
					total_value = new BN(total_value);
					rescue_value = new BN(rescue_value);
					let receipt;
					beforeEach(async function() {
						receipt = await land_sale.rescueErc20(token.address, a1, rescue_value, {from: a0});
					});
					it('ERC20 "Transfer" event is emitted', async function() {
						await expectEvent.inTransaction(receipt.tx, token, "Transfer", {
							from: land_sale.address,
							to: a1,
							value: rescue_value,
						});
					});
					it("land sale contract balance decreases as expected", async function() {
						expect(await token.balanceOf(land_sale.address)).to.be.bignumber.that.equals(total_value.sub(rescue_value));
					});
					it("token recipient balance increases as expected", async function() {
						expect(await token.balanceOf(a1)).to.be.bignumber.that.equals(rescue_value);
					});
				}

				describe("can rescue all the tokens", function() {
					rescue(value);
				});
				describe("can rescue some tokens", function() {
					rescue(value, value.subn(1));
				});

				it("cannot rescue more than all the tokens", async function() {
					await expectRevert(
						land_sale.rescueErc20(token.address, a1, value.addn(1), {from: a0}),
						erc20_compliant? "ERC20: transfer amount exceeds balance": "ERC20 low-level call failed"
					);
				});
				if(erc20_compliant) {
					it("reverts if ERC20 transfer fails", async function() {
						await token.setTransferSuccessOverride(false, {from: a0});
						await expectRevert(land_sale.rescueErc20(token.address, a1, 1, {from: a0}), "ERC20 transfer failed");
					});
				}
			}
			describe("once non-sILV ERC20 tokens are lost in the sale contract", function() {
				run_non_sIlv_test_suite(true);
			});
			describe("once non-sILV ERC20 tokens (not ERC20 compliant, like USDT) are lost in the sale contract", function() {
				run_non_sIlv_test_suite(false);
			});
			describe("once sILV ERC20 tokens are lost in the sale contract", function() {
				// link the sILV token
				let token;
				beforeEach(async function() {
					token = sIlv;
				});

				const value = random_bn(2, 1_000_000_000);
				let receipt;
				beforeEach(async function() {
					receipt = await token.mint(land_sale.address, value, {from: a0});
				});
				it('ERC20 "Transfer" event is emitted', async function() {
					expectEvent(receipt, "Transfer", {
						from: ZERO_ADDRESS,
						to: land_sale.address,
						value: value,
					});
				});
				it("land sale contract balance increases as expected", async function() {
					expect(await token.balanceOf(land_sale.address)).to.be.bignumber.that.equals(value);
				});

				it("can't rescue all the tokens", async function() {
					await expectRevert(land_sale.rescueErc20(token.address, a1, value, {from: a0}), "sILV access denied");
				});
				it("can't rescue some tokens", async function() {
					await expectRevert(land_sale.rescueErc20(token.address, a1, value.subn(1), {from: a0}), "sILV access denied");
				});
				it("can't rescue more than all the tokens", async function() {
					await expectRevert(land_sale.rescueErc20(token.address, a1, value.addn(1), {from: a0}), "sILV access denied");
				});
			});
		});

		describe("when sale is initialized, and input data root is set", function() {
			// initialize the sale
			let sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices;
			beforeEach(async function() {
				({sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices} = await land_sale_init(a0, land_sale));
			});
			// generate land plots and setup the merkle tree
			const {plots, tree, root, sequences, tiers} = generate_land(100_000);
			beforeEach(async function() {
				await land_sale.setInputDataRoot(root, {from: a0});
			});
			// setup the pricing oracle
			const eth_out = new BN(1);
			const ilv_in = new BN(4);
			beforeEach(async function() {
				await aggregator.setRate(eth_out, ilv_in, {from: a0});
			});
			// define two buyers, supply only one with sILV tokens
			const buyer = a1, buyer2 = a2;
			beforeEach(async function() {
				const eth_balance = await balance.current(buyer);
				await sIlv.mint(buyer, eth_balance.mul(ilv_in).div(eth_out), {from: a0});
				await sIlv.approve(land_sale.address, MAX_UINT256, {from: buyer});
			});
			// sale beneficiary (push withdraw)
			const beneficiary = a3;
			// treasury to withdraw to (pull withdraw)
			const treasury = a4;

			/**
			 * Adjusts sale time to the one required to buy a plot
			 * @param plot plot to buy
			 * @param t_seq when we'd like to buy (within a sequence)
			 */
			async function prepare(plot, t_seq = random_int(0, seq_duration)) {
				// if plot is not set – pick random plot
				if(!plot) {
					plot = random_element(plots);
				}

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

			/**
			 * Runs buy test suite
			 * @param tier_id tier ID to test in
			 * @param cc corner case: -1 for first second buy, 0 somewhere in the middle, 1 for last second buy
			 * @param l1 indicates if should run the test in L1 (with minting) or L2 (without minting)
			 */
			function buy_test_suite(tier_id, cc, l1 = false) {
				const corner = cc < 0? "left": cc > 0? "right": "middle";

				describe(`buying a random plot in tier ${tier_id} (corner case: ${corner})`, function() {
					const plot = random_element(plots.filter(p => p.tierId == tier_id));
					let metadata, proof, seq_start, seq_end, t, price_eth, price_sIlv;
					beforeEach(async function() {
						const t_seq = cc < 0? 0: cc > 0? seq_duration - 1: random_int(60, seq_duration - 60);
						({metadata, proof, seq_start, seq_end, t, price_eth, price_sIlv} = await prepare(plot, t_seq));
					});

					async function buy(use_sIlv = false, dust_amt = price_eth.divn(10), from = buyer) {
						// in a Dutch auction model dust ETH will be usually present
						const value = use_sIlv? 0: cc < 0? price_eth: price_eth.add(dust_amt);
						// depending on l1 flag we use different function name
						const buy_fn = l1? land_sale.buyL1: land_sale.buyL2;
						// execute buy function
						return await buy_fn(plot, proof, {from, value});
					}

					it("reverts if merkle root is unset", async function() {
						await land_sale.setInputDataRoot(ZERO_BYTES32, {from: a0});
						await expectRevert(buy(), "empty sale");
					});
					it("reverts if merkle proof is invalid", async function() {
						proof[0] = random_hex();
						await expectRevert(buy(), "invalid plot");
					});
					it("reverts if current time is before sale starts", async function() {
						await land_sale.setNow32(sale_start - 1, {from: a0});
						await expectRevert(buy(), "inactive sale");
					});
					it("reverts if current time is after sale ends", async function() {
						await land_sale.setNow32(sale_end, {from: a0});
						await expectRevert(buy(), "inactive sale");
					});
					it("reverts if current time is before sequence starts", async function() {
						await land_sale.setNow32(seq_start - 1, {from: a0});
						await expectRevert(buy(), plot.sequenceId > 0? "invalid sequence": "inactive sale");
					});
					it("reverts if current time is after sequence ends", async function() {
						await land_sale.setNow32(seq_end, {from: a0});
						await expectRevert(buy(), plot.sequenceId < sequences - 1? "invalid sequence": "inactive sale");
					});
					it("reverts if price for the tier is undefined", async function() {
						await land_sale.initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices.slice(0, tier_id), {from: a0});
						await expectRevert(buy(), "invalid tier");
					});
					it("reverts if ETH value supplied is lower than the price", async function() {
						price_eth = price_eth.subn(1);
						await expectRevert(buy(false, new BN(0)), "not enough ETH");
					});
					it("reverts if sILV value supplied is lower than the price", async function() {
						await sIlv.approve(land_sale.address, price_sIlv.subn(1), {from: buyer});
						await expectRevert(buy(true), "not enough funds supplied");
					});
					it("reverts if sILV value available is lower than the price", async function() {
						await sIlv.approve(land_sale.address, price_sIlv, {from: buyer2});
						await expectRevert(buy(true, new BN(0), buyer2), "not enough funds available");
					});
					it("reverts if the sale is not active (isActive override)", async function() {
						await land_sale.setStateOverride(false, {from: a0});
						await expectRevert(buy(), "inactive sale");
					});
					it("reverts if price oracle reports zero price", async function() {
						await oracle.setEthToIlvOverride(0, {from: a0});
						await expectRevert(buy(true), "price conversion error");
					});
					describe("reverts if price oracle reports price close to zero", function() {
						const border_price = 1_000;
						const fn = async () => await buy(true);
						it(`reverts if price oracle price is equal to border price ${border_price}`, async function() {
							await oracle.setEthToIlvOverride(border_price, {from: a0});
							await expectRevert(fn(), "price conversion error");
						});
						it(`doesn't revert if price oracle price is bigger than border price ${border_price}`, async function() {
							await oracle.setEthToIlvOverride(border_price + 1, {from: a0});
							await fn();
						});
					});
					it("reverts if ERC20 transfer fails", async function() {
						await sIlv.setTransferSuccessOverride(false, {from: a0});
						await expectRevert(buy(true), "ERC20 transfer failed");
					});
					it("reverts if minted twice", async function() {
						await buy();
						await expectRevert(buy(), "already minted");
					});
					if(!l1) {
						describe("if executed not by EOA", function() {
							let delegate;
							beforeEach(async function() {
								delegate = await land_sale_delegate_deploy(a0, land_sale.address);
							});
							it("reverts", async function() {
								await expectRevert(
									delegate.buyL2Delegate(plot, proof, {from: buyer, value: price_eth}),
									"L2 sale requires EOA"
								);
							});
						});
					}

					function succeeds(use_sIlv = false, beneficiary = false) {
						before(function() {
							log.debug(
								"buying with %o, beneficiary: %o",
								use_sIlv? "sILV": "ETH",
								beneficiary? beneficiary: "not set"
							);
						});
						// save initial balances for the future comparison:
						// eb: ETH balance; sb: sILV balance
						let buyer_eb0, buyer_sb0, sale_eb0, sale_sb0, beneficiary_eb0, beneficiary_sb0;
						beforeEach(async function() {
							buyer_eb0 = await balance.current(buyer);
							buyer_sb0 = await sIlv.balanceOf(buyer);
							sale_eb0 = await balance.current(land_sale.address);
							sale_sb0 = await sIlv.balanceOf(land_sale.address);

							if(beneficiary) {
								beneficiary_eb0 = await balance.current(beneficiary);
								beneficiary_sb0 = await sIlv.balanceOf(beneficiary);
								await land_sale.setBeneficiary(beneficiary, {from: a0});
							}
						});

						let receipt, gas_cost, _plot;
						beforeEach(async function() {
							receipt = await buy(use_sIlv);
							gas_cost = await extract_gas_cost(receipt);

							// minted plot contains randomness and cannot be fully guessed,
							// we enrich it from the actual minted plot
							_plot = parse_plot(Object.assign({...receipt.logs[0].args["_plot"]}, plot))
						});
						if(l1) {
							it('"PlotBoughtL1" event is emitted ', async function() {
								expectEvent(receipt,"PlotBoughtL1", {
									_by: buyer,
									_tokenId: plot.tokenId + "",
									_sequenceId: plot.sequenceId + "",
									_plot: plot_to_metadata(_plot),
									_eth: price_eth,
									_sIlv: use_sIlv? price_sIlv: "0",
								});
							});
						}
						else {
							it('"PlotBoughtL2" event is emitted ', async function() {
								// minted plot contains randomness and cannot be fully guessed
								expectEvent(receipt, "PlotBoughtL2", {
									_by: buyer,
									_tokenId: plot.tokenId + "",
									_sequenceId: plot.sequenceId + "",
									_plot: plot_to_metadata(_plot),
									_plotPacked: pack(_plot),
									_eth: price_eth,
									_sIlv: use_sIlv? price_sIlv: "0",
								});
							});
						}
						describe("the plot bought is minted as expected", function() {
							if(!l1) {
								// simulate off-chain minting process executed in L2
								beforeEach(async function() {
									await land_nft.mintFor(
										buyer,
										1,
										web3.utils.asciiToHex(`{${plot.tokenId}:{${pack(_plot).toString(10)}`),
										{from: a0}
									);
								});
							}
							it("LandSale::exists: true", async function() {
								expect(await land_sale.exists(plot.tokenId)).to.be.true;
							});
							it("ERC721::exists: true", async function() {
								expect(await land_nft.exists(plot.tokenId)).to.be.true;
							});
							it("ERC721::ownerOf: buyer", async function() {
								expect(await land_nft.ownerOf(plot.tokenId)).to.equal(buyer);
							});
							it("ERC721::totalSupply: +1", async function() {
								expect(await land_nft.totalSupply()).to.be.bignumber.that.equals("1");
							});
							it("bought plot has metadata", async function() {
								expect(await land_nft.hasMetadata(plot.tokenId)).to.be.true;
							});
							describe("bought plot metadata is set as expected", function() {
								let plot_metadata;
								before(async function() {
									plot_metadata = await land_nft.getMetadata(plot.tokenId);
									log.debug(print_plot(plot_metadata));
								});
								it("regionId matches", async function() {
									expect(plot_metadata.regionId).to.be.bignumber.that.equals(plot.regionId + "");
								});
								it("x-coordinate matches", async function() {
									expect(plot_metadata.x).to.be.bignumber.that.equals(plot.x + "");
								});
								it("y-coordinate matches", async function() {
									expect(plot_metadata.y).to.be.bignumber.that.equals(plot.y + "");
								});
								it("plot size matches", async function() {
									expect(plot_metadata.size).to.be.bignumber.that.equals(plot.size + "");
								});
								it("generator version is 1", async function() {
									expect(plot_metadata.version).to.be.bignumber.that.equals("1");
								});
								it("seed is set", async function() {
									expect(plot_metadata.seed).to.be.bignumber.that.is.not.zero;
								});
							});
							describe("bought plot metadata view looks as expected", function() {
								let metadata_view;
								before(async function() {
									metadata_view = await land_nft.viewMetadata(plot.tokenId);
									log.debug(print_plot(metadata_view));
								});
								it("regionId matches", async function() {
									expect(metadata_view.regionId).to.be.bignumber.that.equals(plot.regionId + "");
								});
								it("x-coordinate matches", async function() {
									expect(metadata_view.x).to.be.bignumber.that.equals(plot.x + "");
								});
								it("y-coordinate matches", async function() {
									expect(metadata_view.y).to.be.bignumber.that.equals(plot.y + "");
								});
								it("plot size matches", async function() {
									expect(metadata_view.size).to.be.bignumber.that.equals(plot.size + "");
								});
								describe(`landmark type matches the tier ${tier_id}`,  function() {
									if(tier_id < 3) {
										it("no landmark (ID 0) for the tier less than 3", async function() {
											expect(metadata_view.landmarkTypeId).to.be.bignumber.that.is.zero;
										});
									}
									else if(tier_id < 4) {
										it("element landmark (ID 1-3) for the tier 3", async function() {
											expect(metadata_view.landmarkTypeId).to.be.bignumber.that.is.closeTo("2", "1");
										});
									}
									else if(tier_id < 5) {
										it("fuel landmark (ID 4-6) for the tier 4", async function() {
											expect(metadata_view.landmarkTypeId).to.be.bignumber.that.is.closeTo("5", "1");
										});
									}
									else if(tier_id < 6) {
										it("Arena landmark (ID 7) for the tier 5", async function() {
											expect(metadata_view.landmarkTypeId).to.be.bignumber.that.equals("7");
										});
									}
									else {
										it(`unexpected tier ${tier_id}`, async function() {
											expect(false);
										});
									}
								});
								{
									const num_sites = element_sites;
									it(`number of element sites (${num_sites[tier_id]}) matches the tier (${tier_id})`, async function() {
										const sites = metadata_view.sites.filter(s => s.typeId >= 1 && s.typeId <= 3);
										expect(sites.length).to.equal(num_sites[tier_id]);
									});
								}
								{
									const num_sites = fuel_sites;
									it(`number of fuel sites (${num_sites[tier_id]}) matches the tier (${tier_id})`, async function() {
										const sites = metadata_view.sites.filter(s => s.typeId >= 4 && s.typeId <= 6);
										expect(sites.length).to.equal(num_sites[tier_id]);
									});
								}
							});
						});
						describe("funds move as expected", function() {
							if(use_sIlv) {
								it("buyer sILV balance decreases as expected", async function() {
									expect(await sIlv.balanceOf(buyer)).to.be.bignumber.that.equals(buyer_sb0.sub(price_sIlv));
								});
								if(beneficiary) {
									it("beneficiary sILV balance increases as expected", async function() {
										expect(await sIlv.balanceOf(beneficiary)).to.be.bignumber.that.equals(beneficiary_sb0.add(price_sIlv));
									});
								}
								else {
									it("sale sILV balance increases as expected", async function() {
										expect(await sIlv.balanceOf(land_sale.address)).to.be.bignumber.that.equals(sale_sb0.add(price_sIlv));
									});
								}
								it("buyer ETH balance remains", async function() {
									expect(await balance.current(buyer)).to.be.bignumber.that.equals(buyer_eb0.sub(gas_cost));
								});
							}
							else {
								it("buyer ETH balance decreases as expected", async function() {
									expect(await balance.current(buyer)).to.be.bignumber.that.equals(buyer_eb0.sub(price_eth).sub(gas_cost));
								});
								if(beneficiary) {
									it("beneficiary ETH balance increases as expected", async function() {
										expect(await balance.current(beneficiary)).to.be.bignumber.that.equals(beneficiary_eb0.add(price_eth));
									});
								}
								else {
									it("sale ETH balance increases as expected", async function() {
										expect(await balance.current(land_sale.address)).to.be.bignumber.that.equals(sale_eb0.add(price_eth));
									});
								}
								it("buyer sILV balance remains", async function() {
									expect(await sIlv.balanceOf(buyer)).to.be.bignumber.that.equals(buyer_sb0);
								});
							}
						});
					}

					describe("succeeds otherwise", function() {
						it("sale is active", async function() {
							expect(await land_sale.isActive()).to.be.true;
						});
						describe("when buying with ETH, without beneficiary set (default)", succeeds);
						describe("when buying with ETH, with beneficiary set", function() {
							succeeds(false, beneficiary);
						});
						describe("when buying with sILV, without beneficiary set", function() {
							succeeds(true);
						});
						describe("when buying with sILV, with beneficiary set", function() {
							succeeds(true, beneficiary);
						});
					});
				});
			}

			// run three L1 tests for each of the tiers
			describe("Layer 1", function() {
				for(let tier_id = 1; tier_id <= tiers; tier_id++) {
					buy_test_suite(tier_id, -1, true);
					buy_test_suite(tier_id, 0, true);
					buy_test_suite(tier_id, 1, true);
				}
			});
			// run three L2 tests for each of the tiers
			describe("Layer 2", function() {
				for(let tier_id = 1; tier_id <= tiers; tier_id++) {
					buy_test_suite(tier_id, -1, false);
					buy_test_suite(tier_id, 0, false);
					buy_test_suite(tier_id, 1, false);
				}
			});

			// run a separate test for free tier (0)
			describe("buying a plot in free tier (0)", function() {
				const plot = {
					tokenId: 1,
					sequenceId: 0,
					regionId: 1,
					x: 1,
					y: 1,
					tierId: 0,
					size: 90,
				};
				const leaf = plot_to_leaf(plot);
				beforeEach(async function() {
					await land_sale.setInputDataRoot(leaf, {from: a0});
					await land_sale.setNow32(sale_start + seq_offset * plot.sequenceId);
				});
				it("reverts (not supported in this sale version)", async function() {
					const value = start_prices[plot.tierId];
					await expectRevert(land_sale.buyL1(plot, [], {from: buyer, value}), "unsupported tier");
				});
			});

			describe("pausing/resuming: pause() / resume()", function() {
				function is_active() {
					it("sale is active", async function() {
						expect(await land_sale.isActive()).to.be.true;
					});
				}
				function is_not_active() {
					it("sale is not active", async function() {
						expect(await land_sale.isActive()).to.be.false;
					});
				}
				async function pause_at(t) {
					await land_sale.setNow32(t, {from: a0});
					return await land_sale.pause({from: a0});
				}
				async function resume_at(t) {
					await land_sale.setNow32(t, {from: a0});
					return await land_sale.resume({from: a0});
				}

				describe("before sale starts", function() {
					beforeEach(async function() {
						await land_sale.setNow32(sale_start - 1, {from: a0})
					});
					is_not_active();
				});
				describe("after sale starts", function() {
					beforeEach(async function() {
						await land_sale.setNow32(sale_start, {from: a0})
					});
					is_active();
				});
				describe("after sale ends", function() {
					beforeEach(async function() {
						await land_sale.setNow32(sale_end, {from: a0})
					});
					is_not_active();
				});
				describe("before sale ends", function() {
					beforeEach(async function() {
						await land_sale.setNow32(sale_end - 1, {from: a0})
					});
					is_active();
				});

				it("resuming is impossible (throws) before paused", async function() {
					await expectRevert(resume_at(1), "already running");
				});

				describe("when paused at any time", function() {
					let elapsed, paused_at;
					let receipt;
					beforeEach(async function() {
						elapsed = random_int(1, 1_000);
						paused_at = random_int(1, 0xFFFFFFFD - elapsed);
						receipt = await pause_at(paused_at);
					});
					is_not_active();
					it("pausedAt is updated as expected", async function() {
						expect(await land_sale.pausedAt()).to.be.bignumber.that.equals(paused_at + "");
					});
					it("pauseDuration doesn't change (remains zero)", async function() {
						expect(await land_sale.pauseDuration()).to.be.bignumber.that.is.zero;
					});
					it("ownTime() remains equal to the current time", async function() {
						expect(await land_sale.ownTime()).to.be.bignumber.that.equals(paused_at + "");
					});
					it('"Paused" event is emitted', async function() {
						expectEvent(receipt, "Paused", {_by: a0, _pausedAt: paused_at + ""});
					});
					it("pausing again is impossible (throws)", async function() {
						await expectRevert(pause_at(paused_at), "already paused");
					});

					// we will use partial initialization function several times
					const sale_initialize = async (
						sale_start = 0xFFFF_FFFF,
						sale_end = 0xFFFF_FFFF,
						halving_time = 0xFFFF_FFFF,
						time_flow_quantum = 0xFFFF_FFFF,
						seq_duration = 0xFFFF_FFFF,
						seq_offset = 0xFFFF_FFFF,
						start_prices = [(new BN(2).pow(new BN(96))).subn(1)] // 0xFFFFFFFF_FFFFFFFF_FFFFFFFF
					) => await land_sale.initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices, {from: a0});

					describe("initialization resets the pause state and resumes the sale", function() {
						let reinitialized_at;
						let receipt;
						beforeEach(async function() {
							reinitialized_at = paused_at + elapsed;
							await land_sale.setNow32(reinitialized_at, {from: a0});
							receipt = await sale_initialize(1, 0xFFFFFFFE);
						});

						is_active();
						it("pausedAt is erased (changed to zero)", async function() {
							expect(await land_sale.pausedAt()).to.be.bignumber.that.is.zero;
						});
						it("pauseDuration is erased (changed to zero)", async function() {
							expect(await land_sale.pauseDuration()).to.be.bignumber.that.is.zero;
						});
						it("ownTime() remains equal to the current time now32()", async function() {
							expect(await land_sale.ownTime()).to.be.bignumber.that.equals(await land_sale.now32());
						});
						it('"Resumed" event is emitted', async function() {
							expectEvent(receipt, "Resumed", {
								_by: a0,
								_pausedAt: paused_at + "",
								_resumedAt: reinitialized_at + "",
								_pauseDuration: elapsed + "",
							});
						});
						it("resuming again is impossible (throws)", async function() {
							await expectRevert(resume_at(paused_at + 1), "already running");
						});
					});

					describe("when resumed after the pause", function() {
						let resumed_at, duration;
						let receipt;
						beforeEach(async function() {
							resumed_at = random_int(paused_at, 0xFFFFFFFE);
							duration = Math.max(sale_start, resumed_at) - Math.max(sale_start, paused_at);
							receipt = await resume_at(resumed_at);
						});
						it("pausedAt is erased (changed to zero)", async function() {
							expect(await land_sale.pausedAt()).to.be.bignumber.that.is.zero;
						});
						it("pauseDuration is increased as expected", async function() {
							expect(await land_sale.pauseDuration()).to.be.bignumber.that.equals(duration + "");
						});
						it("ownTime() shifts as expected", async function() {
							expect(await land_sale.ownTime()).to.be.bignumber.that.equals(Math.max(sale_start, paused_at) + "");
						});
						it('"Resumed" event is emitted', async function() {
							expectEvent(receipt, "Resumed", {
								_by: a0,
								_pausedAt: paused_at + "",
								_resumedAt: resumed_at + "",
								_pauseDuration: duration + "",
							});
						});
						it("resuming again is impossible (throws)", async function() {
							await expectRevert(resume_at(resumed_at + 1), "already running");
						});

						describe("initialization resets the pause state", function() {
							let receipt;
							beforeEach(async function() {
								receipt = await sale_initialize(1, 0xFFFFFFFE);
							});
							is_active();
							it("pausedAt doesn't change (remains zero)", async function() {
								expect(await land_sale.pausedAt()).to.be.bignumber.that.is.zero;
							});
							it("pauseDuration is erased (changed to zero)", async function() {
								expect(await land_sale.pauseDuration()).to.be.bignumber.that.is.zero;
							});
							it("ownTime() remains equal to the current time now32()", async function() {
								expect(await land_sale.ownTime()).to.be.bignumber.that.equals(await land_sale.now32());
							});
							it('"Resumed" event is not emitted', async function() {
								expectEvent.notEmitted(receipt, "Resumed");
							});
							it("resuming again is impossible (throws)", async function() {
								await expectRevert(resume_at(resumed_at + 1), "already running");
							});
						});

						describe("when additional time passes", function() {
							let new_time;
							beforeEach(async function() {
								new_time = random_int(resumed_at, 0xFFFFFFFF);
								await land_sale.setNow32(new_time, {from: a0});
							});
							it("ownTime() remains shifted as expected", async function() {
								expect(await land_sale.ownTime()).to.be.bignumber.that.equals(
									new_time - resumed_at + Math.max(sale_start, paused_at) + ""
								);
							});
						});
					});
				});
				describe("when paused before the sale starts", function() {
					let paused_at;
					beforeEach(async function() {
						paused_at = sale_start - 2;
						await pause_at(paused_at);
					});
					is_not_active();

					describe("when resumed before the sale starts", function() {
						let resumed_at;
						beforeEach(async function() {
							resumed_at = sale_start - 1;
							await resume_at(resumed_at);
						});
						is_not_active();
						it("ownTime() remains equal to the current time", async function() {
							expect(await land_sale.ownTime()).to.be.bignumber.that.equals(resumed_at + "");
						});
					});

					describe("when resumed after the sale starts", function() {
						let resumed_at;
						beforeEach(async function() {
							resumed_at = sale_start + seq_offset;
							await resume_at(resumed_at);
						});
						is_active();
						it("ownTime() shifts as expected to saleStart", async function() {
							expect(await land_sale.ownTime()).to.be.bignumber.that.equals(sale_start + "");
						});
						for(let tier_id = 1; tier_id <= tiers; tier_id++) {
							it(`token price for seq 0, tier ${tier_id} remains equal to initial`, async function() {
								expect(await land_sale.tokenPriceNow(0, tier_id)).to.be.bignumber.that.equals(start_prices[tier_id]);
							});
						}
					});
				});
				describe("when paused after the sale starts", function() {
					let paused_at;
					let receipt;
					beforeEach(async function() {
						paused_at = sale_start;
						receipt = await pause_at(paused_at);
					});
					is_not_active();
					it("ownTime() remains equal to the current time", async function() {
						expect(await land_sale.ownTime()).to.be.bignumber.that.equals(paused_at + "");
					});

					describe("when resumed after the pause", function() {
						let resumed_at;
						let receipt;
						beforeEach(async function() {
							resumed_at = sale_end;
							receipt = await resume_at(resumed_at);
						});
						is_active();
						it("ownTime() shifts as expected", async function() {
							expect(await land_sale.ownTime()).to.be.bignumber.that.equals(paused_at + "");
						});
						for(let tier_id = 0; tier_id <= tiers; tier_id++) {
							it(`token price for seq 0, tier ${tier_id} remains equal to initial`, async function() {
								expect(await land_sale.tokenPriceNow(0, tier_id)).to.be.bignumber.that.equals(start_prices[tier_id]);
							});
						}
					});
				});
			});

			describe("withdrawing", function() {
				async function buy(use_sIlv = false, plot = random_element(plots)) {
					const {proof, price_eth, price_sIlv} = await prepare(plot);
					await land_sale.buyL1(plot, proof, {from: buyer, value: use_sIlv? 0: price_eth});
					return {price_eth, price_sIlv};
				}

				async function withdraw(eth_only = true, to = treasury) {
					if(to == a0) {
						return await land_sale.withdraw(eth_only, {from: a0});
					}
					return await land_sale.withdrawTo(to, eth_only, {from: a0});
				}

				function succeeds(use_eth, use_sIlv, eth_only, to_self = false) {
					const to = to_self? a0: treasury;

					// create the required ETH/sILV balances by buying
					let price_eth, price_sIlv;
					beforeEach(async function() {
						if(use_eth) {
							const plot = plots[2 * random_int(0, plots.length >> 1)];
							({price_eth} = await buy(false, plot));
						}
						if(use_sIlv) {
							const plot = plots[1 + 2 * random_int(0, (plots.length >> 1) - 1)];
							({price_sIlv} = await buy(true, plot));
						}
					});

					// save initial balances for the future comparison:
					// eb: ETH balance; sb: sILV balance
					let sale_sb0, treasury_eb0, treasury_sb0;
					beforeEach(async function() {
						sale_sb0 = await sIlv.balanceOf(land_sale.address);
						treasury_eb0 = await balance.current(to);
						treasury_sb0 = await sIlv.balanceOf(to);
					});

					// now do the withdrawal and test
					let receipt, gas_cost;
					beforeEach(async function() {
						receipt = await withdraw(eth_only, to);
						gas_cost = to_self? await extract_gas_cost(receipt): new BN(0);
					});

					it('"Withdrawn" event is emitted', async function() {
						expectEvent(receipt, "Withdrawn", {
							_by: a0,
							_to: to,
							_eth: use_eth? price_eth: "0",
							_sIlv: use_sIlv && !eth_only? price_sIlv: "0",
						});
					});
					if(use_eth) {
						it("treasury ETH balance increases as expected", async function() {
							expect(await balance.current(to)).to.be.bignumber.that.equals(treasury_eb0.add(price_eth).sub(gas_cost));
						});
						it("sale contract ETH balance decreases to zero", async function() {
							expect(await balance.current(land_sale.address)).to.be.bignumber.that.is.zero;
						});
					}
					else {
						it("treasury ETH balance doesn't change", async function() {
							expect(await balance.current(to)).to.be.bignumber.that.equals(treasury_eb0.sub(gas_cost));
						});
						it("sale contract ETH balance remains zero", async function() {
							expect(await balance.current(land_sale.address)).to.be.bignumber.that.is.zero;
						});
					}
					if(use_sIlv && !eth_only) {
						it("treasury sILV balance increases as expected", async function() {
							expect(await sIlv.balanceOf(to)).to.be.bignumber.that.equals(treasury_sb0.add(price_sIlv));
						});
						it("sale contract sILV balance decreases to zero", async function() {
							expect(await sIlv.balanceOf(land_sale.address)).to.be.bignumber.that.is.zero;
						});
					}
					else {
						it("treasury sILV balance doesn't change", async function() {
							expect(await sIlv.balanceOf(to)).to.be.bignumber.that.equals(treasury_sb0);
						});
						it("sale contract sILV balance doesn't change", async function() {
							expect(await sIlv.balanceOf(land_sale.address)).to.be.bignumber.that.equals(sale_sb0);
						});
					}
				}

				it("throws if `to` address is not set", async function() {
					await buy();
					await expectRevert(withdraw(true, ZERO_ADDRESS), "recipient not set");
				});
				describe("withdrawing ETH only", function() {
					it("throws if there is no ETH, and no sILV on the balance", async function() {
						await expectRevert(withdraw(), "zero balance");
					});
					it("throws if there is no ETH, and some sILV on the balance", async function() {
						await buy(true);
						await expectRevert(withdraw(), "zero balance");
					});
					describe("succeeds if there is some ETH, and no sILV on the balance", function() {
						succeeds(true, false, true);
					});
					describe("succeeds if there is some ETH, and some sILV on the balance", function() {
						succeeds(true, true, true);
					});
					describe("self withdraw succeeds", function() {
						succeeds(true, false, true, true);
					});
				});
				describe("withdrawing ETH and sILV", function() {
					it("throws if there is no ETH, and no sILV on the balance", async function() {
						await expectRevert(withdraw(false), "zero balance");
					});
					describe("succeeds if there is no ETH, and some sILV on the balance", function() {
						succeeds(false, true, false);
					});
					describe("succeeds if there is some ETH, and no sILV on the balance", function() {
						succeeds(true, false, false);
					});
					describe("succeeds if there is some ETH, and some sILV on the balance", function() {
						succeeds(true, true, false);
					});
					describe("self withdraw succeeds", function() {
						succeeds(true, false, true, true);
					});
				});
			});
		});
	});
});
