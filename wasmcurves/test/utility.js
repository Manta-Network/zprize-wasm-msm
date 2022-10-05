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
    
    it("storeI64 and loadI64 should be correct.", async () => {
        let length = 5;
        const pArr = pb.alloc(8 * length);
        for (let i = 0; i < length; i++) {
            pb.set(pArr + 8 * i, i, 8);
        }
        pb.g1m_multiexp_organizeBucketsOneRound
        for (let i = 0; i < length; i++) {
            console.log(pb.get(pArr + 8 * i, 1, 8).toString(16));
        }
    });
});
