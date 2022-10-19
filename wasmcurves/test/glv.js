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

    // Prints the hex representation of a single coordinates in a point
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

    it("scalarMul is correct.", async () => {
        const input = [0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn, 0x8b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n]
        const scalar = 9003405095674209932115908784230457051068760537362306482987933690960811974463n;
        const pExpectedOutput = pb.alloc(n8q * 3);
        const pPoints = pb.alloc(n8q * 3);
        const pScalar = pb.alloc(n8r);
        pb.set(pScalar, scalar, n8r);
        pb.set(pPoints, input[0], 48);
        pb.set(pPoints + 48, input[1], 48);
        pb.f1m_one(pPoints + 96);
        pb.f1m_toMontgomery(pPoints, pPoints);
        pb.f1m_toMontgomery(pPoints + 48, pPoints + 48);
        pb.g1m_timesScalar(pPoints, pScalar, n8r, pExpectedOutput);
        pb.g1m_normalize(pExpectedOutput, pExpectedOutput);
        printG1("Expected: ", pExpectedOutput);

        const pScalar512 = pb.alloc(64);
        pb.set(pScalar512, scalar, 64);
        pb.set(pScalar512, scalar, 64);
        const pScalarSplit = pb.alloc(64);
        const pConvertedPoint = pb.alloc(n8q * 3);
        const pAccumulator = pb.alloc(n8q * 3);
        const pCalculated = pb.alloc(n8q * 3);
        let sign = pb.g1m_glv_decomposeScalar(pScalar512, pScalarSplit);
        console.log("sign: ", sign);
        console.log("sign&1: ", sign&1);
        console.log("sign&2: ", sign&2);
        pb.g1m_glv_endomorphism(pPoints, sign&1, pConvertedPoint);
        pb.g1m_timesScalar(pConvertedPoint, pScalarSplit, n8r/2, pAccumulator);
        pb.g1m_glv_endomorphism(pPoints, sign&2, pConvertedPoint);
        pb.g1m_timesScalar(pConvertedPoint, pScalarSplit+n8r/2, n8r/2, pCalculated);
        pb.g1m_add(pAccumulator, pCalculated, pAccumulator);
        pb.g1m_normalize(pAccumulator, pAccumulator);
        printG1("Output: ", pAccumulator);
    });
});
