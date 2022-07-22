const assert = require("assert");
const bigInt = require("big-integer");

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
//            buildTest(module, "int_mulOld");
        }, 32);
    });

    it("It should do a basic multiplication", async () => {
        let c;
        const pA = pbInt.alloc();
        const pB = pbInt.alloc();
        const pC = pbInt.alloc(64);

        const values = helpers.genValues(8, false);

        for (let i=0; i<values.length; i++) {
            for (let j=0; j<values.length; j++) {
                pbInt.set(pA, values[i]);
                pbInt.set(pB, values[j]);
                // console.log(values[i].toString(16));
                // console.log(values[j].toString(16));

                pbInt.int_mul(pA, pB, pC);
                c = pbInt.get(pC, 1, 64);

                // console.log("Result: " + c.toString(16));
                // console.log("Refere: " + values[i].times(values[j]).toString(16));
                assert(c.equals(values[i].times(values[j])));

            }
        }
    });


    it("It should do a basic squaring", async () => {
        let c;
        const pA = pbInt.alloc();
        const pC = pbInt.alloc(64);

        const values = helpers.genValues(8, false);

        for (let i=0; i<values.length; i++) {
            pbInt.set(pA, values[i]);

            pbInt.int_square(pA, pC);
            c = pbInt.get(pC, 1, 64);

            assert(c.equals(values[i].times(values[i])));

        }
    }).timeout(10000000);

    it("It should profile int", async () => {

        const pA = pbInt.alloc();
        const pB = pbInt.alloc();
        const pC = pbInt.alloc(64);

        let start, end, time;
        //pb.set(pr, bigInt("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16));

        // const A = bigInt.one.shiftLeft(256).minus(1);
        // const B = bigInt.one.shiftLeft(256).minus(1);

        const A = bigInt("10719222850664546238301075827032876239176124476888588364803088858357331359854", 10);
        const B = bigInt("10719222850664546238301075827032876239176124476888588364803088858357331359854", 10);

        pbInt.set(pA, A);
        pbInt.set(pB, B);

        // start = new Date().getTime();
        // pbInt.test_int_mul(pA, pB, pC, 50000000);
        // end = new Date().getTime();
        // time = end - start;
        //console.log("Mul Time (ms): " + time);

        const c1 = pbInt.get(pC, 1, 64);
        assert(c1.equals(A.times(B)));

        
        console.log("a+b: " + time);
        // start = new Date().getTime();
        // pbInt.test_int_mulOld(pA, pB, pC, 50000000);
        // end = new Date().getTime();
        // time = end - start;

        // const c2 = pbInt.get(pC, 1, 64);
        // assert(c2.equals(A.times(B)));

        // console.log("Mul Old Time (ms): " + time);

    }).timeout(10000000);

});
