// Both Truffle anf Hardhat with Truffle make an instance of web3 available in the global scope
// BN constants, functions to work with BN
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;

// ACL token features and roles
const {
	FEATURE_L1_SALE_ACTIVE,
	FEATURE_L2_SALE_ACTIVE,
	FEATURE_ALL,
	ROLE_TOKEN_CREATOR,
	ROLE_METADATA_PROVIDER,
} = require("../../../scripts/include/features_roles");

// reimport some deployment routines from erc20/erc721 deployment packs
const {
	erc20_deploy,
	usdt_deploy,
} = require("../../erc20/include/deployment_routines");
const {
	land_nft_deploy,
	land_nft_deploy_restricted,
	land_nft_deploy_mock,
	erc721_deploy_restricted,
} = require("../../land_nft/include/deployment_routines");

/**
 * Deploys Escrowed Illuvium Mock used for payments in Land Sale
 *
 * @param a0 smart contract owner, super admin
 * @return ERC20Mock instance with sILV UID
 */
async function sIlv_mock_deploy(a0) {
	// smart contracts required
	const ERC20Contract = artifacts.require("./ERC20Mock");

	// deploy the ERC20
	const token = await ERC20Contract.new("sILV", "Escrowed Illuvium", {from: a0});

	// set the correct sILV UID
	await token.setUid("0xac3051b8d4f50966afb632468a4f61483ae6a953b74e387a01ef94316d6b7d62", {from: a0});

	// enable all the features
	await token.updateFeatures(FEATURE_ALL, {from: a0});

	// return the deployed instance reference
	return token;
}

/**
 * Default Land Sale initialization parameters:
 * Start: 1,000,000,000
 * End:   1,000,259,200
 * Halving Time: 34 minutes
 * Sequence Duration: 2 hours
 * Sequence Offset: 1 hour
 * Start Prices:
 *    Tier 0: 0
 *    Tier 1: 10,000 Gwei
 *    Tier 2: 100,000 Gwei
 *    Tier 3: 1,000,000 Gwei (0.001 Eth)
 *    Tier 4: 10,000,000 Gwei (0.01 Eth)
 *    Tier 5: 100,000,000 Gwei (0.1 Eth)
 *
 * @type {{seq_duration: number, sale_end: number, seq_offset: number, halving_time: number, sale_start: number, start_prices: BN[]}}
 */
const DEFAULT_LAND_SALE_PARAMS = {
	sale_start: 1_000_000_000,
	sale_end:   1_000_259_200,
	get sale_duration() {return this.sale_end - this.sale_start;},
	halving_time: 1_643,
	time_flow_quantum: 60,
	seq_duration: 7_200,
	seq_offset:   3_600,
	get open_sequences() {return Math.ceil(this.sale_duration / this.seq_offset)},
	get full_sequences() {return Math.floor(1 + (this.sale_duration - this.seq_duration) / this.seq_offset);},
	start_prices: new Array(6).fill(0)
		.map((_, i) => new BN(i > 0? Math.pow(10, 3 + i): 0))
		.map(v => toWei(new BN(v), "shannon")), // 10 ^ 9
}

/**
 * Initialized the already deployed sale, if the any of the initialization params are not set,
 * the defaults are used, see DEFAULT_LAND_SALE_PARAMS
 *
 * @param a0 account executing the initialization
 * @param land_sale Land Sale smart contract instance
 * @param sale_start Sale Start
 * @param sale_end Sale End
 * @param halving_time Halving Time
 * @param time_flow_quantum Time Flow Quantum, Price Update Interval
 * @param seq_duration Sequence Duration
 * @param seq_offset Sequence Offset
 * @param start_prices Start Prices by Tier
 * @return sale initialization params
 */
