const assert = require("assert");
const ChaCha = require("ffjavascript").ChaCha;
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const utils = require("../src/utils");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("GLV Tests", function () {
    this.timeout(10000000);
    // Fq: 48 bytes = 384 bits
    const n8q = 48;
    // Fr: 32 bytes = 256 bits
    const n8r = 32;
    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, 1);
    });

    it("isPositive is correct.", async () => {
        const oneHandred = 100;
        const pOneHundred = pb.alloc(64);
        pb.set(pOneHundred, oneHandred, 64);
        // Note: wasmcurve cannot set negative numbers over 32, we use a workaround method to generate negtives.
        // The actual i^th inputs should be 100-inputs[i].
        const inputs = [0, 1, 100, 500, 9003405095674209932115908784230457051068760537362306482987933690960811974463n];
        const expectedOutput = [1, 1, 1, 0, 0];
        const pScalar = pb.alloc(64);
        const subtractor = pb.alloc(64);
        for (let i = 0; i < inputs.length; i++) {
            pb.set(subtractor, inputs[i], 64);
            pb.g1m_int512_sub(pOneHundred, subtractor, pScalar);
            let output = pb.g1m_glv_isPositive(pScalar);
            assert.equal(expectedOutput[i], output);
        }
    });

    it("decomposeScalar is correct.", async () => {
        const scalar = 9003405095674209932115908784230457051068760537362306482987933690960811974463n;
        const expectedOutput = [
            86900781371527243792514624323931922239n,
            39318100695279906693562908013718409681n,
        ];
        const pScalar = pb.alloc(64);
        pb.set(pScalar, scalar, 64);
        const pScalarRes = pb.alloc(64);
        let sign = pb.g1m_glv_decomposeScalar(pScalar, pScalarRes);
        let output = pb.get(pScalarRes, 2, 16);
        for (let i = 0; i < 2; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
        assert.equal(sign, 1);
    });

    it("endomorphism is correct.", async () => {

    });

    it("scalarMul is correct.", async () => {
        // k, P
        // k -> k1, k2
        // P -> P, Q
        // k*P = k1*P + k2*Q
    });
});
