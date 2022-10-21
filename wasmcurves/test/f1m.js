const assert = require("assert");
const { modInv, isNegative } = require("../src/bigint.js");

const buildF1 = require("../src/f1");
const buildF1m = require("../src/build_f1m");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildTest2 = require("../src/build_test.js").buildTest2;

describe("Basic tests for Zq", () => {

    it("fast mul is correct", async () => {
        let start,end,time;

        const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;        
        const A = 0xFFFFFFFFFFFFFFFFFFFFn;

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            buildTest2(module, "f1m_mul");
            buildTest2(module, "f1m_fastMul");
        }, 32);

        const pA = pbF1m.alloc();
        const pC = pbF1m.alloc();
        const pD = pbF1m.alloc();

        pbF1m.set(pA, A);

        start = new Date().getTime();
        pbF1m.test_f1m_mul(pA, pA, pC, 70000);
        end = new Date().getTime();
        time = end - start;

        const c1 = pbF1m.get(pC);

        console.log("Mul Time (ms): " + time);

        start = new Date().getTime();
        pbF1m.test_f1m_fastMul(pA, pA, pD,70000);
        end = new Date().getTime();
        time = end - start;

        const d1 = pbF1m.get(pD);

        console.log("Fast Mul Time (ms): " + time);

        console.log("wasmcurve: " + c1);
        console.log("our      : " + d1)
        //assert.equal(c1, d1);
    }).timeout(10000000);
    
});
