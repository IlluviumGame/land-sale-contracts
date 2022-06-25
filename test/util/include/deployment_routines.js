/**
 * Deploys Access Control Mock
 *
 * @param a0 smart contract deployer, owner, super admin
 * @returns AccessControl instance
 */
async function acl_mock_deploy(a0) {
	// smart contracts required
	const ACL = artifacts.require("./AccessControlMock");

	// deploy ACL and return the reference
	return await ACL.new({from: a0});
}

/**
 * Deploys Upgradeable Access Control Mock
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param version version number to deploy, optional
 * @returns UpgradeableAccessControl instance
 */
async function upgradeable_acl_mock_deploy(a0, version) {
	// smart contracts required
	const ACL = artifacts.require("./UpgradeableAccessControlMock" + (version || ""));

	// deploy the upgradeable ACL and return
	return await ACL.new({from: a0});
}

/**
 * Deploys Upgradeable Access Control Mock via ERC1967Proxy
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param version version number to deploy, optional
 * @returns ERC1967Proxy –> UpgradeableAccessControl instance
 */
async function upgradeable_acl_mock_deploy_via_proxy(a0, version) {
	// smart contracts required
	const ACL = artifacts.require("./UpgradeableAccessControlMock" + (version || ""));
	const Proxy = artifacts.require("./ERC1967Proxy");

	// deploy the upgradeable ACL
	const instance = await ACL.new({from: a0});

	// prepare the initialization call bytes
	const init_data = instance.contract.methods.postConstruct().encodeABI();

	// deploy proxy, and initialize the impl (inline)
	const proxy = await Proxy.new(instance.address, init_data, {from: a0});

	// wrap the proxy into the impl ABI and return
	return await ACL.at(proxy.address);
}

// export public deployment API
module.exports = {
	acl_mock_deploy,
	upgradeable_acl_mock_deploy,
	upgradeable_acl_mock_deploy_via_proxy,
}
