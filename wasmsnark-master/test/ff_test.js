const assert = require("assert");
const bigInt = require("big-integer");
const buildF1 = require("../src/build_f1");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

describe("Basic tests for FF", () => {
    it("It should check correctness for add and sub", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        //    //          52435875175126190479447740508185965837690552500527637822603658699938581184513
        const A = bigInt("674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588",16);
        const B = bigInt("5FB51E0EE491C6F26F2FD3AB01162C4D3AD3AFF73FC213510EBBF34FAA74C07E",16);

        // const A = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        // const B = bigInt("5FB51E0EE491C6F26F2FD3AB01162C4D3AD3AFF73FC213510EBBF34FAA74C07E",16);


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

        const op1 = pbF1.get(pA);
        const op2 = pbF1.get(pB);
        console.log("Operand1: " + bigInt(op1).toString());
        console.log("Operand2: " + bigInt(op2).toString());

        // wasm result: 531594301EC795F435BFEF2B5BD4BC1F7D6A38C03632F025BA13405F8E978605
        // wasmsnark: 37580092976549694901061208524679759230750484726388121703217475989570600797701
        pbF1.f1_add(pA, pB, pC);
        console.log("Operand1 add operand2: " + bigInt(pbF1.get(pC)).toString());
        
        // wasm result: 0798FF657F4185578A9A1FDD634A3B8A5B807CD4B6AD25829C9B59BF39AE050A
        // wasmsnark: 3436513375603838875919827544574537340810112804547470174493279205783342286090
        pbF1.f1_sub(pA, pB, pC)
        console.log("Operand1 sub operand2: " + bigInt(pbF1.get(pC)).toString());

        // wasm result: 4B21C405077FB95DF30A958F837B54640F4F57EB3A5EC173399ABCD4916DF74A
        // wasmsnark: 33983122474756098781773951350022199996275924024116950809355222184621048198986
        pbF1.f1_mul(pA, pB, pC)
        console.log("Operand1 mul operand2: " + bigInt(pbF1.get(pC)).toString());

        // wasm result: 427D8B799CA353FA64575246ED0F662AA437E96577EB58E2EFA8DAF3EA9C922E
        // wasmsnark: 30074466510984537046030399553264726479800103255901875477962969006999963734574
        const pB_inv = pbF1.alloc();
        pbF1.f1_inverse(pB,pB_inv);
        pbF1.f1_mul(pB_inv,pA,pC);
        console.log("Operand1 div operand2: " + bigInt(pbF1.get(pC)).toString());

    }).timeout(10000000);

    it("It should test time consumption", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588",16);
        const B = bigInt("5FB51E0EE491C6F26F2FD3AB01162C4D3AD3AFF73FC213510EBBF34FAA74C07E",16);

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

        const SIZE = 18;

        let start, end_add, end_sub, end_mul, end_div, time;
        
        for (let SIZE=14; SIZE<16; SIZE+=2){
            let loops = 1<<SIZE;

            // test add
            start = new Date().getTime();
            pbF1.test_f1_add(pA, pB, pC, loops);
            end_add = new Date().getTime();
            time = end_add - start;
            console.log("ADD: loops: 2^"+ SIZE +". Test Time (ms): " + time);

            // test sub
            pbF1.test_f1_sub(pA, pB, pC, loops)
            end_sub = new Date().getTime();
            time = end_sub - end_add;
            console.log("SUB: loops: 2^"+ SIZE +". Test Time (ms): " + time);

            // test mul
            pbF1.test_f1_mul(pA, pB, pC, loops)
            end_mul = new Date().getTime();
            time = end_mul - end_sub;
            console.log("MUL: loops: 2^"+ SIZE +". Test Time (ms): " + time);

            // test div
            // use a inverse and a mul 
            const pB_inv = pbF1.alloc();
            pbF1.set(pB_inv, B);
            pbF1.test_f1_inverse(pB,pB_inv,loops);
            pbF1.test_f1_mul(pA, pB_inv, pC, loops);
            end_div = new Date().getTime();
            time = end_div - end_mul;
            console.log("DIV: loops: 2^"+ SIZE +". Test Time (ms): " + time);
        }
    }).timeout(10000000);
});
