const assert = require("assert");
const { modInv } = require("../src/bigint.js");
const buildBn128 = require("../src/bn128/build_bn128.js");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("Basic tests for g1 in bn128", () => {

    let pb;
    const n8=32;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBn128(module);
        }, n8);
    });
    const ChaCha = require("ffjavascript").ChaCha;
    it("It should test multiexp", async () => {
        const N=4;
        const pG1 = pb.bn128.pG1gen;

  
        let acc=0;

        const pCalculated = pb.alloc(n8*3);
        const pCalculated2 = pb.alloc(n8*3);

        // Set scalars to 1,2,3
        const pScalars = pb.alloc(n8*N);
        for (let i=0; i<N; i++) {
            // pb.set(pScalars+i*n8, i3+143214);
            pb.set(pScalars+i*n8, i);
        }

        // Set points to 1*G, 2*G, 3*G
        const pPoints = pb.alloc(n8*2*N);
        for (let i=0; i<N; i++) {
            pb.g1m_timesScalarAffine(pG1, pScalars+n8*i, n8, pCalculated);
            pb.g1m_toAffine(pCalculated, pPoints+i*n8*2);
        }
        // pb.set(pPoints+0*n8, 0);//p0
        // pb.set(pPoints+1*n8, 0);
        pb.set(pPoints+2*n8, 0);//p1
        pb.set(pPoints+3*n8, 0);
        pb.set(pPoints+4*n8, 0);//p2
        pb.set(pPoints+5*n8, 0);
        pb.set(pPoints+6*n8, 0);//p3
        pb.set(pPoints+7*n8, 0);
        // pb.set(pPoints+8*n8, 0);
        // pb.set(pPoints+9*n8, 0);

        pb.g1m_multiexpAffine_wasmcurve(pPoints, pScalars, n8, N, pCalculated);
        pb.g1m_multiexp_multiExp(pPoints, pScalars, N, pCalculated2);

        console.log(pb.g1m_isZeroAffine(pCalculated));
        console.log(pb.g1m_isZeroAffine(pCalculated2));
        assert(pb.g1m_eq(pCalculated2, pCalculated));

    }).timeout(100000000);
});
