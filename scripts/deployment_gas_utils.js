// get fs to update "gas_costs.json"
const fs = require("fs");

/**
 * Extracts the cumulative transactions gas costs from the transaction receipts specified
 *
 * @param receipts an array of transaction receipts to process
 */
function extract_total_gas_cost_from_receipts(...receipts) {
	// sum up all the gas costs from the receipts supplied
	return receipts.reduce((a, v) => a + parseInt(v.gasUsed || v.receipt.gasUsed), 0);
}

/**
 * Updates total gas cost for a deployment, saves the data into "gas_costs.json", field_name field
 *
 * @param field_name json file field name to save data into
 * @param receipts an array of transaction receipts to process
 */
function update_total_gas_cost(field_name, ...receipts) {
	let file_data;
	try {
		file_data = fs.readFileSync("./gas_costs.json", "utf8");
	}
	catch(e) {
		if(e.code !== 'ENOENT') {
			throw e;
		}
	}
	const gas_costs = file_data? JSON.parse(file_data): {};
	gas_costs[field_name] = extract_total_gas_cost_from_receipts(...receipts);
	fs.writeFileSync("./gas_costs.json", JSON.stringify(gas_costs), "utf8");
}

// export public module API
module.exports = {
	extract_total_gas_cost_from_receipts,
	update_total_gas_cost,
}
