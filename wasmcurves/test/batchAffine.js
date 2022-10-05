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

    it("storeI64 and loadI64 should be correct.", async () => {
        let length = 5;
        const pArr = pb.alloc(8 * length);
        for (let i = 0; i < length; i++) {
            pb.set(pArr + 8 * i, i, 8);
        }
        // pb.g1m_multiexp_organizeBucketsOneRound
        for (let i = 0; i < length; i++) {
            console.log(pb.get(pArr + 8 * i, 1, 8).toString(16));
        }
    });

    // it("organizeBucketsOneRound should be correct.", async () => {
    //     let numPoints = 6;
    //     let numBuckets = 8;
    //     const pPointSchedules = pb.alloc(8 * numPoints);
    //     const pMetadata = pb.alloc(8 * numPoints);
    //     let pointSchedules = [0x0000000000000000, 0x0000000100000003, 0x0000000200000000, 0x0000000300000001, 0x0000000400000002, 0x0000000500000001, 0x0000000600000003];
    //     for (let i = 0; i < numPoints; i++) {
    //         pb.set(pPointSchedules + 8 * i, pointSchedules[i], 8);
    //     }
    //     pb.g1m_multiexp_organizeBucketsOneRound(pPointSchedules, numPoints, numBuckets, pMetadata);
    //     for (let i = 0; i < numPoints; i++) {
    //         console.log(pb.get(pMetadata + 8 * i, 1, 8).toString(16))
    //     }
    // });
});
