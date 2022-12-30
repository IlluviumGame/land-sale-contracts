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
	const plots_on_sale = await print_plots_on_sale(land_sale, filter_plots_on_sale(
		plots,
		ls_params,
		[3, 4],
		true,
	));
	log.info("%o plots are available currently on sale", plots_on_sale.length);

	// buy the plots
	await buy_plots(sILV, land_sale, ls_params, plots_on_sale, tree, accounts.slice(1));
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

function filter_plots_on_sale(plots, ls_params, tiers, cheap) {
	// derive the sequences on sale
	// derive the sequences which are currently available on sale
	const {seqFrom, seqTo} = get_current_seq_bounds(ls_params);

	// return the plots,
	return plots
		// filtering out the plots not available on sale,
		.filter(p => p.sequenceId >= seqFrom && p.sequenceId < seqTo - cheap? 1: 0)
		// filtering out the tiers not mentioned in `tiers`
		.filter(p => !tiers || !tiers.length || tiers.indexOf(p.tierId) >= 0);
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

async function buy_plots(sILV, land_sale, ls_params, plots, tree, accounts) {
	if(plots.length === 0) {
		log.info("no plots to buy, skipping");
		return [];
	}

	const start_time = performance.now();

	log.info("buying %o plots... please wait...", plots.length);
	const txs = plots.map((p, i) => {
		return land_sale.methods.buyL2(plot_to_metadata(parse_plot_data(p)), tree.getHexProof(p.leaf)).send({
			from: accounts[i],
			value: use_sIlv?0: ls_params.startPrices[p.tierId], // TODO: calculate the price
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
