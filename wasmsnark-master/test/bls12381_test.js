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

    it("It should test ec add correctness", async () => {
        const pG1 = pb.bls12381.test_point_1_gen;
        const pG2 = pb.bls12381.test_point_2_gen;
        printG1("pG1     : ",pG1);
        printG1("pG2     : ",pG2);

        const p1 = pb.alloc(n8*3);
        
        pb.g1m_add(pG1, pG2, p1);
        pb.g1m_affine(p1,p1);

        assert(ns(p1) == "0x513c7f15bd0a3c9c1fc1aa95d00fcf668066ec5b99015a8063e9400fd62b4cd35d4b84b28be97a7d10769697e64b0ed");
        assert(ns(p1+n8) == "0x1478657e45fa945d49b22d7d95f8f9a4c0621ac66e1c9b41c73fa8da66bc131f8de19c51a977427af2a5ca6e2031abd0");
    });


    


    it("It should do a basic point doubling adding G1", async () => {
        const pG1 = pb.bls12381.pG1gen;

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);
        

        for(var size=10;size<18;size+=2){
            const start = new Date().getTime();
            for(var i=0;i<100;i++){
                pb.test_g1m_add(pG1, pG1, p1,1<<size); // 2*G1
            }

            const end = new Date().getTime();
            const time = end - start;
            console.log("size: 2^"+ size+", Time to compute G1 add (ms): " + time/100);
        }


    });

    



    // it("It should timesScalar G1", async () => {

    //     const s=1;
    //     const pG1 = pb.bls12381.pG1gen;

    //     const p1 = pb.alloc(n8*3);// result
    //     const p2 = pb.alloc(n8*3);// for compare
    //     const ps = pb.alloc(n8);// 10

    //     pb.set(ps, s);
    //     console.log("pG1: "+pb.get(pG1))

    //     const start = new Date().getTime();
    //     var i=0;
    //     //while(i<10000){
    //     pb.g1m_timesScalar(pG1, ps, n8, p1);
    //     i++;
    //     //}
    //     console.log("times 10 pG1: "+pb.get(p1))
    //     const end = new Date().getTime();
    //     const time = end - start;
    //     console.log("Time to compute G1 timesScalar (ms): " + time);


    //     // pb.g1m_zero(p2);

    //     // for (let i=0; i<s; i++) {
    //     //     pb.g1m_add(pG1,p2, p2);
    //     // }

    //     // assert.equal(pb.g1m_eq(p1, p2), 1);
    // });


    // it("G1n == 0", async () => {
    //     const pG1 = pb.bls12381.pG1gen;
    //     const pr = pb.bls12381.pr;

    //     const p1 = pb.alloc(n8*3);

    //     pb.g1m_timesScalar(pG1, pr, n8, p1);

    //     assert.equal(pb.g1m_isZero(p1), 1);
    // });
    

});
