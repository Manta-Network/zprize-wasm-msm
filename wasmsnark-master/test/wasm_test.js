const assert = require("assert");
const bigInt = require("big-integer");
const { pbkdf2Sync } = require("crypto");

const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildInt = require("../src/build_int.js");
const buildTest2 = require("../src/build_test.js").buildTest2;
const buildTest1 = require("../src/build_test.js").buildTest1;
const buildF1m = require("../src/build_wasm_test");
const helpers = require("./helpers/helpers.js");


describe("Basic tests for Int", () => {
    
    let pbF1m;

    before(async () => {
        const q = bigInt("2188824287183927440041603434369820418657580849561721888242871839274400416034343698204186575808495617");

        pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
            //buildTest1(module,"f1m_testWasmBinary")
            //buildTest2(module,"f1m_fullArrangeMul")
            buildTest2(module,"f1m_add")
            

            
        }, 64);
    });

    it("It should profile F1m int mul", async () => {
        
        // const A = bigInt.one.shiftLeft(255).minus(1111111);
        // const B = bigInt.one.shiftLeft(256).minus(2000000000);
        const A = bigInt.one;
        const B = bigInt.one;

        const pA = pbF1m.alloc();
        const pB = pbF1m.alloc();
        const pC = pbF1m.alloc();
        pbF1m.set(pA, A);
        pbF1m.set(pB, B);
        let repeat = 1<<22;

        // let start2 = new Date().getTime();
        // pbF1m.test_f1m_testWasmBinary(pA,pC,repeat);
        // let end2 = new Date().getTime();
        // time = (end2 - start2) ;
        // console.log("WASM build test1 Time (ms): " + time);
        // console.log(pbF1m.get(pC))


        // let start3 = new Date().getTime();
        // pbF1m.test_f1m_fullArrangeMul(pA,pB,pC,repeat);
        // let end3 = new Date().getTime();
        // time = (end3 - start3) ;
        // console.log("WASM build test2 Time (ms): " + time);
        // console.log(pbF1m.get(pC).toString(16))
        

        
        let start4 = new Date().getTime();
        pbF1m.test_f1m_add(pA,pB,pC,repeat);
        let end4 = new Date().getTime();
        time = (end4 - start4) ;
        console.log("Add test Time (ms): " + time);
        console.log(pbF1m.get(pC).toString(16))
        

    }).timeout(10000000);

});
