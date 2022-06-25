// Both Truffle anf Hardhat with Truffle make an instance of web3 available in the global scope

/**
 * Deploys the Land Library (Mock)
 *
 * @param a0 deployer address, optional
 * @return LandLib instance delivered as LandLibMock
 */
async function land_lib_deploy(a0) {
	// smart contracts required
	const LandLib = artifacts.require("./LandLibMock");

	// deploy and return the reference to instance
	return a0? await LandLib.new({from: a0}): await LandLib.new();
}

// export public deployment API
module.exports = {
	land_lib_deploy,
};
