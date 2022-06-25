// import Merkle tree related stuff
const {MerkleTree} = require("merkletreejs");
const keccak256 = require("keccak256");

// TODO: read it from LandSale.json struct LandSale.PlotData
// struct LandSale.PlotData
const PlotData_ABI = [
	{
		"internalType": "uint32",
		"name": "tokenId",
		"type": "uint32"
	},
	{
		"internalType": "uint32",
		"name": "sequenceId",
		"type": "uint32"
	},
	{
		"internalType": "uint8",
		"name": "regionId",
		"type": "uint8"
	},
	{
		"internalType": "uint16",
		"name": "x",
		"type": "uint16"
	},
	{
		"internalType": "uint16",
		"name": "y",
		"type": "uint16"
	},
	{
		"internalType": "uint8",
		"name": "tierId",
		"type": "uint8"
	},
	{
		"internalType": "uint16",
		"name": "size",
		"type": "uint16"
	}
];

/**
 * Generates complete Merkle tree structure for the PlotData array given
 * @param plots PlotData array
 * @return {{leaves: *, root: string, tree: MerkleTree}}
 */
function generate_tree(plots) {
	// generate an array of the leaves for a Merkle tree, the tree itself, and its root
	const leaves = plots.map(plot => plot_to_leaf(plot));
	const tree = new MerkleTree(leaves, keccak256, {hashLeaves: false, sortPairs: true});
	const root = tree.getHexRoot();

	// return the complete Merkle tree structure
	return {tree, root, leaves};
}

/**
 * Calculates keccak256(abi.encodePacked(...)) for the struct PlotData from LandSale.sol
 *
 * @param plot PlotData object
 * @return {Buffer} keccak256 hash of tightly packed PlotData fields
 */
function plot_to_leaf(plot) {
	// convert the input land plot object into the params array to feed the soliditySha3
	const params = Object.entries(plot).map(kv => Object.assign({}, {
		t: PlotData_ABI.find(e => e.name == kv[0]).type,
		v: kv[1],
	}));

	// feed the soliditySha3 to get a hex-encoded keccak256
	const hash = web3.utils.soliditySha3(...params);
	// return as Buffer
	return MerkleTree.bufferify(hash);
}

// export public utils API
module.exports = {
	generate_tree,
	plot_to_leaf,
}
