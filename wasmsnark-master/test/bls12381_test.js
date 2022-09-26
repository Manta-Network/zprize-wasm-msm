const assert = require("assert");
const bigInt = require("big-integer");
const internal = require("stream");
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest2 = require("../src/build_test.js").buildTest2;
 

describe("Basic tests for g1 in bls12-381", function () {

    this.timeout(10000000);

    const n8=48;
    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
            buildTest2(module, "f1m_mul");
            buildTest2(module, "g1m_add");
        }, n8);
    });

    function ns(p) {
        pb.f1m_fromMontgomery(p, p);
        const n = pb.get(p);
        pb.f1m_toMontgomery(p, p);
        //return n.toString()
        return "0x" + n.toString(16);
    }
 
    function printG1(s, p) {
        console.log(s + " G1(" + ns(p) + " , " + ns(p+n8) + " , " + ns(p+n8*2) + ")"   );
    }

    it("It should test ec add correctness (affine)", async () => {
        const pG1 = pb.bls12381.test_point_1_gen;
        const pG2 = pb.bls12381.test_point_2_gen;
        printG1("pG1     : ",pG1);
        printG1("pG2     : ",pG2);

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);
        
        console.log(pb.bls12381.test_point_1_gen)
        console.log(pb.bls12381.test_point_2_gen)
        console.log(p1)
        console.log(p2)
        
        
        
        
        pb.g1m_add(pG1, pG2, p1);
        pb.g1m_affine(p1,p1);

        assert(ns(p1) == "0x513c7f15bd0a3c9c1fc1aa95d00fcf668066ec5b99015a8063e9400fd62b4cd35d4b84b28be97a7d10769697e64b0ed");
        assert(ns(p1+n8) == "0x1478657e45fa945d49b22d7d95f8f9a4c0621ac66e1c9b41c73fa8da66bc131f8de19c51a977427af2a5ca6e2031abd0");
    });

    it("It should test ec add correctness (projective)", async () => {
        const pG1 = pb.bls12381.test_point_3_gen;
        const pG2 = pb.bls12381.test_point_4_gen;
        printG1("pG1     : ",pG1);
        printG1("pG2     : ",pG2);

        const p1 = pb.alloc(n8*3);
        
        pb.g1m_add(pG1, pG2, p1);
        printG1("G1: ",p1)
        //pb.g1m_affine(p1,p1);

        assert(ns(p1) == "0x145b87ab9ffa5f869c95870899aa7f55978b2a911a8640f5faeb4a877df2fa29f4271d5e44b34c25000f2b17c570d854");
        assert(ns(p1+n8) == "0x5e108707c2d0615fe6d250e82987ff8cfabf734b5480d36789352b17950ae331ac70cbc0ac3fac6b982395d281631f9");
        assert(ns(p1+2*n8) == "0xe9046ab3db7eab3ac6fa11b3192a9f355539d2f2a221b636fe7da605e609a8a68788561a094aea24cbb2bff7eeba3ca");
        
    });

    it("It should test ec mul correctness (projective)", async () => {

        const s=10;
        const pG2 = pb.bls12381.pG2gen;

        const p1 = pb.alloc(n8*6);
        const p2 = pb.alloc(n8*6);
        const ps = pb.alloc(n8);

        pb.set(ps, s);

        pb.g2m_timesScalar(pG2, ps, n8, p1);

        pb.g2m_zero(p2);

        for (let i=0; i<s; i++) {
            pb.g2m_add(pG2,p2, p2);
        }

        assert.equal(pb.g2m_eq(p1, p2), 1);
    });


    it("It should do a basic point doubling adding G1 (projective)", async () => {
        const pG1 = pb.bls12381.pG1gen;
        const s1 = 333;
        const s2 = 444;
     
        const ps1 = pb.alloc(n8);
        const ps2 = pb.alloc(n8);
        pb.set(ps1, s1);
        pb.set(ps2, s2);
        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3); 

        const pr = pb.alloc(n8*3); 

        pb.g1m_timesScalar(pG1, ps1, n8, p1);
        pb.g1m_timesScalar(pG1, ps2, n8, p2);

        for(var size=10;size<18;size+=2){
            const start = new Date().getTime();
            for(var i=0;i<100;i++){
                pb.test_g1m_add(p1, p2, pr,1<<size); 
            }

            const end = new Date().getTime();
            const time = end - start;
            console.log("size: 2^"+ size+", Time to compute G1 add (ms): " + time/100);
        }
    });

    it("It should timesScalar G1", async () => {
        const s=BigInt("0x674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588",16);
        const pG1 = pb.bls12381.pG1gen;

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);
        const ps = pb.alloc(n8);

        pb.set(ps, s);

        const REPEAT = 100;
        
        for(var size=6;size<6;size+=2){
            const loops = 1<<size;
            const start = new Date().getTime();
            for (var i =0; i<REPEAT ;i++){
                for (var j=0; j<loops; j++) {
                    pb.g1m_timesScalar(pG1, ps, n8, p1);
                }
            }
            const end = new Date().getTime();
            const time = end - start;
            console.log("size: 2^"+ size+", Time to compute timesscalar (ms): " + time/REPEAT);
        }
    });
});
