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

    it("It should test construct_addition_chains", async () => {
        const pG1 = pb.bls12381.pG1gen;
        let n = 10;
        let bucketNum = 8;

        const pPointSchedule = pb.alloc(8*n);
        const pMetadata = pb.alloc(n*8);
        const pTableSize = pb.alloc(bucketNum*4);//ok
        const pBucketOffset = pb.alloc(bucketNum*4);
        const pIndex = pb.alloc(n*4);//ok
        const debug32 = pb.alloc(4);
        const debug64 = pb.alloc(8);
        const pBitoffset = pb.alloc((bucketNum+1)*4);
        const pRes = pb.alloc(n*8);
        let maxCount = 3;

        let point1Schedule = 0x0000000000000001n;
        let point2Schedule = 0x0000000100000001n;
        let point3Schedule = 0x0000000200000001n;
        let point4Schedule = 0x0000000300000003n;
        let point5Schedule = 0x0000000400000003n;
        let point6Schedule = 0x0000000500000003n;
        let point7Schedule = 0x0000000600000003n;
        let point8Schedule = 0x0000000700000003n;
        let point9Schedule = 0x0000000800000002n;
        let point10Schedule = 0x0000000900000002n;

        pb.set(pPointSchedule,point1Schedule,8);
        pb.set(pPointSchedule+8,point2Schedule,8);
        pb.set(pPointSchedule+8*2,point3Schedule,8);
        pb.set(pPointSchedule+8*3,point4Schedule,8);
        pb.set(pPointSchedule+8*4,point5Schedule,8);
        pb.set(pPointSchedule+8*5,point6Schedule,8);
        pb.set(pPointSchedule+8*6,point7Schedule,8);
        pb.set(pPointSchedule+8*7,point8Schedule,8);
        pb.set(pPointSchedule+8*8,point9Schedule,8);
        pb.set(pPointSchedule+8*9,point10Schedule,8);

        pb.set(pBitoffset,0,4);
        pb.set(pBitoffset+4,2,4);
        pb.set(pBitoffset+4*2,6,4);
        pb.set(pBitoffset+4*3,10,4);
        
        console.log("========Test OrganizeBucketsOneRound========")
        pb.g1m_multiexp_OrganizeBucketsOneRound(pPointSchedule,n,bucketNum,pMetadata,pTableSize,pBucketOffset,pIndex,debug32,debug64);
        console.log(pb.get(pPointSchedule+8,1,8).toString(16))
        console.log(pb.get(pMetadata+8*9,1,8).toString(16))

        console.log("========Test ConstructAdditionChains========")
        pb.g1m_multiexp_ConstructAdditionChains(pPointSchedule,maxCount,pTableSize,pBitoffset,n,bucketNum,pRes);
        for(let i=0;i<10;i++){
            console.log(pb.get(pRes+8*i,1,8).toString(16))
        }
        
        // 0 0   point1Schedule point2Schedule point3Schedule point3Schedule 0 0
    });
});
