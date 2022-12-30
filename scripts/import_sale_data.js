/**
 * Imports land plot data from the JSON files, saves it in CSV format,
 * builds land plot data Merkle tree from the land data imported, saves the tree
 *
 * Data from the marketing JSON files is excluded from the resulting CSV file
 *
 * land_sale_1 = land_sale_1_english + land_sale_1_marketing + land_sale_1_public + land_sale_1_testing
 *
 * Run: npx hardhat run ./import_sale_data.js
 * Inputs:
 * ./data/land_coordinates_base.json
 * ./data/land_sale_1_english.json
 * ./data/land_sale_1_marketing.json
 * ./data/land_sale_1_public.json
 * ./data/land_sale_1_testing.json
 * Outputs:
 * ./data/land_sale_1_english.csv
 * ./data/land_sale_1_marketing.csv
 * ./data/land_sale_1_public.csv
 * ./data/land_sale_1_public_proofs.txt
 * ./data/land_sale_1_testing.csv
 * ./data/land_sale_1_all.csv
 * ./data/land_sale_1_all_proofs.txt
 */

// built in node.js libraries in use
const fs = require('fs')
const path = require('path')

// import CSV import/export
const {
	save_sale_data_csv,
	load_sale_data_csv,
	save_sale_data_proofs,
} = require("./include/sale_data_utils");

// define file names
const global_metadata_path = path.join(__dirname, "data/land_coordinates_base.json");

const dutch_in_path = path.join(__dirname, "data/land_sale_1_public.json");
const english_in_path = path.join(__dirname, "data/land_sale_1_english.json");
const marketing_in_path = path.join(__dirname, "data/land_sale_1_marketing.json");
const testing_in_path = path.join(__dirname, "data/land_sale_1_testing.json");

const dutch_out_path = path.join(__dirname, "data/land_sale_1_public.csv");
const english_out_path = path.join(__dirname, "data/land_sale_1_english.csv");
const marketing_out_path = path.join(__dirname, "data/land_sale_1_marketing.csv");
const testing_out_path = path.join(__dirname, "data/land_sale_1_testing.csv");
const all_out_path = path.join(__dirname, "data/land_sale_1_all.csv");

const public_merkle_path = path.join(__dirname, "data/land_sale_1_proofs.txt");
const all_merkle_path = path.join(__dirname, "data/land_sale_1_all_proofs.txt");

// JSON files containing land plots metadata
console.log("reading JSON data from");
console.log("global metadata: %o", global_metadata_path);
console.log("english auction T5: %o", english_in_path);
console.log("marketing plots: %o", marketing_in_path);
console.log("dutch auction T1-4: %o", dutch_in_path);
console.log("testing plots: %o", testing_in_path);

const global_metadata = JSON.parse(fs.readFileSync(global_metadata_path));
const dutch_data = JSON.parse(fs.readFileSync(dutch_in_path));
const english_data =  JSON.parse(fs.readFileSync(english_in_path));
const marketing_data = JSON.parse(fs.readFileSync(marketing_in_path));
const testing_data = JSON.parse(fs.readFileSync(testing_in_path));
console.log("%o entries read (global metadata)", Object.keys(global_metadata).length);

// combine land_sale_1 = land_sale_1_english + land_sale_1_marketing + land_sale_1_public + land_sale_1_testing
const all_data = dutch_data["1"].concat(english_data["1"], marketing_data["1"], testing_data["1"]);

// derive arrays of land plots enriched with metadata from the JSON files
const dutch_plots = enrich(dutch_data["1"], global_metadata).filter(plot => Number.isInteger(plot.sequenceId));
const english_plots = enrich(english_data["1"], global_metadata);
const marketing_plots = enrich(marketing_data["1"], global_metadata);
const testing_plots = enrich(testing_data["1"], global_metadata);
const all_plots = enrich(all_data, global_metadata);
console.log("%o dutch plots read", dutch_plots.length);
console.log("%o english plots read", english_plots.length);
console.log("%o marketing plots read", marketing_plots.length);
console.log("%o testing plots read", testing_plots.length);
console.log("%o total plots read", all_plots.length);

