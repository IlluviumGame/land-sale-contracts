// ACL token features and roles
const {FEATURE_ALL} = require("../../../scripts/include/features_roles");

// token constants
const {
	NAME,
	SYMBOL,
	DECIMALS,
	TOTAL_SUPPLY: S0,
} = require("./erc20_constants");

/**
 * Deploys ERC20 token with all the features enabled
 *
 * @param a0 smart contract owner, super admin
 * @param H0 initial token holder address
 * @returns ERC20 instance
 */
async function erc20_deploy(a0, H0 = a0) {
	// deploy the token
	const token = await erc20_deploy_restricted(a0, H0);

	// enable all permissions on the token
	await token.updateFeatures(FEATURE_ALL, {from: a0});

	// return the reference
	return token;
}

/**
 * Deploys ERC20 token with no features enabled
 *
 * @param a0 smart contract owner, super admin
 * @param H0 initial token holder address
 * @returns ERC20 instance
 */
async function erc20_deploy_restricted(a0, H0 = a0) {
	// smart contracts required
	const ERC20Contract = artifacts.require("./ERC20Mock");

	// deploy the token
	const token = await ERC20Contract.new(NAME, SYMBOL, {from: a0});

	// mint the initial supply
	await token.mint(H0, S0, {from: a0});

	// return the reference
	return token;
}

/**
 * Deploys USDT token, used to test non ERC20 compliant transfer function
 * (doesn't return any value on successful operation)
 *
 * @param a0 smart contract owner
 * @param H0 initial token holder address
 * @returns USDT ERC20 instance
 */
async function usdt_deploy(a0, H0 = a0) {
	// smart contracts required
	const USDTContract = artifacts.require("./TetherToken");

	// deploy the token
	const token = await USDTContract.new(S0, "Tether USD", "USDT", 6, {from: a0});

	// move the initial supply if required
	if(H0 !== a0) {
		await token.transfer(H0, S0, {from: a0});
	}

	// return the reference
	return token;
}

// export public deployment API
module.exports = {
	erc20_deploy,
	erc20_deploy_restricted,
	usdt_deploy,
	NAME,
	SYMBOL,
	DECIMALS,
	S0,
};
