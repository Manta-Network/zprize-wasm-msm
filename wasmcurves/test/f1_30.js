const assert = require("assert");
const buildF1m = require("../src/build_f1m");
const buildProtoboard = require("wasmbuilder").buildProtoboard;
const buildBn128 = require("../src/bn128/build_bn128.js");

describe("Basic tests for Zq", () => {
    it("fast mul is correct", async () => {
        const q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;        
        //const q = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        const A = q-8993425245399888888888888888889999988845n;

        const pbF1m = await buildProtoboard((module) => {
            buildF1m(module, q);
        }, 32);

        const pA = pbF1m.alloc();
        const pC = pbF1m.alloc();
        const pD = pbF1m.alloc();
        const one = pbF1m.alloc();

        pbF1m.set(pA, A);
        pbF1m.f1m_toMontgomery(pA,pA)
        pbF1m.f1m_mul(pA, pA, pA);
        pbF1m.f1m_fromMontgomery(pA,pA)
        let d1 = pbF1m.get(pA);
        
        assert.equal(((A*A )% q), d1);
    }).timeout(10000000);
});

