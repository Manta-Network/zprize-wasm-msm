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

    it("countBits is correct.", async () => {
        let inputs = [3, 5, 2];
        let expectedOutput = [0, 2, 6, 10];
        const numBuckets = 3;
        const maxBucketBits = 3;
        const pBucketCounts = pb.alloc(4 * numBuckets);
        const pBitOffsets = pb.alloc(4 * (numBuckets + 1));
        for (let i = 0; i < numBuckets; i++) {
            pb.set(pBucketCounts + 4 * i, inputs[i], 4);
        }
        pb.g1m_multiexp_countBits(pBucketCounts, numBuckets, maxBucketBits, pBitOffsets);
        let output = pb.get(pBitOffsets, numBuckets + 1, 4);
        for (let i = 0; i < numBuckets + 1; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("getChunk is correct.", async () => {
        const inputScalarArr = [0xF, 0xF0, 0x70, 0xE5, 0xFFFF, 0xE51, 0x7E51,
            0x27E51, 0x927E51, 0x8927E51, 0xF8927E51, 0x1F8927E51];
        const chunkSizeArr = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
        const scalarSizeArr = [1, 1, 1, 1, 2, 2, 2, 3, 5, 4, 4, 5];
        const numChunksArr = [1, 2, 2, 2, 4, 3, 4, 4, 5, 6, 7, 8];
        const expectedOutputArr = [
            [15],
            [16, 7],
            [16, 3],
            [5, 7],
            [31, 31, 31, 1],
            [17, 18, 3],
            [17, 18, 31, 0],
            [17, 18, 31, 4],
            [17, 18, 31, 4, 9],
            [17, 18, 31, 4, 9, 4],
            [17, 18, 31, 4, 9, 28, 3],
            [17, 18, 31, 4, 9, 28, 7, 0],
        ];
        for (let i = 0; i < 12; i++) {
            let inputScalar = inputScalarArr[i];
            const chunkSize = chunkSizeArr[i];
            const scalarSize = scalarSizeArr[i];
            const numChunks = numChunksArr[i];
            let expectedOutput = expectedOutputArr[i];
            const pScalar = pb.alloc(scalarSize);
            const pChunks = pb.alloc(4 * numChunks);
            pb.set(pScalar, inputScalar, scalarSize);
            pb.g1m_multiexp_testGetChunk(pScalar, scalarSize, chunkSize, pChunks);
            let output = pb.get(pChunks, numChunks, 4);
            if (numChunks == 1) {
                assert.equal(output, expectedOutput[0]);
            } else {
                for (let i = 0; i < numChunks; i++) {
                    assert.equal(output[i], expectedOutput[i]);
                }
            }
        }
    });

    it("constructAdditionChains is correct.", async () => {
        let inputs = [
            0x0000000000000000, 0x0000000100000000, 0x0000000200000000, 0x0000000800000001,
            0x0000000900000001, 0x0000000300000002, 0x0000000400000002, 0x0000000500000002,
            0x0000000600000002, 0x0000000700000002
        ];
        let precomputedBitOffset = [0, 2, 6, 10];
        let precomputedBucketCounts = [3, 2, 5];
        let expectedOutput = [
            0x0000000000000000, 0x0000000300000002, 0x0000000100000000, 0x0000000200000000,
            0x0000000800000001, 0x0000000900000001, 0x0000000400000002, 0x0000000500000002,
            0x0000000600000002, 0x0000000700000002
        ];
        let numPoints = 10;
        let numBuckets = 3;
        const pPointSchedules = pb.alloc(8 * numPoints);
        const pBucketCounts = pb.alloc(4 * numBuckets);
        const pBitOffsets = pb.alloc((numBuckets + 1) * 4);
        const pMetadata = pb.alloc(8 * numPoints);
        for (let i = 0; i < numPoints; i++) {
            pb.set(pPointSchedules + 8 * i, inputs[i], 8);
        }
        for (let i = 0; i < numBuckets + 1; i++) {
            pb.set(pBitOffsets + 4 * i, precomputedBitOffset[i], 4);
        }
        for (let i = 0; i < numBuckets; i++) {
            pb.set(pBucketCounts + 4 * i, precomputedBucketCounts[i], 4);
        }
        pb.g1m_multiexp_constructAdditionChains(pPointSchedules, numPoints, numBuckets, pBucketCounts, pBitOffsets, pMetadata);
        let output = pb.get(pMetadata, numPoints, 8);
        for (let i = 0; i < numPoints; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("singlePointComputeSchedule is correct.", async () => {
        const inputScalarArr = [0xF, 0xF0, 0x70, 0xE5, 0xFFFF, 0xE51, 0x7E51,
            0x27E51, 0x927E51, 0x8927E51, 0xF8927E51, 0x1F8927E51];
        const scalarSizeArr = [1, 1, 1, 1, 2, 2, 2, 3, 5, 4, 4, 5];
        const chunkSizeArr = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
        const pointIdxArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const numChunksArr = [1, 2, 2, 2, 4, 3, 4, 4, 5, 6, 7, 8];
        const expectedOutputPointSchedulesArr = [
            [0x000000000000000F],
            [0x0000000000000010, 0x0000000000000007],
            [0x0000000000000010, 0x0000000000000003],
            [0x0000000000000005, 0x0000000000000007],
            [0x000000000000001F, 0x000000000000001F, 0x000000000000001F, 0x0000000000000001],
            [0x0000000000000011, 0x0000000000000012, 0x0000000000000003],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F,
                0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F,
                0x0000000000000004],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F,
                0x0000000000000004, 0x0000000000000009],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F,
                0x0000000000000004, 0x0000000000000009, 0x0000000000000004],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F,
                0x0000000000000004, 0x0000000000000009, 0x000000000000001C, 0x0000000000000003],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F,
                0x0000000000000004, 0x0000000000000009, 0x000000000000001C, 0x0000000000000007, 0xffffffffffffffffn],
        ];
        const expectedOutputRoundCountsArr = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        ];
        for (let i = 0; i < 12; i++) {
            let inputScalar = inputScalarArr[i];
            const scalarSize = scalarSizeArr[i];
            const chunkSize = chunkSizeArr[i];
            const pointIdx = pointIdxArr[i];
            const numPoints = 1;
            const numChunks = numChunksArr[i];
            const bucketCounts = 32;
            let expectedOutputPointSchedules = expectedOutputPointSchedulesArr[i];
            let expectedOutputRoundCounts = expectedOutputRoundCountsArr[i];
            const pScalar = pb.alloc(scalarSize);
            const pPointSchedules = pb.alloc(8 * numChunks);
            const pRoundCounts = pb.alloc(4 * bucketCounts);
            pb.set(pScalar, inputScalar, scalarSize);
            pb.g1m_multiexp_singlePointComputeSchedule(pScalar, scalarSize, chunkSize, pointIdx, numPoints, numChunks, pPointSchedules, pRoundCounts);
            let outputPointSchedules = pb.get(pPointSchedules, numChunks, 8);
            let outputRoundCounts = pb.get(pRoundCounts, bucketCounts, 4);
            if (numChunks == 1) {
                assert.equal(outputPointSchedules, expectedOutputPointSchedules[0]);
            } else {
                for (let i = 0; i < numChunks; i++) {
                    assert.equal(outputPointSchedules[i], expectedOutputPointSchedules[i]);
                }
            }
            for (let i = 0; i < bucketCounts; i++) {
                assert.equal(outputRoundCounts[i], expectedOutputRoundCounts[i]);
            }
        }
    });

    it("rearrangePoints is correct.", async () => {
        // use fake point for simplicity
        let points = [
            0x000011111111111111, 0x000022222222222222, 
            0x11111111, 0x11112222, 0x22221111, 0x22222222, 0x33331111, 0x33332222, 
            0x44441111, 0x44442222, 0x55551111, 0x55552222, 0x66661111, 0x66662222, 
            0x77771111, 0x77772222, 0x88881111, 0x88882222, 0x99991111, 0x99992222
        ];
        let schedules = [
            0x0000000000000000, 0x0000000300000002, 0x0000000100000000, 0x0000000200000000,
            0x0000000800000001, 0x0000000900000001, 0x0000000400000002, 0x0000000500000002,
            0x0000000600000002, 0x0000000700000002
        ];
        let expectedOutput = [
            0x000011111111111111, 0x000022222222222222, 
            0x33331111, 0x33332222, 0x11111111, 0x11112222, 0x22221111, 0x22222222, 
            0x88881111, 0x88882222, 0x99991111, 0x99992222, 0x44441111, 0x44442222,
            0x55551111, 0x55552222, 0x66661111, 0x66662222, 0x77771111, 0x77772222
        ];
        let numPoints = 10;
        const pPointSchedules = pb.alloc(8 * numPoints);
        const pPoints = pb.alloc(numPoints * n8q * 2);
        const pRes = pb.alloc(numPoints * n8q * 2);

        for (let i = 0; i < numPoints; i++) {
            pb.set(pPointSchedules + 8 * i, schedules[i], 8);
        }
        for (let i = 0; i < numPoints; i++) {
            pb.set(pPoints + 96 * i, points[i * 2], 48);
            pb.set(pPoints + 96 * i + 48, points[i * 2 + 1], 48);
        }
        pb.g1m_multiexp_rearrangePoints(numPoints, pPoints, pPointSchedules, pRes);
        let output = pb.get(pRes, numPoints * 2 , 48);
        for (let i = 0; i < numPoints * 2; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });
});
