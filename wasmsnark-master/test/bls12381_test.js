const assert = require("assert");
const bigInt = require("big-integer");
const internal = require("stream");
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("Basic tests for g1 in bls12-381", function () {

    this.timeout(10000000);

    const n8=48;

    function getFieldElementF12(pR) {
        pb.ftm_fromMontgomery(pR, pR);
        const res =  [
            [
                [
                    pb.get(pR),
                    pb.get(pR+n8),
                ],[
                    pb.get(pR+n8*2),
                    pb.get(pR+n8*3),
                ],[
                    pb.get(pR+n8*4),
                    pb.get(pR+n8*5),
                ]
            ],[
                [
                    pb.get(pR+n8*6),
                    pb.get(pR+n8*7),
                ],[
                    pb.get(pR+n8*8),
                    pb.get(pR+n8*9),
                ],[
                    pb.get(pR+n8*10),
                    pb.get(pR+n8*11),
                ]
            ]
        ];
        pb.ftm_toMontgomery(pR, pR);
        return res;
    }
    function getFieldElementF6(pR) {
        pb.f6m_fromMontgomery(pR, pR);
        const res =  [
            [
                pb.get(pR),
                pb.get(pR+n8),
            ],[
                pb.get(pR+n8*2),
                pb.get(pR+n8*3),
            ],[
                pb.get(pR+n8*4),
                pb.get(pR+n8*5),
            ]
        ];
        pb.f6m_toMontgomery(pR, pR);
        return res;
    }
    function getFieldElementF2(pR) {
        pb.f2m_fromMontgomery(pR, pR);
        const res =  [
            pb.get(pR),
            pb.get(pR+n8),
        ];
        pb.f2m_toMontgomery(pR, pR);
        return res;
    }

    function assertEqualF12(p1, p2) {
        for (let i=0; i<2; i++) {
            for (let j=0; j<3; j++) {
                for (let k=0; k<2; k++) {
                    assert(p1[i][j][k].equals(p2[i][j][k]));
                }
            }
        }
    }

    function assertEqualF6(p1, p2) {
        for (let j=0; j<3; j++) {
            for (let k=0; k<2; k++) {
                assert(bigInt(p1[j][k]).equals(bigInt(p2[j][k])));
            }
        }
    }

    function assertEqualF2(p1, p2) {
        for (let k=0; k<2; k++) {
            assert(p1[k].equals(p2[k]));
        }
    }

    function ns(p) {
        pb.f1m_fromMontgomery(p, p);
        const n = pb.get(p);
        pb.f1m_toMontgomery(p, p);
        return "0x" + n.toString(16);
    }

    function printF1(s, p) {
        console.log(s, " " + ns(p))
    }

    function printF2(s, p) {
        console.log(s + " Fq2(" + ns(p) + " + " + ns(p+n8) +"*u " );
    }

    function printF6(s, p) {
        console.log(s + " [Fq2(\n" + ns(p) + " +\n " + ns(p+n8) +"*u],[" );
        console.log("Fq2(\n" + ns(p+n8*2) + " +\n " + ns(p+n8*3) +"*u],[" );
        console.log("Fq2(\n" + ns(p+n8*4) + " +\n " + ns(p+n8*5) +"*u]" );
    }

    function printF12(s, p) {
        console.log(s + " [ [Fq2(\n" + ns(p) + " +\n " + ns(p+n8) +"*u],[" );
        console.log("Fq2(\n" + ns(p+n8*2) + " +\n " + ns(p+n8*3) +"*u],[" );
        console.log("Fq2(\n" + ns(p+n8*4) + " +\n " + ns(p+n8*5) +"*u]]" );
        console.log("[ [Fq2(\n" + ns(p+n8*6) + " +\n " + ns(p+n8*7) +"*u],[" );
        console.log("Fq2(\n" + ns(p+n8*8) + " +\n " + ns(p+n8*9) +"*u],[" );
        console.log("Fq2(\n" + ns(p+n8*10) + " +\n " + ns(p+n8*11) +"*u]]" );
    }

    function printG1(s, p) {
        console.log(s + " G1(" + ns(p) + " , " + ns(p+n8) + " , " + ns(p+n8*2) + ")"   );
    }

    function printG2(s, p) {
        console.log(s + " (G2):");
        for (let i=0; i<6; i++) {
            console.log(ns(p+n8*i));
        }
        console.log("");
    }


    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, n8);
    });

    it("It should do a basic point operation in F2", async () => {
        const e1 = pb.alloc(n8*2);
        pb.set(e1, bigInt("1"));
        pb.set(e1+n8, bigInt("2"));
        const e2 = pb.alloc(n8*2);
        pb.f2m_square(e1,e2);

        const e3 = pb.alloc(n8*2);
        pb.f2m_mul(e1,e1, e3);

        const res2 = getFieldElementF2(e2);
        const res3 = getFieldElementF2(e3);

        assert(res2[0] = res3[0]);
        assert(res2[1] = res3[1]);
    });
   
    it("It should do a basic op in f2", async () => {
        const e1 = pb.alloc(n8*2);

        for (let i=0; i<2; i++) {
            pb.set(e1+n8*i, bigInt(i+1));
        }

        pb.f2m_toMontgomery(e1, e1);

        const e2 = pb.alloc(n8*2);
        pb.f2m_square(e1, e2);

        const e3 = pb.alloc(n8*2);
        pb.f2m_mul(e1,e1, e3);

        const res2 = getFieldElementF2(e2);
        const res3 = getFieldElementF2(e3);

        assertEqualF2(res2, res3);
    });
    


    it("It should do a basic point doubling adding G1", async () => {
        const pG1 = pb.bls12381.pG1gen;

        const p1 = pb.alloc(n8*3);
        const p2 = pb.alloc(n8*3);
        const start = new Date().getTime();
        
        var i = 1;
        while(i<10000){
        pb.g1m_add(pG1, pG1, p1); // 2*G1
        pb.g1m_add(p1, pG1, p1);  // 3*G1
        pb.g1m_add(p1, pG1, p1);  // 4*G1

        pb.g1m_double(pG1, p2); // 2*G1
        pb.g1m_double(p2, p2); // 4*G1

        i++
        }
        const end = new Date().getTime();
        const time = end - start;
        console.log("Time to compute G1 add (ms): " + time);

        
        
        assert.equal(pb.g1m_isZero(pG1), 0);
        assert.equal(pb.g1m_eq(p1, p2), 1);

        pb.g1m_sub(p1, p2, p1);  // 0
        assert.equal(pb.g1m_isZero(p1), 1);

    });
    it("It should timesScalar G1", async () => {

        const s=1;
        const pG1 = pb.bls12381.pG1gen;

        const p1 = pb.alloc(n8*3);// result
        const p2 = pb.alloc(n8*3);// for compare
        const ps = pb.alloc(n8);// 10

        pb.set(ps, s);
        console.log("pG1: "+pb.get(pG1))

        const start = new Date().getTime();
        var i=0;
        //while(i<10000){
        pb.g1m_timesScalar(pG1, ps, n8, p1);
        i++;
        //}
        console.log("times 10 pG1: "+pb.get(p1))
        const end = new Date().getTime();
        const time = end - start;
        console.log("Time to compute G1 timesScalar (ms): " + time);


        // pb.g1m_zero(p2);

        // for (let i=0; i<s; i++) {
        //     pb.g1m_add(pG1,p2, p2);
        // }

        // assert.equal(pb.g1m_eq(p1, p2), 1);
    });
    it("G1n == 0", async () => {
        const pG1 = pb.bls12381.pG1gen;
        const pr = pb.bls12381.pr;

        const p1 = pb.alloc(n8*3);

        pb.g1m_timesScalar(pG1, pr, n8, p1);

        assert.equal(pb.g1m_isZero(p1), 1);
    });
    it("It should do a basic point doubling adding G2", async () => {
        
        const pG2 = pb.bls12381.pG2gen;

        const p1 = pb.alloc(n8*6);
        const p2 = pb.alloc(n8*6);


        
        const start = new Date().getTime();
        var i=1;
        while(i<10000){
           
        
        pb.g2m_add(pG2, pG2, p1); // 2*G1
        pb.g2m_add(p1, pG2, p1);  // 3*G1      
        pb.g2m_add(p1, pG2, p1);  // 4*G1

        pb.g2m_double(pG2, p2); // 2*G1
        
        pb.g2m_double(p2, p2); // 4*G1
        
        i++;
        }
        
        const end = new Date().getTime();
        const time = end - start;
        console.log("Time to compute G2 add (ms): " + time);


        assert.equal(pb.g2m_isZero(pG2), 0);
        assert.equal(pb.g2m_eq(p1, p2), 1);

        pb.g2m_sub(p1, p2, p1);  // 0
        assert.equal(pb.g2m_isZero(p1), 1);

    });
    it("Should test unitary", async () => {
        const pG1 = pb.bls12381.pG1gen;
        const pG2 = pb.bls12381.pG2gen;
        const pnG1 = pb.alloc(n8*3);
        const pnG2 = pb.alloc(n8*6);

        const pP = pb.alloc(n8*12);
        const pQ = pb.alloc(n8*12);
        const pR = pb.alloc(n8*12);

        pb.g1m_neg(pG1, pnG1);
        pb.g2m_neg(pG2, pnG2);

        pb.bls12381_pairing(pG1, pG2, pP);
        pb.ftm_conjugate(pP, pP);
        pb.bls12381_pairing(pG1, pnG2, pQ);
        pb.bls12381_pairing(pnG1, pG2, pR);

        // printF12("P: ", pP);
        // printF12("Q: ", pQ);
        // printF12("R: ", pR);

        const P = getFieldElementF12(pP);
        const Q = getFieldElementF12(pQ);
        const R = getFieldElementF12(pR);

        assertEqualF12(P, Q);
        assertEqualF12(Q, R);
    });


    it("It should timesScalar G2", async () => {

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
    it("G2n == 0", async () => {
        const pG2 = pb.bls12381.pG2gen;
        const pr = pb.bls12381.pr;

        const p1 = pb.alloc(n8*6);

        pb.g2m_timesScalar(pG2, pr, n8, p1);

        assert.equal(pb.g2m_isZero(p1), 1);
    });

    
    

    it("It should do a basic pairing", async () => {
        const ps = pb.alloc(n8);
        const pOne = pb.alloc(n8*12);
        pb.set(ps, bigInt(10));
        const pRes1 = pb.alloc(n8*12);
        const pRes2 = pb.alloc(n8*12);
        const pRes3 = pb.alloc(n8*12);
        const pRes4 = pb.alloc(n8*12);

        const pG1s = pb.alloc(n8*3);
        const pG2s = pb.alloc(n8*2*3);
        const pG1gen = pb.bls12381.pG1gen;
        const pG2gen = pb.bls12381.pG2gen;

        pb.ftm_one(pOne);
        pb.g1m_timesScalar(pG1gen, ps, n8, pG1s);
        pb.g2m_timesScalar(pG2gen, ps, n8, pG2s);

        const pPreP = pb.alloc(n8*3);
        const pPreQ = pb.alloc(n8*2*3 + n8*2*3*70);

        pb.bls12381_prepareG1(pG1s, pPreP);
        pb.bls12381_prepareG2(pG2gen, pPreQ);


        // printG1("pPreP: ", pPreP);
        // for (let i=0; i<75; i++) {
        //     printG1("pPreQ " + i + ":", pPreQ + i*48*2*3);
        // }
        pb.bls12381_millerLoop(pPreP, pPreQ, pRes1);
        // printF12("Miller Result: ", pRes1);
        pb.bls12381_finalExponentiation(pRes1, pRes2);

        pb.bls12381_prepareG1(pG1gen, pPreP);
        pb.bls12381_prepareG2(pG2s, pPreQ);
        pb.bls12381_millerLoop(pPreP, pPreQ, pRes3);
        pb.bls12381_finalExponentiation(pRes3, pRes4);

        const res2 = getFieldElementF12(pRes2);
        const res4 = getFieldElementF12(pRes4);

        assertEqualF12(res2, res4);

        pb.bls12381_pairing(pG1s, pG2gen, pRes1);

        const start = new Date().getTime();
        pb.bls12381_pairing(pG1gen, pG2s, pRes2);
        const end = new Date().getTime();
        const time = end - start;
        console.log("Time to compute a single pairing (ms): " + time);

        const resL = getFieldElementF12(pRes1);
        const resR = getFieldElementF12(pRes2);

        assertEqualF12(resL, resR);

    });

});
