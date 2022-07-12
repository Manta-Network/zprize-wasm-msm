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



    

    it("It should profile int", async () => {

        const pA = pbInt.alloc();
        const pB = pbInt.alloc();
        const pC = pbInt.alloc(64);

        let start, end, time;

        // const A = bigInt.one.shiftLeft(256).minus(1);
        // const B = bigInt.one.shiftLeft(256).minus(1);
        // const A = bigInt("10719222850664546238301075827032876239176124476888588364803088858357331359854", 10);
        // const B = bigInt("10719222850664546238301075827032876239176124476888588364803088858357331359854", 10);
        const A = bigInt.one.shiftLeft(255).minus(1);
        //const B = bigInt.one.shiftLeft(256).minus(2);
        const B =bigInt("100000000000");

        pbInt.set(pA, A);
        pbInt.set(pB, B);

        pbInt.int_mul(pA, pB, pC);
        
        console.log("a: " + pbInt.get(pA));
        console.log("b: " + pbInt.get(pB));
        console.log("a+b result: " + pbInt.get(pC));

        // start = new Date().getTime();
        // pbInt.test_int_sub(pA, pB, pC, 1<<20);
        // end = new Date().getTime();
        // time = end - start;

        // const c1 = pbInt.get(pC, 1, 64);
        //assert(c1.equals(A.times(B)));

        // console.log("Test Time (ms): " + time);

    }).timeout(10000000);

});
