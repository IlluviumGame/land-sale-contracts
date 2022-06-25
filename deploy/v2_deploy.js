// deploy: npx hardhat deploy --network rinkeby --tags v2_deploy
// verify: npx hardhat etherscan-verify --network rinkeby

// script is built for hardhat-deploy plugin:
// A Hardhat Plugin For Replicable Deployments And Easy Testing
// https://www.npmjs.com/package/hardhat-deploy

// BN utils
const {
	toBN,
	print_amt,
} = require("../scripts/include/bn_utils");

// deployment utils (contract state printers)
const {
	print_nft_acl_details,
	print_land_sale_acl_details,
} = require("../scripts/deployment_utils");

// to be picked up and executed by hardhat-deploy plugin
module.exports = async function({deployments, getChainId, getNamedAccounts, getUnnamedAccounts}) {
	// print some useful info on the account we're using for the deployment
	const chainId = await getChainId();
	const [A0] = await web3.eth.getAccounts();
	let nonce = await web3.eth.getTransactionCount(A0);
	let balance = await web3.eth.getBalance(A0);

	// print initial debug information
	console.log("network %o %o", chainId, network.name);
	console.log("service account %o, nonce: %o, balance: %o ETH", A0, nonce, print_amt(balance));

	// deploy Land ERC721 implementation v2 if required
	await deployments.deploy("LandERC721_v2", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "LandERC721",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		// args: [],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land ERC721 implementation v2 deployment details
	const land_nft_v2_deployment = await deployments.get("LandERC721_v2");
	const land_nft_v2_contract = new web3.eth.Contract(land_nft_v2_deployment.abi, land_nft_v2_deployment.address);
	// get Land ERC721 proxy deployment details
	const land_nft_proxy_deployment = await deployments.get("LandERC721_Proxy");
	// print Land ERC721 proxy deployment details
	await print_nft_acl_details(A0, land_nft_v2_deployment.abi, land_nft_proxy_deployment.address);

	// prepare the upgradeTo call bytes
	const land_nft_proxy_upgrade_data = land_nft_v2_contract.methods.upgradeTo(land_nft_v2_deployment.address).encodeABI();

	// update the implementation address in the proxy
	// TODO: do not update if already updated
	const land_nft_receipt = await deployments.rawTx({
		from: A0,
		to: land_nft_proxy_deployment.address,
		data: land_nft_proxy_upgrade_data, // upgradeTo(land_nft_v2_deployment.address)
	});
	console.log("LandERC721_Proxy.upgradeTo(%o): %o", land_nft_v2_deployment.address, land_nft_receipt.transactionHash);

	// deploy Land Sale implementation v2 if required
	await deployments.deploy("LandSale_v2", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "LandSale",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		// args: [],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land Sale implementation v2 deployment details
	const land_sale_v2_deployment = await deployments.get("LandSale_v2");
	const land_sale_v2_contract = new web3.eth.Contract(land_sale_v2_deployment.abi, land_sale_v2_deployment.address);
	// get Land Sale proxy deployment details
	const land_sale_proxy_deployment = await deployments.get("LandSale_Proxy");
	// print Land Sale proxy deployment details
	await print_land_sale_acl_details(A0, land_sale_v2_deployment.abi, land_sale_proxy_deployment.address);

	// prepare the upgradeTo call bytes
	const land_sale_proxy_upgrade_data = land_sale_v2_contract.methods.upgradeTo(land_sale_v2_deployment.address).encodeABI();

	// update the implementation address in the proxy
	// TODO: do not update if already updated
	const land_sale_receipt = await deployments.rawTx({
		from: A0,
		to: land_sale_proxy_deployment.address,
		data: land_sale_proxy_upgrade_data, // upgradeTo(land_sale_v2_deployment.address)
	});
	console.log("LandSale_Proxy.upgradeTo(%o): %o", land_sale_v2_deployment.address, land_sale_receipt.transactionHash);
};

// Tags represent what the deployment script acts on. In general, it will be a single string value,
// the name of the contract it deploys or modifies.
// Then if another deploy script has such tag as a dependency, then when the latter deploy script has a specific tag
// and that tag is requested, the dependency will be executed first.
// https://www.npmjs.com/package/hardhat-deploy#deploy-scripts-tags-and-dependencies
module.exports.tags = ["v2_deploy", "deploy", "v2"];
// module.exports.dependencies = ["v1_deploy"];
