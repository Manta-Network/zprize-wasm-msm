const assert = require("assert");
const { modInv } = require("../src/bigint.js");
const buildBn128 = require("../src/bn128/build_bn128.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("Basic tests for g1 in bn128", () => {

    let pb;
    const n8=32;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBn128(module);
        }, n8);
    });
    const ChaCha = require("ffjavascript").ChaCha;
    it("Benchmark.", async () => {
        let n8r=32;
        let n8q = 32;
        const scale = 16;
        const N = (1 << scale) ;
        console.log("Number of Points: 2^", scale);
        const pG1 = pb.bn128.pG1gen;
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
            pb.g1m_multiexp_multiExp(pPreprocessedPoints, pPreprocessedScalars, N * 2 , pResWithGLV);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("multiexp+batchAffine+GLV msm Time (ms): " + time);
        pb.g1m_normalize(pRes, pRes);
        pb.g1m_normalize(pCalculated, pCalculated);
        pb.g1m_normalize(pResWithGLV, pResWithGLV);

        let output = pb.get(pRes, 2, 32);
        let wasmcurveOutput = pb.get(pCalculated, 2, 32);
        let outputWithGLV = pb.get(pResWithGLV, 2, 32);
        assert.equal(output[0], wasmcurveOutput[0]);
        assert.equal(output[1], wasmcurveOutput[1]);
        assert.equal(output[0], outputWithGLV[0]);
        assert.equal(output[1], outputWithGLV[1]);
    }).timeout(100000000);
});
