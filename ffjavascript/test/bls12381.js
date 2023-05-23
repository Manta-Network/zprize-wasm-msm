import assert from "assert";
import buildBn128 from "../src/bn128.js";
import buildBls12381 from "../src/bls12381.js";
import {log2} from "../src/utils.js";
import BigBuffer from "../src/bigbuffer.js";

describe("bls12381", async function () {
    this.timeout(0);

    const logger = {
        error: (msg) => { console.log("ERROR: "+msg); },
        warning: (msg) => { console.log("WARNING: "+msg); },
        info: (msg) => { console.log("INFO: "+msg); },
        debug: (msg) => { console.log("DEBUG: "+msg); },
    };

    let bls12381;
    before( async() => {
        bls12381 = await buildBls12381(true);
    });
    after( async() => {
        bls12381.terminate();
    });

    it("Benchmark.", async () => {
        const Fr = bls12381.Fr;
        const G1 = bls12381.G1;
        const N = 1 << 8;

        let scalars = new BigBuffer(N*bls12381.Fr.n8);
        let bases = new BigBuffer(N*G1.F.n8*2);
        let acc = Fr.zero;
        for (let i=0; i<N; i++) {
            if (i%100000 == 0) logger.debug(`setup ${i}/${N}`);
            //const num = Fr.e(i+1);
            const num = Fr.e(Fr.random());
            scalars.set(Fr.fromMontgomery(num), i*bls12381.Fr.n8);
            bases.set(G1.toAffine(G1.timesFr(G1.g, num)), i*G1.F.n8*2);
            acc = Fr.add(acc, Fr.square(num));
        }
        // bases = bases.slice();
        // scalars = scalars.slice();

        const accG = G1.timesFr(G1.g, acc);
        let accG2,accG3,accG4;
        let start, end, time;

        start = new Date().getTime();
        for (let i = 0; i < 10; i++) {
            //accG2 = await G1.multiExpAffine(bases, scalars, logger, "test");
            accG2 = await G1.multiExpAffine(bases.slice(), scalars.slice());
        }
        end = new Date().getTime();
        time = end - start;
        console.log("msm Time (ms): " + time);

        start = new Date().getTime();
        for (let i = 0; i < 10; i++) {
            //accG2 = await G1.multiExpAffine(bases, scalars, logger, "test");
            accG3 = await G1.multiExpAffine2(bases, scalars);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("msm2 Time (ms): " + time);

        start = new Date().getTime();
        for (let i = 0; i < 1; i++) {
            accG4 = await G1.multiExpAffine_wasmcurve(bases, scalars);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("wasmcurve msm Time (ms): " + time);

        // todo: check results
        // assert(G1.eq(accG, accG2 ));
        // assert(G1.eq(accG, accG3 ));
        // assert(G1.eq(accG, accG4 ));
    });
});

