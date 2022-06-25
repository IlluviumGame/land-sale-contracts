/**
 * default Hardhat configuration which uses account mnemonic to derive accounts
 * script expects following environment variables to be set:
 *   - P_KEY1 – mainnet private key, should start with 0x
 *     or
 *   - MNEMONIC1 – mainnet mnemonic, 12 words
 *
 *   - P_KEY3 – ropsten private key, should start with 0x
 *     or
 *   - MNEMONIC3 – ropsten mnemonic, 12 words
 *
 *   - P_KEY4 – rinkeby private key, should start with 0x
 *     or
 *   - MNEMONIC4 – rinkeby mnemonic, 12 words
 *
 *   - ALCHEMY_KEY – Alchemy API key
 *     or
 *   - INFURA_KEY – Infura API key (Project ID)
 *
 *   - ETHERSCAN_KEY – Etherscan API key
 */

// Loads env variables from .env file
require('dotenv').config()

// Enable Truffle 5 plugin for tests
// https://hardhat.org/guides/truffle-testing.html
require("@nomiclabs/hardhat-truffle5");

// enable etherscan integration
// https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html
require("@nomiclabs/hardhat-etherscan");

// enable Solidity-coverage
// https://hardhat.org/plugins/solidity-coverage.html
require("solidity-coverage");

// enable hardhat-gas-reporter
// https://hardhat.org/plugins/hardhat-gas-reporter.html
require("hardhat-gas-reporter");

// compile Solidity sources directly from NPM dependencies
// https://github.com/ItsNickBarry/hardhat-dependency-compiler
require("hardhat-dependency-compiler");

// adds a mechanism to deploy contracts to any network,
// keeping track of them and replicating the same environment for testing
// https://www.npmjs.com/package/hardhat-deploy
require("hardhat-deploy");

