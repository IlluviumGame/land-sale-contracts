// Zeppelin test helpers
const {
	BN,
	constants,
	expectEvent,
	expectRevert,
} = require("@openzeppelin/test-helpers");
const {
	assert,
	expect,
} = require("chai");
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = constants;

// BN constants and utilities
const {
	random_bn255,
} = require("../../../scripts/include/bn_utils");

// ACL core features and roles
const {
	not,
	ROLE_ACCESS_MANAGER,
} = require("../../../scripts/include/features_roles");

/**
 * ACL core behaviour
 *
 * @param deployment_fn ACL contract deployment function
 * @param a0 deployer/admin account
 * @param a1 participant 1
 * @param a2 participant 2
 */
function behavesLikeACL(deployment_fn, a0, a1, a2) {
	// define the "players"
	const by = a1;
	const to = a2;

	// deploy the ACL
	let acl;
	beforeEach(async function() {
		acl = await deployment_fn.call(this, a0);
	});

	describe("when performed by ACCESS_MANAGER", function() {
		beforeEach(async function() {
			await acl.updateRole(by, ROLE_ACCESS_MANAGER, {from: a0});
		});
		describe("when ACCESS_MANAGER has full set of permissions", function() {
			beforeEach(async function() {
				await acl.updateRole(by, MAX_UINT256, {from: a0});
			});
			describe("what you set", function() {
				let receipt, set;
				beforeEach(async function() {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					set = random_bn255();
					receipt = await acl.updateRole(to, set, {from: by});
				});
				describe("is what you get", function() {
					it('"userRoles" value', async function() {
						expect(await acl.userRoles(to)).to.be.bignumber.that.equals(set);
					});
					it('"RoleUpdated" event', async function() {
						await expectEvent(receipt, "RoleUpdated", {
							_by: by,
							_to: to,
							_requested: set,
							_actual: set,
						});
					});
				});
			});
			describe("what you remove", function() {
				let receipt, remove;
				beforeEach(async function() {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					remove = random_bn255();
					receipt = await acl.updateRole(to, not(remove), {from: by});
				});
				describe("is what gets removed", function() {
					it('"userRoles" value', async function() {
						expect(await acl.userRoles(to)).to.be.bignumber.that.equals(not(remove));
					});
					it('"RoleUpdated" event', async function() {
						await expectEvent(receipt, "RoleUpdated", {
							_by: by,
							_to: to,
							_requested: not(remove),
							_actual: not(remove),
						});
					});
				});
			});
		});
		describe("when ACCESS_MANAGER doesn't have any permissions", function() {
			describe("what you get, independently of what you set", function() {
				let receipt, set;
				beforeEach(async function() {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					set = random_bn255();
					receipt = await acl.updateRole(to, set, {from: by});
				});
				describe("is always zero", function() {
					it('"userRoles" value', async function() {
						expect(await acl.userRoles(to)).to.be.bignumber.that.is.zero;
					});
					it('"RoleUpdated" event', async function() {
						await expectEvent(receipt, "RoleUpdated", {
							_by: by,
							_to: to,
							_requested: set,
							_actual: "0",
						});
					});
				});
			});
			describe("what you get, independently of what you remove", function() {
				let receipt, remove;
				beforeEach(async function() {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					remove = random_bn255();
					await acl.updateRole(to, MAX_UINT256, {from: a0});
					receipt = await acl.updateRole(to, not(remove), {from: by});
				});
				describe("is always what you had", function() {
					it('"userRoles" value', async function() {
						expect(await acl.userRoles(to)).to.be.bignumber.that.equals(MAX_UINT256);
					});
					it('"RoleUpdated" event', async function() {
						await expectEvent(receipt, "RoleUpdated", {
							_by: by,
							_to: to,
							_requested: not(remove),
							_actual: MAX_UINT256,
						});
					});
				});
			});
		});
		describe("when ACCESS_MANAGER has some permissions", function() {
			let role;
			beforeEach(async function() {
				// do not touch the highest permission bit (ACCESS_MANAGER permission)
				role = random_bn255();
				await acl.updateRole(by, ROLE_ACCESS_MANAGER.or(role), {from: a0});
			});
			describe("what you get", function() {
				let receipt, set;
				beforeEach(async function() {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					set = random_bn255();
					receipt = await acl.updateRole(to, set, {from: by});
				});
				describe("is an intersection of what you set and what you have", function() {
					it('"userRoles" value', async function() {
						expect(await acl.userRoles(to)).to.be.bignumber.that.equals(role.and(set));
					});
					it('"RoleUpdated" event', async function() {
						await expectEvent(receipt, "RoleUpdated", {
							_by: by,
							_to: to,
							_requested: set,
							_actual: role.and(set),
						});
					});
				});
			});
			describe("what you remove", function() {
				let receipt, remove;
				beforeEach(async function() {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					remove = random_bn255();
					await acl.updateRole(to, MAX_UINT256, {from: a0});
					receipt = await acl.updateRole(to, not(remove), {from: by});
				});
				describe("is an intersection of what you tried to remove and what you have", function() {
					it('"userRoles" value', async function() {
						expect(await acl.userRoles(to)).to.be.bignumber.that.equals(not(role.and(remove)));
					});
					it('"RoleUpdated" event', async function() {
						await expectEvent(receipt, "RoleUpdated", {
							_by: by,
							_to: to,
							_requested: not(remove),
							_actual: not(role.and(remove)),
						});
					});
				});
			});
		});
		describe("ACCESS_MANAGER updates itself", function() {
			beforeEach(async function() {
				// do not touch the highest permission bit (ACCESS_MANAGER permission)
				const role = random_bn255();
				await acl.updateRole(by, ROLE_ACCESS_MANAGER.or(role), {from: a0});
			});
			it("and degrades to zero with the 99.99% probability in 14 runs", async function() {
				// randomly remove 255 bits of permissions
				for(let i = 0; i < 14; i++) {
					// do not touch the highest permission bit (ACCESS_MANAGER permission)
					const role = random_bn255();
					await acl.updateRole(by, not(role), {from: by});
				}
				// this may fail with the probability 2^(-14) < 0.01%
				expect(await acl.userRoles(by)).to.be.bignumber.that.equals(ROLE_ACCESS_MANAGER);
			})
		});
		describe("when ACCESS_MANAGER grants ACCESS_MANAGER permission", function() {
			beforeEach(async function() {
				await acl.updateRole(to, ROLE_ACCESS_MANAGER, {from: by});
			});
			it("operator becomes an ACCESS_MANAGER", async function() {
				expect(await acl.isOperatorInRole(to, ROLE_ACCESS_MANAGER), "operator").to.be.true;
				expect(await acl.isSenderInRole(ROLE_ACCESS_MANAGER, {from: to}), "sender").to.be.true;
			});
		});
		describe("when ACCESS_MANAGER revokes ACCESS_MANAGER permission from itself", function() {
			beforeEach(async function() {
				await acl.updateRole(by, 0, {from: by});
			});
			it("operator ceases to be an ACCESS_MANAGER", async function() {
				expect(await acl.isOperatorInRole(by, ROLE_ACCESS_MANAGER), "operator").to.be.false;
				expect(await acl.isSenderInRole(ROLE_ACCESS_MANAGER, {from: by}), "sender").to.be.false;
			});
		});
	});
	describe("otherwise (no ACCESS_MANAGER permission)", function() {
		it("updateFeatures reverts", async function() {
			await expectRevert(acl.updateFeatures(1, {from: by}), "access denied");
		});
		it("updateRole reverts", async function() {
			await expectRevert(acl.updateRole(to, 1, {from: by}), "access denied");
		});
	});
}

// export the ACL core behaviour
module.exports = {
	behavesLikeACL,
}
