const assert = require("assert");
const bigInt = require("big-integer");

const buildF1 = require("../index.js").buildF1;
const buildF1m = require("../src/build_f1m");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

describe("Basic tests for FF", () => {
    it("It should check correctness for add and sub", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588",16);
        const B = bigInt("5FB51E0EE491C6F26F2FD3AB01162C4D3AD3AFF73FC213510EBBF34FAA74C07E",16);

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            buildTest2(module, "f1m_mul");
            buildTest2(module, "f1m_add");
            buildTest2(module, "f1m_sub");
        }, 32);

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pC = pbF1m.alloc();

        pbF1m.set(pA, A);
        pbF1m.set(pB, B);

        const op1 = pbF1m.get(pA);
        const op2 = pbF1m.get(pB);
        console.log("Operand1: " + op1);
        console.log("Operand2: " + op2);

        // native rust result: 531594301EC795F435BFEF2B5BD4BC1F7D6A38C03632F025BA13405F8E978605
        // wasmsnark: 3.758009297654969e+76
        pbF1m.f1m_add(pA, pB, pC);
        console.log("Operand1 add operand2: " + pbF1m.get(pC));
        
        // native rust result: 0798FF657F4185578A9A1FDD634A3B8A5B807CD4B6AD25829C9B59BF39AE050A
        // wasmsnark: 3.4365133756038387e+75
        pbF1m.f1m_sub(pA, pB, pC)
        console.log("Operand1 sub operand2:" + pbF1m.get(pC));

        // wrong answer
        // pbF1m.f1m_mul(pA, pB, pC)
        // console.log("Operand1 sub operand2 :" + pbF1m.get(pC));
    }).timeout(10000000);

    it("It should test time consumption", async () => {
        const q = bigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
        const A = bigInt("674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588",16);
        const B = bigInt("5FB51E0EE491C6F26F2FD3AB01162C4D3AD3AFF73FC213510EBBF34FAA74C07E",16);

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            buildTest2(module, "f1m_mul");
            buildTest2(module, "f1m_add");
            buildTest2(module, "f1m_sub");
        }, 32);

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pC = pbF1m.alloc();

        pbF1m.set(pA, A);
        pbF1m.set(pB, B);

        const SIZE = 18;

        let start, end, end2, time;
        
        for (let SIZE=18; SIZE<=24; SIZE+=2){
            let loops = 1<<SIZE;

            // test add
            start = new Date().getTime();
            pbF1m.test_f1m_add(pA, pB, pC, loops);
            end = new Date().getTime();
            time = end - start;
            console.log("ADD: loops: 2^"+ SIZE +". Test Time (ms): " + time);

            // test sub
            start = new Date().getTime();
            pbF1m.test_f1m_sub(pA, pB, pC, loops)
            end2 = new Date().getTime();
            time = end2 - end;
            console.log("SUB: loops: 2^"+ SIZE +". Test Time (ms): " + time);
        }
    }).timeout(10000000);
});
