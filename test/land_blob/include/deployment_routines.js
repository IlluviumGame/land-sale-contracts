// Both Truffle anf Hardhat with Truffle make an instance of web3 available in the global scope

/**
 * Deploys the Land Blob Library (Mock)
 *
 * @param a0 deployer address, optional
 * @return LandBlobLib instance delivered as LandBlobLibMock
 */
async function land_blob_lib_deploy(a0) {
	// smart contracts required
	const LandBlobLib = artifacts.require("./LandBlobLibMock");

	// deploy and return the reference to instance
	return a0? await LandBlobLib.new({from: a0}): await LandBlobLib.new();
}

// export public deployment API
module.exports = {
	land_blob_lib_deploy,
};
