const assert = require("assert");
const buildBn128 = require("../src/bn128/build_bn128.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("Basic tests for g1 in bn128", () => {
    function ns(p) {
        pb.f1m_fromMontgomery(p, p);
        const n = pb.get(p);
        pb.f1m_toMontgomery(p, p);
        return "0x" + n.toString(16);
    }

    function printG1(s, p) {
        console.log(s + " G1(" + ns(p) + " , " + ns(p+n8) + " , " + ns(p+n8*2) + ")"   );
    }

    let pb;
    const n8=32;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBn128(module);
        }, n8);
    });

    it("It should do a basic point doubling adding G1", async () => {
        const pG1 = pb.bn128.pG1gen;

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);

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

    it("It should do a basic doubling adding G1", async () => {
        const pG1 = pb.bn128.pG1gen;

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);

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
    it("It should timesScalar G1", async () => {

        const s=2;
        const pG1 = pb.bn128.pG1gen;

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);
        const ps = pb.alloc(n8);

        pb.set(ps, s);

        pb.g1m_timesScalar(pG1, ps, n8, p1);

        pb.g1m_zero(p2);

        for (let i=0; i<s; i++) {
            pb.g1m_add(pG1,p2, p2);
        }

        assert.equal(pb.g1m_eq(p1, p2), 1);
    });


    it("It should test multiexp", async () => {
        const N=8;
        const pG1 = pb.bn128.pG1gen;

        const pExpected = pb.alloc(n8*3);
        const pScalarExpected = pb.alloc(n8*N);
        let acc=0;
        for (let i=0; i<N; i++) {
            acc += (i+1)*(i+1);
        }
        pb.set(pScalarExpected, acc);
        pb.g1m_timesScalar(pG1, pScalarExpected, n8, pExpected);

        const pCalculated = pb.alloc(n8*3);
        const pRes = pb.alloc(n8*3);
        const pResWithGLV = pb.alloc(n8*3);
        const pPreprocessedPoints = pb.alloc(N * n8 * 2 * 2);
        const pPreprocessedScalars = pb.alloc(N * n8 * 2);

        // Set scalars to 1,2,3
        const pScalars = pb.alloc(n8*N);
        for (let i=0; i<N; i++) {
            pb.set(pScalars+i*n8, i+1);
        }

        // Set points to 1*G, 2*G, 3*G
        const pPoints = pb.alloc(n8*2*N);
        for (let i=0; i<N; i++) {
            pb.g1m_timesScalarAffine(pG1, pScalars+n8*i, n8, pCalculated);
            pb.g1m_toAffine(pCalculated, pPoints+i*n8*2);
        }

        // Do yhe multiexp:  1*1*G + 2*2*G + ...
        pb.g1m_multiexpAffine_wasmcurve(pPoints, pScalars, n8, N, pCalculated);
        pb.g1m_normalize(pCalculated, pCalculated);

        pb.g1m_multiexp_multiExp(pPoints, pScalars, N, pRes);
        pb.g1m_normalize(pRes, pRes);


        pb.g1m_glv_preprocessEndomorphism(pPoints, pScalars, N, pPreprocessedPoints, pPreprocessedScalars);
        pb.g1m_multiexp_multiExp(pPreprocessedPoints, pPreprocessedScalars, N * 2, pResWithGLV);
        pb.g1m_normalize(pResWithGLV, pResWithGLV);



        assert(pb.g1m_eq(pExpected, pCalculated));
        assert(pb.g1m_eq(pExpected, pRes));
        assert(pb.g1m_eq(pExpected, pResWithGLV));

    });

    it("Benchmark multiexp", async () => {
        const N=1<<14;
        REPEAT = 10;
        const pG1 = pb.bn128.pG1gen;

        const pExpected = pb.alloc(n8*3);
        const pScalarExpected = pb.alloc(n8*N);
        let acc=0;
        for (let i=0; i<N; i++) {
            acc += (i+1)*(i+1);
        }
        pb.set(pScalarExpected, acc);
        pb.g1m_timesScalar(pG1, pScalarExpected, n8, pExpected);

        const pCalculated = pb.alloc(n8*3);
        const pRes = pb.alloc(n8*3);
        const pResWithGLV = pb.alloc(n8*3);
        const pPreprocessedPoints = pb.alloc(N * n8 * 2 * 2);
        const pPreprocessedScalars = pb.alloc(N * n8 * 2);

        // Set scalars to 1,2,3
        const pScalars = pb.alloc(n8*N);
        for (let i=0; i<N; i++) {
            pb.set(pScalars+i*n8, i+1);
        }

        // Set points to 1*G, 2*G, 3*G
        const pPoints = pb.alloc(n8*2*N);
        for (let i=0; i<N; i++) {
            pb.g1m_timesScalarAffine(pG1, pScalars+n8*i, n8, pCalculated);
            pb.g1m_toAffine(pCalculated, pPoints+i*n8*2);
        }

        // benchmark the multiexp
        console.log("Starting multiExp");
        let start, end;

        start = new Date().getTime();
        for (let i = 0; i < REPEAT; i++) {
            pb.g1m_multiexpAffine_wasmcurve(pPoints, pScalars, n8, N, pCalculated);
        }
        end = new Date().getTime();
        time = end - start;
        pb.g1m_normalize(pCalculated, pCalculated);
        console.log("wasmcurve msm Time (ms): " + time);
        start = new Date().getTime();
        for (let i = 0; i < REPEAT; i++) {
            pb.g1m_multiexp_multiExp(pPoints, pScalars, N, pRes);
        }
        end = new Date().getTime();
        time = end - start;
        pb.g1m_normalize(pRes, pRes);
        console.log("batchAffine msm Time (ms): " + time);
        start = new Date().getTime();
        for (let i = 0; i < REPEAT; i++) {
            pb.g1m_glv_preprocessEndomorphism(pPoints, pScalars, N, pPreprocessedPoints, pPreprocessedScalars);
            pb.g1m_multiexp_multiExp(pPreprocessedPoints, pPreprocessedScalars, N * 2, pResWithGLV);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("multiexp+batchAffine+GLV msm Time (ms): " + time);
        pb.g1m_normalize(pResWithGLV, pResWithGLV);

        assert(pb.g1m_eq(pExpected, pCalculated));
        assert(pb.g1m_eq(pExpected, pRes));
        assert(pb.g1m_eq(pExpected, pResWithGLV));

    }).timeout(10000000);



});
