// RoyalERC721: EIP-2981 related tests, including ACL

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
	MAX_UINT256,
} = constants;

// ACL token features and roles
const {
	not,
	ROLE_URI_MANAGER,
	ROLE_ROYALTY_MANAGER,
	ROLE_OWNER_MANAGER,
} = require("../../scripts/include/features_roles");

// deployment routines in use, token name and symbol
const {
	land_nft_deploy,
} = require("./include/deployment_routines");

// run EIP2981 tests
contract("LandERC721/RoyalERC721: EIP2981 royalties", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	// deploy token
	let token;
	beforeEach(async function() {
		token = await land_nft_deploy(a0);
	});

	describe("EIP2981 Royalties", function() {
		it("royaltyReceiver is not set initially", async function() {
			expect(await token.royaltyReceiver()).to.equal(ZERO_ADDRESS);
		});
		it("royaltyPercentage is not set initially", async function() {
			expect(await token.royaltyPercentage()).to.be.bignumber.that.is.zero;
		});
		it("contractURI is not set initially", async function() {
			expect(await token.contractURI()).to.equal("");
		});

		describe("updating the royalty info", function() {
			// default operator
			const by = a1;
			// default royalty receiver
			const to = a2;
			// default royalty percentage 7.5%
			const royalty = 750;
			// a function to update royalty info
			async function setRoyaltyInfo(_to = to, _royalty = royalty) {
				return await token.setRoyaltyInfo(_to, _royalty, {from: by});
			}

			describe("when sender doesn't have ROLE_ROYALTY_MANAGER permission", function() {
				beforeEach(async function() {
					await token.updateRole(by, not(ROLE_ROYALTY_MANAGER), {from: a0});
				});
				it("setRoyaltyInfo fails", async function() {
					await expectRevert(setRoyaltyInfo(), "access denied");
				});
			});
			describe("when sender has ROLE_ROYALTY_MANAGER permission", function() {
				beforeEach(async function() {
					await token.updateRole(by, ROLE_ROYALTY_MANAGER, {from: a0});
				});
				it("fails if receiver is not set but royalty is set", async function() {
					await expectRevert(setRoyaltyInfo(ZERO_ADDRESS, royalty), "invalid receiver");
				});
				it("fails if royalty percentage exceeds 100%", async function() {
					await expectRevert(setRoyaltyInfo(to, 100_01), "royalty percentage exceeds 100%");
				});
				function succeeds(_to = to, _royalty = royalty) {
					let receipt;
					beforeEach(async function() {
						receipt = await setRoyaltyInfo(_to, _royalty);
					});
					it("royaltyReceiver gets set as expected", async function() {
						expect(await token.royaltyReceiver()).to.equal(_to);
					});
					it("royaltyPercentage gets set as expected", async function() {
						expect(await token.royaltyPercentage()).to.be.bignumber.that.equals(_royalty + "");
					});
					it("royalty gets calculated as expected", async function() {
						const price = 1000;
						const info = await token.royaltyInfo(13, price);
						expect(info.receiver, "unexpected receiver").to.equal(_to);
						expect(
							info.royaltyAmount,
							"unexpected amount"
						).to.be.bignumber.that.equals(Math.floor(price * _royalty / 100_00) + "");
					})
					it('"RoyaltyInfoUpdated" event is emitted', async function() {
						expectEvent(receipt, "RoyaltyInfoUpdated", {
							_by: by,
							_receiver: _to,
							_percentage: _royalty + "",
						});
					});
				}
				describe("succeeds if both receiver and royalty are set", function() {
					succeeds();
				});
				describe("succeeds if both receiver and royalty are set (max royalty: 100%)", function() {
					succeeds(to, 100_00);
				});
				describe("succeeds if receiver is set and royalty is not", function() {
					succeeds(to, 0);
				});
				describe("succeeds if both receiver and royalty are not set", function() {
					succeeds(ZERO_ADDRESS, 0);
				});
			});

		});
	});

	describe("OpenSea contract level metadata", function() {
		// default operator
		const by = a1;
		// default contract URI
		const contractURI = "https://super-awesome-contract-now-forever-nvm.com/returns/legacy/";
		// a function to update contract URI
		async function setContractURI() {
			return await token.setContractURI(contractURI, {from: by});
		}

		describe("when sender doesn't have ROLE_URI_MANAGER permission", function() {
			beforeEach(async function() {
				await token.updateRole(by, not(ROLE_URI_MANAGER), {from: a0});
			});
			it("setContractURI fails", async function() {
				await expectRevert(setContractURI(), "access denied");
			});
		});
		describe("when sender has ROLE_URI_MANAGER permission", function() {
			beforeEach(async function() {
				await token.updateRole(by, ROLE_URI_MANAGER, {from: a0});
			});
			describe("setContractURI succeeds", function() {
				let receipt;
				beforeEach(async function() {
					receipt = await setContractURI();
				});
				it("contractURI gets set as expected", async function() {
					expect(await token.contractURI()).to.equal(contractURI);
				});
				it('"ContractURIUpdated" event is emitted', async function() {
					expectEvent(receipt, "ContractURIUpdated", {
						_by: by,
						_value: contractURI,
					});
				});
			});
		});

	});

	describe('OpenSea/Zeppelin "Ownable" Support', function() {
		// default operator
		const by = a1;
		// default new owner
		const to = a2;

		// "owner" tests
		it('"owner" is set to the deployer address initially', async function() {
			expect(await token.owner(), "unexpected owner").to.equal(a0);
			expect(await token.isOwner(a0), "isOwner(a0) returns false").to.be.true;
		});

		// a function to transfer ownership
		async function changeOwner() {
			return await token.transferOwnership(to, {from: by});
		}

		describe("when sender doesn't have ROLE_OWNER_MANAGER permission", function() {
			beforeEach(async function() {
				await token.updateRole(by, not(ROLE_OWNER_MANAGER), {from: a0});
			});
			it("setOwner fails", async function() {
				await expectRevert(changeOwner(), "access denied");
			});
		});
		describe("when sender has ROLE_OWNER_MANAGER permission", function() {
			beforeEach(async function() {
				await token.updateRole(by, ROLE_OWNER_MANAGER, {from: a0});
			});
			describe("setOwner succeeds", function() {
				let receipt;
				beforeEach(async function() {
					receipt = await changeOwner();
				});
				it("owner gets set as expected", async function() {
					expect(await token.owner(), "unexpected owner").to.equal(to);
					expect(await token.isOwner(to), "isOwner(to) returns false").to.be.true;
				});
				it('"OwnerUpdated" event is emitted', async function() {
					expectEvent(receipt, "OwnerUpdated", {
						_by: by,
						_oldVal: a0,
						_newVal: to,
					});
				});
				it('new "owner" cannot change owner due to lack of ROLE_OWNER_MANAGER permission', async function() {
					await expectRevert(token.transferOwnership(by, {from: to}), "access denied");
				});
			});
		});
	});

});
