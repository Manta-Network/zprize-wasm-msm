const utils = require("./utils.js");

// Supports only BLS12-381.
module.exports = function buildGLV(module, prefix, fnName) {
    const n8r = 32;
    const n8q = 48;
    const f1mField = "f1m";
    const g1mField = "g1m";

    const u0 = 1;
    const u1 = -228988810152649578064853576960394133503n;
    const v0 = 228988810152649578064853576960394133504n;
    const v1 = 1;
    const negV1 = -1;
    const negOne = -1;
    const zero = 0;
    const beta = 793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n;
    const divisor = -52435875175126190479447740508185965837690552500527637822603658699938581184513n; // v0*u1 - v1*u0
    const pU0 = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(u0, 64)));
    const pU1 = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(u1, 64)));
    const pV0 = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(v0, 64)));
    const pV1 = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(v1, 64)));
    const pNegV1 = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(negV1, 64)));
    const pNegOne = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(negOne, 64)));
    const pZero = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(zero, 64)));
    const pBeta = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(beta, 64)));
    const pDivisor = c.i32_const(module.alloc(64, utils.bigInt2BytesLE(divisor, 64)));
    const pScratchSpace = c.i32_const(module.alloc(64));
    const pScratchSpace1 = c.i32_const(module.alloc(64));
    const pQ1 = c.i32_const(module.alloc(64));
    const pQ2 = c.i32_const(module.alloc(64));
    const pK1 = c.i32_const(module.alloc(64));
    const pK2 = c.i32_const(module.alloc(64));

    // Given a pointer `pScalar` to a 256-bit scalar stored in 512-bit, decomposes into two 128-bit scalars pointed by `pScalarRes`.
    function buildDecomposeScalar() {
        const f = module.addFunction(fnName + "_decomposeScalar");
        const c = f.getCodeBuilder();
        // Pointer to a 256-bit scalar stored in 512-bit memory
        f.addParam("pScalar", "i32");
        // Pointer to two 128-bit scalars
        f.addParam("pScalarRes", "i32");
        f.addcode(
            // let q1 = (u1 * pScalar) / ((v0 * u1) - (v1 * u0));
            c.call(prefix + "_int512_mul", c.getLocal("pScalar"), pU1, pScratchSpace),
            c.call(prefix + "_int512_div", pScratchSpace, pDivisor, pQ1),
            // let q2 = (-v1 * pScalar) / ((v0 * u1) - (v1 * u0));
            c.call(prefix + "_int512_mul", c.getLocal("pScalar"), pNegV1, pScratchSpace),
            c.call(prefix + "_int512_div", pScratchSpace, pDivisor, pQ2),
            // let pK1 = pScalar - &q1 * v0 - &q2 * u0;
            c.call(prefix + "_int512_mul", pQ1, pV0, pScratchSpace),
            c.call(prefix + "_int512_sub", c.getLocal("pScalar"), pScratchSpace, pK1),
            c.call(prefix + "_int512_mul", pQ2, pU0, pScratchSpace),
            c.call(prefix + "_int512_sub", pK1, pScratchSpace, pK1),
            // let pK2 = - (q1 * v.1 + q2 * u.1);
            c.call(intField + "_mul", pQ1, pV1, pScratchSpace),
            c.call(intField + "_mul", pQ2, pU1, pScratchSpace1),
            c.call(intField + "_add", pScratchSpace, pScratchSpace1, pK2),
            c.call(intField + "_sub", pZero, pK2, pK2),
            // pScalarRes = [pK1[0], pK1[1], pK2[0], pK2[1]]
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(0), c.call(prefix + "_utility_loadI64", pK1, c.i32_const(0))),
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(1), c.call(prefix + "_utility_loadI64", pK1, c.i32_const(1))),
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(2), c.call(prefix + "_utility_loadI64", pK2, c.i32_const(0))),
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(3), c.call(prefix + "_utility_loadI64", pK2, c.i32_const(1))),
        );
    }

    // Given a point P = (x, y) at `pPoint`, computes a new point Q = (beta*x, y) and stores at `pPointRes`.
    function buildEndomorphism() {
        const f = module.addFunction(fnName + "_endomorphism");
        const c = f.getCodeBuilder();
        f.addParam("pPoint", "i32");
        f.addParam("pPointRes", "i32");
        f.addcode(
            c.call(f1mField + "_mul", c.getLocal("pPoint"), pBeta, c.getLocal("pPointRes")),
            c.call(f1mField + "_copy", c.i32_add(c.getLocal("pPoint"), c.i32_const(n8q)), c.i32_add(c.getLocal("pPointRes"), c.i32_const(n8q))),
        );
    }

    buildDecomposeScalar();
    buildEndomorphism();
    module.exportFunction(fnName + "_decomposeScalar");
    module.exportFunction(fnName + "_endomorphism");
};