const assert = require("assert");
const bigInt = require("big-integer");
const buildF1 = require("../src/build_f1");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

describe("Basic tests for Fr and Fq", () => {
    it("It should profile build_f1", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("1", 16);
        const B = bigInt("2", 16);

        const pbF1 = await buildProtoboard((module) => {
            buildF1(module, q);
            buildTest2(module, "f1_mul");
            buildTest2(module, "f1_add");
            buildTest2(module, "f1_sub");
        }, 32);

        const pA = pbF1.alloc();
        const pB = pbF1.alloc();
        const pC = pbF1.alloc();

        pbF1.set(pA, A);
        pbF1.set(pB, B);

        let repeat2 = 1<<2;
        start1 = new Date().getTime();
        for(let i=0;i<repeat2;i++){
            pbF1.f1_mul(pA, pB, pC);        
        }
        end1 = new Date().getTime();
        console.log("inv time "+ (end1-start1)/1.0);
        
        

        console.log("a: " + pbF1.get(pA));
        console.log("b: " + pbF1.get(pB));
        console.log("a*b result: " + pbF1.get(pC));
        

    }).timeout(10000000);

    

});
