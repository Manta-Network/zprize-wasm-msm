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

    it("decomposeScalar is correct.", async () => {
        const scalar = 90034050956742099321159087842304570510687605373623064829879336909608119744630n;
        const input = utils.bigInt2BytesLE(scalar, n8r);
        // let expectedOutput = [4, 10, 7, 5, 15];
        const pScalar = pb.alloc(n8r);
        for (let i = 0; i < n8r; i++) {
            pb.set(pScalar + i, input[i], 1);
        }
        const pScalarRes = pb.alloc(n8r);
        pb.g1m_glv_decomposeScalar(pScalar, pScalarRes);
        let output = pb.get(pScalarRes, 2, n8r/2);
        for (let i = 0; i < 2; i++) {
            console.log("i: ", output[i]);
            // assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("endomorphism is correct.", async () => {

    });

    it("scalarMul is correct.", async () => {

    });
});

// 90034050956742099321159087842304570510687605373623064829879336909608119744630
// C7 0D 77 8B CC EF 36 A8 1A ED 8D A0 B8 19 D2 BD 28 BD 86 53 E5 6A 5D 40 90 3D  F1  A0  AD  E0  B8  76

// 340282366841710300967557013911933920184