const assert = require("assert");
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const {bitLength} = require("../src/bigint.js");

describe("Basic tests for batch affine in bls12-381", function () {

    this.timeout(10000000);

    const n8q=48;
    const n8r=32;

    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, n8q);
    });

    function printG1(s, p) {
        console.log(s + " G1(" + ns(p) + " , " + ns(p+n8q) + " , " + ns(p+n8q*2) + ")"   );
    }
    function ns(p) {
        pb.f1m_fromMontgomery(p, p);
        const n = pb.get(p);
        pb.f1m_toMontgomery(p, p);
        return "0x" + n.toString(16);
    }

    it("It should do OrganizeBuckets", async () => {
        const pG1 = pb.bls12381.pG1gen;
        let n = 6;
        let bucketNum = 8;

        const pPointSchedule = pb.alloc(8*n);

        let point1 = 0x0000000000000001n
        let point2 = 0x0000000100000004n
        let point3 = 0x0000000200000005n
        let point4 = 0x0000000300000003n
        let point5 = 0x0000000400000003n
        let point6 = 0x0000000500000006n
        
        
        pb.set(pPointSchedule,point1,8)
        pb.set(pPointSchedule+8,point2,8)
        pb.set(pPointSchedule+8*2,point3,8)
        pb.set(pPointSchedule+8*3,point4,8)
        pb.set(pPointSchedule+8*4,point5,8)
        pb.set(pPointSchedule+8*5,point6,8)

        const pMetadata = pb.alloc(n*8);
        const pTableSize = pb.alloc(bucketNum*4);//ok
        const pBucketOffset = pb.alloc(bucketNum*4);
        const pIndex = pb.alloc(n*4);//ok

        const debug32 = pb.alloc(4);
        const debug64 = pb.alloc(8);

        pb.g1m_multiexp_OrganizeBucketsOneRound(pPointSchedule,n,bucketNum,pMetadata,pTableSize,pBucketOffset,pIndex,debug32,debug64);
        console.log("debug32")
        console.log(pb.get(debug32,1,4).toString(16))
        console.log(pb.get(pTableSize+4*6,1,4).toString(16))

        console.log(pb.get(pMetadata+8*3,1,8).toString(16))
        //console.log(pMetadata)
        //console.log(pb.get(pBucketOffset+4*6,1,4).toString())
        //console.log(pb.get(pIndex+4,1,4).toString(16))
        //console.log(pb.get(debug32,1,4).toString(16))
    });
    
});