// validate imported data integrity
// 1) find duplicates coordinates (x, y)
assert(
	!all_plots.some(element => all_plots.filter(plot => plot.x === element.x && plot.y === element.y).length !== 1),
	"duplicate coordinates (x, y) were found!"
);
// 2) find duplicate token IDs
assert(
	!all_plots.some(element => all_plots.filter(plot => plot.tokenId === element.tokenId).length !== 1),
	"duplicate token IDs were found!"
);
// 3) verify all the sequences are in range [0, 71) and exist
const sequences = 71;
assert.equal(Math.min(...dutch_plots.map(plot => plot.sequenceId)), 0, "seq ID lower bound violation!");
assert.equal(Math.max(...dutch_plots.map(plot => plot.sequenceId)), sequences - 1, "seq ID upper bound violation!");
[...Array(sequences).keys()].forEach(function(seq_id) {
	assert(dutch_plots.some(plot => plot.sequenceId === seq_id), `seq ID ${seq_id} not found!`);
});

// 4) verify land_sale_1 = land_sale_1_english + land_sale_1_marketing + land_sale_1_public + land_sale_1_testing
assert.equal(
	all_plots.length,
	dutch_plots.length + english_plots.length + marketing_plots.length + testing_plots.length,
	"some marketing plots were not removed"
);
console.log(
	"%o = %o + %o + %o + %o",
	all_plots.length,
	dutch_plots.length,
	english_plots.length,
	marketing_plots.length,
	testing_plots.length
);

// sort by sequence ID
dutch_plots.sort(land_comparator);
english_plots.sort(land_comparator);
marketing_plots.sort(land_comparator);
testing_plots.sort(land_comparator);
all_plots.sort(land_comparator);

// save land data in CSV format
console.log("exporting dutch auction plots CSV into %o", dutch_out_path);
save_sale_data_csv(dutch_plots, dutch_out_path);
console.log("exporting english auction CSV into %o", english_out_path);
save_sale_data_csv(english_plots, english_out_path);
console.log("exporting marketing plots CSV into %o", marketing_out_path);
save_sale_data_csv(marketing_plots, marketing_out_path);
console.log("exporting testing plots CSV into %o", testing_out_path);
save_sale_data_csv(testing_plots, testing_out_path);
console.log("exporting all plots CSV into %o", all_out_path);
save_sale_data_csv(all_plots, all_out_path);
// save the Merkle tree root and proofs
console.log("generating Merkle tree for dutch auction plots and saving it into %o", public_merkle_path);
save_sale_data_proofs(dutch_plots, public_merkle_path);
console.log("generating Merkle tree for all plots and saving it into %o", all_merkle_path);
save_sale_data_proofs(all_plots, all_merkle_path);

console.log("CSV and Merkle tree data successfully saved");

/*
token_id,sequence_id,region_id,x,y,tier_id,size
1,0,7,0,0,4,59
2,60,1,1,0,3,79
*/

/**
 * Enriches the data with metadata, eventually delivering deliverable
 * @param data
 * @param metadata
 * @return {*}
 */
function enrich(data, metadata) {
	return data.map(land => {
		const land_data = metadata[land.LandID];
		return {
			tokenId: parseInt(land["LandID"]),
			sequenceId: parseInt(land["SequenceID"]),
			regionId: parseInt(land_data["Region"]),
			x: parseInt(land_data["X"]),
			y: parseInt(land_data["Y"]),
			tierId: parseInt(land_data["Tier"]),
			size: parseInt(land_data["Size"]),
		};
	});
}

function land_comparator(plot1, plot2) {
	const seq1 = isNaN(plot1.sequenceId)? 0: plot1.sequenceId;
	const seq2 = isNaN(plot2.sequenceId)? 0: plot2.sequenceId;
	const delta = seq1 - seq2;

	return delta? delta: plot1.tokenId - plot2.tokenId;
}
