/**
 * Prepares the accounts derived from the mnemonic
 * to have enough ETH balance to send transactions (pay for gas)
 * Feeds accounts [1, n] from the account 0
 */

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {web3, Web3, config, network} = hre;
const {toWei} = web3.utils;

// standard node.js modules in use
const path = require("path");

// BN utils
const {
	toBN,
	sum_bn,
	print_amt,
} = require("../include/bn_utils");

// block utils
const {
	extract_gas_cost,
} = require("../../test/include/block_utils");

// common utils
const {
	print_acc_info,
} = require("./include/common");

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
	let accounts = await web3.eth.getAccounts();
	const [A0] = accounts;
	const nonce = await web3.eth.getTransactionCount(A0);
	const balance = toBN(await web3.eth.getBalance(A0));

	// print initial debug information
	console.log("network %o %o", chainId, network.name);
	console.log("service account %o, nonce: %o, balance: %o ETH", A0, nonce, print_amt(balance));

	// load ABIs in use
	const {abi: sILV_abi} = require(path.join(__dirname, "../../artifacts/contracts/interfaces/ERC20Spec.sol/ERC20.json"));

	// deployed addresses
	const sILV_address = config.namedAccounts.sIlv_address[network.name];

	// connect to the contracts
	const sILV = new web3.eth.Contract(sILV_abi, sILV_address);

	// detect service account sILV balance
	let sILV_balance = toBN(await sILV.methods.balanceOf(A0).call());
	console.log("service account sILV (%o) balance: %o sILV", sILV_address, print_amt(sILV_balance));

	// print all the accounts info
	const {sILV_balances} = await print_acc_info(accounts, sILV);

	// TODO: extract arguments into config or command line args
	const target_balance = toWei(toBN(1000), "ether")
	const min_balance = target_balance.divn(2);
	const min_source_balance = toWei(toBN(1_000_000), "ether");

	// calculate amounts to feed the accounts [1, n] from account 0
	const recipients = [];
	const values = [];
	for(let i = 1; i < accounts.length; i++) {
		if(sILV_balance.lt(min_source_balance.add(target_balance))) {
			console.log("default account balance depleted: %o", print_amt(sILV_balance));
			break;
		}
		if(sILV_balances[i].lt(min_balance)) {
			const value = target_balance.sub(sILV_balances[i]);
			recipients.push(accounts[i]);
			values.push(value);
			console.log("account %o %o requires %o sILV", i, accounts[i], print_amt(value));
			sILV_balance = sILV_balance.sub(value);
		}
	}
	if(recipients.length > 0) {
		const batch_size = 200;
		for(let i = 0; i < recipients.length; i += batch_size) {
			const recipients_slice = recipients.slice(i, i + batch_size);
			const values_slice = values.slice(i, i + batch_size);

			console.log("use disperse app to feed the accounts (%o):", Math.floor(i / batch_size));
			console.log("token: %o", sILV_address);
			console.log("recipients: %o", recipients_slice.join(","));
			console.log("values: %o", values_slice.map(a => a.toString()).join(","));
		}
	}
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