async function land_sale_init(
	a0,
	land_sale,
	sale_start = DEFAULT_LAND_SALE_PARAMS.sale_start,
	sale_end = DEFAULT_LAND_SALE_PARAMS.sale_end,
	halving_time = DEFAULT_LAND_SALE_PARAMS.halving_time,
	time_flow_quantum = DEFAULT_LAND_SALE_PARAMS.time_flow_quantum,
	seq_duration = DEFAULT_LAND_SALE_PARAMS.seq_duration,
	seq_offset = DEFAULT_LAND_SALE_PARAMS.seq_offset,
	start_prices = DEFAULT_LAND_SALE_PARAMS.start_prices
) {
	// init the sale
	await land_sale.initialize(sale_start, sale_end, halving_time, time_flow_quantum, seq_duration, seq_offset, start_prices, {from: a0});

	// calculate some additional auxiliary params
	const sale_duration = sale_end - sale_start;
	const open_sequences = Math.ceil(sale_duration / seq_offset);
	const full_sequences = Math.floor(1 + (sale_duration - seq_duration) / seq_offset);

	// and return its initialization params
	return {
		sale_start,
		sale_end,
		sale_duration,
		halving_time,
		time_flow_quantum,
		seq_duration,
		seq_offset,
		open_sequences,
		full_sequences,
		start_prices
	};
}

/**
 * Deploys Land Sale with all the features enabled, and all the required roles set up
 *
 * Deploys Land NFT instance if it's address is not specified
 * Deploys sILV token mock if sILV address is not specified
 * Deploys LandSalePriceOracleV1 mock if Land Sale Price Oracle address is not specified
 *
 * @param a0 smart contract owner, super admin
 * @param land_nft_addr LandERC721 token address
 * @param sIlv_addr sILV token address
 * @param oracle_addr Land Sale Oracle address
 * @returns LandSale, LandERC721 instances
 */
async function land_sale_deploy(a0, land_nft_addr, sIlv_addr, oracle_addr) {
	// deploy the restricted version
	const {
		land_sale,
		land_nft,
		sIlv,
		oracle,
		aggregator,
	} = await land_sale_deploy_restricted(a0, land_nft_addr, sIlv_addr, oracle_addr);

	// enabled all the features
	await land_sale.updateFeatures(FEATURE_L1_SALE_ACTIVE | FEATURE_L2_SALE_ACTIVE, {from: a0});

	// return all the linked/deployed instances
	return {land_sale, land_nft, sIlv, oracle, aggregator};
}

/**
 * Deploys Land Sale with no features enabled, but all the required roles set up
 *
 * Deploys Land NFT instance if it's address is not specified
 * Deploys sILV token mock if sILV address is not specified
 * Deploys LandSalePriceOracleV1 mock if Land Sale Price Oracle address is not specified
 *
 * @param a0 smart contract owner, super admin
 * @param land_nft_addr LandERC721 token address
 * @param sIlv_addr sILV token address
 * @param oracle_addr Land Sale Price Oracle address
 * @returns LandSale, LandERC721, sILV, price oracle, and chainlink aggregator instances
 */
async function land_sale_deploy_restricted(a0, land_nft_addr, sIlv_addr, oracle_addr) {
	// smart contracts required
	const LandERC721 = artifacts.require("./LandERC721");
	const ERC20 = artifacts.require("contracts/interfaces/ERC20Spec.sol:ERC20");
	const LandSalePriceOracle = artifacts.require("./LandSalePriceOracleV1Mock");
	const ChainlinkAggregator = artifacts.require("./ChainlinkAggregatorV3Mock");

	// link/deploy the contracts
	const land_nft = land_nft_addr? await LandERC721.at(land_nft_addr): await land_nft_deploy(a0);
	const sIlv = sIlv_addr? await ERC20.at(sIlv_addr): await sIlv_mock_deploy(a0);
	const {oracle, aggregator} = oracle_addr? {
		oracle: await LandSalePriceOracle.at(oracle_addr),
		aggregator: await ChainlinkAggregator.at(await this.oracle.ilvAggregator()),
	}: await land_sale_price_oracle_deploy(a0);
	const land_sale = await land_sale_deploy_pure(a0, land_nft.address, sIlv.address, oracle.address);

	// grant sale the permission to mint tokens
	await land_nft.updateRole(land_sale.address, ROLE_TOKEN_CREATOR | ROLE_METADATA_PROVIDER, {from: a0});

	// return all the linked/deployed instances
	return {land_sale, land_nft, sIlv, oracle, aggregator};
}

/**
 * Deploys Land Sale wrapped into ERC1967Proxy with no features enabled, and no roles set up
 *
 * Requires a valid Land NFT, sILV, Land Sale Price Oracle addresses to be specified
 *
 * @param a0 smart contract owner, super admin
 * @param land_nft_addr LandERC721 token address, required
 * @param sIlv_addr sILV token address, required
 * @param oracle_addr Land Sale Price Oracle address, required
 * @returns LandSale instance (mocked)
 */
