/**
 * Generates random land plot data and Merkle tree and saves it
 *
 * Run: npx hardhat run ./generate_sale_data.js
 * Outputs:
 * ./data/test/sale_data_n.csv
 * ./data/test/sale_data_n_proofs.txt
 * where n ∈ (2, 20, 200, 2000, 20000)
 */

// import land generator
const {
	generate_land,
} = require("../test/protocol/include/land_data_utils");

// import CSV import/export
const {
	save_sale_data_csv,
	load_sale_data_csv,
	save_sale_data_proofs,
} = require("./include/sale_data_utils");

// node[0] ./generate_sale_data.js[1] ./data/test/sale_data_n.csv[2] ./data/sale_data_n_proofs.txt[3]
const module_path = process.argv[1];
// check input parameters are as we expect them to be
assert(
	(module_path.startsWith("/") || module_path.startsWith("./")) && module_path.endsWith(".js"),
	"wrong module path, use ./generate_sale_proofs.js for example"
);
// extract module dir (this is a js file name and path we run)
const module_dir = module_path.substring(0, module_path.lastIndexOf("/") + 1);


// define sale buckets (number of items on sale) to generate
const buckets = [2, 20, 200, 2_000, 20_000];

// generate the data and save it into the files
buckets.forEach((bucket, i) => {
	if(bucket > 8_000) {
		console.log("generating bucket %o of %o (size %o)", i + 1, buckets.length, bucket);
	}

	// generate the data and save it
	const {plots} = generate_land(bucket);
	save_sale_data_csv(plots, module_dir + `data/test/sale_data_${bucket}.csv`);

	// verify saved correctly
	const saved_plots = load_sale_data_csv(module_dir + `data/test/sale_data_${bucket}.csv`);
	assert.deepEqual(saved_plots, plots, "saved data doesn't match generated!");

	// save the Merkle tree root and proofs
	save_sale_data_proofs(plots, module_dir + `data/test/sale_data_${bucket}_proofs.txt`);

	console.log("bucket %o of %o (size %o) generation complete", i + 1, buckets.length, bucket);
});