// verify environment setup, display warning if required, replace missing values with fakes
const FAKE_MNEMONIC = "test test test test test test test test test test test junk";
if(!process.env.MNEMONIC1 && !process.env.P_KEY1) {
	console.warn("neither MNEMONIC1 nor P_KEY1 is not set. Mainnet deployments won't be available");
	process.env.MNEMONIC1 = FAKE_MNEMONIC;
}
else if(process.env.P_KEY1 && !process.env.P_KEY1.startsWith("0x")) {
	console.warn("P_KEY1 doesn't start with 0x. Appended 0x");
	process.env.P_KEY1 = "0x" + process.env.P_KEY1;
}
if(!process.env.MNEMONIC3 && !process.env.P_KEY3) {
	console.warn("neither MNEMONIC3 nor P_KEY3 is not set. Ropsten deployments won't be available");
	process.env.MNEMONIC3 = FAKE_MNEMONIC;
}
else if(process.env.P_KEY3 && !process.env.P_KEY3.startsWith("0x")) {
	console.warn("P_KEY3 doesn't start with 0x. Appended 0x");
	process.env.P_KEY3 = "0x" + process.env.P_KEY3;
}
if(!process.env.MNEMONIC4 && !process.env.P_KEY4) {
	console.warn("neither MNEMONIC4 nor P_KEY4 is not set. Rinkeby deployments won't be available");
	process.env.MNEMONIC4 = FAKE_MNEMONIC;
}
else if(process.env.P_KEY4 && !process.env.P_KEY4.startsWith("0x")) {
	console.warn("P_KEY4 doesn't start with 0x. Appended 0x");
	process.env.P_KEY4 = "0x" + process.env.P_KEY4;
}
if(!process.env.MNEMONIC42 && !process.env.P_KEY42) {
	console.warn("neither MNEMONIC42 nor P_KEY42 is not set. Kovan deployments won't be available");
	process.env.MNEMONIC42 = FAKE_MNEMONIC;
}
else if(process.env.P_KEY42 && !process.env.P_KEY42.startsWith("0x")) {
	console.warn("P_KEY42 doesn't start with 0x. Appended 0x");
	process.env.P_KEY42 = "0x" + process.env.P_KEY42;
}
if(!process.env.INFURA_KEY && !process.env.ALCHEMY_KEY) {
	console.warn("neither INFURA_KEY nor ALCHEMY_KEY is not set. Deployments may not be available");
	process.env.INFURA_KEY = "";
	process.env.ALCHEMY_KEY = "";
}
if(!process.env.ETHERSCAN_KEY) {
	console.warn("ETHERSCAN_KEY is not set. Deployed smart contract code verification won't be available");
	process.env.ETHERSCAN_KEY = "";
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	defaultNetwork: "hardhat",
	networks: {
		// https://hardhat.org/hardhat-network/
		hardhat: {
			// set networkId to 0xeeeb04de as for all local networks
			chainId: 0xeeeb04de,
			// set the gas price to one for convenient tx costs calculations in tests
			// gasPrice: 1,
			// London hard fork fix: impossible to set gas price lower than baseFeePerGas (875,000,000)
			initialBaseFeePerGas: 0,
			accounts: {
				count: 35,
			},
/*
			forking: {
				url: "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY, // create a key: https://infura.io/
				enabled: !!(process.env.HARDHAT_FORK),
			},
*/
		},
		// https://etherscan.io/
		mainnet: {
			url: get_endpoint_url("mainnet"),

			accounts: process.env.P_KEY1? [
				process.env.P_KEY1, // export private key from mnemonic: https://metamask.io/
			]: {
				mnemonic: process.env.MNEMONIC1, // create 12 words: https://metamask.io/
			}
		},
		// https://ropsten.etherscan.io/
		ropsten: {
			url: get_endpoint_url("ropsten"),

			accounts: process.env.P_KEY3? [
				process.env.P_KEY3, // export private key from mnemonic: https://metamask.io/
			]: {
				mnemonic: process.env.MNEMONIC3, // create 12 words: https://metamask.io/
			}
		},
		// https://rinkeby.etherscan.io/
		rinkeby: {
			url: get_endpoint_url("rinkeby"),

			accounts: process.env.P_KEY4? [
				process.env.P_KEY4, // export private key from mnemonic: https://metamask.io/
			]: {
				mnemonic: process.env.MNEMONIC4, // create 12 words: https://metamask.io/
			}
		},
		// https://kovan.etherscan.io/
		kovan: {
			url: get_endpoint_url("kovan"),

			accounts: process.env.P_KEY42? [
				process.env.P_KEY42, // export private key from mnemonic: https://metamask.io/
			]: {
				mnemonic: process.env.MNEMONIC42, // create 12 words: https://metamask.io/
			}
		},
	},

	// Configure Solidity compiler
	solidity: {
		// https://hardhat.org/guides/compile-contracts.html
		compilers: [
			{ // project main compiler version
				version: "0.8.11",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			},
			{ // used to compile USDT mock
				version: "0.4.11",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			},
		]
	},

	// Set default mocha options here, use special reporters etc.
	mocha: {
		// timeout: 100000,

		// disable mocha timeouts:
		// https://mochajs.org/api/mocha#enableTimeouts
		enableTimeouts: false,
		// https://github.com/mochajs/mocha/issues/3813
		timeout: false,
	},

	// Configure etherscan integration
	// https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html
	etherscan: {
		// Your API key for Etherscan
		// Obtain one at https://etherscan.io/
		apiKey: process.env.ETHERSCAN_KEY
	},

	// hardhat-gas-reporter will be disabled by default, use REPORT_GAS environment variable to enable it
	// https://hardhat.org/plugins/hardhat-gas-reporter.html
	gasReporter: {
		enabled: !!(process.env.REPORT_GAS)
	},

	// compile Solidity sources directly from NPM dependencies
	// https://github.com/ItsNickBarry/hardhat-dependency-compiler
	dependencyCompiler: {
		paths: [
			// ERC1967 is used to deploy upgradeable contracts
			"@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
			// Chainlink Price Feed Aggregator interface is used to connect to Chainlink Price Feed Aggregator
			"@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface",
		],
	},

	// namedAccounts allows you to associate names to addresses and have them configured per chain
	// https://github.com/wighawag/hardhat-deploy#1-namedaccounts-ability-to-name-addresses
	namedAccounts: {
		// Illuvium ERC20 (ILV)
		ilv_address: {
			"mainnet": "0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E",
			"rinkeby": "0xb671194b2e9fB884f65B92a1DBaB875E5F76ec5C",
			"ropsten": "0xd91dFB4CB8f6820765D29447ba1Bb37AEC5D1d5F",
		},
		// Escrowed Illuvium 2 ERC20 (sILV2)
		sIlv_address: {
			"mainnet": "0x7E77dCb127F99ECe88230a64Db8d595F31F1b068",
			"rinkeby": "0xbfF2129e06a7e76323e7ceA754eBD045Bc3E82A5",
			"ropsten": "0xCe34A06141B2131aD6C6E293275d22123bcf1865",
		},
		// Chainlink Price Feed Aggregator
		chainlink_aggregator: {
			"mainnet": "0xf600984CCa37cd562E74E3EE514289e3613ce8E4",
			"rinkeby": "0x48731cF7e84dc94C5f84577882c14Be11a5B7456",
		},
		// IMX Stark contract address, https://docs.x.immutable.com/docs/introduction-smart-contracts
		stark_contract_address: {
			"mainnet": "0x5FDCCA53617f4d2b9134B29090C87D01058e27e9",
			"ropsten": "0x4527BE8f31E2ebFbEF4fCADDb5a17447B27d2aef",
		},
	},

}

