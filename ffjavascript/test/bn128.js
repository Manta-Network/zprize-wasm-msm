import assert from "assert";
import buildBn128 from "../src/bn128.js";
import {log2} from "../src/utils.js";
import BigBuffer from "../src/bigbuffer.js";

describe("bn128", async function () {
    this.timeout(0);

    const logger = {
        error: (msg) => { console.log("ERROR: "+msg); },
        warning: (msg) => { console.log("WARNING: "+msg); },
        info: (msg) => { console.log("INFO: "+msg); },
        debug: (msg) => { console.log("DEBUG: "+msg); },
    };

    let bn128;
    before( async() => {
        bn128 = await buildBn128(false);
    });
    after( async() => {
        bn128.terminate();
    });

    it("Benchmark.", async () => {
        const Fr = bn128.Fr;
        const G1 = bn128.G1;
        const N = 1 << 18;

        let scalars = new BigBuffer(N*bn128.Fr.n8);
        let bases = new BigBuffer(N*G1.F.n8*2);
        let acc = Fr.zero;
        for (let i=0; i<N; i++) {
            if (i%100000 == 0) logger.debug(`setup ${i}/${N}`);
            const num = Fr.e(Fr.random());
            scalars.set(Fr.fromMontgomery(num), i*bn128.Fr.n8);
            bases.set(G1.toAffine(G1.timesFr(G1.g, num)), i*G1.F.n8*2);
            acc = Fr.add(acc, Fr.square(num));
        }
        // bases = bases.slice();
        // scalars = scalars.slice();

        const accG = G1.timesFr(G1.g, acc);
        let accG2,accG3,accG4,accG5;
        let start, end, time;

        let repeat = 2;
        start = new Date().getTime();
        for (let i = 0; i < repeat; i++) {
            accG2 = await G1.multiExpAffine(bases.slice(), scalars.slice());
        }
        end = new Date().getTime();
        time = end - start;
        console.log("msm(chunk parallel) Time (ms): " + time/repeat);

        start = new Date().getTime();
        for (let i = 0; i < repeat; i++) {
            accG3 = await G1.multiExpAffine2(bases, scalars);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("msm2(chunk and length parallel) Time (ms): " + time/repeat);

        start = new Date().getTime();
        for (let i = 0; i < repeat; i++) {
            accG4 = await G1.multiExpAffine3(bases, scalars);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("msm3(length parallel) Time (ms): " + time/repeat);


        start = new Date().getTime();
        for (let i = 0; i < repeat; i++) {
            accG5 = await G1.multiExpAffine_wasmcurve(bases, scalars);
        }
        end = new Date().getTime();
        time = end - start;
        console.log("wasmcurve msm Time (ms): " + time/repeat);


        assert(G1.eq(accG, accG2 ));
        assert(G1.eq(accG, accG3 ));
        assert(G1.eq(accG, accG4 ));
        assert(G1.eq(accG, accG5 ));
    });
});

