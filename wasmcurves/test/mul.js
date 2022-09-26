const assert = require("assert");
const bigInt = require("big-integer");
const { pbkdf2Sync } = require("crypto");

const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildInt = require("../src/build_int.js");
const buildTest2 = require("../src/build_test.js").buildTest2;

const helpers = require("./helpers/helpers.js");


describe("Basic tests for Int", () => {
    let pbInt;

    before(async () => {
        pbInt = await buildProtoboard((module) => {
            buildInt(module, 4);
            buildTest2(module, "int_mul");
            buildTest2(module, "int_add");
            //buildTest2(module, "int_div");
            buildTest2(module, "int_sub");

        }, 32);
    });

    it("It should profile build_int", async () => {

        const pA = pbInt.alloc();
        const pB = pbInt.alloc();
        const pC = pbInt.alloc(64);

        const A = bigInt("10");
        const B =bigInt("300");

        pbInt.set(pA, A);
        pbInt.set(pB, B);

        pbInt.int_mul(pA, pB, pC);
        
        console.log("a: " + pbInt.get(pA));
        console.log("b: " + pbInt.get(pB));
        console.log("a*b result: " + pbInt.get(pC));

        let repeat = 1;
        start = new Date().getTime();
        for(let i=0;i<repeat;i++){
            pbInt.int_mul(pA, pB, pC);
        }
        end = new Date().getTime();
        console.log("time "+ (end-start));

        //getlocal(x) 11122
        //get local(x1) 12661

        let repeat2 = 1<<1;
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        //console.log(q.modInv(bigInt("100000000",16)));
        start1 = new Date().getTime();
        for(let i=0;i<repeat2;i++){
            const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();
        }
        end1 = new Date().getTime();
        console.log("inv time "+ (end1-start1)/1.0);

    }).timeout(10000000);

});
