// deploy: npx hardhat deploy --network rinkeby --tags v1_deploy
// verify: npx hardhat etherscan-verify --network rinkeby

// script is built for hardhat-deploy plugin:
// A Hardhat Plugin For Replicable Deployments And Easy Testing
// https://www.npmjs.com/package/hardhat-deploy

// BN utils
const {
	toBN,
	print_amt,
} = require("../scripts/include/bn_utils");

// ERC721 token name and symbol
const {
	NAME,
	SYMBOL,
} = require("../scripts/include/land_nft_constants");

// deployment utils (contract state printers)
const {
	print_nft_acl_details,
	print_sIlv_erc20_details,
	print_chainlink_aggregator_details,
	print_land_sale_price_oracle_details,
	print_land_sale_acl_details,
} = require("../scripts/deployment_utils");

// ACL token features and roles for sILV (if deployment is necessary)
const {
	FEATURE_TRANSFERS,
	FEATURE_TRANSFERS_ON_BEHALF,
} = require("../scripts/include/features_roles");

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

	// deploy Land ERC721 implementation v1 if required
	await deployments.deploy("LandERC721_v1", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "LandERC721",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		// args: [NAME, SYMBOL],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land ERC721 implementation v1 deployment details
	const land_nft_v1_deployment = await deployments.get("LandERC721_v1");
	const land_nft_v1_contract = new web3.eth.Contract(land_nft_v1_deployment.abi, land_nft_v1_deployment.address);

	// prepare the initialization call bytes
	const land_nft_proxy_init_data = land_nft_v1_contract.methods.postConstruct(NAME, SYMBOL).encodeABI();

	// deploy Land ERC721 Proxy
	await deployments.deploy("LandERC721_Proxy", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "ERC1967Proxy",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		args: [land_nft_v1_deployment.address, land_nft_proxy_init_data],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land ERC721 proxy deployment details
	const land_nft_proxy_deployment = await deployments.get("LandERC721_Proxy");
	// print Land ERC721 proxy deployment details
	await print_nft_acl_details(A0, land_nft_v1_deployment.abi, land_nft_proxy_deployment.address);

	// deploy Land Descriptor
	await deployments.deploy("LandDescriptor", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "LandDescriptorImpl",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		// args: [],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land Descriptor implementation deployment details
	const land_descriptor_deployment_address = (await deployments.get("LandDescriptor")).address;
	// Set the descriptor via setLandDescriptor
	const land_nft_proxy_contract = new web3.eth.Contract(land_nft_v1_deployment.abi, land_nft_proxy_deployment.address);

	// update the descriptor address on Land ERC721 proxy
	const set_land_descriptor_data = await land_nft_proxy_contract.methods.setLandDescriptor(
		land_descriptor_deployment_address
	).encodeABI();
	// Set LandDescriptor for LandERC721 proxy
	const receipt = await deployments.rawTx({
		from: A0,
		to: land_nft_proxy_deployment.address,
		data: set_land_descriptor_data, // setLandDescriptor(land_descriptor_deployment_address)
	});
	console.log("LandERC721_Proxy.setLandDescriptor(%o): %o", land_descriptor_deployment_address, receipt.transactionHash);

	// read ILV, sILV, SalePriceOracle addresses from named accounts, deploy mocks if required
	let {ilv_address, sIlv_address, chainlink_aggregator} = await getNamedAccounts();
	// for the test networks we deploy mocks for sILV token and chainlink price feed aggregator
	// (for mainnet these entities are already maintained separately)
	if(chainId > 1) {
		// deploy sILV Mock (if required)
		if(!sIlv_address) {
			await deployments.deploy("sILV_Mock", {
				from: A0,
				contract: "ERC20Mock",
				args: ["sILV", "Escrowed Illuvium"],
				skipIfAlreadyDeployed: true,
				log: true,
			});
			const sIlv_deployment = await deployments.get("sILV_Mock");
			sIlv_address = sIlv_deployment.address;

			// verify TOKEN_UID and set it (if required)
			const expectedUid = "0xac3051b8d4f50966afb632468a4f61483ae6a953b74e387a01ef94316d6b7d62";
			const actualUid = await deployments.read("sILV_Mock", "TOKEN_UID");
			console.log("sILV_Mock.TOKEN_UID: %o", actualUid.toHexString())
			if(expectedUid !== actualUid.toHexString()) {
				const receipt = await deployments.execute(
					"sILV_Mock", // deployment name maps to smart contract name
					{from: A0}, // TxOptions, includes from, to, nonce, value, etc.
					"setUid", // function name to execute
					expectedUid, // function params
				);
				console.log("sILV_Mock.setUid(%o): %o", expectedUid, receipt.transactionHash);
			}

			// transfers and transfers on behalf should be enabled, since LandSale initializer calls it
			const sIlv_features = toBN(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
			const sIlv_contract = new web3.eth.Contract(
				sIlv_deployment.abi,
				sIlv_address
			);
			// verify if transfers and transfers on behalf are enabled if required
			const features = toBN(await sIlv_contract.methods.features().call());
			if(!features.eq(sIlv_features)) {
				const update_features_data = sIlv_contract.methods.updateFeatures(sIlv_features).encodeABI();
				await deployments.rawTx({
					from: A0,
					to: sIlv_address,
					data: update_features_data, // updateFeatures(sIlv_features)
				});
			}
		}
		// deploy Chainlink Aggregator Mock (if required)
		if(!chainlink_aggregator) {
			await deployments.deploy("ChainlinkAggregator_Mock", {
				from: A0,
				contract: "ChainlinkAggregatorV3Mock",
				// args: [],
				skipIfAlreadyDeployed: true,
				log: true,
			});
			chainlink_aggregator = (await deployments.get("ChainlinkAggregator_Mock")).address;
		}
	}
	// make sure the addresses we need are defined now
	assert(sIlv_address, "sILV address is not set for " + network.name);
	assert(chainlink_aggregator, "Chainlink Aggregator address is not defined for " + network.name);

	// print some debugging info about the connected instances
	const sIlv_erc20_artifact = await deployments.getArtifact(
		"@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20"
	);
	await print_sIlv_erc20_details(A0, sIlv_erc20_artifact.abi, sIlv_address);
	const chainlink_aggregator_artifact = await deployments.getArtifact(
		"@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface"
	);
	await print_chainlink_aggregator_details(A0, chainlink_aggregator_artifact.abi, chainlink_aggregator);

	// deploy Land Sale Price Oracle implementation v1 if required
	await deployments.deploy("LandSalePriceOracle_v1", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "LandSalePriceOracleV1",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		// args: [NAME, SYMBOL],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land Sale Price Oracle implementation v1 deployment details
	const land_sale_price_oracle_v1_deployment = await deployments.get("LandSalePriceOracle_v1");
	const land_sale_price_oracle_v1_contract = new web3.eth.Contract(
		land_sale_price_oracle_v1_deployment.abi,
		land_sale_price_oracle_v1_deployment.address
	);

	// prepare the initialization call bytes
	const land_sale_price_oracle_proxy_init_data = land_sale_price_oracle_v1_contract.methods.postConstruct(
		chainlink_aggregator
	).encodeABI();

	// deploy Land Sale Price Oracle Proxy
	await deployments.deploy("LandSalePriceOracle_Proxy", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "ERC1967Proxy",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		args: [land_sale_price_oracle_v1_deployment.address, land_sale_price_oracle_proxy_init_data],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land Sale Price Oracle proxy deployment details
	const land_sale_price_oracle_proxy_deployment = await deployments.get("LandSalePriceOracle_Proxy");
	// print Land Sale Price Oracle proxy deployment details
	await print_land_sale_price_oracle_details(
		A0,
		land_sale_price_oracle_v1_deployment.abi,
		land_sale_price_oracle_proxy_deployment.address
	);

	// deploy Land Sale implementation v1 if required
	await deployments.deploy("LandSale_v1", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "LandSale",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		// args: [land_nft_proxy_deployment.address, sIlv_address, oracle_address],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land Sale implementation v1 deployment details
	const land_sale_v1_deployment = await deployments.get("LandSale_v1");
	const land_sale_v1_contract = new web3.eth.Contract(land_sale_v1_deployment.abi, land_sale_v1_deployment.address);

	// prepare the initialization call bytes
	const land_sale_proxy_init_data = land_sale_v1_contract.methods.postConstruct(
		land_nft_proxy_deployment.address,
		sIlv_address,
		land_sale_price_oracle_proxy_deployment.address
	).encodeABI();

	// deploy Land Sale Proxy
	await deployments.deploy("LandSale_Proxy", {
		// address (or private key) that will perform the transaction.
		// you can use `getNamedAccounts` to retrieve the address you want by name.
		from: A0,
		contract: "ERC1967Proxy",
		// the list of argument for the constructor (or the upgrade function in case of proxy)
		args: [land_sale_v1_deployment.address, land_sale_proxy_init_data],
		// if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
		skipIfAlreadyDeployed: true,
		// if true, it will log the result of the deployment (tx hash, address and gas used)
		log: true,
	});
	// get Land Sale proxy deployment details
	const land_sale_proxy_deployment = await deployments.get("LandSale_Proxy");
	// print Land Sale v1 deployment details
	await print_land_sale_acl_details(A0, land_sale_v1_deployment.abi, land_sale_proxy_deployment.address);
};

// Tags represent what the deployment script acts on. In general, it will be a single string value,
// the name of the contract it deploys or modifies.
// Then if another deploy script has such tag as a dependency, then when the latter deploy script has a specific tag
// and that tag is requested, the dependency will be executed first.
// https://www.npmjs.com/package/hardhat-deploy#deploy-scripts-tags-and-dependencies
module.exports.tags = ["v1_deploy", "deploy", "v1"];
