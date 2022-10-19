const assert = require("assert");
const ChaCha = require("ffjavascript").ChaCha;
const buildBls12381 = require("../src/bls12381/build_bls12381.js");
const utils = require("../src/utils");
const buildProtoboard = require("wasmbuilder").buildProtoboard;

describe("GLV Tests", function () {
    this.timeout(10000000);
    // Fq: 48 bytes = 384 bits
    const n8q = 48;
    // Fr: 32 bytes = 256 bits
    const n8r = 32;
    let pb;
    before(async () => {
        pb = await buildProtoboard((module) => {
            buildBls12381(module);
        }, 1);
    });

    it("decomposeScalar is correct.", async () => {
        const scalar = 9003405095674209932115908784230457051068760537362306482987933690960811974463n;
        const pScalar = pb.alloc(64);
        pb.set(pScalar, scalar, 64);
        console.log("pScalar: ", pb.get(pScalar, 1, 64));

        const pScalarRes = pb.alloc(64);
        pb.g1m_glv_decomposeScalar(pScalar, pScalarRes);
        console.log("pScalarRes: ", pb.get(pScalarRes, 1, 64));

        // let output = pb.get(pScalarRes, 2, n8r / 2);
        // for (let i = 0; i < 2; i++) {
        //     console.log("i: ", output[i]);
        //     // assert.equal(output[i], expectedOutput[i]);
        // }
    });

    it("endomorphism is correct.", async () => {

    });

    it("scalarMul is correct.", async () => {

    });
});

//  k: 9003405095674209932115908784230457051068760537362306482987933690960811974463, 
//  divisor: 52435875175126190479447740508185965837690552500527637822603658699938581184513, 
//  u1_k: 9003405095674209932115908784230457051068760537362306482987933690960811974463, 
//  q1: 0, 
//  minus_v1_k: 2061679020180739469047023531468293329388578619704058061474721230945262427065206778081527246556275829431699448733889, 
//  q2: 39318100695279906693562908013718409681, 
//  q1_v0: 0, 
//  q2_u0: 9003405095674209932115908784230457050981859755990779239195419066636880052224, 
//  q1_v1: 0, 
//  q2_u1: 39318100695279906693562908013718409681, 
//  k1_minus_q1_v0: 9003405095674209932115908784230457051068760537362306482987933690960811974463, 
//  k1: 86900781371527243792514624323931922239, 
//  k2: -39318100695279906693562908013718409681


// -39318100695279906693562908013718409681
//



// 13407807929942597099574024998205846127479365820592393377722594172552127497222326270094883060734540096997396000528874603279033680036565765127819995331063257n