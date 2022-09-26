const assert = require("assert");
const bigInt = require("big-integer");
const buildF1 = require("../src/build_f1");
const buildInt = require("../src/build_int");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

describe("Basic tests for Fr and Fq", () => {
    it("It should check correctness for +-*/", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("2ADDD44F7E3B786EF46BFBDBB7949E00042DA2DE98C064CF94C25463CA1C3FBE", 16);
        const B = bigInt("387B871A42CC7E352F862DB864633FA7433EDC24198C03528255C7E9F7A37C04", 16);

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

        // test add
        pbF1.f1_add(pA, pB, pC);
        assert((pbF1.get(pC)).toString(16) == "63595b69c107f6a423f229941bf7dda7476c7f02b24c682217181c4dc1bfbbc2");

        // test sub
        pbF1.f1_sub(pA, pB, pC)
        assert((pbF1.get(pC)).toString(16) == "664ff488650c7781f81fa62b5cd3365e14ac6abd7f32bd7c126c8c78d278c3bb");

        // test mul
        pbF1.f1_mul(pA, pB, pC)
        assert((pbF1.get(pC)).toString(16) == "347703aeef1eb02552b6365c5ea24ec5ffcb2456c44d668b5ae1d4667535951f");

        // test div
        const pB_inv = pbF1.alloc();
        pbF1.f1_inverse(pB, pB_inv);
        pbF1.f1_mul(pB_inv, pA, pC);
        assert((pbF1.get(pC)).toString(16) == "427d8b799ca353fa64575246ed0f662aa437e96577eb58e2efa8daf3ea9c922e");

        // test MODULUS
        const pOne = pbF1.alloc();
        const pTwo = pbF1.alloc();
        const MODULUS_MINUS_ONE = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184512");
        pbF1.set(pOne, bigInt("1"));
        pbF1.set(pTwo, bigInt("2"));
        pbF1.f1_sub(pOne, pTwo, pC)

        assert((pbF1.get(pC)).toString() == MODULUS_MINUS_ONE.toString());


    }).timeout(10000000);

    it("It should test time consumption (Fr)", async () => {
        // Fr
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("2ADDD44F7E3B786EF46BFBDBB7949E00042DA2DE98C064CF94C25463CA1C3FBE", 16);
        const B = bigInt("387B871A42CC7E352F862DB864633FA7433EDC24198C03528255C7E9F7A37C04", 16);
        
        const pbF1 = await buildProtoboard((module) => {
            buildF1(module, q);
            buildTest2(module, "f1_mul");
            buildTest2(module, "f1_add");
            buildTest2(module, "f1_sub");
            buildTest1(module, "f1_inverse");
        }, 32);

        const pA = pbF1.alloc();
        const pB = pbF1.alloc();
        const pC = pbF1.alloc();

        pbF1.set(pA, A);
        pbF1.set(pB, B);

        let start, end_add, end_sub, end_mul, end_div, time;

        const REPEAT = 100;
        for (let SIZE = 16; SIZE < 24; SIZE += 2) {
            let loops = 1 << SIZE;

            // test add
            start = new Date().getTime();
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_add(pA, pB, pC, loops); 
            }
            end_add = new Date().getTime();
            time = (end_add - start) / REPEAT;
            console.log("ADD: loops: 2^" + SIZE + ". Test Time (ms): " + time);

            // test sub
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_sub(pA, pB, pC, loops);
            }
            end_sub = new Date().getTime();
            time = (end_sub - end_add) / REPEAT;
            console.log("SUB: loops: 2^" + SIZE + ". Test Time (ms): " + time);

            // test mul
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_mul(pA, pB, pC, loops);
            }
            end_mul = new Date().getTime();
            time = (end_mul - end_sub) / REPEAT;
            console.log("MUL: loops: 2^" + SIZE + ". Test Time (ms): " + time);
        }

        // test div
        // use a inverse and a mul 
        for (let SIZE = 8; SIZE < 18; SIZE += 2) {
            let loops = 1 << SIZE;
            const pB_inv = pbF1.alloc();
            pbF1.set(pB_inv, B);

            let begin_div = new Date().getTime();
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_inverse(pB, pB_inv, loops);
                pbF1.test_f1_mul(pA, pB_inv, pC, loops);
            }

            end_div = new Date().getTime();
            time = (end_div - begin_div) / REPEAT;
            console.log("DIV: loops: 2^" + SIZE + ". Test Time (ms): " + time);
        }
    }).timeout(10000000);

    it("It should test time consumption (Fq)", async () => {
        // Fq
        const q = bigInt("4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559787");
        const A = bigInt("145B87AB9FFA5F869C95870899AA7F55978B2A911A8640F5FAEB4A877DF2FA29F4271D5E44B34C25000F2B17C570D854",16);
        const B = bigInt("05E108707C2D0615FE6D250E82987FF8CFABF734B5480D36789352B17950AE331AC70CBC0AC3FAC6B982395D281631F9",16);

        const pbF1 = await buildProtoboard((module) => {
            buildF1(module, q);
            buildTest2(module, "f1_mul");
            buildTest2(module, "f1_add");
            buildTest2(module, "f1_sub");
            buildTest1(module, "f1_inverse");
        }, 48);

        const pA = pbF1.alloc();
        const pB = pbF1.alloc();
        const pC = pbF1.alloc();

        pbF1.set(pA, A);
        pbF1.set(pB, B);

        let start, end_add, end_sub, end_mul, end_div, time;

        const REPEAT = 100;
        for (let SIZE = 16; SIZE < 24; SIZE += 2) {
            let loops = 1 << SIZE;

            // test add
            start = new Date().getTime();
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_add(pA, pB, pC, loops);
            }
            end_add = new Date().getTime();
            time = (end_add - start) / REPEAT;
            console.log("ADD: loops: 2^" + SIZE + ". Test Time (ms): " + time);

            // test sub
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_sub(pA, pB, pC, loops);
            }
            end_sub = new Date().getTime();
            time = (end_sub - end_add) / REPEAT;
            console.log("SUB: loops: 2^" + SIZE + ". Test Time (ms): " + time);

            // test mul
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_mul(pA, pB, pC, loops);
            }
            end_mul = new Date().getTime();
            time = (end_mul - end_sub) / REPEAT;
            console.log("MUL: loops: 2^" + SIZE + ". Test Time (ms): " + time);
        }

        // test div
        // use a inverse and a mul 
        for (let SIZE = 8; SIZE < 18; SIZE += 2) {
            let loops = 1 << SIZE;
            const pB_inv = pbF1.alloc();
            pbF1.set(pB_inv, B);

            let begin_div = new Date().getTime();
            for (let i = 0; i < REPEAT; i++) {
                pbF1.test_f1_inverse(pB, pB_inv, loops);
                pbF1.test_f1_mul(pA, pB_inv, pC, loops);
            }

            end_div = new Date().getTime();
            time = (end_div - begin_div) / REPEAT;
            console.log("DIV: loops: 2^" + SIZE + ". Test Time (ms): " + time);
        }
    }).timeout(10000000);


});
