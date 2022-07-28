const assert = require("assert");
const bigInt = require("big-integer");
const build_f1m = require("../src/build_f1m");
const buildF1 = require("../src/build_f1m");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

describe("Basic tests for Fr and Fq", () => {
    it("It should profile build_f1", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("424358751751261904794477405081865837690552500527637822603658699938581184513");
        const B = bigInt("324358751751261904794477405081859837690552500527637822603658699938581184513");

        const pbF1m = await buildProtoboard((module) => {
            build_f1m(module, q);
            buildTest2(module, "f1m_mul");
            // buildTest2(module, "f1_add");
            // buildTest2(module, "f1_sub");
        }, 64);
        console.log(q.toString(16));
        const pA = pbF1m.alloc(64);
        const pB = pbF1m.alloc(64);
        const pC = pbF1m.alloc(64);

        pbF1m.set(pA, A);
        pbF1m.set(pB, B);

        let size = 1<<20;
        let repeat2 = 5;
        start1 = new Date().getTime();
        for(let i=0;i<repeat2;i++){
        pbF1m.test_f1m_mul(pA, pB, pC, size);        
        }
        end1 = new Date().getTime();
        console.log("mul time "+ (end1-start1)/repeat2);

        // 150ms
        
        

        console.log("a: " + pbF1m.get(pA));
        console.log("b: " + pbF1m.get(pB));
        pbF1m.f1m_toMontgomery(pC, pC);
        console.log("a*b result: " + pbF1m.get(pC).toString(16));
        

    }).timeout(10000000);

    

});