/**
 * Determines a JSON-RPC endpoint to use to connect to the node
 * based on the requested network name and environment variables set
 *
 * Tries to use custom RPC URL first (MAINNET_RPC_URL/ROPSTEN_RPC_URL/RINKEBY_RPC_URL/KOVAN_RPC_URL)
 * Tries to use alchemy RPC URL next (if ALCHEMY_KEY is set)
 * Fallbacks to infura RPC URL
 *
 * @param network_name one of mainnet/ropsten/rinkeby/kovan
 * @return JSON-RPC endpoint URL
 */
function get_endpoint_url(network_name) {
	// try custom RPC endpoint first (private node, quicknode, etc.)
	// create a quicknode key: https://www.quicknode.com/
	if(process.env.MAINNET_RPC_URL && network_name === "mainnet") {
		return process.env.MAINNET_RPC_URL;
	}
	if(process.env.ROPSTEN_RPC_URL && network_name === "ropsten") {
		return process.env.ROPSTEN_RPC_URL;
	}
	if(process.env.RINKEBY_RPC_URL && network_name === "rinkeby") {
		return process.env.RINKEBY_RPC_URL;
	}
	if(process.env.KOVAN_RPC_URL && network_name === "kovan") {
		return process.env.KOVAN_RPC_URL;
	}

	// try the alchemy next
	// create a key: https://www.alchemy.com/
	if(process.env.ALCHEMY_KEY) {
		switch(network_name) {
			case "mainnet": return "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY;
			case "ropsten": return "https://eth-ropsten.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY;
			case "rinkeby": return "https://eth-rinkeby.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY;
			case "kovan": return "https://eth-kovan.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY;
		}
	}

	// fallback to infura
	// create a key: https://infura.io/
	switch(network_name) {
		case "mainnet": return "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY;
		case "ropsten": return "https://ropsten.infura.io/v3/" + process.env.INFURA_KEY;
		case "rinkeby": return "https://rinkeby.infura.io/v3/" + process.env.INFURA_KEY;
		case "kovan": return "https://kovan.infura.io/v3/" + process.env.INFURA_KEY;
	}
}
