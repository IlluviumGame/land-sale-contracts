// Both Truffle anf Hardhat with Truffle make an instance of web3 available in the global scope
// BN constants, functions to work with BN
const BN = web3.utils.BN;


/**
 * Calculates dutch auction price after the time of interest has passed since
 * the auction has started
 *
 * The price is assumed to drop by `m` every `dt` seconds, according to formula:
 *      p(t + dt) = p(t) * (1 - m)
 * The price reduces `100 * m` percent every `dt` seconds passed
 *
 * @param p0 initial price
 * @param dt price drop interval
 * @param m price drop fraction, m ∈ (0, 1)
 * @param t elapsed time
 * @return price after `t` seconds passed, `p = p0 * 2^(-t/dt)`
 */
function price_formula_percent(p0, dt, m, t) {
	// check m doesn't exceed 1
	assert(m <= 1, "m is greater than one");

	// use this constant for a good precision (derived from MAX_SAFE_INTEGER)
	const max_int = 1_000_000_000_000_000;

	// apply the (1 - m)% as many times as required
	let p = new BN(p0);
	for(let i = 0; i < Math.floor(t / dt); i++) {
		p = p.mul(new BN((1 - m) * max_int)).div(new BN(max_int));
	}

	// and return the result
	return p;
}

/**
 * Calculates dutch auction price after the time of interest has passed since
 * the auction has started
 *
 * The price is assumed to drop exponentially, according to formula:
 *      p(t) = p0 * 2^(-t/t0)
 * The price halves every t0 seconds passed from the start of the auction
 *
 * @param p0 initial price
 * @param t0 price halving time
 * @param t elapsed time
 * @param dt price update interval, optional, default is 1 (disabled)
 * @return price after `t` seconds passed, `p = p0 * 2^(-t/t0)`
 */
function price_formula_exp(p0, t0, t, dt = 1) {
	// apply the price update interval if required
	if(dt > 1) {
		t = Math.floor(t / dt) * dt;
	}

	// make sure p0 is BN, t0 and t  are expected to be numbers
	p0 = new BN(p0);

	// precision multiplier
	const pm = 2_000000000000000;

	// apply the exponentiation and return
	return p0.mul(new BN(pm * Math.pow(2, -t/t0))).div(new BN(pm));
}

/**
 * Calculates dutch auction price after the time of interest has passed since the auction has started
 *
 * The price is assumed to drop exponentially, according to formula:
 *      p(t) = p0 * 2^(-t/t0)
 * The price halves every t0 seconds passed from the start of the auction
 *
 * Calculates with the precision p0 * 2^(-1/256), meaning the price updates every t0 / 256 seconds
 * For example, if halving time is one hour, the price updates every 14 seconds
 *
 * @param p0 initial price
 * @param t0 price halving time
 * @param t elapsed time
 * @param dt price update interval, optional, default is 1 (disabled)
 * @return price after `t` seconds passed, `p = p0 * 2^(-t/t0)`
 */
function price_formula_sol(p0, t0, t, dt = 1) {
	// apply the price update interval if required
	if(dt > 1) {
		t = Math.floor(t / dt) * dt;
	}

	// perform very rough price estimation first by halving
	// the price as many times as many t0 intervals have passed
	let p = p0.shrn(Math.floor(t / t0));

	// if price halves (decreases by 2 times) every t0 seconds passed,
	// than every t0 / 2 seconds passed it decreases by sqrt(2) times (2 ^ (1/2)),
	// every t0 / 2 seconds passed it decreases 2 ^ (1/4) times, and so on

	// we've prepared a small cheat sheet here with the pre-calculated values for
	// the roots of the degree of two 2 ^ (1 / 2 ^ n)
	// for the resulting function to be monotonically decreasing, it is required
	// that (2 ^ (1 / 2 ^ n)) ^ 2 <= 2 ^ (1 / 2 ^ (n - 1))
	// to emulate floating point values, we present them as nominator/denominator
	// roots of the degree of two nominators:
	const sqrNominator = [
		1_414213562373095, // 2 ^ (1/2)
		1_189207115002721, // 2 ^ (1/4)
		1_090507732665257, // 2 ^ (1/8) *
		1_044273782427413, // 2 ^ (1/16) *
		1_021897148654116, // 2 ^ (1/32) *
		1_010889286051700, // 2 ^ (1/64)
		1_005429901112802, // 2 ^ (1/128) *
		1_002711275050202  // 2 ^ (1/256)
	];
	// roots of the degree of two denominator:
	const sqrDenominator =
		1_000000000000000;

	// perform up to 8 iterations to increase the precision of the calculation
	// dividing the halving time `t0` by two on every step
	for(let i = 0; i < sqrNominator.length && t > 0 && t0 > 1; i++) {
		// determine the reminder of `t` which requires the precision increase
		t %= t0;
		// halve the `t0` for the next iteration step
		t0 = t0 >> 1;
		// if elapsed time `t` is big enough and is "visible" with `t0` precision
		if(t >= t0) {
			// decrease the price accordingly to the roots of the degree of two table
			p = p.mul(new BN(sqrDenominator)).div(new BN(sqrNominator[i]));
		}
		// if elapsed time `t` is big enough and is "visible" with `2 * t0` precision
		// (this is possible sometimes due to rounding errors when halving `t0`)
		if(t >= 2 * t0) {
			// decrease the price again accordingly to the roots of the degree of two table
			p = p.mul(new BN(sqrDenominator)).div(new BN(sqrNominator[i]));
		}
	}

	// return the result
	return p;
}

// export public utils API
module.exports = {
	price_formula_percent,
	price_formula_exp,
	price_formula_sol,
}
