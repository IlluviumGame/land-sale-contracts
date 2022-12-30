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
	let balance = toBN(await web3.eth.getBalance(A0));

	// print initial debug information
	console.log("network %o %o", chainId, network.name);
	console.log("service account %o, nonce: %o, balance: %o ETH", A0, nonce, print_amt(balance));

	// print all the accounts info
	const {balances} = await print_acc_info(accounts);

	// TODO: extract arguments into config or command line args
	const target_balance = toWei(toBN(5), "ether")
	const min_balance = target_balance.divn(2);
	const min_source_balance = toWei(toBN(350), "ether");

	// calculate amounts to feed the accounts [1, n] from account 0
	const recipients = [];
	const values = [];
	for(let i = 1; i < accounts.length; i++) {
		if(balance.lt(min_source_balance.add(target_balance))) {
			console.log("default account balance depleted: %o", print_amt(balance));
			break;
		}
		if(balances[i].lt(min_balance)) {
			const value = target_balance.sub(balances[i]);
			recipients.push(accounts[i]);
			values.push(value);
			console.log("account %o %o requires %o ETH", i, accounts[i], print_amt(value));
/*
			const receipt = await web3.eth.sendTransaction({
				from: A0,
				to: accounts[i],
				value,
			});
			const tx_cost = await extract_gas_cost(receipt);
*/
			balance = balance.sub(value)/*.sub(tx_cost)*/;
		}
	}
	if(recipients.length > 0) {
		console.log("use disperse app to feed the accounts:");
		console.log("value: %o ETH", print_amt(sum_bn(values)));
		console.log("recipients: %o", recipients.join(","));
		console.log("values: %o", values.map(a => a.toString()).join(","));
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
