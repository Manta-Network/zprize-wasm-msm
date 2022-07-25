import chai from "chai";
import * as Scalar from "../src/scalar.js";
import buildBls12381 from "../src/bls12381.js";
import F1Field from "../src/f1field.js";

const assert = chai.assert;


describe("F1 testing", function() {
    this.timeout(0);

    let bls12381;
    before( async() => {
        bls12381 = await buildBls12381();
    });
    after( async() => {
        bls12381.terminate();
    });

    it("Should test Fr: ", () => {
        const F = new F1Field(bls12381.r);
        const repeat = 100;
        let a = F.random();
        let b = F.random();
        
        for(let SIZE = 12;SIZE<12;SIZE+=2){
            let loops = 1 << SIZE;
            let start_add = new Date().getTime();
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.add(a,b);
                }
            }
            let end_add = new Date().getTime();
            console.log("ADD: loops: 2^" + SIZE + ". Test Time (ms): " + (end_add - start_add) / repeat);
        
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.sub(a,b);
                }
            }
            let end_sub = new Date().getTime();
            console.log("SUB: loops: 2^" + SIZE + ". Test Time (ms): " + (end_sub - end_add) / repeat);

            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.mul(a,b);
                }
            }
            let end_mul = new Date().getTime();
            console.log("MUL: loops: 2^" + SIZE + ". Test Time (ms): " + (end_mul - end_sub) / repeat);
        }

        
        for(let SIZE = 8;SIZE<8;SIZE+=2){
            let loops = 1 << SIZE;
            let start_div = new Date().getTime();
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.div(a,b);
                }
            }
            let end_div = new Date().getTime();
            console.log("DIV: loops: 2^" + SIZE + ". Test Time (ms): " + (end_div - start_div) / repeat);
        }
    });

    it("Should test Fq: ", () => {
        const F = new F1Field(bls12381.q);
        const repeat = 100;
        let a = F.random();
        let b = F.random();

        for(let SIZE = 16;SIZE<16;SIZE+=2){
            let loops = 1 << SIZE;
            let start_add = new Date().getTime();
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.add(a,b);
                }
            }
            let end_add = new Date().getTime();
            console.log("ADD: loops: 2^" + SIZE + ". Test Time (ms): " + (end_add - start_add) / repeat);
        
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.sub(a,b);
                }
            }
            let end_sub = new Date().getTime();
            console.log("SUB: loops: 2^" + SIZE + ". Test Time (ms): " + (end_sub - end_add) / repeat);

            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.mul(a,b);
                }
            }
            let end_mul = new Date().getTime();
            console.log("MUL: loops: 2^" + SIZE + ". Test Time (ms): " + (end_mul - end_sub) / repeat);
        }

        
        for(let SIZE = 8;SIZE<8;SIZE+=2){
            let loops = 1 << SIZE;
            let start_div = new Date().getTime();
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                
                    let s = F.div(a,b);
                }
            }
            let end_div = new Date().getTime();
            console.log("DIV: loops: 2^" + SIZE + ". Test Time (ms): " + (end_div - start_div) / repeat);
        }


    });
});

describe("Curve G1 Test", function() {
    this.timeout(0);

    let bls12381;
    before( async() => {
        bls12381 = await buildBls12381();
    });
    after( async() => {
        bls12381.terminate();
    });

    it("Should test G1 add", () => {
        // type Uint8Array(32) = 256 bit
        const r1 = bls12381.Fr.e(33);
        const r2 = bls12381.Fr.e(44);

        // type Uint8Array(144) = 384 * 3 bit
        const gr1 = bls12381.G1.timesFr(bls12381.G1.g, r1);
        const gr2 = bls12381.G1.timesFr(bls12381.G1.g, r2);

        const repeat = 100;
        for(let SIZE = 10;SIZE<10;SIZE+=2){
            let loops = 1 << SIZE;
            let start_add = new Date().getTime();
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                    const grsum = bls12381.G1.add(gr1, gr2);
                }
            }
            let end_add = new Date().getTime();
            console.log("EC add: loops: 2^" + SIZE + ". Test Time (ms): " + (end_add - start_add) / repeat);
        }
    });

    it("Should test G1 mul", () => {
        // type Uint8Array(32) = 256 bit
        const s=BigInt("0x674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588",16);
        const r1 = bls12381.Fr.e(s);
        const r2 = bls12381.Fr.e(44);
        const r3 = bls12381.Fr.add(r1, r2)

        // type Uint8Array(144) = 384 * 3 bit
        const gr = bls12381.G1.timesFr(bls12381.G1.g, r2);

        const repeat = 100;
        for(let SIZE = 6;SIZE<14;SIZE+=2){
            let loops = 1 << SIZE;
            let start_mul = new Date().getTime();
            for (let i=0;i<repeat; i++) {
                for(let j=0; j<loops;j++){
                    let grmul = bls12381.G1.timesFr(gr, r1);

                }
            }
            let end_mul = new Date().getTime();
            console.log("EC mul: loops: 2^" + SIZE + ". Test Time (ms): " + (end_mul - start_mul) / repeat);
        }
        
    });
});

