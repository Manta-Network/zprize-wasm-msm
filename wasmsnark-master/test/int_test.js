const assert = require("assert");
const bigInt = require("big-integer");
const { pbkdf2Sync } = require("crypto");

const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildInt = require("../src/build_int.js");
const buildTest2 = require("../src/build_test.js").buildTest2;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildF1m = require("../src/build_f1m");
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

        }, 64);
    });



    

    it("It should profile int mul", async () => {

        const pA = pbInt.alloc();
        const pB = pbInt.alloc();
        const pC = pbInt.alloc(64);

        let start, end, time;

        // const A = bigInt.one.shiftLeft(256).minus(1);
        // const B = bigInt.one.shiftLeft(256).minus(1);
        // const A = bigInt("10719222850664546238301075827032876239176124476888588364803088858357331359854", 10);
        // const B = bigInt("10719222850664546238301075827032876239176124476888588364803088858357331359854", 10);
        const A = bigInt.one.shiftLeft(255).minus(1111111);
        const B = bigInt.one.shiftLeft(256).minus(2000000000);
        //const B =bigInt("100000000000");

        pbInt.set(pA, A);
        pbInt.set(pB, B);

        pbInt.int_mul(pA, pB, pC);
        
        console.log("a: " + pbInt.get(pA).toString());
        console.log("b: " + pbInt.get(pB).toString());
        console.log("a*b result: " + pbInt.get(pC).toString(16));

        let repeat = 100;
        start = new Date().getTime();
        for (let i = 0; i < repeat; i++) {
            pbInt.test_int_mul(pA, pB, pC, 1<<22);
        }
        end = new Date().getTime();
        time = (end - start) / repeat;

        // const c1 = pbInt.get(pC, 1, 64);
        //assert(c1.equals(A.times(B)));

        console.log("INT Test Time (ms): " + time);

    }).timeout(10000000);

    it("It should profile F1m int mul", async () => {

        let start,end,time;

        const q = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
        // const A=q.minus(1);
        // const B=q.minus(1).shiftRight(1);
        
        const A = bigInt.one.shiftLeft(255).minus(1111111);
        const B = bigInt.one.shiftLeft(256).minus(2000000000);

        // const A = bigInt("1234");
        // const B = bigInt("20000000000000000");

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            buildTest2(module, "f1m_cachemul");
            buildTest2(module, "f1m_cachemulf1m");
            buildTest2(module, "f1m_slideWindowMul");
            buildTest2(module, "f1m_slideWindowRearrangeMul");
            
        }, 64);

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pC = pbF1m.alloc(64);

        pbF1m.set(pA, A);
        //pbF1m.f1m_toMontgomery(pA, pA);
        pbF1m.set(pB, B);
        //pbF1m.f1m_toMontgomery(pB, pB);

        console.log("a: " + pbF1m.get(pA).toString());
        console.log("b: " + pbF1m.get(pB).toString());

        let repeat = 100;

        let start2 = new Date().getTime();
        for (let i = 0; i < repeat; i++) {
            pbF1m.test_f1m_cachemul(pA, pB, pC, 1<<22); // int mul 280-300ms
        }
        let end2 = new Date().getTime();
        time = (end2 - start2) / repeat;
        console.log("a*b result: " + pbF1m.get(pC).toString(16));
        console.log("F1m buildCacheMul Time (ms): " + time);


        let repeat_slide_window = 100;

        let start4 = new Date().getTime();
        for (let i = 0; i < repeat_slide_window; i++) {
            pbF1m.test_f1m_slideWindowMul(pA, pB, pC, 1<<22); // int mul 280-300ms
        }
        let end4 = new Date().getTime();
        time = (end4 - start4) / repeat_slide_window;
        console.log("a*b result: " + pbF1m.get(pC).toString(16));
        console.log("F1m buildSlideWindowMul Time (ms): " + time);


        let repeat_rearrange_window = 100;

        let start5 = new Date().getTime();
        for (let i = 0; i < repeat_rearrange_window; i++) {
            pbF1m.test_f1m_slideWindowRearrangeMul(pA, pB, pC, 1<<22); // int mul 280-300ms
        }
        let end5 = new Date().getTime();
        time = (end5 - start5) / repeat_slide_window;
        console.log("a*b result: " + pbF1m.get(pC).toString(16));
        console.log("F1m buildSlideWindowRearrangeMul Time (ms): " + time);




        let repeat_f1m = 0;
        let start3 = new Date().getTime();
        for (let i = 0; i < repeat_f1m; i++) {
            pbF1m.test_f1m_cachemulf1m(pA, pB, pC, 1<<22); // f1m mul 167-200ms  remove and0xFFFFFFF 120ms
        }
        let end3 = new Date().getTime();
        time = (end3 - start3) / repeat_f1m;
        console.log("F1m buildCacheMulF1m Time (ms): " + time);







        
        //console.log("a*b result: " + pbF1m.get(pC).toString());

        pbF1m.f1m_fromMontgomery(pC, pC);

        const c1 = pbF1m.get(pC, 1, 32);
        //assert(c1.equals(A.times(B).mod(q)));

        

        //        start = new Date().getTime();
        //        pbF1m.test_f1m_mulOld(pA, pB, pC, 50000000);
        //        end = new Date().getTime();
        //        time = end - start;
        //
        //
        //        pbF1m.f1m_fromMontgomery(pC, pC);
        //
        //        const c2 = pbF1m    .get(pC, 1, 32);
        //        assert(c2.equals(A.times(B).mod(q)));
        //
        //        console.log("Mul Old Time (ms): " + time);

    }).timeout(10000000);

});
