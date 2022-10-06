const assert = require("assert");
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("Basic tests for batch affine in bls12-381", function () {
    this.timeout(10000000);
    // Fq: 48 bytes = 384 bits
    const n8q = 48;
    // Fr: 32 bytes = 256 bits
    const n8r = 32;
    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, n8q);
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

    it("organizeBucketsOneRound is correct.", async () => {
        let inputs = [0x0000000000000000, 0x0000000100000003, 0x0000000200000000, 0x0000000300000001, 0x0000000400000002, 0x0000000500000001, 0x0000000600000003];
        let expectedOutput = [0x0000000000000000, 0x0000000200000000, 0x0000000300000001, 0x0000000500000001, 0x0000000400000002, 0x0000000100000003, 0x0000000600000003];
        let numPoints = 7;
        let numBuckets = 8;
        const pPointSchedules = pb.alloc(8 * numPoints);
        const pMetadata = pb.alloc(8 * numPoints);
        for (let i = 0; i < numPoints; i++) {
            pb.set(pPointSchedules + 8 * i, inputs[i], 8);
        }
        pb.g1m_multiexp_organizeBucketsOneRound(pPointSchedules, numPoints, numBuckets, pMetadata);
        let output = pb.get(pMetadata, numPoints, 8);
        for (let i = 0; i < numPoints; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("organizeBuckets is correct.", async () => {
        let inputs = [
            0x0000000000000000, 0x0000000100000003, 0x0000000200000000, 0x0000000300000001, 0x0000000400000002, 0x0000000500000001, 0x0000000600000003,
            0x0000000000000004, 0x0000000100000002, 0x0000000200000003, 0x0000000300000000, 0x0000000400000007, 0x0000000500000006, 0x0000000600000002,
        ];
        let expectedOutput = [
            0x0000000000000000, 0x0000000200000000, 0x0000000300000001, 0x0000000500000001, 0x0000000400000002, 0x0000000100000003, 0x0000000600000003,
            0x0000000300000000, 0x0000000100000002, 0x0000000600000002, 0x0000000200000003, 0x0000000000000004, 0x0000000500000006, 0x0000000400000007,
        ];
        const numPoints = 7;
        const numBuckets = 8;
        const numChunks = 2;
        const pPointSchedules = pb.alloc(8 * numChunks * numPoints);
        const pMetadata = pb.alloc(8 * numChunks * numPoints);
        for (let i = 0; i < numChunks * numPoints; i++) {
            pb.set(pPointSchedules + 8 * i, inputs[i], 8);
        }
        pb.g1m_multiexp_organizeBuckets(pPointSchedules, numPoints, numChunks, numBuckets, pMetadata);
        let output = pb.get(pMetadata, numChunks * numPoints, 8);
        for (let i = 0; i < numChunks * numPoints; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("constructAdditionChains is correct.", async () => {
        let inputs = [
            0x0000000000000000, 0x0000000100000000, 0x0000000200000000, 0x0000000800000001,
            0x0000000900000001, 0x0000000300000002, 0x0000000400000002, 0x0000000500000002,
            0x0000000600000002, 0x0000000700000002
        ];
        let expectedOutput = [
            0x0000000000000000, 0x0000000300000002, 0x0000000100000000, 0x0000000200000000,
            0x0000000800000001, 0x0000000900000001, 0x0000000400000002, 0x0000000500000002,
            0x0000000600000002, 0x0000000700000002
        ];
        let numPoints = 10;
        let numBuckets = 3;
        let maxCount = 3;
        const pPointSchedules = pb.alloc(8 * numPoints);
        const pBucketCounts = pb.alloc(4 * numBuckets);
        const pBitoffset = pb.alloc((numBuckets + 1) * 4);
        const pRes = pb.alloc(numPoints * 8);
        for (let i = 0; i < numPoints; i++) {
            pb.set(pPointSchedules + 8 * i, inputs[i], 8);
        }
        pb.set(pBitoffset, 0, 4);
        pb.set(pBitoffset + 4, 2, 4);
        pb.set(pBitoffset + 4 * 2, 6, 4);
        pb.set(pBitoffset + 4 * 3, 10, 4);
        pb.set(pBucketCounts, 3, 4);
        pb.set(pBucketCounts + 4, 2, 4);
        pb.set(pBucketCounts + 4 * 2, 5, 4);
        pb.g1m_multiexp_constructAdditionChains(pPointSchedules, maxCount, pBucketCounts, pBitoffset, numPoints, numBuckets, pRes);
        let output = pb.get(pRes, numPoints, 8);
        for (let i = 0; i < 10; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });
});
