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
    const zero = 0;
    const beta = 793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n;
    const divisor = -52435875175126190479447740508185965837690552500527637822603658699938581184513n; // v0*u1 - v1*u0
    const pU0 = module.alloc(64, utils.bigInt2BytesLE(u0, 64));
    const pU1 = module.alloc(64, utils.bigInt2BytesLE(u1, 64));
    const pV0 = module.alloc(64, utils.bigInt2BytesLE(v0, 64));
    const pV1 = module.alloc(64, utils.bigInt2BytesLE(v1, 64));
    const pNegV1 = module.alloc(64, utils.bigInt2BytesLE(negV1, 64));
    const pZero = module.alloc(64, utils.bigInt2BytesLE(zero, 64));
    const pBeta = module.alloc(64, utils.bigInt2BytesLE(beta, 64));
    const pDivisor = module.alloc(64, utils.bigInt2BytesLE(divisor, 64));

    // Given a pointer `pScalar` to a 256-bit scalar stored in 512-bit, decomposes into two 128-bit scalars pointed by `pScalarRes`.
    function buildDecomposeScalar() {
        const f = module.addFunction(fnName + "_decomposeScalar");
        // Pointer to a 256-bit scalar stored in 512-bit memory
        f.addParam("pScalar", "i32");
        // Pointer to two 128-bit scalars
        f.addParam("pScalarRes", "i32");
        // Pointer to a 512-bit scratch space.
        f.addLocal("pScratchSpace", "i32");
        // Pointer to a 512-bit scratch space.
        f.addLocal("pScratchSpace1", "i32");
        // Pointer to a 512-bit q1.
        f.addLocal("pQ1", "i32");
        // Pointer to a 512-bit q2.
        f.addLocal("pQ2", "i32");
        // Pointer to a 512-bit k1.
        f.addLocal("pK1", "i32");
        // Pointer to a 512-bit k2.
        f.addLocal("pK2", "i32");
        // Pointer to a 512-bit remainder.
        f.addLocal("pQr", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("pScratchSpace", c.call(prefix + "_utility_allocateMemory", c.i32_const(64))),
            c.setLocal("pScratchSpace1", c.call(prefix + "_utility_allocateMemory", c.i32_const(64))),
            c.setLocal("pQ1", c.call(prefix + "_utility_allocateMemory", c.i32_const(64))),
            c.setLocal("pQ2", c.call(prefix + "_utility_allocateMemory", c.i32_const(64))),
            c.setLocal("pK1", c.call(prefix + "_utility_allocateMemory", c.i32_const(64))),
            c.setLocal("pK2", c.call(prefix + "_utility_allocateMemory", c.i32_const(64))),
            // let q1 = (u1 * pScalar) / ((v0 * u1) - (v1 * u0));
            c.call(prefix + "_int512_mul", c.getLocal("pScalar"), c.i32_const(pU1), c.getLocal("pScratchSpace")),
            c.call(prefix + "_int512_div", c.getLocal("pScratchSpace"), c.i32_const(pDivisor), c.getLocal("pQ1"), c.getLocal("pQr")),
            // let q2 = (-v1 * pScalar) / ((v0 * u1) - (v1 * u0));
            c.call(prefix + "_int512_mul", c.getLocal("pScalar"), c.i32_const(pNegV1), c.getLocal("pScratchSpace")),
            c.call(prefix + "_int512_div", c.getLocal("pScratchSpace"), c.i32_const(pDivisor), c.getLocal("pQ2"), c.getLocal("pQr")),
            // let pK1 = pScalar - &q1 * v0 - &q2 * u0;
            c.call(prefix + "_int512_mul", c.getLocal("pQ1"), c.i32_const(pV0), c.getLocal("pScratchSpace")),
            c.setLocal("pK1", c.call(prefix + "_int512_sub", c.getLocal("pScalar"), c.getLocal("pScratchSpace"), c.i32_const(pZero))),
            c.call(prefix + "_int512_mul", c.getLocal("pQ2"), c.i32_const(pU0), c.getLocal("pScratchSpace")),
            c.setLocal("pK1", c.call(prefix + "_int512_sub", c.getLocal("pK1"), c.getLocal("pScratchSpace"), c.i32_const(pZero))),
            // let pK2 = - (q1 * v.1 + q2 * u.1);
            c.call(prefix + "_int512_mul", c.getLocal("pQ1"), c.i32_const(pV1), c.getLocal("pScratchSpace")),
            c.call(prefix + "_int512_mul", c.getLocal("pQ2"), c.i32_const(pU1), c.getLocal("pScratchSpace1")),
            c.setLocal("pK2",
                c.call(prefix + "_int512_sub",
                    c.i32_const(pZero),
                    c.call(prefix + "_int512_add", c.getLocal("pScratchSpace"), c.getLocal("pScratchSpace1"), c.i32_const(pZero)),
                    c.i32_const(pZero),
                ),
            ),
            // pScalarRes = [pK1[0], pK1[1], pK2[0], pK2[1]]
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(0), c.call(prefix + "_utility_loadI64", c.getLocal("pK1"), c.i32_const(0))),
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(1), c.call(prefix + "_utility_loadI64", c.getLocal("pK1"), c.i32_const(1))),
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(2), c.call(prefix + "_utility_loadI64", c.getLocal("pK2"), c.i32_const(0))),
            c.call(prefix + "_utility_storeI64", c.getLocal("pScalarRes"), c.i32_const(3), c.call(prefix + "_utility_loadI64", c.getLocal("pK2"), c.i32_const(1))),
            c.i32_store(c.i32_const(0), c.getLocal("pScratchSpace")),
        );
    }

    // Given a point P = (x, y) at `pPoint`, computes a new point Q = (beta*x, y) and stores at `pPointRes`.
    function buildEndomorphism() {
        const f = module.addFunction(fnName + "_endomorphism");
        f.addParam("pPoint", "i32");
        f.addParam("pPointRes", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.call(f1mField + "_mul", c.getLocal("pPoint"), c.i32_const(pBeta), c.getLocal("pPointRes")),
            c.call(f1mField + "_copy", c.i32_add(c.getLocal("pPoint"), c.i32_const(n8q)), c.i32_add(c.getLocal("pPointRes"), c.i32_const(n8q))),
        );
    }

    buildDecomposeScalar();
    buildEndomorphism();
    module.exportFunction(fnName + "_decomposeScalar");
    module.exportFunction(fnName + "_endomorphism");
};
