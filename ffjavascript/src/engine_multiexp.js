import { log2 } from "./utils.js";

const pTSizes = [
    1 ,  1,  1,  1,    2,  3,  4,  5,
    6 ,  7,  7,  8,    9, 10, 11, 11,
    12, 12, 13, 14,   16, 16, 17, 17,
    17, 17, 17, 17,   17, 17, 17, 17
];

const pTSizes_wasmcurve = [
    1 ,  1,  1,  1,    2,  3,  4,  5,
    6 ,  7,  7,  8,    9, 10, 11, 12,
    13, 13, 14, 15,   16, 16, 17, 17,
    17, 17, 17, 17,   17, 17, 17, 17
];

export default function buildMultiexp(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = G.tm;

    //直接调用batchaffine，不再分块
    async function _multiExp_batchaffine(buffBases, buffScalars, inType, logger, logText) {
        if ( ! (buffBases instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
        }
        if ( ! (buffScalars instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
        }

        let sGIn;
        let fnName;

        if (groupName == "G1") {
            if (inType == "affine") {
                //fnName = "g1m_multiexp_multiExp";
                //fnName = "g1m_multiexpAffine_wasmcurve";
                fnName = "g1m_multiexp_multiExp";
                sGIn = G.F.n8*2;
            } else {
                fnName = "undefined";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                fnName = "undefined";
                sGIn = G.F.n8*2;
            } else {
                fnName = "undefined";
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }


        let nPoints = Math.floor(buffBases.byteLength / sGIn);
        let sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;
        const numBuckets = 1<<bitChunkSize;
        
        const task = [
            {cmd: "ALLOCSET", var: 0, buff: buffBases},// pPoints
            {cmd: "ALLOCSET", var: 1, buff: buffScalars},//pScalars
            {cmd: "ALLOC", var: 2, len: G.F.n8*3},//pResult

            {cmd: "CALL", fnName: "g1m_multiexp_multiExp", params: [
                {var: 0},
                {var: 1},
                {val: nPoints},
                {var: 2},
            ]},

            {cmd: "GET", out: 0, var: 2, len: G.F.n8*3},//pMetadata
        ];      
        console.log("nPoints", nPoints, "sScalar", sScalar, "buffScalars.byteLength", buffScalars.byteLength," buffBases.byteLength", buffBases.byteLength)
        return G.tm.queueAction(task);
    }


    // 按照chunk并行
    async function _multiExp(buffBases, buffScalars, inType, logger, logText) {
        if ( ! (buffBases instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
        }
        if ( ! (buffScalars instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
        }

        let sGIn;
        let fnName;

        if (groupName == "G1") {
            if (inType == "affine") {
                //fnName = "g1m_multiexp_multiExp";
                //fnName = "g1m_multiexpAffine_wasmcurve";
                fnName = "g1m_doubleAffine";
                sGIn = G.F.n8*2;
            } else {
                fnName = "undefined";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                fnName = "undefined";
                sGIn = G.F.n8*2;
            } else {
                fnName = "1 ";
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }


        let nPoints = Math.floor(buffBases.byteLength / sGIn);
        let sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }
        const opPromises = [];
        const opPromises_params = [];

        // sScalar = Fr.e(sScalar)
        // nPoints = Fr.e(nPoints)

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;
        const numBuckets = 1<<bitChunkSize;

        

        
        const task = [
            {cmd: "ALLOCSET", var: 0, buff: buffBases},// pPoints
            {cmd: "ALLOCSET", var: 1, buff: buffScalars},//pScalars
            {cmd: "ALLOC", var: 2, len: G.F.n8*3},//pResult
            {cmd: "ALLOC", var: 3, len: nChunks * nPoints * 8},//pPointSchedules
            {cmd: "ALLOC", var: 4, len: nChunks * nPoints * 8},//pMetadata
            {cmd: "ALLOC", var: 5, len: nChunks * 4},//pRoundCounts
            {cmd: "ALLOC", var: 6, len: nChunks * nPoints * 4},//pBucketCounts
            {cmd: "ALLOC", var: 7, len: nChunks * 4},//pNumNonZeroBuckets  

            {cmd: "CALL", fnName: "g1m_multiexp_initialized", params: [
                {var: 0},
                {var: 1},
                {val: nPoints},
                {var: 2},
                {var: 3},
                {var: 4},
                {var: 5},
                {var: 6},
                {var: 7},
                {val: nChunks},
                {val: bitChunkSize},
                {val: numBuckets},
            ]},

            {cmd: "GET", out: 0, var: 4, len: nChunks * nPoints * 8},//pMetadata
            {cmd: "GET", out: 1, var: 6, len: nChunks * nPoints * 4},//pBucketCounts
            {cmd: "GET", out: 2, var: 7, len: nChunks * 4}//pNumNonZeroBuckets 
        ];

        let start, end, time;
        start = new Date().getTime();
        opPromises_params.push(
            G.tm.queueAction(task)
        );

        const params = await Promise.all(opPromises_params);
        // console.log("params: " + params.length);
        end = new Date().getTime();
        time = end - start;
        //console.log("initialize params Time (ms): " + time);

        
        

        if ( ! (params[0][0] instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk params is not Uint8Array`);
        }

        start = new Date().getTime();
        for (let i=0; i<nChunks; i++) {
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: params[0][0]},//pPointSchedules
                {cmd: "ALLOCSET", var: 1, buff: buffBases},// pPoints
                {cmd: "ALLOCSET", var: 2, buff: params[0][2]},// pNumNonZeroBuckets
                {cmd: "ALLOCSET", var: 3, buff: params[0][1]},//pBucketCounts

                {cmd: "ALLOC", var: 4, len: G.F.n8*3},//pResult
                {cmd: "ALLOC", var: 5, len: G.F.n8*3},//pAccumulator
                {cmd: "ALLOC", var: 6, len: G.F.n8*3},//pRunningSum
                {cmd: "ALLOC", var: 7, len: (nPoints+1)*4},//pBitOffsets
                {cmd: "ALLOC", var: 8, len: nPoints*8},//pPointScheduleAlt
                {cmd: "ALLOC", var: 9, len: G.F.n8*3*nPoints},//pPointPairs1  
                {cmd: "ALLOC", var: 10, len: G.F.n8*3*nPoints},//pPointPairs2
                
                {cmd: "CALL", fnName: "g1m_multiexp_multiExpChunks_wrapper", params: [
                    {var: 0},
                    {var: 1},
                    {var: 2},
                    {var: 3},
                    {val: nPoints},
                    {val: bitChunkSize},
                    {val: nChunks},
                    {val: numBuckets},
                    {var: 4},
                    {var: 5},
                    {var: 6},
                    {var: 7},
                    {var: 8},
                    {var: 9},
                    {var: 10},
                    {val: i},//是否要跳过第一个chunk
                ]},
                {cmd: "GET", out: 0, var: 4, len: G.F.n8*3}
            ];
            opPromises.push(
                G.tm.queueAction(task)
            );
        }
        
        const result = await Promise.all(opPromises);
        // console.log("result: " + result.length);
        end = new Date().getTime();
        time = end - start;
        //console.log("compute result Time (ms): " + time);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            if (!G.isZero(res)) {
                for (let j=0; j<bitChunkSize; j++) res = G.double(res);
            }
            res = G.add(res, result[i][0]);
            
        }
        // console.log("=========output (engine_multiexp)===========")
        // console.log("nPoints",nPoints)
        // console.log("bitChunkSize",bitChunkSize)
        // console.log("nChunks",nChunks)
        // console.log("numBuckets",numBuckets)
        // console.log("res",res)
        return res;
    }

    // G.multiExp = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
    //     return await _multiExp(buffBases, buffScalars, "jacobian", logger, logText);
    // };

    // 按照chunk并行
    G.multiExpAffine = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "affine", logger, logText);
    };


    // chunk和长度并行
    async function _multiExp2(buffBases, buffScalars, inType, logger, logText) {
        const MAX_CHUNK_SIZE = 1 << 22;
        const MIN_CHUNK_SIZE = 1 << 14;
        let sGIn;
        if (groupName == "G1") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        let chunkSize;
        chunkSize = Math.floor(nPoints / (tm.concurrency /nChunks));
        if (chunkSize>MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;
        if (chunkSize<MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;

        const opPromises = [];
        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`Multiexp start: ${logText}: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);
            const buffBasesChunk = buffBases.slice(i*sGIn, (i+n)*sGIn);
            const buffScalarsChunk = buffScalars.slice(i*sScalar, (i+n)*sScalar);
            opPromises.push(_multiExp(buffBasesChunk, buffScalarsChunk, inType, logger, logText).then( (r) => {
                if (logger) logger.debug(`Multiexp end: ${logText}: ${i}/${nPoints}`);
                return r;
            }));
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            res = G.add(res, result[i]);
        }

        return res;
    }
    // chunk和长度并行
    G.multiExpAffine2 = async function multiExpAffine2(buffBases, buffScalars, logger, logText) {
        return await _multiExp2(buffBases, buffScalars, "affine", logger, logText);
    };

    //长度并行
    async function _multiExp3(buffBases, buffScalars, inType, logger, logText) {
        const MAX_CHUNK_SIZE = 1 << 17;
        const MIN_CHUNK_SIZE = 1 << 9;
        let sGIn;

        if (groupName == "G1") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }


        let chunkSize;
        // chunkSize = Math.floor(nPoints / (tm.concurrency /nChunks));
        // if (chunkSize>MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;
        // if (chunkSize<MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;
        chunkSize = Math.floor(nPoints /tm.concurrency);
        console.log(tm.concurrency);
        chunkSize = 1<<17
        const opPromises = [];
        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`Multiexp start: ${logText}: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);
            // console.log("n", n, " nPoints - i", nPoints - i, " chunkSize", chunkSize);
            const buffBasesChunk = buffBases.slice(i*sGIn, (i+n)*sGIn);
            const buffScalarsChunk = buffScalars.slice(i*sScalar, (i+n)*sScalar);
            // opPromises.push(_multiExp_batchaffine(buffBasesChunk, buffScalarsChunk, inType, logger, logText).then( (r) => {
            //     if (logger) logger.debug(`Multiexp end: ${logText}: ${i}/${nPoints}`);
            //     return r;
            // }));
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: buffBasesChunk},// pPoints
                {cmd: "ALLOCSET", var: 1, buff: buffScalarsChunk},//pScalars
                {cmd: "ALLOC", var: 2, len: G.F.n8*3},//pResult
    
                {cmd: "CALL", fnName: "g1m_multiexp_multiExp", params: [
                    {var: 0},
                    {var: 1},
                    //{val: 32},
                    {val: n},
                    {var: 2},
                ]},
    
                {cmd: "GET", out: 0, var: 2, len: G.F.n8*3},
            ];
            const tmp = G.tm.queueAction(task);
            opPromises.push(tmp);
        }

        const result = await Promise.all(opPromises);
        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            res = G.add(res, result[i][0]);
        }
        return res;
    }

    
    //长度并行
    G.multiExpAffine3 = async function multiExpAffine3(buffBases, buffScalars, logger, logText) {
        return await _multiExp3(buffBases, buffScalars, "affine", logger, logText);
    };




    async function _multiExpChunk_wasmcurve(buffBases, buffScalars, inType, logger, logText) {
        if ( ! (buffBases instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk_wasmcurve buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk_wasmcurve buffBases is not Uint8Array`);
        }
        if ( ! (buffScalars instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk_wasmcurve buffScalars is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk_wasmcurve buffScalars is not Uint8Array`);
        }
        inType = inType || "affine";

        let sGIn;
        let fnName;
        if (groupName == "G1") {
            if (inType == "affine") {
                fnName = "g1m_multiexpAffine_wasmcurve_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g1m_multiexp_wasmcurve_chunk";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            // if (inType == "affine") {
            //     fnName = "g2m_multiexpAffine_chunk";
            //     sGIn = G.F.n8*2;
            // } else {
            //     fnName = "g2m_multiexp_chunk";
            //     sGIn = G.F.n8*3;
            // }
            throw new Error("Invalid group");
        } else {
            throw new Error("Invalid group");
        }
        const nPoints = Math.floor(buffBases.byteLength / sGIn);

        if (nPoints == 0) return G.zero;
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes_wasmcurve[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: buffBases},
                {cmd: "ALLOCSET", var: 1, buff: buffScalars},
                {cmd: "ALLOC", var: 2, len: G.F.n8*3},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {var: 1},
                    {val: sScalar},
                    {val: nPoints},
                    {val: i*bitChunkSize},
                    {val: Math.min(sScalar*8 - i*bitChunkSize, bitChunkSize)},
                    {var: 2}
                ]},
                {cmd: "GET", out: 0, var: 2, len: G.F.n8*3}
            ];
            opPromises.push(
                G.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            if (!G.isZero(res)) {
                for (let j=0; j<bitChunkSize; j++) res = G.double(res);
            }
            res = G.add(res, result[i][0]);
        }

        return res;
    }

    async function _multiExp_wasmcurve(buffBases, buffScalars, inType, logger, logText) {
        const MAX_CHUNK_SIZE = 1 << 22;
        const MIN_CHUNK_SIZE = 1 << 10;
        let sGIn;

        if (groupName == "G1") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes_wasmcurve[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        let chunkSize;
        chunkSize = Math.floor(nPoints / (tm.concurrency /nChunks));
        if (chunkSize>MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;
        if (chunkSize<MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;

        const opPromises = [];
        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`Multiexp start: ${logText}: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);
            const buffBasesChunk = buffBases.slice(i*sGIn, (i+n)*sGIn);
            const buffScalarsChunk = buffScalars.slice(i*sScalar, (i+n)*sScalar);
            opPromises.push(_multiExpChunk_wasmcurve(buffBasesChunk, buffScalarsChunk, inType, logger, logText).then( (r) => {
                if (logger) logger.debug(`Multiexp end: ${logText}: ${i}/${nPoints}`);
                return r;
            }));
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            res = G.add(res, result[i]);
        }

        return res;
    }


    G.multiExpAffine_wasmcurve = async function multiExpAffine_wasmcurve(buffBases, buffScalars, logger, logText) {
        return await _multiExp_wasmcurve(buffBases, buffScalars, "affine", logger, logText);
    };

}
