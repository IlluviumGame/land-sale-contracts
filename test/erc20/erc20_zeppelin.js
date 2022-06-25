// OpenZeppelin ERC20 Tests Runner
// See https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/test/token/ERC20/

// ACL token features and roles
const {
	ROLE_TOKEN_CREATOR,
	ROLE_TOKEN_DESTROYER,
} = require("../../scripts/include/features_roles");

// Zeppelin unit tests – delivered as behaviours
// basic ERC20 behaviours
const {
	shouldBehaveLikeERC20,
} = require("./include/zeppelin/ERC20.behavior");
// extended ERC20 behaviours
const {
	shouldHaveBasicProps,
	shouldHaveAtomicApprove,
	shouldHaveMint,
	shouldHaveBurn,
} = require("./include/zeppelin/ERC20.behavior.ext");

// deployment routines in use
const {
	erc20_deploy,
	NAME,
	SYMBOL,
	DECIMALS,
	S0,
} = require("./include/deployment_routines");

// run OpenZeppelin ERC20 tests
contract("ERC20: OpenZeppelin ERC20 Tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	let erc20;
	beforeEach(async function() {
		erc20 = await erc20_deploy(a0, H0);
	});

	function run_zeppelin_erc20_tests(S0, H0, a1, a2) {
		// Zeppelin global setup
		beforeEach(async function() {
			// Zeppelin uses this.token shortcut to access token instance
			this.token = erc20;
		});

		describe("ERC20 token shouldBehaveLikeERC20", function() {
			// Zeppelin setup for ERC20 transfers: not required, full set of features already on deployment
			shouldBehaveLikeERC20("ERC20: ", S0, H0, a1, a2);
		});
		describe("ERC20 token shouldHaveMint (ext)", function() {
			// Zeppelin setup for token minting
			beforeEach(async function() {
				// Zeppelin uses default zero account A0 (accounts[0]) to mint tokens,
				// grant this address a permission to mint
				await erc20.updateRole(A0, ROLE_TOKEN_CREATOR, {from: a0});
			});
			shouldHaveMint("ERC20: ", S0, H0, a1);
		});
		describe("ERC20 token shouldHaveBurn (ext)", function() {
			// Zeppelin setup for token burning
			beforeEach(async function() {
				// Zeppelin uses default zero account A0 (accounts[0]) to burn tokens,
				// grant this address a permission to burn
				await erc20.updateRole(A0, ROLE_TOKEN_DESTROYER, {from: a0});
			});
			shouldHaveBurn("ERC20: ", S0, H0);
		});
		describe("ERC20 token shouldHaveBasicProps (ext)", function() {
			shouldHaveBasicProps(NAME, SYMBOL, DECIMALS);
		});
		describe("ERC20 token shouldHaveApprove (ext)", function() {
			shouldHaveAtomicApprove("ERC20: ", S0, H0, a1);
		});
	}

	run_zeppelin_erc20_tests(S0, H0, a1, a2);
});
