const assert = require("assert");
const { modInv, isNegative } = require("../src/bigint.js");

const buildF1 = require("../src/f1");
const buildF1m = require("../src/build_f1m");
const build = require("../src/f1");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const ChaCha = require("ffjavascript").ChaCha;


describe("Basic tests for Zq", () => {
    // Fq: 48 bytes = 384 bits
    const n8q = 48;
    // Fr: 32 bytes = 256 bits
    const n8r = 32;

    function mod(x, p) {
        x = x % p;
        return x < 0n ? x + p : x;
    }

    it("It should profile int", async () => {

        let start,end,time;

        //const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
        // const A=(q - 1n);
        // const B=(q - 1n) >> 1n;

        const q = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        let A=(q - 1n)//(q - 1n);
        let B=(q - 1n) >> 6n//(q - 1n) >> 1n;
        A=1n//(q - 1n);
        B=3n//(q - 1n) >> 1n;
        let K = 13 * 30;
        let R = 1n << BigInt(K);
        R2 = mod(R * R, q)

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            buildTest2(module, "f1m_mul");
        }, 8*13);//48

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pR2 = pbF1m.alloc();
        const pC = pbF1m.alloc();
   
        pbF1m.set(pA, A);
        pbF1m.set(pB, B);
        pbF1m.set(pR2, R2);

        let z0 = mod(A * B, q);

        pbF1m.f1m_mul(pA, pB, pC)
        pbF1m.f1m_mul(pC, pR2, pC)
        // start = new Date().getTime();
        // //pbF1m.test_f1m_mul(pA, pB, pC, 5000000);
        // pbF1m.test_f1m_30bitMul(pA, pB, pC, 50000000);
        // end = new Date().getTime();
        // time = end - start;
        // console.log("30 limb Mul Time (ms): " + time);
        
        let z1 = pbF1m.get(pC);

        console.log(z1.toString(16))
        console.log(z0.toString(16))
        
    }).timeout(10000000);

    it("Should do inverse in montgomery", async () => {
        const q = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        const v= [
            1n,
            (q - 1n),
            (q - 2n),
            ((q - 1n) >> 1n),
            ((q - 1n) >> 1n) + 1n,
            ((q - 1n) >> 1n) + 2n,
            ((q - 1n) >> 1n) - 1n,
            ((q - 1n) >> 1n) - 2n,
            2n,
        ];

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
        }, 48);

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pC = pbF1m.alloc();

        for (let i=0; i<v.length; i++) {
            pbF1m.set(pA, v[i]);
            
            pbF1m.f1m_toMontgomery(pA, pA);
            pbF1m.f1m_inverse(pA, pB);
            pbF1m.f1m_mul(pA, pB, pC);
            pbF1m.f1m_fromMontgomery(pC, pC);

            const c = pbF1m.get(pC);
            assert(c, 1);
        }
    }).timeout(10000000);


    it("Test montgomery", async () => {

        let start,end,time;

        //const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
        // const A=(q - 1n);
        // const B=(q - 1n) >> 1n;

        const q = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        let A=(q - 1n)//(q - 1n);
        let B=(q - 1n) >> 6n//(q - 1n) >> 1n;
        A=1n//(q - 1n);
        B=2//(q - 1n) >> 1n;
        

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            buildTest2(module, "f1m_mul");
        }, 48);//48

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pC = pbF1m.alloc();

        pbF1m.set(pA, A);
        pbF1m.set(pB, B);

        pbF1m.f1m_toMontgomery(pA, pA);
        pbF1m.f1m_toMontgomery(pB, pB);
        pbF1m.f1m_mul(pA, pB, pC);
        pbF1m.f1m_fromMontgomery(pC, pC);   
        

        let z1 = pbF1m.get(pC);

        console.log(z1.toString());
        
    }).timeout(10000000);


    // Prints the hex representation of a single coordinates in a point
    
    

    it("Benchmark.", async () => {
        

        function printHex(p) {
            pb.f1m_fromMontgomery(p, p);
            const n = pb.get(p);
            pb.f1m_toMontgomery(p, p);
            return "0x" + n.toString(16);
        }
    
        // Prints the (x, y, z) coordinates of a G1 point
        function printG1(s, p) {
            console.log(s + " G1(" + printHex(p) + " , " + printHex(p + n8q) + " , " + printHex(p + n8q * 2) + ")");
        }

        let pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, n8q);

        const scale = 10;
        const N = 1 << scale;
        console.log("Number of Points: 2^", scale);
        const pG1 = pb.bls12381.pG1gen;
        const pCalculated = pb.alloc(n8q * 3);
        const REPEAT = 10;
        const pScalars = pb.alloc(n8r * N);
        

        const rng = new ChaCha();
        for (let i = 0; i < N * n8r / 4; i++) {
            pb.i32[pScalars / 4 + i] = rng.nextU32();
        }
        const pPointCoefficients = pb.alloc(n8r * N);
        for (let i = 0; i < N * n8r / 4; i++) {
            pb.i32[pPointCoefficients / 4 + i] = rng.nextU32();
        }
        const pPoints = pb.alloc(n8q * 2 * N);
        for (let i = 0; i < N; i++) {
            pb.g1m_timesScalarAffine(pG1, pPointCoefficients + n8r * i, n8r, pCalculated);
            pb.g1m_toAffine(pCalculated, pPoints + i * n8q * 2);
        }
        const pPreprocessedPoints = pb.alloc(N * n8q * 2 * 2);
        const pPreprocessedScalars = pb.alloc(N * n8r * 2);

        console.log("Starting multiExp");
        let start, end;
        start = new Date().getTime();
        for (let i = 0; i < REPEAT; i++) {
            pb.g1m_multiexpAffine_wasmcurve(pPoints, pScalars, n8r, N, pCalculated);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("wasmcurve msm Time (ms): " + time);

        // pb.g1m_normalize(pCalculated, pCalculated);
        // printG1("result: ",pCalculated)
        
        const pRes = pb.alloc(n8q * 3);
        start = new Date().getTime();
        for (let i = 0; i < REPEAT; i++) {
            pb.g1m_multiexp_multiExp(pPoints, pScalars, N, pRes);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("multiexp+batchAffine msm Time (ms): " + time);

        const pResWithGLV = pb.alloc(n8q * 3);
        start = new Date().getTime();
        for (let i = 0; i < REPEAT; i++) {
            pb.g1m_glv_preprocessEndomorphism(pPoints, pScalars, N, pPreprocessedPoints, pPreprocessedScalars);
            pb.g1m_multiexp_multiExp(pPreprocessedPoints, pPreprocessedScalars, N * 2, pResWithGLV);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("multiexp+batchAffine+GLV msm Time (ms): " + time);

        
        

        //                 13x30 bits                           12x32 bits        
        // 2^n        wasmcurve  batchAffine  GLV          wasmcurve  batchAffine   GLV
        // 10           ???         ???        ???           1478         1412      1041
        // 12           ???         ???        ???           5142         3895        3292
        // 14           10125        7079     6471           14279         10083        9101
        // 16           34405       22546    21912           46709         31739        33731

    }).timeout(10000000);


    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, n8q);
    });
    it("It should do a basic point doubling adding G1", async () => {
        const pG1 = pb.bls12381.pG1gen;

        const p1 = pb.alloc(n8q*3);
        const p2 = pb.alloc(n8q*3);

        pb.g1m_add(pG1, pG1, p1); // 2*G1
        pb.g1m_add(p1, pG1, p1);  // 3*G1
        pb.g1m_add(p1, pG1, p1);  // 4*G1

        pb.g1m_double(pG1, p2); // 2*G1
        pb.g1m_double(p2, p2); // 4*G1

        assert.equal(pb.g1m_isZero(pG1), 0);
        assert.equal(pb.g1m_eq(p1, p2), 1);

        pb.g1m_sub(p1, p2, p1);  // 0
        assert.equal(pb.g1m_isZero(p1), 1);

    });
    it("Test G1 timesScalar.", async () => {

        const s=10;
        const pG1 = pb.bls12381.pG1gen;

        const p1 = pb.alloc(n8q*3);
        const p2 = pb.alloc(n8q*3);
        const ps = pb.alloc(n8r);

        pb.set(ps, s);

        pb.g1m_timesScalar(pG1, ps, n8r, p1);

        pb.g1m_zero(p2);

        for (let i=0; i<s; i++) {
            pb.g1m_add(pG1,p2, p2);
        }

        assert.equal(pb.g1m_eq(p1, p2), 1);
    });
    

    it("Generator should be in group G1", async () => {
        const pG1 = pb.bls12381.pG1gen;

        assert.equal(pb.g1m_inGroupAffine(pG1), 1);
    });

    it("Point in curve and not in group G1", async () => {
        const p1 = pb.alloc(n8q*3);
        const pG1b = pb.bls12381.pG1b;

        pb.set(p1, 4n, n8q);
        pb.f1m_toMontgomery(p1, p1);
        pb.f1m_square(p1, p1+n8q);
        pb.f1m_mul(p1, p1+n8q, p1+n8q);
        pb.f1m_add(p1+n8q, pG1b, p1+n8q);

        assert.equal(pb.g1m_inGroupAffine(p1), 0);
        assert.equal(pb.g1m_inCurveAffine(p1), 0);

        pb.f1m_sqrt(p1+n8q, p1+n8q);

        assert.equal(pb.g1m_inGroupAffine(p1), 0);
        assert.equal(pb.g1m_inCurveAffine(p1), 1);

        const ph= pb.alloc(16);
        pb.set(ph, 0x396c8c005555e1568c00aaab0000aaabn, 16);

        pb.g1m_timesScalarAffine(p1, ph, 16  ,p1);

        assert.equal(pb.g1m_inCurve(p1), 1);
        assert.equal(pb.g1m_inGroup(p1), 1);
    });


});

