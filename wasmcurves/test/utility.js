const assert = require("assert");
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("Utility Tests", function () {
    this.timeout(10000000);
    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, 1);
    });

    it("storeI32 and loadI32 is correct.", async () => {
        let length = 5;
        const input = [4, 9, 5, 2, 11];
        let expectedOutput = [4, 10, 7, 5, 15];
        const pArr = pb.alloc(4 * length);
        for (let i = 0; i < length; i++) {
            pb.set(pArr + 4 * i, input[i], 4);
        }
        pb.g1m_multiexp_testLoadStoreI32(pArr, length);
        let output = pb.get(pArr, length, 4);
        for (let i = 0; i < length; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("storeI64 and loadI64 is correct.", async () => {
        let length = 5;
        const input = [4, 9, 5, 2, 11];
        let expectedOutput = [4, 10, 7, 5, 15];
        const pArr = pb.alloc(8 * length);
        for (let i = 0; i < length; i++) {
            pb.set(pArr + 8 * i, input[i], 8);
        }
        pb.g1m_multiexp_testLoadStoreI64(pArr, length);
        let output = pb.get(pArr, length, 8);
        for (let i = 0; i < length; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("maxArrayValue is correct.", async () => {
        let length = 5;
        const input = [4, 9, 5, 2, 11];
        let expectedOutput = 11;
        const pArr = pb.alloc(4 * length);
        let max = pb.alloc(4);
        for (let i = 0; i < length; i++) {
            pb.set(pArr + 4 * i, input[i], 4);
        }
        pb.g1m_multiexp_testMaxArrayValue(pArr, length, max);
        let output = pb.get(max, 1, 4);
        assert.equal(output, expectedOutput);
    });

    it("getMsb is correct.", async () => {
        let length = 5;
        const input = [0xFFFFFFFF, 0x7FF7FF0F, 0xFFFFFF, 0x3, 0x31];
        let expectedOutput = [32, 31, 24, 2, 6];
        const pArr = pb.alloc(4 * length);
        let pMsb = pb.alloc(4*length);
        for (let i = 0; i < length; i++) {
            pb.set(pArr + 4 * i, input[i], 4);
        }
        pb.g1m_multiexp_testGetMsb(pArr, length, pMsb);
        let output = pb.get(pMsb, length, 4);
        for (let i = 0; i < length; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });
});
