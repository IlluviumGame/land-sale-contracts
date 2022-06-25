// common module functions

// BN utils
const {
	toBN,
	print_amt,
} = require("../../include/bn_utils");

/**
 * Prints the accounts info: address, nonce, ETH balance, optionally sILV balance,
 * returns arrays of nonces, ETH balances, optionally sILV balances
 *
 * @param accounts an array of accounts to print info for
 * @param sILV, optional, sILV web3 contract instance
 * @return {Promise<{nonces: Number[], balances: BN[], sILV_balances: BN[]}>}
 */
async function print_acc_info(accounts, sILV) {
	const start_time = performance.now();

	const txs = [];
	for(let i = 0; i < accounts.length; i++) {
		txs.push(web3.eth.getTransactionCount(accounts[i]));
		txs.push(web3.eth.getBalance(accounts[i]));
		if(sILV) {
			txs.push(sILV.methods.balanceOf(accounts[i]).call());
		}
	}
	const tx_results = await Promise.all(txs);
	const d = sILV? 3: 2;
	const nonces = tx_results.filter((_, i) => i % d === 0);
	const balances = tx_results.filter((_, i) => i % d === 1).map(v => toBN(v));
	const sILV_balances = sILV? tx_results.filter((_, i) => i % d === 2).map(v => toBN(v)) : undefined;

	const table_data = [];
	for(let i = 0; i < accounts.length; i++) {
		const table_record = {
			"account": accounts[i],
			"nonce": nonces[i],
			"ETH balance": print_amt(balances[i]),
		};
		if(sILV) {
			table_record["sILV balance"] = print_amt(sILV_balances[i]);
		}
		table_data.push(table_record);
	}
	console.table(table_data);

	const end_time = performance.now();
	console.log("%o accounts info fetched in %oms", accounts.length, end_time - start_time);

	return {nonces, balances, sILV_balances};
}

// export public module API
module.exports = {
	print_acc_info,
}