async function land_sale_deploy_pure(a0, land_nft_addr, sIlv_addr, oracle_addr) {
	// smart contracts required
	const LandSale = artifacts.require("./LandSaleMock");
	const Proxy = artifacts.require("./ERC1967Proxy");

	// deploy implementation without a proxy
	const instance = await LandSale.new({from: a0});

	// prepare the initialization call bytes to initialize the proxy (upgradeable compatibility)
	const init_data = instance.contract.methods.postConstruct(land_nft_addr, sIlv_addr, oracle_addr).encodeABI();

	// deploy proxy, and initialize the implementation (inline)
	const proxy = await Proxy.new(instance.address, init_data, {from: a0});

	// wrap the proxy into the implementation ABI and return
	return await LandSale.at(proxy.address);
}

/**
 * Deploys Land Sale Price Oracle instance
 *
 * @param a0 smart contract owner, super admin
 * @param aggregator_address Chainlink Aggregator V3 instance address
 * @return LandSalePriceOracleV1 instance
 */
async function land_sale_price_oracle_deploy(a0, aggregator_address) {
	// smart contracts required
	const ChainlinkAggregator = artifacts.require("./ChainlinkAggregatorV3Mock");

	// link/deploy the contracts
	const aggregator = aggregator_address? await ChainlinkAggregator.at(aggregator_address): await chainlink_aggregator_deploy_mock(a0);
	const oracle = await land_sale_price_oracle_deploy_pure(a0, aggregator.address);

	// return the contacts deployed
	return {oracle, aggregator};
}

/**
 * Deploys Land Sale Price Oracle wrapped into ERC1967Proxy with no features enabled, and no roles set up
 *
 * Requires a valid Chainlink Aggregator V3 instance address to be specified
 *
 * @param a0 smart contract owner, super admin
 * @param aggregator_address Chainlink Aggregator V3 instance address, required
 * @return LandSalePriceOracleV1 instance (mocked)
 */
async function land_sale_price_oracle_deploy_pure(a0, aggregator_address) {
	// smart contracts required
	const LandSalePriceOracleV1 = artifacts.require("./LandSalePriceOracleV1Mock");
	const Proxy = artifacts.require("./ERC1967Proxy");

	// deploy implementation without a proxy
	const instance = await LandSalePriceOracleV1.new({from: a0});

	// prepare the initialization call bytes to initialize the proxy (upgradeable compatibility)
	const init_data = instance.contract.methods.postConstruct(aggregator_address).encodeABI();

	// deploy proxy, and initialize the implementation (inline)
	const proxy = await Proxy.new(instance.address, init_data, {from: a0});

	// wrap the proxy into the implementation ABI and return
	return await LandSalePriceOracleV1.at(proxy.address);
}

/**
 * Deploys Chainlink Aggregator V3 Mock
 *
 * @param a0 smart contract owner, super admin
 * @return Chainlink AggregatorV3Interface instance (mocked)
 */
async function chainlink_aggregator_deploy_mock(a0) {
	// smart contracts required
	const ChainlinkAggregator = artifacts.require("./ChainlinkAggregatorV3Mock");

	// deploy and return the reference to instance
	return await ChainlinkAggregator.new({from: a0});
}

/**
 * Deploys Land Sale Delegate
 *
 * @param a0 smart contract owner, super admin
 * @param sale_address LandSale instance address to attach to, required
 * @return LandSaleDelegateMock instance
 */
async function land_sale_delegate_deploy(a0, sale_address) {
	// smart contracts required
	const LandSaleDelegateMock = artifacts.require("./LandSaleDelegateMock");

	// deploy and return the reference to instance
	return await LandSaleDelegateMock.new(sale_address, {from: a0});
}

// export public deployment API
module.exports = {
	erc20_deploy,
	usdt_deploy,
	sIlv_mock_deploy,
	land_nft_deploy,
	land_nft_deploy_restricted,
	land_nft_deploy_mock,
	erc721_deploy_restricted,
	DEFAULT_LAND_SALE_PARAMS,
	land_sale_init,
	land_sale_deploy,
	land_sale_deploy_restricted,
	land_sale_deploy_pure,
	land_sale_price_oracle_deploy,
	land_sale_price_oracle_deploy_pure,
	chainlink_aggregator_deploy_mock,
	land_sale_delegate_deploy,
};
