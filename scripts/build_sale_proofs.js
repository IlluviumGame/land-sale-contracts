/**
 * Builds land plot data Merkle tree from the land data provided and saves the tree
 *
 * Run: npx hardhat run ./build_sale_proofs.js
 * Input: ./data/sale_data_v1.csv
 * Output: ./data/sale_data_v1_proofs.txt
 */

// import CSV import/export
const {
	load_sale_data_csv,
	save_sale_data_proofs,
} = require("./include/sale_data_utils");

// node[0] ./build_sale_proofs.js[1] ./data/sale_data_v1.csv[2] ./data/sale_data_v1_proofs.txt[3]
const module_path = process.argv[1];
// check input parameters are as we expect them to be
assert(
	(module_path.startsWith("/") || module_path.startsWith("./")) && module_path.endsWith(".js"),
	"wrong module path, use ./generate_sale_proofs.js for example"
);
// extract module dir (this is a js file name and path we run)
const module_dir = module_path.substring(0, module_path.lastIndexOf("/") + 1);
// derive the data file(s) path(s)
const input_file = process.argv && process.argv.length > 2? process.argv[2]: module_dir + "data/sale_data_v1.csv";
const output_file = process.argv && process.argv.length > 3? process.argv[3]: module_dir + "data/sale_data_v1_proofs.txt";

// read land data data
const plots = load_sale_data_csv(input_file);
console.log("successfully loaded %o land plots; generating Merkle tree", plots.length);

// save the Merkle tree root and proofs
save_sale_data_proofs(plots, output_file);

console.log("Merkle tree generation complete (%o plots)", plots.length);
