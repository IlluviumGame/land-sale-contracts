// Land Generator: Isomorphic Grid ASCII Printer Tests
// Verifies internal Isomorphic Grid ASCII Printer used in other tests

// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// Chai test helpers
const {
	assert,
	expect,
} = require("chai");

// isomorphic grid utils
const {
	print_sites,
	is_corner,
} = require("./include/isomorphic_grid_utils");

// run Land Generator: Isomorphic Grid ASCII Printer Tests
contract("LandLib: [Land Gen] Isomorphic Grid ASCII Printer Tests", function(accounts) {
	it("1x1 print", async function() {
		const print = print_sites([], 1);
		log.debug(print);
		expect(print).to.be.equal(".\n");
	});
	it("1x1 corners", async function() {
		expect(is_corner(0, 0, 1)).to.be.false;
	});
	it("2x2 print", async function() {
		const print = print_sites([], 2);
		log.debug(print);
		expect(print).to.be.equal("..\n..\n");
	});
	it("2x2 corners", async function() {
		expect(is_corner(0, 0, 2, "(0, 0)")).to.be.false;
		expect(is_corner(0, 1, 2, "(0, 1)")).to.be.false;
		expect(is_corner(1, 0, 2, "(1, 0)")).to.be.false;
		expect(is_corner(1, 1, 2, "(1, 1)")).to.be.false;
	});
	it("3x3 print", async function() {
		const print = print_sites([], 3);
		log.debug(print);
		expect(print).to.be.equal(" . \n...\n . \n");
	});
	it("3x3 corners", async function() {
		expect(is_corner(0, 0, 3, "(0, 0)")).to.be.true;
		expect(is_corner(0, 1, 3, "(0, 1)")).to.be.false;
		expect(is_corner(0, 2, 3, "(0, 2)")).to.be.true;
		expect(is_corner(1, 0, 3, "(1, 0)")).to.be.false;
		expect(is_corner(1, 1, 3, "(1, 1)")).to.be.false;
		expect(is_corner(1, 2, 3, "(1, 2)")).to.be.false;
		expect(is_corner(2, 0, 3, "(2, 0)")).to.be.true;
		expect(is_corner(2, 1, 3, "(2, 1)")).to.be.false;
		expect(is_corner(2, 2, 3, "(2, 2)")).to.be.true;
	});
	it("4x4 print", async function() {
		const print = print_sites([], 4);
		log.debug(print);
		expect(print).to.be.equal(" .. \n....\n....\n .. \n");
	});
	it("4x4 corners", async function() {
		expect(is_corner(0, 0, 4, "(0, 0)")).to.be.true;
		expect(is_corner(0, 1, 4, "(0, 1)")).to.be.false;
		expect(is_corner(0, 2, 4, "(0, 2)")).to.be.false;
		expect(is_corner(0, 3, 4, "(0, 3)")).to.be.true;
		expect(is_corner(1, 0, 4, "(1, 0)")).to.be.false;
		expect(is_corner(1, 1, 4, "(1, 1)")).to.be.false;
		expect(is_corner(1, 2, 4, "(1, 2)")).to.be.false;
		expect(is_corner(1, 3, 4, "(1, 2)")).to.be.false;
		expect(is_corner(2, 0, 4, "(2, 0)")).to.be.false;
		expect(is_corner(2, 1, 4, "(2, 1)")).to.be.false;
		expect(is_corner(2, 2, 4, "(2, 2)")).to.be.false;
		expect(is_corner(2, 3, 4, "(2, 2)")).to.be.false;
		expect(is_corner(3, 0, 4, "(3, 0)")).to.be.true;
		expect(is_corner(3, 1, 4, "(3, 1)")).to.be.false;
		expect(is_corner(3, 2, 4, "(3, 2)")).to.be.false;
		expect(is_corner(3, 3, 4, "(3, 3)")).to.be.true;
	});
	it("5x5 print", async function() {
		const print = print_sites([], 5);
		log.debug(print);
		expect(print).to.be.equal("  .  \n ... \n.....\n ... \n  .  \n");
	});
	it("5x5 corners", async function() {
		expect(is_corner(0, 0, 5, "(0, 0)")).to.be.true;
		expect(is_corner(0, 1, 5, "(0, 1)")).to.be.true;
		expect(is_corner(0, 2, 5, "(0, 2)")).to.be.false;
		expect(is_corner(0, 3, 5, "(0, 3)")).to.be.true;
		expect(is_corner(0, 4, 5, "(0, 4)")).to.be.true;
		expect(is_corner(1, 0, 5, "(1, 0)")).to.be.true;
		expect(is_corner(1, 1, 5, "(1, 1)")).to.be.false;
		expect(is_corner(1, 2, 5, "(1, 2)")).to.be.false;
		expect(is_corner(1, 3, 5, "(1, 3)")).to.be.false;
		expect(is_corner(1, 4, 5, "(1, 4)")).to.be.true;
		expect(is_corner(2, 0, 5, "(2, 0)")).to.be.false;
		expect(is_corner(2, 1, 5, "(2, 1)")).to.be.false;
		expect(is_corner(2, 2, 5, "(2, 2)")).to.be.false;
		expect(is_corner(2, 3, 5, "(2, 3)")).to.be.false;
		expect(is_corner(2, 4, 5, "(2, 4)")).to.be.false;
		expect(is_corner(3, 0, 5, "(3, 0)")).to.be.true;
		expect(is_corner(3, 1, 5, "(3, 1)")).to.be.false;
		expect(is_corner(3, 2, 5, "(3, 2)")).to.be.false;
		expect(is_corner(3, 3, 5, "(3, 3)")).to.be.false;
		expect(is_corner(3, 4, 5, "(3, 4)")).to.be.true;
		expect(is_corner(4, 0, 5, "(4, 0)")).to.be.true;
		expect(is_corner(4, 1, 5, "(4, 1)")).to.be.true;
		expect(is_corner(4, 2, 5, "(4, 2)")).to.be.false;
		expect(is_corner(4, 3, 5, "(4, 3)")).to.be.true;
		expect(is_corner(4, 4, 5, "(4, 4)")).to.be.true;
	});
});
