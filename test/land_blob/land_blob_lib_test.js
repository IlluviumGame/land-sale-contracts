// LandBlobLib: minting blob parsing tests

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

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

// number utils
const {
	random_int,
	random_element,
} = require("../include/number_utils");

// BN utils
const {
	random_bn256,
	random_bits,
} = require("../../scripts/include/bn_utils");

// deployment routines in use
const {
	land_blob_lib_deploy,
} = require("./include/deployment_routines");

// run LandBlobLib minting blob parsing tests
contract("LandBlobLib: minting blob parsing tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2] = accounts;

	// deploy the LandBlobLib
	let land_blob_lib;
	before(async function() {
		land_blob_lib = await land_blob_lib_deploy(a0);
	});

	// depth of the tests performed
	const ROUNDS = 100;

	async function atoi_sol(a, offset = 0) {
		return await land_blob_lib.atoi(a.length > 0? web3.utils.asciiToHex(a): [], offset);
	}

	async function parse_minting_blob_sol(imx_blob) {
		return await land_blob_lib.parseMintingBlob(web3.utils.asciiToHex(imx_blob));
	}

	async function test_atoi_pure(rounds = ROUNDS) {
		for(let k = 0; k < rounds; k++) {
			const n = random_bn256();
			const a = n.toString(10);
			const {i, p} = await atoi_sol(a);
			log.debug("input: %o", a);
			log.debug("i_js: %o", n.toString(10));
			log.debug("i_sol: %o", {i: i.toString(10), p: p.toNumber()});
			expect(i, "atoi: bad result").to.be.bignumber.that.equals(n);
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals(a.length + "");
		}
	}

	async function test_atoi_dirty(rounds = ROUNDS) {
		for(let k = 0; k < rounds; k++) {
			const bit_len = random_int(8, 200);
			const n = random_bits(bit_len);
			const a = random_element(["", "/"], true)
				+ n.toString(10)
				+ random_element(["/", ":"], true)
				+ random_int(1, 1_000_000_000);
			const {i, p} = await atoi_sol(a);
			log.debug("input: %o", a);
			log.debug("i_js: %o", n.toString(10));
			log.debug("i_sol: %o", {i: i.toString(10), p: p.toNumber()});
			expect(i, "atoi: bad result").to.be.bignumber.that.equals(n);
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals(
				n.toString(10).length + (a.startsWith("/")? 1: 0) + ""
			);
		}
	}

	async function test_parse_minting_blob(rounds = ROUNDS) {
		for(let i = 0; i < rounds; i++) {
			const token_id = random_int(1, 1_000_000_000);
			const metadata = random_bn256();
			const minting_blob = `{${token_id}}:{${metadata.toString(10)}}`;

			log.debug("input: %o", minting_blob);
			log.debug("blob_js: %o", {token_id, metadata: metadata.toString(16)});
			const parsed_blob = await parse_minting_blob_sol(minting_blob);
			log.debug("blob_sol: %o", {token_id: parsed_blob.tokenId.toNumber(), metadata: parsed_blob.metadata.toString(16)});
			expect(parsed_blob.tokenId, "bad tokenId").to.be.bignumber.that.equals(token_id + "");
			expect(parsed_blob.metadata, "bad metadata").to.be.bignumber.that.equals(metadata);
		}
	}

	it("atoi: digits only [ @skip-on-coverage ]", async function() {
		await test_atoi_pure();
	});
	it("atoi: digits only (low complexity)", async function() {
		await test_atoi_pure(ROUNDS / 10);
	});
	it("atoi: mixed [ @skip-on-coverage ]", async function() {
		await test_atoi_dirty();
	});
	it("atoi: mixed (low complexity)", async function() {
		await test_atoi_dirty(ROUNDS / 10);
	});
	it("parseMintingBlob [ @skip-on-coverage ]", async function() {
		await test_parse_minting_blob();
	});
	it("parseMintingBlob (low complexity)", async function() {
		await test_parse_minting_blob(ROUNDS / 10);
	});

	describe("corner cases", function() {
		it("atoi returns zero for an empty bytes input", async function() {
			const {i, p} = await atoi_sol("");
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("0");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("0");
		});
		it("atoi returns zero if string contains only invalid characters", async function() {
			const {i, p} = await atoi_sol("abba");
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("0");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("0");
		});
		it("atoi returns zero for 0x10", async function() {
			const {i, p} = await atoi_sol("0x10");
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("0");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("1");
		});
		it("atoi returns 10 for a10", async function() {
			const {i, p} = await atoi_sol("a10");
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("10");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("3");
		});
		it("atoi returns 10 for 10A", async function() {
			const {i, p} = await atoi_sol("10A");
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("10");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("2");
		});
		it("atoi returns 0 for 10A offset 2", async function() {
			const {i, p} = await atoi_sol("10A", 2);
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("0");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("2");
		});
		it("atoi returns 10 for 1010 offset 2", async function() {
			const {i, p} = await atoi_sol("1010", 2);
			expect(i, "atoi: bad result").to.be.bignumber.that.equals("10");
			expect(p, "atoi: bad stop index").to.be.bignumber.that.equals("4");
		});

		// x => (123, 467)
		[
			"{123}:{467}",
			"123:467",
			"123{}467",
			"b123abc467a",
			"b123abc467a8910",
			" 123 467 ",
			"123\n467",
			"[123,467]",
			"[123; 467]",
			"(123, 467)",
			"(123, 467, 8910)",
			"{123.467}",
			"{123.467.8910}",
		].forEach((blob) => {
			it(`parseMintingBlob: "${blob}" => (123, 467)`, async function() {
				const {tokenId, metadata} = await parse_minting_blob_sol(blob);
				expect(tokenId, "unexpected tokenId").to.be.bignumber.that.equals("123");
				expect(metadata, "unexpected metadata").to.be.bignumber.that.equals("467");
			});
		});

		// x => (123, 0)
		[
			"abc123",
			"123abc",
			"{123}",
			"{123:}",
			"{:123}",
			"{,123}",
			"\n123",
			"{123,\n}",
			"{\n,123}",
			"(123, 0)",
		].forEach((blob) => {
			it(`parseMintingBlob: "${blob}" => (123, 0)`, async function() {
				const {tokenId, metadata} = await parse_minting_blob_sol(blob);
				expect(tokenId, "unexpected tokenId").to.be.bignumber.that.equals("123");
				expect(metadata, "unexpected metadata").to.be.bignumber.that.equals("0");
			});
		});

		// x => (0, 123)
		[
			"0:123",
			"0:123:467",
			"0; 123",
			"(0, 123)",
			"(0, 123, 467)",
			"0,123",
			"0,123,467",
			"0.123",
			"0.123.467",
		].forEach((blob) => {
			it(`parseMintingBlob: "${blob}" => (0, 123)`, async function() {
				const {tokenId, metadata} = await parse_minting_blob_sol(blob);
				expect(tokenId, "unexpected tokenId").to.be.bignumber.that.equals("0");
				expect(metadata, "unexpected metadata").to.be.bignumber.that.equals("123");
			});
		});

		// x => throws (no tokenId found)
		[
			[],
			"",
			"abc",
			"{}"
		].forEach((blob) => {
			it(`parseMintingBlob: reverts for "${blob}" (no tokenId)`, async function() {
				await expectRevert(parse_minting_blob_sol(blob), "no tokenId found");
			});
		});

		// x => (0, 123)
		[
			"0",
			"{0}",
			"{0}:{0}",
			"{0}:",
			"(0, 0, 123)",
			":0",
			"\n0",
			"\n0\n0\n123",
		].forEach((blob) => {
			it(`parseMintingBlob: "${blob}" => (0, 0)`, async function() {
				const {tokenId, metadata} = await parse_minting_blob_sol(blob);
				expect(tokenId, "unexpected tokenId").to.be.bignumber.that.equals("0");
				expect(metadata, "unexpected metadata").to.be.bignumber.that.equals("0");
			});
		});
	});
});
