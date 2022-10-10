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

    // Note: This supports only scalarSize as a multiple of 4.
    it("singlePointComputeSchedule is correct.", async () => {
        const inputScalarArr = [
            0x0000000F, 0x000000F0, 0x00000070, 0x000000E5,
            0x0000FFFF, 0x00000E51, 0x00007E51, 0x00027E51,
            0x00927E51, 0x08927E51, 0xF8927E51];
        const scalarSize = 4;
        const chunkSize = 5;
        const pointIdx = 0;
        const numChunks = 7;
        const numPoints = 1;
        const expectedOutputPointSchedulesArr = [
            [0x000000000000000F, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000010, 0x0000000000000007, 0xffffffffffffffffn, 0xffffffffffffffffn,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000010, 0x0000000000000003, 0xffffffffffffffffn, 0xffffffffffffffffn,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000005, 0x0000000000000007, 0xffffffffffffffffn, 0xffffffffffffffffn,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x000000000000001F, 0x000000000000001F, 0x000000000000001F, 0x0000000000000001,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x0000000000000003, 0xffffffffffffffffn,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F, 0xffffffffffffffffn,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F, 0x0000000000000004,
                0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F, 0x0000000000000004,
                0x0000000000000009, 0xffffffffffffffffn, 0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F, 0x0000000000000004,
                0x0000000000000009, 0x0000000000000004, 0xffffffffffffffffn],
            [0x0000000000000011, 0x0000000000000012, 0x000000000000001F, 0x0000000000000004,
                0x0000000000000009, 0x000000000000001C, 0x0000000000000003],
        ];
        const expectedOutputRoundCountsArr = [
            [1, 0, 0, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 0, 0, 0],
            [1, 1, 1, 0, 0, 0, 0],
            [1, 1, 1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0, 0, 0],
            [1, 1, 1, 1, 1, 0, 0],
            [1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1],
        ];
        for (let i = 0; i < 11; i++) {
            let inputScalar = inputScalarArr[i];
            let expectedOutputPointSchedules = expectedOutputPointSchedulesArr[i];
            let expectedOutputRoundCounts = expectedOutputRoundCountsArr[i];
            const pScalar = pb.alloc(scalarSize);
            const pPointSchedules = pb.alloc(8 * numChunks);
            const pRoundCounts = pb.alloc(4 * numChunks);
            pb.set(pScalar, inputScalar, scalarSize);
            pb.g1m_multiexp_singlePointComputeSchedule(pScalar, scalarSize, chunkSize, pointIdx, numPoints, numChunks, pPointSchedules, pRoundCounts);
            let outputPointSchedules = pb.get(pPointSchedules, numChunks, 8);
            let outputRoundCount = pb.get(pRoundCounts, numChunks, 4);
            for (let j = 0; j < numChunks; j++) {
                assert.equal(outputPointSchedules[j], expectedOutputPointSchedules[j]);
                assert.equal(outputRoundCount[j], expectedOutputRoundCounts[j]);
            }
        }
    });

    it("reorderPoints is correct.", async () => {
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
        pb.g1m_multiexp_reorderPoints(pPoints, pPointSchedules, numPoints, pRes);
        let output = pb.get(pRes, numPoints * 2, 48);
        for (let i = 0; i < numPoints * 2; i++) {
            assert.equal(output[i], expectedOutput[i]);
        }
    });

    it("addAffinePointsOneRound is correct.", async () => {
        // use fake point for simplicity
        let pairs = [
            0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn,
            0x8b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n,
            0x572cbea904d67468808c8eb50a9450c9721db309128012543902d0ac358a62ae28f75bb8f1c7c42c39a8c5529bf0f4en,
            0x166a9d8cabc673a322fda673779d8e3822ba3ecb8670e461f73bb9021d5fd76a4c56d9d4cd16bd1bba86881979749d28n,
            0x11111111, 0x11112222, 0x22221111, 0x22222222,
            0xc9b60d5afcbd5663a8a44b7c5a02f19e9a77ab0a35bd65809bb5c67ec582c897feb04decc694b13e08587f3ff9b5b60n,
            0x143be6d078c2b79a7d4f1d1b21486a030ec93f56aa54e1de880db5a66dd833a652a95bee27c824084006cb5644cbd43fn,
            0x99991111, 0x99992222, 0x44441111, 0x44442222,
            0x55551111, 0x55552222,
            0x00001113, 0x66662222, 0x00001113, 0x66662222 // same point test
        ];
        let expectedF1mOutput = []
        let expectedG1mOutput = []
        let resultTest = []
        let cleanDataTest = []
        let pointsInRound = 8;
        let numPoints = 10;
        const pPaires = pb.alloc(numPoints * n8q * 2);

        // F1m operation results
        const x1 = pb.alloc(n8q);
        const y1 = pb.alloc(n8q);
        const x2 = pb.alloc(n8q);
        const y2 = pb.alloc(n8q);
        const m = pb.alloc(n8q);
        const x1_square = pb.alloc(n8q);
        const x1_squarex1_square = pb.alloc(n8q);
        const x1_squarex1_squarex1_square = pb.alloc(n8q);
        const y1_add_y1 = pb.alloc(n8q);
        const y1_add_y1_inv = pb.alloc(n8q);

        const y2_minus_y1 = pb.alloc(n8q);
        const x2_minus_x1 = pb.alloc(n8q);
        const x2_minus_x1_inv = pb.alloc(n8q);
        const x2_add_x1 = pb.alloc(n8q);
        const m_square = pb.alloc(n8q);
        const x1_minus_x3 = pb.alloc(n8q);
        const x1_minus_x3_mul_m = pb.alloc(n8q);
        const x3 = pb.alloc(n8q);
        const y3 = pb.alloc(n8q);

        for (let start = (numPoints - pointsInRound) * 2; start < numPoints * 2; start += 4) {
            pb.set(x1, pairs[start], 48);
            pb.set(y1, pairs[start + 1], 48);
            pb.set(x2, pairs[start + 2], 48);
            pb.set(y2, pairs[start + 3], 48);
            pb.f1m_toMontgomery(x1, x1);
            pb.f1m_toMontgomery(y1, y1);
            pb.f1m_toMontgomery(x2, x2);
            pb.f1m_toMontgomery(y2, y2);

            pb.f1m_add(x2, x1, x2_add_x1);
            pb.f1m_sub(x2, x1, x2_minus_x1);

            if (pb.get(x2_minus_x1, 1, 48) == 0) {
                pb.f1m_mul(x1, x1, x1_square);
                pb.f1m_add(x1_square, x1_square, x1_squarex1_square);
                pb.f1m_add(x1_squarex1_square, x1_square, x1_squarex1_squarex1_square);
                pb.f1m_add(y1, y1, y1_add_y1);
                pb.f1m_inverse(y1_add_y1, y1_add_y1_inv);
                pb.f1m_mul(y1_add_y1_inv, x1_squarex1_squarex1_square, m);
            }
            else {
                pb.f1m_sub(y2, y1, y2_minus_y1);
                pb.f1m_inverse(x2_minus_x1, x2_minus_x1_inv);
                pb.f1m_mul(x2_minus_x1_inv, y2_minus_y1, m);
            }
            pb.f1m_mul(m, m, m_square); // m^2
            pb.f1m_sub(m_square, x2_add_x1, x3);//x3
            pb.f1m_sub(x1, x3, x1_minus_x3);
            pb.f1m_mul(x1_minus_x3, m, x1_minus_x3_mul_m);
            pb.f1m_sub(x1_minus_x3_mul_m, y1, y3);//y3
            pb.f1m_fromMontgomery(x3, x3);
            pb.f1m_fromMontgomery(y3, y3);
            expectedF1mOutput.push(pb.get(x3, 1, 48));
            expectedF1mOutput.push(pb.get(y3, 1, 48));
            // console.log(pb.get(x3, 1, 48).toString(16));
            // console.log(pb.get(y3, 1, 48).toString(16));
        }

        // addAffinePointsOneRound results
        for (let i = 0; i < numPoints; i++) {
            pb.set(pPaires + 96 * i, pairs[i * 2], 48);
            pb.set(pPaires + 96 * i + 48, pairs[i * 2 + 1], 48);
            pb.f1m_toMontgomery(pPaires + 96 * i, pPaires + 96 * i);
            pb.f1m_toMontgomery(pPaires + 96 * i + 48, pPaires + 96 * i + 48);
        }

        pb.g1m_multiexp_addAffinePointsOneRound(numPoints, pointsInRound, pPaires);
        for (let i = 0; i < numPoints; i++) {
            pb.f1m_fromMontgomery(pPaires + 96 * i, pPaires + 96 * i);
            pb.f1m_fromMontgomery(pPaires + 96 * i + 48, pPaires + 96 * i + 48);
        }
        let output = pb.get(pPaires, numPoints * 2, 48);
        for (let i = numPoints * 2 - pointsInRound; i < numPoints * 2; i++) {
            resultTest.push(output[i]);
            //console.log(output[i].toString(16));
        }
        for (let i = 0; i < (numPoints - pointsInRound) * 2; i++) {
            cleanDataTest.push(output[i]);
            //console.log(output[i].toString(16));
        }

        // G1m add
        const expectedOutput = pb.alloc(numPoints / 2 * n8q * 3);
        const g1minput = pb.alloc(numPoints * n8q * 3);
        for (let i = 0; i < numPoints; i++) {
            pb.set(g1minput + 144 * i, pairs[i * 2], 48);
            pb.set(g1minput + 144 * i + 48, pairs[i * 2 + 1], 48);
            pb.f1m_toMontgomery(g1minput + 144 * i, g1minput + 144 * i);
            pb.f1m_toMontgomery(g1minput + 144 * i + 48, g1minput + 144 * i + 48);
            pb.f1m_one(g1minput + 144 * i + 96);
        }
        for (let i = 0; i < numPoints; i++) {
            pb.set(expectedOutput + 48 * i, 0, 48);
        }
        for (let i = 0; i < numPoints / 2; i++) {
            pb.g1m_add(g1minput + 2 * i * 144, g1minput + 2 * i * 144 + 144, expectedOutput + i * 144)
            pb.g1m_normalize(expectedOutput + i * 144, expectedOutput + i * 144)
        }
        for (let i = 0; i < numPoints; i++) {
            pb.f1m_fromMontgomery(expectedOutput + 144 * i, expectedOutput + 144 * i);
            pb.f1m_fromMontgomery(expectedOutput + 144 * i + 48, expectedOutput + 144 * i + 48);
            pb.f1m_fromMontgomery(expectedOutput + 144 * i + 96, expectedOutput + 144 * i + 96);
        }
        let output2 = pb.get(expectedOutput, numPoints / 2 * 3, 48);
        for (let i = (numPoints - pointsInRound) / 2 * 3; i < numPoints / 2 * 3; i += 3) {
            expectedG1mOutput.push(output2[i]);
            expectedG1mOutput.push(output2[i + 1]);
            // console.log(output2[i].toString(16));
            // console.log(output2[i+1].toString(16));
        }

        // Test whether pPaires equals paire in index [0...pointsInRound] 
        for (let i = 0; i < (numPoints - pointsInRound) * 2; i++) {
            assert.equal(pairs[i], cleanDataTest[i]);
        }
        // Test result in two ways
        // f1m
        for (let i = 0; i < pointsInRound; i++) {
            assert.equal(expectedF1mOutput[i], resultTest[i]);
        }
        // wasmcurve g1m
        for (let i = 0; i < pointsInRound; i++) {
            assert.equal(expectedG1mOutput[i], resultTest[i]);
        }
    });

    // it("evaluateAdditionChains is correct (TODO).", async () => {
    //     let precomputedBitOffset = [0, 2, 6, 10];
    //     let numPoints = 10;
    //     let max_bucket_bits = 3;
    //     let points = [
    //         0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn,
    //         0x8b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n,
    //         0x572cbea904d67468808c8eb50a9450c9721db309128012543902d0ac358a62ae28f75bb8f1c7c42c39a8c5529bf0f4en,
    //         0x166a9d8cabc673a322fda673779d8e3822ba3ecb8670e461f73bb9021d5fd76a4c56d9d4cd16bd1bba86881979749d28n,
    //         0x11111111, 0x11112222, 0x22221111, 0x22222222,
    //         0xc9b60d5afcbd5663a8a44b7c5a02f19e9a77ab0a35bd65809bb5c67ec582c897feb04decc694b13e08587f3ff9b5b60n,
    //         0x143be6d078c2b79a7d4f1d1b21486a030ec93f56aa54e1de880db5a66dd833a652a95bee27c824084006cb5644cbd43fn,
    //         0x99991111, 0x99992222, 0x44441111, 0x44442222,
    //         0x55551111, 0x55552222,
    //         0x00001113, 0x66662222, 0x00001113, 0x66662222 // same point test
    //     ];
    //     let numBuckets = 3;
    //     let additionChains = [
    //         0x0000000000000000, 0x0000000300000002, 0x0000000100000000, 0x0000000200000000,
    //         0x0000000800000001, 0x0000000900000001, 0x0000000400000002, 0x0000000500000002,
    //         0x0000000600000002, 0x0000000700000002
    //     ];

    //     const pPoints = pb.alloc(numPoints * n8q * 2);
    //     const pBitOffsets = pb.alloc((numBuckets + 1) * 4);
    //     const pAdditionChains = pb.alloc(numPoints * 8);
    //     const pRes = pb.alloc(numPoints * n8q * 2);

    //     for (let i = 0; i < numPoints; i++) {
    //         pb.set(pPoints + 96 * i, points[i * 2], 48);
    //         pb.set(pPoints + 96 * i + 48, points[i * 2 + 1], 48);
    //         pb.f1m_toMontgomery(pPoints + 96 * i, pPoints + 96 * i);
    //         pb.f1m_toMontgomery(pPoints + 96 * i + 48, pPoints + 96 * i + 48);
    //     }
    //     for (let i = 0; i < numBuckets + 1; i++) {
    //         pb.set(pBitOffsets + 4 * i, precomputedBitOffset[i], 4);
    //     }
    //     for (let i = 0; i < numPoints; i++) {
    //         pb.set(pAdditionChains + 8 * i, additionChains[i], 8);
    //     }
    //     pb.g1m_multiexp_evaluateAdditionChains(pBitOffsets, numPoints, max_bucket_bits, pPoints, pAdditionChains, pRes);

    //     for (let i = 0; i < numPoints * 2; i++) {
    //         pb.f1m_fromMontgomery(pRes + 48 * i, pRes + 48 * i);
    //     }
    //     let output = pb.get(pRes, numPoints * 2, 48);
    //     for (let i = 0; i < numPoints * 2; i++) {
    //         console.log(output[i].toString(16));
    //     }
    //     console.log("===========Expected results===========")

    //     let rearranged_points = [
    //         0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn,
    //         0x8b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n,
    //         0x22221111, 0x22222222,
    //         0x572cbea904d67468808c8eb50a9450c9721db309128012543902d0ac358a62ae28f75bb8f1c7c42c39a8c5529bf0f4en,
    //         0x166a9d8cabc673a322fda673779d8e3822ba3ecb8670e461f73bb9021d5fd76a4c56d9d4cd16bd1bba86881979749d28n,
    //         0x11111111, 0x11112222,
    //         0x00001113, 0x66662222,
    //         0x00001113, 0x66662222,
    //         0xc9b60d5afcbd5663a8a44b7c5a02f19e9a77ab0a35bd65809bb5c67ec582c897feb04decc694b13e08587f3ff9b5b60n,
    //         0x143be6d078c2b79a7d4f1d1b21486a030ec93f56aa54e1de880db5a66dd833a652a95bee27c824084006cb5644cbd43fn,
    //         0x99991111, 0x99992222,
    //         0x44441111, 0x44442222,
    //         0x55551111, 0x55552222,
    //     ];
    //     const pPoints_for_test = pb.alloc(numPoints * n8q * 3);
    //     const point2_add_point3 = pb.alloc(n8q * 3);
    //     const point4_add_point5 = pb.alloc(n8q * 3);
    //     const point6_add_point7 = pb.alloc(n8q * 3);
    //     const point8_add_point9 = pb.alloc(n8q * 3);
    //     const point6789 = pb.alloc(n8q * 3);
    //     for (let i = 0; i < numPoints; i++) {
    //         pb.set(pPoints_for_test + 144 * i, rearranged_points[i * 2], 48);
    //         pb.set(pPoints_for_test + 144 * i + 48, rearranged_points[i * 2 + 1], 48);
    //         pb.f1m_one(pPoints_for_test + 144 * i + 96);
    //         pb.f1m_toMontgomery(pPoints_for_test + 144 * i, pPoints_for_test + 144 * i);
    //         pb.f1m_toMontgomery(pPoints_for_test + 144 * i + 48, pPoints_for_test + 144 * i + 48);
    //     }
    //     pb.g1m_add(pPoints_for_test + n8q * 3 * 2, pPoints_for_test + n8q * 3 * 3, point2_add_point3);
    //     pb.g1m_normalize(point2_add_point3, point2_add_point3);
    //     printG1("point2_add_point3: ", point2_add_point3)

    //     pb.g1m_add(pPoints_for_test + n8q * 3 * 4, pPoints_for_test + n8q * 3 * 5, point4_add_point5);
    //     pb.g1m_normalize(point4_add_point5, point4_add_point5);
    //     printG1("point4_add_point5: ", point4_add_point5)

    //     pb.g1m_add(pPoints_for_test + n8q * 3 * 6, pPoints_for_test + n8q * 3 * 7, point6_add_point7);
    //     pb.g1m_add(pPoints_for_test + n8q * 3 * 8, pPoints_for_test + n8q * 3 * 9, point8_add_point9);
    //     pb.g1m_add(point6_add_point7, point8_add_point9, point6789);
    //     pb.g1m_normalize(point6_add_point7, point6_add_point7);
    //     printG1("point6_add_point7: ", point6_add_point7)
    //     pb.g1m_normalize(point8_add_point9, point8_add_point9);
    //     printG1("point8_add_point9: ", point8_add_point9)
    //     pb.g1m_normalize(point6789, point6789);
    //     printG1("point6789: ", point6789)

    // });

    it("computeSchedule is correct.", async () => {
        const inputScalars = [
            0x0000000F, 0x000000F0, 0x00000070, 0x000000E5,
            0x0000FFFF, 0x00000E51, 0x00007E51, 0x00027E51,
            0x00927E51, 0x08927E51, 0xF8927E51];
        const scalarSize = 4;
        const chunkSize = 5;
        const numChunks = 7;
        const numPoints = 11;
        const expectedOutputPointSchedules = [
            [0x000000000000000F, 0x0000000100000010, 0x0000000200000010, 0x0000000300000005, 0x000000040000001F, 0x0000000500000011, 0x0000000600000011, 0x0000000700000011, 0x0000000800000011, 0x0000000900000011, 0x0000000A00000011], // Round1
            [0xffffffffffffffffn, 0x0000000100000007, 0x0000000200000003, 0x0000000300000007, 0x000000040000001F, 0x0000000500000012, 0x0000000600000012, 0x0000000700000012, 0x0000000800000012, 0x0000000900000012, 0x0000000A00000012], // Round2
            [0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0x000000040000001F, 0x0000000500000003, 0x000000060000001F, 0x000000070000001F, 0x000000080000001F, 0x000000090000001F, 0x0000000A0000001F], // Round3
            [0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0x0000000400000001, 0xffffffffffffffffn, 0xffffffffffffffffn, 0x0000000700000004, 0x0000000800000004, 0x0000000900000004, 0x0000000A00000004], // Round4
            [0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0x0000000800000009, 0x0000000900000009, 0x0000000A00000009], // Round5
            [0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0x0000000900000004, 0x0000000A0000001C], // Round6
            [0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0xffffffffffffffffn, 0x0000000A00000003], // Round7
        ];
        const expectedOutputRoundCounts = [11, 10, 7, 5, 3, 2, 1];
        const pScalars = pb.alloc(scalarSize * numPoints);
        const pPointSchedules = pb.alloc(8 * numChunks * numPoints);
        const pRoundCounts = pb.alloc(4 * numChunks);
        for (let i = 0; i < numPoints; i++) {
            pb.set(pScalars + scalarSize * i, inputScalars[i], scalarSize);
        }
        pb.g1m_multiexp_computeSchedule(pScalars, numPoints, scalarSize, chunkSize, numChunks, pPointSchedules, pRoundCounts);
        let outputPointSchedules = pb.get(pPointSchedules, numChunks * numPoints, 8);
        let outputRoundCounts = pb.get(pRoundCounts, numChunks, 4);
        for (let i = 0; i < numChunks; i++) {
            for (let j = 0; j < numPoints; j++) {
                assert.equal(outputPointSchedules[i * numPoints + j], expectedOutputPointSchedules[i][j]);
            }
        }
        for (let i = 0; i < numChunks; i++) {
            assert.equal(outputRoundCounts[i], expectedOutputRoundCounts[i]);
        }
    });
});
