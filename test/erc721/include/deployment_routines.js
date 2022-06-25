// ACL token features and roles
const {FEATURE_ALL} = require("../../../scripts/include/features_roles");

// token constants
const {
	NAME,
	SYMBOL,
} = require("./erc721_constants");

/**
 * Deploys ERC721 token with all the features enabled
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param name token name, ERC-721 compatible descriptive name
 * @param symbol token symbol, ERC-721 compatible abbreviated name
 * @returns ERC721 instance
 */
async function erc721_deploy(a0, name = NAME, symbol = SYMBOL) {
	// deploy the token
	const token = await erc721_deploy_restricted(a0, name, symbol);

	// enable all permissions on the token
	await token.updateFeatures(FEATURE_ALL, {from: a0});

	// return the reference
	return token;
}

/**
 * Deploys ERC721 token with no features enabled
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param name token name, ERC-721 compatible descriptive name
 * @param symbol token symbol, ERC-721 compatible abbreviated name
 * @returns ERC721 instance
 */
async function erc721_deploy_restricted(a0, name = NAME, symbol = SYMBOL) {
	// smart contracts required
	const ERC721Contract = artifacts.require("./ERC721Mock");

	// deploy ERC721 and return the reference
	return await ERC721Contract.new(name, symbol, {from: a0});
}

/**
 * Deploys Upgradeable ERC721 token with all the features enabled
 *
 * @param a0 smart contract owner, super admin
 * @param name ERC721 token name
 * @param symbol ERC721 token symbol
 * @returns UpgradeableERC721 instance
 */
async function upgradeable_erc721_deploy(a0, name = NAME, symbol = SYMBOL) {
	// deploy the token
	const token = await upgradeable_erc721_deploy_restricted(a0, name, symbol);

	// enable all permissions on the token
	await token.updateFeatures(FEATURE_ALL, {from: a0});

	// return the reference
	return token;
}

/**
 * Deploys Upgradeable ERC721 token with no features enabled
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param name token name, ERC-721 compatible descriptive name
 * @param symbol token symbol, ERC-721 compatible abbreviated name
 * @returns UpgradeableERC721 instance
 */
async function upgradeable_erc721_deploy_restricted(a0, name = NAME, symbol = SYMBOL) {
	// smart contracts required
	const ERC721Contract = artifacts.require("./UpgradeableERC721Mock");
	const Proxy = artifacts.require("./ERC1967Proxy");

	// deploy an instance without a proxy
	const instance = await ERC721Contract.new({from: a0});

	// prepare the initialization call bytes
	const init_data = instance.contract.methods.postConstruct(name, symbol).encodeABI();

	// deploy proxy, and initialize the implementation (inline)
	const proxy = await Proxy.new(instance.address, init_data, {from: a0});

	// wrap the proxy into the implementation ABI and return
	return await ERC721Contract.at(proxy.address);
}

/**
 * Upgrades Upgradeable ERC721 token with no features enabled
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param proxy previously deployed instance (as a proxy)
 * @returns UpgradeableERC721 instance
 */
async function upgradeable_erc721_upgrade_restricted(a0, proxy) {
	// smart contracts required
	const ERC721Contract = artifacts.require("./UpgradeableERC721Mock2");

	// deploy new instance without a proxy
	const instance = await ERC721Contract.new({from: a0});

	// prepare the initialization call bytes
	const init_data = proxy.contract.methods.postConstruct(name, symbol).encodeABI();

	// and upgrade the implementation
	await proxy.upgradeTo/*AndCall*/(instance.address/*, init_data*/, {from: a0});

	// return the proxy itself
	return proxy;
}

/**
 * Deploys Zeppelin ERC721 Receiver Mock
 *
 * @param a0 deployer, smart contract deployer, owner, super admin
 * @param retval return value receiver returns when receives the token,
 *       if error is set to "None"
 * @param error one of 0 (None), 1 (RevertWithMessage), 2 (RevertWithoutMessage), 3 (Panic)
 * @return ERC721Receiver instance
 */
async function erc721_receiver_deploy(a0, retval = "0x150b7a02", error = 0) {
	// smart contracts required
	const ERC721ReceiverMock = artifacts.require("./ERC721ReceiverMock");

	// deploy ERC721 receiver and return the reference
	return await ERC721ReceiverMock.new(retval, error, {from: a0});
}

// export public deployment API
module.exports = {
	erc721_deploy,
	erc721_deploy_restricted,
	upgradeable_erc721_deploy,
	upgradeable_erc721_deploy_restricted,
	upgradeable_erc721_upgrade_restricted,
	erc721_receiver_deploy,
	NAME,
	SYMBOL,
};
