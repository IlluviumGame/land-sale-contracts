// import useful functions from tests
const {
	generate_tree,
} = require("../../test/protocol/include/merkle_tree_utils");

// we use fs to read/write CSV
const fs = require("fs");

// PlotData (sale data) structure header
const SALE_DATA_CSV_HEADER = "token_id,sequence_id,region_id,x,y,tier_id,size";

/**
 * Saves the PlotData (sale data) array into the file in CSV format
 * @param plots array of PlotData (sale data)
 * @param file_path file to save CSV into
 */
function save_sale_data_csv(plots, file_path = "./sale_data.csv") {
	// csv header is already prepared: SALE_DATA_CSV_HEADER
	// prepare csv body
	// TODO: validate internal plots structure (hello, TypeScript!)
	const csv_body = plots.map(plot => Object.values(plot).map(n => isNaN(n)? "": n).join(","));

	// prepare the resulting csv text
	const csv_text = [SALE_DATA_CSV_HEADER].concat(...csv_body).join("\n");

	// write csv text data into the file
	fs.writeFileSync(file_path, csv_text);
}

/**
 * Loads the PlotData (sale data) array from the CSV file
 * @param file_path file to load CSV from
 * @return array of PlotData (sale data)
 */
function load_sale_data_csv(file_path = "./sale_data.csv") {
	// read csv text data from the file
	const csv_text = fs.readFileSync(file_path, {encoding: "utf8"});

	// parse csv text data rows
	const csv_rows = csv_text.split(/[\r\n]+/);

	// extract csv header and validate it is as expected
	const csv_header = csv_rows[0];
	assert.equal(csv_header, SALE_DATA_CSV_HEADER, "malformed CSV header");

	// extract csv body, map it into plots array, and return
	return csv_rows.slice(1)
		.filter(row => row.length) // remove empty rows
		.map(row => row.split(",") // convert comma separated text into array (metadata)
			.map(s => parseInt(s))) // of integers (numbers)
		.map(metadata => Object.assign({}, { // map metadata into plot
			tokenId: metadata[0],
			sequenceId: metadata[1],
			regionId: metadata[2],
			x: metadata[3],
			y: metadata[4],
			tierId: metadata[5],
			size: metadata[6],
		}));
}

/**
 * Generates complete Merkle tree structure for the PlotData array given,
 * and saves Merkle root (line 0) and Merkle proofs (lines 1+) into the file
 * @param plots plots array of PlotData (sale data)
 * @param file_path file to save Merkle tree data into
 */
function save_sale_data_proofs(plots, file_path = "./sale_data_proofs.txt") {
	// parse the input, generate Merkle tree
	const {tree, root, leaves} = generate_tree(plots);

	// generate the proofs required
	const proofs = leaves.map(leaf => tree.getHexProof(leaf).join(","));

	// concatenate Merkle root with all the proofs in a single text
	const output_text = [root].concat(...proofs).join("\n");

	// write output text data into the file
	fs.writeFileSync(file_path, output_text);
}

// export public module API
module.exports = {
	save_sale_data_csv,
	load_sale_data_csv,
	save_sale_data_proofs,
}
