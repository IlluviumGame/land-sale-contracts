// AccessControl (ACL) Core Tests

// import the core ACL behaviour to use
const {
	behavesLikeACL
} = require("./include/acl.behaviour");

// deployment routines in use
const {
	acl_mock_deploy,
} = require("./include/deployment_routines");

// run AccessControl (ACL) tests
contract("AccessControl (ACL) Core tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3] = accounts;

	// run the core ACL behaviour test
	behavesLikeACL(acl_mock_deploy, a0, a1, a2);
});
