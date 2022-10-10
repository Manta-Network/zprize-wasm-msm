/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildMultiexpOpt(module, prefix, fnName, opAdd, n8b) {
    const n64g = module.modules[prefix].n64; // prefix g1m
    const n8g = n64g * 8; // 144

    const n8 = 48 // only for our msm implementation 
    const prefixField = "f1m"// only for our msm implementation 

    // Loads an i64 scalar pArr[index].
    function buildLoadI64() {
        const f = module.addFunction(fnName + "_loadI64");
        // Pointer to a 1-d array with i64 elements
        f.addParam("pArr", "i32");
        // Index
        f.addParam("index", "i32");
        f.setReturnType("i64");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i64_load(
                c.i32_add(
                    c.getLocal("pArr"),
                    c.i32_shl(
                        c.getLocal("index"),
                        c.i32_const(3),
                    ),
                ),
            ),
        )
    }

    // Stores an i64 scalar at pArr[index].
    function buildStoreI64() {
        const f = module.addFunction(fnName + "_storeI64");
        // Pointer to a 1-d array with i64 elements
        f.addParam("pArr", "i32");
        // Index
        f.addParam("index", "i32");
        // Value
        f.addParam("value", "i64");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i64_store(
                c.i32_add(
                    c.getLocal("pArr"),
                    c.i32_shl(
                        c.getLocal("index"),
                        c.i32_const(3),
                    ),
                ),
                c.getLocal("value"),
            ),
        )
    }

    // Loads an i32 scalar pArr[index].
    function buildLoadI32() {
        const f = module.addFunction(fnName + "_loadI32");
        // Pointer to a 1-d array with i32 elements
        f.addParam("pArr", "i32");
        // Index
        f.addParam("index", "i32");
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_load(c.i32_add(
                c.getLocal("pArr"),
                c.i32_shl(
                    c.getLocal("index"),
                    c.i32_const(2),
                ),
            )),
        )
    }

    // Stores an i32 scalar at pArr[index].
    function buildStoreI32() {
        const f = module.addFunction(fnName + "_storeI32");
        // Pointer to a 1-d array with i32 elements
        f.addParam("pArr", "i32");
        // Index
        f.addParam("index", "i32");
        // Value
        f.addParam("value", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_store(
                c.i32_add(
                    c.getLocal("pArr"),
                    c.i32_shl(
                        c.getLocal("index"),
                        c.i32_const(2),
                    ),
                ),
                c.getLocal("value"),
            ),
        )
    }

    // Allocates a memory of `size` that are pointed to by `pointer`.
    function buildAllocateMemory() {
        const f = module.addFunction(fnName + "_allocateMemory");
        // Number of bytes to be allocated
        f.addParam("size", "i32");
        // An empty pointer
        f.addLocal("pointer", "i32");
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("pointer", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pointer"),
                    c.getLocal("size"),
                ),
            ),
            c.getLocal("pointer"),
        );
    }

    // Computes `pArr[i] += v` given a pointer `pArr` to an array of `i32`, index `i`, and an i32 value `v`.
    //
    // Note
    // This function does not check if `i` is out-of-bound for `pArr`.
    function buildAddAssignI32InMemoryUncheck() {
        const f = module.addFunction(fnName + "_addAssignI32InMemoryUncheck");
        // A pointer to an array of `i32`.
        f.addParam("pArr", "i32");
        // Index
        f.addParam("i", "i32");
        // Value
        f.addParam("v", "i32");
        // pointer to `pArr[i]`
        f.addLocal("pArrI", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal(
                "pArrI",
                c.i32_add(
                    c.getLocal("pArr"),
                    c.i32_shl(
                        c.getLocal("i"),
                        c.i32_const(2),
                    ),
                ),
            ),
            c.i32_store(
                c.getLocal("pArrI"),
                c.i32_add(
                    c.i32_load(c.getLocal("pArrI")),
                    c.getLocal("v"),
                ),
            ),
        );
    }

    // Initiates an array to a default value.
    function buildInitializeI32() {
        const f = module.addFunction(fnName + "_initializeI32");
        // Pointer to an array
        f.addParam("pArr", "i32");
        // Length of the array
        f.addParam("length", "i32");
        // Default value
        f.addParam("default", "i32");
        // Index
        f.addLocal("i", "i32");
        const c = f.getCodeBuilder();
        // pArr[i] = 0 for all 0 <= i < length
        f.addCode(
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.i32_store(
                    c.i32_add(
                        c.getLocal("pArr"),
                        c.i32_shl(
                            c.getLocal("i"),
                            c.i32_const(2),
                        ),
                    ),
                    c.getLocal("default"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        )
    }

    // Initiates an array to a default value.
    function buildInitializeI64() {
        const f = module.addFunction(fnName + "_initializeI64");
        // Pointer to an array
        f.addParam("pArr", "i32");
        // Length of the array
        f.addParam("length", "i32");
        // default value
        f.addParam("default", "i64");
        // index
        f.addLocal("i", "i32");
        const c = f.getCodeBuilder();
        // pArr[i] = 0 for all 0 <= i < length
        f.addCode(
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.i64_store(
                    c.i32_add(
                        c.getLocal("pArr"),
                        c.i32_shl(
                            c.getLocal("i"),
                            c.i32_const(3),
                        ),
                    ),
                    c.getLocal("default"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        )
    }

    // Gets the maximum in an i32 array pointed by `pArr` with length `length`.
    function buildMaxArrayValue() {
        const f = module.addFunction(fnName + "_maxArrayValue");
        // Pointer to an array
        f.addParam("pArr", "i32");
        // Length of the array
        f.addParam("length", "i32");
        f.setReturnType("i32");
        // Max value
        f.addLocal("max", "i32");
        // Index
        f.addLocal("i", "i32");
        // Temporary value
        f.addLocal("tmp", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // max = 0
            // for (i = 0; i < length; i++) {
            //      if(pArr[i] > max) {
            //          max = pArr[i]
            //      }
            // }
            c.setLocal("max", c.i32_const(0)),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.setLocal("tmp",
                    c.call(fnName + "_loadI32",
                        c.getLocal("pArr"),
                        c.getLocal("i"),
                    ),
                ),
                c.if(
                    c.i32_gt_s(
                        c.getLocal("tmp"),
                        c.getLocal("max"),
                    ),
                    c.setLocal("max", c.getLocal("tmp")),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            c.getLocal("max"),
        );
    }

    // Copies data from `pInputArr` to `pOutputArr`
    function buildCopyArray() {
        const f = module.addFunction(fnName + "_copyArray");
        // Pointer to the input array
        f.addParam("pInputArr", "i32");
        // Length of the array
        f.addParam("length", "i32");
        // Pointer to the output array
        f.addParam("pOutputArr", "i32");
        // Index
        f.addLocal("i", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // for (i = 0; i < length; i++) {
            //      pOutputArr[i] = pInputArr[i]
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.call(fnName + "_storeI32",
                    c.getLocal("pOutputArr"),
                    c.getLocal("i"),
                    c.call(fnName + "_loadI32",
                        c.getLocal("pInputArr"),
                        c.getLocal("i"),
                    ),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        );
    }

    // Given a number `n`, counts the number of significant bits.
    // For example, if n = 5 (i.e., 00000000000000000000000000000101), the output is 3
    function buildGetMSB() {
        const f = module.addFunction(fnName + "_getMsb");
        f.addParam("n", "i32");
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_sub(
                c.i32_const(32),
                c.i32_clz(c.getLocal("n")),
            ),
        );
    }

    // Returns the optimal number of bits in each scalar chunk.
    function buildGetOptimalChunkWidth() {
        const f = module.addFunction(fnName + "_getOptimalBucketWidth");
        // Number of points and scalars in the input vector
        f.addParam("num", "i32");
        // Returns the optimal number of bits in each scalar chunk
        f.setReturnType("i32");
        const pTSizes = module.alloc([ // TODO: This may be tuned.
            17, 17, 17, 17, 17, 17, 17, 17,
            17, 17, 16, 16, 15, 14, 13, 13,
            12, 11, 10, 9, 8, 7, 7, 6,
            5, 4, 3, 2, 1, 1, 1, 1
        ]);
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_load8_u(c.i32_clz(c.getLocal("num")), pTSizes),
        );
    }

    // Returns the number of bucket 2^c where c is the number of bits in each scalar chunk,
    // given the number of points and scalars in the input vector.
    function buildGetNumBuckets() {
        const f = module.addFunction(fnName + "_getNumBuckets");
        // Number of points and scalars in the input vector
        f.addParam("numPoints", "i32");
        // Returns the number of bucket 2^c
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_shl(
                c.i32_const(1),
                c.call(fnName + "_getOptimalBucketWidth", c.getLocal("numPoints"))
            ),
        );
    }

    // Given a pointer `pBucketCounts` to 1d array of the number of points in each bucket,
    // `numBuckets` as the number of buckets, `maxBucketBits` as the bucket bits of the 
    // max bucket count, this function computes the bit offsets when splitting points in 
    // each bucket into pairs, pair of pairs, pair of pairs of pairs, etc. The results is
    // storoed in `pBitOffsets`.
    // Example:
    //    Suppose we have 3 buckets with bucket_counts = [3, 5, 2], a.k.a. [11, 101, 10]
    //    This function first sets bit_offsets as [0, 1+1, 2+2, 4] = [0, 2, 4, 4]
    //    Then, this function sets bit_offsets as [0, 2, 6, 10]
    function buildCountBits() {
        const f = module.addFunction(fnName + "_countBits");
        // A pointer to 1d array of the number of points in each bucket. Shape: numBuckets+1
        f.addParam("pBucketCounts", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Bucket bits of the max bucket count
        // For example, if the max bucket count is 49 (i.e. 0x31), the bucket bit is 6.
        f.addParam("maxBucketBits", "i32");
        // A pointer to an array of bit offsets.
        f.addParam("pBitOffsets", "i32");
        // Index
        f.addLocal("i", "i32");
        // Index
        f.addLocal("j", "i32");
        // bucketCounts[i]
        f.addLocal("bucketCountsI", "i32");
        // maxBucketBits + 1
        f.addLocal("maxBucketBitsPlusOne", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("maxBucketBitsPlusOne",
                c.i32_add(
                    c.getLocal("maxBucketBits"),
                    c.i32_const(1),
                ),
            ),
            c.call(fnName + "_initializeI32",
                c.getLocal("pBitOffsets"),
                c.getLocal("maxBucketBitsPlusOne"),
                c.i32_const(0),
            ),
            //  for (i = 0; i < numBuckets; ++i) {
            //      for (j = 0; j < maxBucketBits; ++j) {
            //          pBitOffsets[j + 1] += (pBucketCounts[i] & (1U << j));
            //      }
            //  }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numBuckets"))),
                c.setLocal("bucketCountsI",
                    c.call(fnName + "_loadI32",
                        c.getLocal("pBucketCounts"),
                        c.getLocal("i"),
                    ),
                ),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("maxBucketBits"))),
                    c.call(fnName + "_addAssignI32InMemoryUncheck",
                        c.getLocal("pBitOffsets"),
                        c.i32_add(
                            c.getLocal("j"),
                            c.i32_const(1),
                        ),
                        c.i32_and(
                            c.getLocal("bucketCountsI"),
                            c.i32_shl(
                                c.i32_const(1),
                                c.getLocal("j"),
                            ),
                        ),
                    ),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            //  for (j = 2; j < maxBucketBits + 1; j++) {
            //      pBitOffsets[j] += pBitOffsets[j - 1];
            //  }
            c.setLocal("j", c.i32_const(2)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("maxBucketBitsPlusOne"))),
                c.call(fnName + "_addAssignI32InMemoryUncheck",
                    c.getLocal("pBitOffsets"),
                    c.getLocal("j"),
                    c.call(fnName + "_loadI32",
                        c.getLocal("pBitOffsets"),
                        c.i32_sub(
                            c.getLocal("j"),
                            c.i32_const(1),
                        ),
                    ),
                ),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // Given a pointer `pScalar` to a specific scalar, `scalarSize` indicating the number
    // of bytes of the scalar, `chunkSize` of the chunk size in bits, a `pointIdx` indicating
    // the index of `scalar` in the input scalar vector, a pointer `pPointSchedules` to a 2-d
    // array of point schedules, a pointer `pRoundCounts` to an array of the number of points
    // in each round, and `numPoint` indicating the number of points in the input vector,
    // this function initializes `pPointSchedules` and `pRoundCounts` for this point.
    function buildSinglePointComputeSchedule() {
        const f = module.addFunction(fnName + "_singlePointComputeSchedule");
        // Pointer to a specific scalar
        f.addParam("pScalar", "i32");
        // Number of bytes of the scalar
        f.addParam("scalarSize", "i32");
        // Chunk size in bits
        f.addParam("chunkSize", "i32");
        // Index of `scalar` in the input scalar vector
        f.addParam("pointIdx", "i32");
        // Number of points
        f.addParam("numPoints", "i32");
        // Number of chunks
        f.addParam("numChunks", "i32");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedules", "i32");
        // Pointer to an array of the number of points in each round
        f.addParam("pRoundCounts", "i32");
        // Extracted chunk from the scalar
        f.addLocal("chunk", "i32");
        // Store pointIdx as i64
        f.addLocal("pointIdxI64", "i64");
        // Chunk Index
        f.addLocal("chunkIdx", "i32");
        // Number of bits of the scalar
        f.addLocal("scalarSizeInBit", "i32");
        // Index
        f.addLocal("idx", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("pointIdxI64",
                c.i64_shl(
                    c.i64_extend_i32_u(c.getLocal("pointIdx")),
                    c.i64_const(32),
                ),
            ),
            c.setLocal("scalarSizeInBit",
                c.i32_shl(
                    c.getLocal("scalarSize"),
                    c.i32_const(3),
                ),
            ),
            c.setLocal("chunkIdx", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("chunkIdx"), c.getLocal("numChunks"))),
                c.setLocal("chunk",
                    c.call(fnName + "_getChunk",
                        c.getLocal("pScalar"),
                        c.getLocal("scalarSize"),
                        c.i32_mul(
                            c.getLocal("chunkIdx"),
                            c.getLocal("chunkSize"),
                        ),
                        c.getLocal("chunkSize")
                    )
                ),
                c.setLocal("idx",
                    c.i32_add(
                        c.i32_mul(
                            c.getLocal("chunkIdx"),
                            c.getLocal("numPoints"),
                        ),
                        c.getLocal("pointIdx"),
                    ),
                ),
                c.if(
                    c.i32_eq(c.getLocal("chunk"), c.i32_const(0)),
                    c.call(fnName + "_storeI64",
                        c.getLocal("pPointSchedules"),
                        c.getLocal("idx"),
                        c.i64_const(0xffffffffffffffffn),
                    ),
                    c.call(fnName + "_storeI64",
                        c.getLocal("pPointSchedules"),
                        c.getLocal("idx"),
                        c.i64_or(
                            c.getLocal("pointIdxI64"),
                            c.i64_extend_i32_u(c.getLocal("chunk")),
                        ),
                    ),
                ),
                c.if(
                    c.i32_ne(
                        c.getLocal("chunk"),
                        c.i32_const(0),
                    ),
                    c.call(fnName + "_addAssignI32InMemoryUncheck",
                        c.getLocal("pRoundCounts"),
                        c.getLocal("chunkIdx"),
                        c.i32_const(1),
                    ),
                ),
                c.setLocal("chunkIdx", c.i32_add(c.getLocal("chunkIdx"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // Given `pScalars` as a pointer to the input scalar vector, `numInitialPoints` as the number of 
    // points in the input point/scalar vector, and `scalarSize` as the number of bytes of the scalar,
    // this function computes a schedule of msm. This function is called once at the beginning of msm.
    // More specifically, this function computes two things:
    // `pPointSchedules`:
    //    A 2-d array
    //       [
    //        [meta_11, meta_12, …, meta_1n], // Round 1. n is the number of points.
    //        [meta_21, meta_22, …, meta_2n], // Round 2
    //        …
    //        [meta_m1, meta_m2, …, meta_mn], // Round m
    //       ]
    //    Each meta_ij is a 64-bit integer. Its encoding is:
    //       [bit63, bit62, …, bit32,    bit31,    bit30, …, bit1, bit0]
    //    High 32 bits (i.e., bit32~bit63): The point index we are working on.
    //    Low 31 bits (i.e., bit0~bit30): The bucket index that we’re adding the point into
    //    32nd bit (i.e., bit31): The sign of the point we’re adding (i.e., do we actually need to subtract)
    //    Intuition: We pack this information into a 64bit unsigned integer, so that we can more efficiently sort 
    //      these entries. For a given round, we want to sort our entries in increasing bucket index order.
    // `pRoundCounts`:
    //    a pointer to an array of the number of points in each round. Note that scalar corresponding to a specific
    //    round may be zero, so this number of points is not the same for all rounds.
    //
    // Note:
    //    This implementation supports only scalarSize as a multiple of 4 due to the alignment requirement
    //    when reading i32 from memory.
    function buildComputeSchedule() {
        const f = module.addFunction(fnName + "_computeSchedule");
        // Pointer to the input scalar vector
        f.addParam("pScalars", "i32");
        // Length of the input scalar vector
        f.addParam("numPoints", "i32");
        // Number of bytes of the scalar
        f.addParam("scalarSize", "i32");
        // Chunk size in bits
        f.addParam("chunkSize", "i32");
        // Number of chunks
        f.addParam("numChunks", "i32");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedules", "i32");
        // Pointer to an array of the number of points in each round
        f.addParam("pRoundCounts", "i32");
        // Point Index
        f.addLocal("pointIdx", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.call(fnName + "_initializeI32",
                c.getLocal("pRoundCounts"),
                c.getLocal("numChunks"),
                c.i32_const(0),
            ),
            c.setLocal("pointIdx", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("pointIdx"), c.getLocal("numPoints"))),
                c.call(fnName + "_singlePointComputeSchedule",
                    c.i32_add(
                        c.getLocal("pScalars"),
                        c.i32_mul(
                            c.getLocal("scalarSize"),
                            c.getLocal("pointIdx"),
                        ),
                    ),
                    c.getLocal("scalarSize"),
                    c.getLocal("chunkSize"),
                    c.getLocal("pointIdx"),
                    c.getLocal("numPoints"),
                    c.getLocal("numChunks"),
                    c.getLocal("pPointSchedules"),
                    c.getLocal("pRoundCounts"),
                ),
                c.setLocal("pointIdx", c.i32_add(c.getLocal("pointIdx"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // Given the pointer `pPointSchedules` to the point schedules of the current round,
    // `numPoints` as the length of the input point vector, `bucketNum` as the number
    // of buckets, this function sorted the point schedules by the bucket index and
    // stores the results in the vector pointed to by `pMetadata`.
    // For example:
    //      Input: [(0,0), (1,3), (2,0), (3,1), (4,2), (5,1), (6,3)]. Here, (i,j) 
    //              indicates the i^th point in the j^th buckets.
    //      Output: sort by bucket index
    //              [(0,0), (2,0),
    //               (3,1), (5,1),
    //               (4,2),
    //               (1,3), (6,3)]
    function buildOrganizeBucketsOneRound() {
        const f = module.addFunction(fnName + "_organizeBucketsOneRound");
        const c = f.getCodeBuilder();
        // Pointer to a 1d array of point schedules. Shape: numPoints
        f.addParam("pPointSchedules", "i32");
        // Length of input point vector
        f.addParam("numPoints", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Pointer to a 1d array of point schedules that stores the results. Shape: numPoints
        f.addParam("pMetadata", "i32");
        // Pointer to an array of the number of points in each bucket. Shape: numBuckets
        f.addLocal("pBucketCount", "i32");
        // Pointer to an array of starting index of each bucket. Shape: numBuckets+1
        f.addLocal("pBucketOffsets", "i32");
        // Pointer to an array of the bucket index of each point. Shape: numPoints
        f.addLocal("pPointBucketIdx", "i32");
        // Bucket index
        f.addLocal("bucketIdx", "i32");
        // Index
        f.addLocal("i", "i32");
        f.addCode(
            c.setLocal("pBucketCount",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(c.getLocal("numBuckets"), c.i32_const(2)),
                ),
            ),
            c.call(fnName + "_initializeI32",
                c.getLocal("pBucketCount"),
                c.getLocal("numBuckets"),
                c.i32_const(0),
            ),
            c.setLocal("pBucketOffsets",
                c.call(fnName + "_allocateMemory", c.i32_shl(
                    c.i32_add(
                        c.getLocal("numBuckets"),
                        c.i32_const(1),
                    ),
                    c.i32_const(2)
                )),
            ),
            c.setLocal("pPointBucketIdx",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(c.getLocal("numPoints"), c.i32_const(2)),
                ),
            ),
            // for(i=0; i<numPoints; i++) {
            //      bucketIdx = (pPointSchedule[i] & 0x7FFFFFFF) as i32
            //      pPointBucketIdx[i] = bucketIdx
            //      pBucketCount[bucketIdx] += 1;
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numPoints"))),
                c.setLocal("bucketIdx", c.i32_wrap_i64(c.i64_and(
                    c.call(fnName + "_loadI64",
                        c.getLocal("pPointSchedules"),
                        c.getLocal("i"),
                    ),
                    c.i64_const(0x7FFFFFFF)
                ))),
                c.call(fnName + "_storeI32",
                    c.getLocal("pPointBucketIdx"),
                    c.getLocal("i"),
                    c.getLocal("bucketIdx"),
                ),
                c.call(fnName + "_addAssignI32InMemoryUncheck",
                    c.getLocal("pBucketCount"),
                    c.getLocal("bucketIdx"),
                    c.i32_const(1),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            // pBucketOffsets[0] = 0;
            // for(i=0; i<numBuckets; i++) {
            //      pBucketOffsets[i+1] = pBucketOffsets[i] + pBucketCount[i];
            // }
            c.call(fnName + "_storeI32",
                c.getLocal("pBucketOffsets"),
                c.i32_const(0),
                c.i32_const(0),
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numBuckets"))),
                c.call(fnName + "_storeI32",
                    c.getLocal("pBucketOffsets"),
                    c.i32_add(
                        c.getLocal("i"),
                        c.i32_const(1),
                    ),
                    c.i32_add(
                        c.call(fnName + "_loadI32",
                            c.getLocal("pBucketOffsets"),
                            c.getLocal("i"),
                        ),
                        c.call(fnName + "_loadI32",
                            c.getLocal("pBucketCount"),
                            c.getLocal("i"),
                        ),
                    ),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            // for(i=0; i<numPoints; i++) {
            //      bucketIdx = pPointBucketIdx[i];
            //      pMetadata[pBucketOffsets[bucketIdx]] = pPointSchedules[i];
            //      pBucketOffsets[bucketIdx] += 1;
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numPoints"))),
                c.setLocal("bucketIdx",
                    c.call(fnName + "_loadI32",
                        c.getLocal("pPointBucketIdx"),
                        c.getLocal("i"),
                    ),
                ),
                c.call(fnName + "_storeI64",
                    c.getLocal("pMetadata"),
                    c.call(fnName + "_loadI32",
                        c.getLocal("pBucketOffsets"),
                        c.getLocal("bucketIdx"),
                    ),
                    c.call(fnName + "_loadI64",
                        c.getLocal("pPointSchedules"),
                        c.getLocal("i"),
                    ),
                ),
                c.call(fnName + "_addAssignI32InMemoryUncheck",
                    c.getLocal("pBucketOffsets"),
                    c.getLocal("bucketIdx"),
                    c.i32_const(1),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            c.i32_store(c.i32_const(0), c.getLocal("pBucketCount")),
        );
    }

    // Given the pointer `pPointSchedules` to the point schedules of all rounds, 
    // `numPoints` as the length of the input point vector, `bucketNum` as the number
    // of buckets, this function sorted the point schedules by the bucket index for
    // each round and stores the results in the 2d array pointed to by `pMetadata`.
    function buildOrganizeBuckets() {
        const f = module.addFunction(fnName + "_organizeBuckets");
        // Pointer to a 2d array of point schedules. Shape: numChunks * numPoints
        f.addParam("pPointSchedules", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Number of chunks
        f.addParam("numChunks", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Pointer to a 2d array of point schedules for storing the processed results.
        // Shape: numChunks * numPoints
        f.addParam("pMetadata", "i32");
        // Index
        f.addLocal("i", "i32");
        // i*numPoints
        f.addLocal("iMulNumPoints", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // for (i=0; i<numChunks; i++) {
            //      organizeBucketsOneRound(
            //          &pPointSchedules[i*numPoints],
            //          numPoints,
            //          numBuckets,
            //          &pMetadata[i*numPoints],
            //      );
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numChunks"))),
                c.setLocal("iMulNumPoints",
                    c.i32_shl(
                        c.i32_mul(
                            c.getLocal("i"),
                            c.getLocal("numPoints"),
                        ),
                        c.i32_const(3),
                    ),
                ),
                c.call(fnName + "_organizeBucketsOneRound",
                    c.i32_add(
                        c.getLocal("pPointSchedules"),
                        c.getLocal("iMulNumPoints"),
                    ),
                    c.getLocal("numPoints"),
                    c.getLocal("numBuckets"),
                    c.i32_add(
                        c.getLocal("pMetadata"),
                        c.getLocal("iMulNumPoints"),
                    ),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        );
    }

    // Given the pointer `pPointSchedules` to the sorted point schedules of the current round,
    // `numPoints` as the length of the input point vector, `bucketNum` as the number
    // of buckets, this function constructs addition chains, stores the processed point schedules
    // in the vector pointed to by `pMetadata`, and stores the bit offsets in `pBitOffset`.
    // 
    // For example:
    //      Input: [(0,0), (1,0), (2,0), (8,1), (9,1), (3,2), (4,2), (5,2), (6,2), (7,2)]. 
    //              Here, (i,j) indicates the i^th point in the j^th buckets.
    //      Output: Addition chains
    //              [(0,0), (3,2),
    //               (1,0), (2,0), (8,1), (9,1),
    //               (4,2), (5,2), (6,2), (7,2)]
    //
    // Assumption:
    //      pPointSchedules: point schedules have been sorted by the bucket index
    //      pBucketCounts: bucket counts is valid and matches pPointSchedules
    function buildConstructAdditionChains() {
        const f = module.addFunction(fnName + "_constructAdditionChains");
        // Pointer to 1d array of point schedules of a specific round
        // Assuming that point schedules have been sorted by the bucket index
        // Shape: numPoints
        f.addParam("pPointSchedule", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Pointer to 1d array of number of points in each bucket for a specific
        // round. Shape: numBuckets
        f.addParam("pBucketCounts", "i32");
        // Pointer to 1d array of the starting index of the i^th bit. Shape: numBuckets + 1
        // For example, if the processed addition chain is
        //      [(0,0), (3,2),
        //       (1,0), (2,0), (8,1), (9,1),
        //       (4,2), (5,2), (6,2), (7,2)]
        // we have pBitOffset = [0, 2, 6, 10]
        f.addParam("pBitOffsets", "i32");
        // Pointer to 1d array of point schedules as the addition chains. Shape:
        f.addParam("pMetadata", "i32");
        f.setReturnType("i32");
        // Max number of points in a bucket
        f.addLocal("maxCount", "i32");
        // Bucket bits of the max bucket count
        // For example, if the max bucket count is 49 (i.e. 0x31), the bucket bit is 5.
        f.addLocal("maxBucketBits", "i32");
        // Local copy of pBitOffsets
        f.addLocal("pBitOffsetsCopy", "i32");
        // Number of points in a bucket
        f.addLocal("count", "i32");
        // Number of bits for a count
        f.addLocal("numBits", "i32");
        // Index of point schedules
        f.addLocal("scheduleIdx", "i32");
        // Index
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("k", "i32");
        f.addLocal("kEnd", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("maxCount",
                c.call(fnName + "_maxArrayValue",
                    c.getLocal("pBucketCounts"),
                    c.getLocal("numBuckets"),
                ),
            ),
            c.setLocal("maxBucketBits",
                c.call(fnName + "_getMsb", c.getLocal("maxCount"))
            ),
            c.call(fnName + "_countBits",
                c.getLocal("pBucketCounts"),
                c.getLocal("numBuckets"),
                c.getLocal("maxBucketBits"),
                c.getLocal("pBitOffsets"),
            ),
            c.setLocal("pBitOffsetsCopy",
                c.call(fnName + "_allocateMemory", c.getLocal("maxBucketBits")),
            ),
            c.call(fnName + "_copyArray",
                c.getLocal("pBitOffsets"),
                c.getLocal("maxBucketBits"),
                c.getLocal("pBitOffsetsCopy"),
            ),
            // scheduleIdx = 0;
            // for (i=0; i<numBuckets; i++) {
            //      count = pBucketCounts[i];
            //      numBits = getMsb(count);
            //      for (j=0; j<numBits; j++) {
            //          kEnd = count & (1 << j);
            //          for (k=0; k<kEnd; k++) {
            //              pMetadata[pBitOffsetsCopy[j]] = pPointSchedule[scheduleIdx];
            //              pBitOffsetsCopy[j]++;
            //              scheduleIdx++;
            //          }
            //      }
            // }
            c.setLocal("scheduleIdx", c.i32_const(0)),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numBuckets"))),
                c.setLocal("count",
                    c.call(fnName + "_loadI32",
                        c.getLocal("pBucketCounts"),
                        c.getLocal("i"),
                    ),
                ),
                c.setLocal("numBits",
                    c.call(fnName + "_getMsb", c.getLocal("count")),
                ),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("numBits"))),
                    c.setLocal("kEnd",
                        c.i32_and(
                            c.getLocal("count"),
                            c.i32_shl(
                                c.i32_const(1),
                                c.getLocal("j")
                            ),
                        ),
                    ),
                    c.setLocal("k", c.i32_const(0)),
                    c.block(c.loop(
                        c.br_if(1, c.i32_eq(c.getLocal("k"), c.getLocal("kEnd"))),
                        c.call(fnName + "_storeI64",
                            c.getLocal("pMetadata"),
                            c.call(fnName + "_loadI32",
                                c.getLocal("pBitOffsetsCopy"),
                                c.getLocal("j"),
                            ),
                            c.call(fnName + "_loadI64",
                                c.getLocal("pPointSchedule"),
                                c.getLocal("scheduleIdx"),
                            ),
                        ),
                        c.call(fnName + "_addAssignI32InMemoryUncheck",
                            c.getLocal("pBitOffsetsCopy"),
                            c.getLocal("j"),
                            c.i32_const(1),
                        ),
                        c.setLocal("scheduleIdx", c.i32_add(c.getLocal("scheduleIdx"), c.i32_const(1))),
                        c.setLocal("k", c.i32_add(c.getLocal("k"), c.i32_const(1))),
                        c.br(0)
                    )),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pBitOffsetsCopy")
            ),
            c.getLocal("maxBucketBits"),
        );
    }

    // This function evaluates a chain of pairwise additions.
    // For example:
    // The input pPoint is the initial point array:
    //      [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9] 
    // pAdditionChains is the pointer to addition chains:
    //              [(0,0), (3,2),
    //               (1,0), (2,0), (8,1), (9,1),
    //               (4,2), (5,2), (6,2), (7,2)]
    // We first call _rearrangePoints() to arrange points as follows:
    //      [p0, p3, p1, p2, p8, p9, p4, p5, p6, p7]
    // And then repeatedly calling the _addAffinePointsOneRound() function to get results.
    function buildEvaluateAdditionChains() {
        const f = module.addFunction(fnName + "_evaluateAdditionChains");
        f.addParam("pBitOffsets", "i32");
        f.addParam("numPoints", "i32"); // number of points
        f.addParam("max_bucket_bits", "i32");
        f.addParam("pPoint", "i32");// original point vectors
        f.addParam("pAdditionChains", "i32");
        f.addParam("pRes", "i32"); // result array start point. size: N*2*n8 byte
        f.addLocal("end", "i32");
        f.addLocal("points_in_round", "i32");
        f.addLocal("start", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("k", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // end = state.num_points
            c.setLocal(
                "end",
                c.getLocal("numPoints")
            ),
            c.call(fnName + "_rearrangePoints", c.getLocal("numPoints"), c.getLocal("pPoint"), c.getLocal("pAdditionChains"), c.getLocal("pRes")),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("max_bucket_bits"))),
                //points_in_round = (state.num_points - state.bit_offsets[i + 1]) >> (i)
                c.setLocal(
                    "points_in_round",
                    c.i32_shr_u(
                        c.i32_sub(
                            c.getLocal("numPoints"),
                            c.i32_load(
                                c.i32_add(
                                    c.i32_mul(
                                        c.i32_add(
                                            c.i32_const(1),
                                            c.getLocal("i")
                                        ),
                                        c.i32_const(4)
                                    ),
                                    c.getLocal("pBitOffsets")
                                )
                            )
                        ),
                        c.getLocal("i")
                    )
                ),
                c.call(fnName + "_addAffinePointsOneRound", c.getLocal("numPoints"), c.getLocal("points_in_round"), c.getLocal("pRes")),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // This function adds a bunch of points together using affine addition formulae.
    // For example:
    // Suppose the memory of the point is in the following format:
    //         x_1, y_1, x_2, y_2, x_3, y_3, x_4, y_4 ...
    // We first store x_i+1 - x_i in ScratchSpace. And then store results in pPair:
    //      ScratchSpace: x_2-x_1(2y_1), x_4-x_3(2y_3) ...
    //      Inverse:      1/(x_2-x_1)(1/2y_1), 1/(x_4-x_3)(1/(2y_3))
    //      pPair:        x_1, y_2-y_1, x_1+x_2, y_2(0), ...
    // The number in bracket is the case when two points are the same.
    //      Input: pairs of points
    //             [p0 | p3 | p1 p2 | p8 p9 | p4 p5 p6 p7]
    //             pointsInRound = 8
    //      Output: 
    //             [p0 | p3 | x  x    x  x  | p1+p2 p8+p9 p4+p5 p6+p7]
    //             xxx is dirty data 
    function buildAddAffinePointsOneRound() {
        const f = module.addFunction(fnName + "_addAffinePointsOneRound");
        f.addParam("n", "i32"); //number of points
        f.addParam("pointsInRound", "i32")
        f.addParam("pPairs", "i32");// store results in paires. memory layout: x1y1(384*2bits) x2y2 x3y3 ...
        // Array
        f.addLocal("pScratchSpace", "i32");// store x2-x1, x4-x3, ... n*n8
        f.addLocal("pInverse", "i32"); // pointer to inverse array, n*n8 bytes 
        // Array ierator
        f.addLocal("itPairs", "i32");
        f.addLocal("itScratchSpace", "i32");
        f.addLocal("itInverse", "i32");
        f.addLocal("itRes", "i32")
        f.addLocal("i", "i32");
        f.addLocal("start", "i32");// n - (number in a round)
        f.addLocal("step", "i32"); // step between two point, 384/8 * 2 * 2. (sizeof(x)) * (x,y) *(2 point)
        f.addLocal("x1", "i32"); //address
        f.addLocal("y1", "i32");
        f.addLocal("x2", "i32");
        f.addLocal("y2", "i32");
        const c = f.getCodeBuilder();
        const m = c.i32_const(module.alloc(n8));
        const X3 = c.i32_const(module.alloc(n8));
        const X1_square = c.i32_const(module.alloc(n8));
        const X1_squareX1_square = c.i32_const(module.alloc(n8));
        const X1_squareX1_squareX1_square = c.i32_const(module.alloc(n8));
        const M = c.i32_const(module.alloc(n8));
        const X1_MINUS_X3 = c.i32_const(module.alloc(n8));
        const X1_MINUS_X3_MUL_M = c.i32_const(module.alloc(n8));
        const M_square = c.i32_const(module.alloc(n8));
        f.addCode(
            // alloc memory
            c.setLocal("pScratchSpace", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pScratchSpace"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8)  // should be 384/8
                    )
                )
            ),
            // uncomment when the test is done
            c.setLocal("pInverse", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pInverse"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8)  // should be 384/8
                    )
                )
            ),
            // start= n - pointsInRound
            c.setLocal("start", c.i32_sub(c.getLocal("n"), c.getLocal("pointsInRound"))),
            // i= n-2
            c.setLocal("i", c.i32_sub(c.getLocal("n"), c.i32_const(2))),
            c.setLocal(
                "itPairs",
                c.i32_add(
                    c.getLocal("pPairs"),
                    c.i32_mul(
                        c.getLocal("i"),
                        c.i32_const(n8 * 2)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(1, c.i32_lt_s(c.getLocal("i"), c.getLocal("start"))),
                c.setLocal("x1", c.getLocal("itPairs")),
                c.setLocal("y1", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8))),
                c.setLocal("x2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8 * 2))),
                c.setLocal("y2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8 * 3))),
                // x2-x1
                c.setLocal(
                    "itScratchSpace",
                    c.i32_add(
                        c.getLocal("pScratchSpace"),
                        c.i32_mul(
                            c.i32_shr_u(
                                c.getLocal("i"),
                                c.i32_const(1)
                            ),
                            c.i32_const(n8)
                        )
                    )
                ),
                // Store x2-x1/2y1 in pScratchSpace for batch inverse, y2-y1 in y2, x1+x2 in x1
                c.call(prefixField + "_sub", c.getLocal("x2"), c.getLocal("x1"), c.getLocal("itScratchSpace")),
                c.if(
                    c.call(prefixField + "_isZero", c.getLocal("itScratchSpace")),
                    [
                        ...c.call(prefixField + "_add", c.getLocal("y1"), c.getLocal("y1"), c.getLocal("itScratchSpace")),
                        ...c.call(prefixField + "_zero", c.getLocal("y2")),// if x2-x1=0, store 0 in y2
                    ],
                    [
                        ...c.call(prefixField + "_sub", c.getLocal("y2"), c.getLocal("y1"), c.getLocal("y2")),// y2-y1
                    ]
                ),
                c.call(prefixField + "_add", c.getLocal("x2"), c.getLocal("x1"), c.getLocal("x2")),
                c.setLocal("itPairs", c.i32_sub(c.getLocal("itPairs"), c.i32_const(n8 * 2 * 2))),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(2))),
                c.br(0)
            )),
            c.setLocal( // inverse start address
                "itInverse",
                c.i32_add(
                    c.getLocal("pScratchSpace"),
                    c.i32_mul(
                        c.i32_shr_u(
                            c.getLocal("start"),
                            c.i32_const(1)
                        ),
                        //c.getLocal("start"),
                        c.i32_const(n8)
                    )
                )
            ),
            // calculate 1/(x2-x1), 1/(x4-x3), ...
            c.call(
                prefixField + "_batchInverse",
                c.getLocal("itInverse"),
                c.i32_const(n8),
                c.i32_shr_u(c.getLocal("pointsInRound"), c.i32_const(1)),
                c.i32_add(
                    c.getLocal("pInverse"),
                    c.i32_mul(
                        c.i32_shr_u(
                            c.getLocal("start"),
                            c.i32_const(1)
                        ),
                        c.i32_const(n8)
                    )
                ),
                c.i32_const(n8)
            ),
            // i= n-2
            c.setLocal("i", c.i32_sub(c.getLocal("n"), c.i32_const(2))),
            c.setLocal("itPairs", c.i32_add(c.getLocal("pPairs"), c.i32_mul(c.getLocal("i"), c.i32_const(n8 * 2)))),
            c.setLocal("itRes", c.i32_add(c.getLocal("pPairs"), c.i32_mul(c.i32_sub(c.getLocal("n"), c.i32_const(1)), c.i32_const(n8 * 2)))), // point to last element
            c.setLocal(
                "itInverse",
                c.i32_add(
                    c.getLocal("pInverse"),
                    c.i32_mul(
                        c.i32_shr_u(
                            c.getLocal("i"),
                            c.i32_const(1)
                        ),
                        c.i32_const(n8)
                    )
                )
            ),
            // while(i>start){
            //  store res
            //}
            c.block(c.loop(
                c.br_if(1, c.i32_lt_s(c.getLocal("i"), c.getLocal("start"))),
                c.setLocal("x1", c.getLocal("itPairs")),//x1
                c.setLocal("y1", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8))),//y1
                c.setLocal("x2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8 * 2))),//x1+x2
                c.setLocal("y2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8 * 3))),//y2-y1
                c.if(
                    c.call(prefixField + "_isZero", c.getLocal("y2")),
                    // m = 3x^2+a / 2y1.  
                    // a==0 in BLS12381
                    [
                        ...c.call(
                            prefixField + "_square",
                            c.getLocal("x1"),
                            X1_square
                        ),
                        ...c.call(
                            prefixField + "_add",
                            X1_square,
                            X1_square,
                            X1_squareX1_square,
                        ),
                        ...c.call(
                            prefixField + "_add",
                            X1_square,
                            X1_squareX1_square,
                            X1_squareX1_squareX1_square,
                        ),
                        ...c.call(
                            prefixField + "_mul",
                            X1_squareX1_squareX1_square,
                            c.getLocal("itInverse"),
                            M,
                        ),

                    ],
                    // m = y2-y1 / (x2-x1)
                    [
                        ...c.call(
                            prefixField + "_mul",
                            c.getLocal("y2"),
                            c.getLocal("itInverse"),
                            M
                        ),

                    ]
                ),
                // store x3  
                // x3 = m^2 - x1 - x2
                c.call(prefixField + "_square", M, M_square),
                c.call(prefixField + "_sub", M_square, c.getLocal("x2"), c.getLocal("itRes")),
                // store y3
                // y3 = m * (x1 - x3) - y1
                c.call(prefixField + "_sub", c.getLocal("x1"), c.getLocal("itRes"), X1_MINUS_X3),
                c.call(prefixField + "_mul", M, X1_MINUS_X3, X1_MINUS_X3_MUL_M),
                c.call(prefixField + "_sub", X1_MINUS_X3_MUL_M, c.getLocal("y1"), c.i32_add(c.getLocal("itRes"), c.i32_const(n8))),
                c.setLocal("itPairs", c.i32_sub(c.getLocal("itPairs"), c.i32_const(n8 * 2 * 2))),
                c.setLocal("itRes", c.i32_sub(c.getLocal("itRes"), c.i32_const(n8 * 2))),// store one element each time
                c.setLocal("itInverse", c.i32_sub(c.getLocal("itInverse"), c.i32_const(n8))),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(2))),
                c.br(0)
            )),
            // free memory
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pScratchSpace")
            )
        );
    }

    // Given the pointer `pSchedule` to the addtion chains of the current round,
    // `n` as the length of the input point vector, `pPoint` as the pointer to initial point vectors.
    // this function arranges the points in the order of the schedule, 
    // stores the processed point in the vector pointed to by `pRes`.
    // 
    // For example:
    //      Input: Addition chains (pSchedule)
    //              [(0,0), (3,2),
    //               (1,0), (2,0), (8,1), (9,1),
    //               (4,2), (5,2), (6,2), (7,2)]
    //              Here, (i,j) indicates the i^th point in the j^th buckets.
    //             pPoint
    //              [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9]   
    //      Output: 
    //              [p0, p3, p1, p2, p8, p9, p4, p5, p6, p7]
    //              Here, pi is i-th point, and in affine representation (x, y). 
    //              Each point use 384*2 bits.
    function buildRearrangePoints() {
        const f = module.addFunction(fnName + "_rearrangePoints");
        f.addParam("n", "i32");// number of points
        f.addParam("pPoint", "i32");// point vectors
        f.addParam("pSchedule", "i32");
        // Arrange the points based on Schedule, copy results in the new memory.
        f.addParam("pRes", "i32");
        const c = f.getCodeBuilder();
        f.addLocal("itSchedule", "i32");
        f.addLocal("itRes", "i32");
        f.addLocal("i", "i32");
        f.addLocal("pointIdx", "i32");
        f.addLocal("pointSrc", "i32");
        f.addCode(
            c.setLocal("i", c.i32_const(0)),
            c.setLocal("itSchedule", c.getLocal("pSchedule")),
            c.setLocal("itRes", c.getLocal("pRes")),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("n"))),
                // get src point address
                c.setLocal(
                    "pointIdx",
                    c.i32_wrap_i64(
                        c.i64_shr_u(
                            c.i64_load(c.getLocal("itSchedule")),
                            c.i64_const(32)
                        )
                    )
                ),
                c.setLocal(
                    "pointSrc",
                    c.i32_add(
                        c.getLocal("pPoint"),
                        c.i32_mul(
                            c.getLocal("pointIdx"),
                            c.i32_const(n8 * 2)
                        )
                    )
                ),
                // copy to the new momory
                c.call(prefix + "_copyAffine", c.getLocal("pointSrc"), c.getLocal("itRes")),
                c.setLocal("itSchedule", c.i32_add(c.getLocal("itSchedule"), c.i32_const(8))),
                c.setLocal("itRes", c.i32_add(c.getLocal("itRes"), c.i32_const(n8 * 2))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // Given the pointer `pScalar` to a scalar of `scalarSize` bytes, `chunkSize` as
    // chunk size in bits, and `startBit` as the bit to start extract, this function
    // returns pScalar[startBit:startBit+chunkSize] if startBit+chunkSize <= scalarSize,
    // or pScalar[startBit:scalarSize] if startBit+chunkSize > scalarSize.
    function buildGetChunk() {
        const f = module.addFunction(fnName + "_getChunk");
        // Pointer to a scalar
        f.addParam("pScalar", "i32");
        // Number of bytes of the scalar
        f.addParam("scalarSize", "i32");
        // Bit to start extract
        f.addParam("startBit", "i32");
        // Chunk size in bits
        f.addParam("chunkSize", "i32");
        // Number of bits to the end of the scalar
        f.addLocal("bitsToEnd", "i32");
        // Mask for extraction
        f.addLocal("mask", "i32");
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("bitsToEnd",
                c.i32_sub(
                    c.i32_mul(
                        c.getLocal("scalarSize"),
                        c.i32_const(8)
                    ),
                    c.getLocal("startBit")
                )
            ),
            c.if(
                c.i32_gt_s(
                    c.getLocal("chunkSize"),
                    c.getLocal("bitsToEnd")
                ),
                c.setLocal("mask",
                    c.i32_sub(
                        c.i32_shl(
                            c.i32_const(1),
                            c.getLocal("bitsToEnd")
                        ),
                        c.i32_const(1)
                    )
                ),
                c.setLocal("mask",
                    c.i32_sub(
                        c.i32_shl(
                            c.i32_const(1),
                            c.getLocal("chunkSize")
                        ),
                        c.i32_const(1)
                    )
                )
            ),
            c.i32_and(
                c.i32_shr_u(
                    c.i32_load(
                        c.i32_add(
                            c.getLocal("pScalar"),
                            c.i32_shr_u(
                                c.getLocal("startBit"),
                                c.i32_const(3)
                            ),
                        ),
                        0,  // offset
                        0   // align to byte.
                    ),
                    c.i32_and(
                        c.getLocal("startBit"),
                        c.i32_const(0x7)
                    )
                ),
                c.getLocal("mask")
            )
        );
    }

    // TODO
    function buildReduceBuckets() {
        const f = module.addFunction(fnName + "_reduceBuckets");
        // Pointer to the input point vector. Shape: numPoints
        f.addParam("pPoints", "i32");
        // Pointer to a 1-d array of point schedules for a specific round. Shape: numPoints
        f.addParam("pPointSchedules", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Pointer to 1d array of number of points in each bucket for a specific
        // round. Shape: numBuckets
        f.addParam("pBucketCounts", "i32");
        // Pointer to 1d array of the starting index of the i^th bit. Shape: numBuckets + 1
        // For example, if the processed addition chain is
        //      [(0,0), (3,2),
        //       (1,0), (2,0), (8,1), (9,1),
        //       (4,2), (5,2), (6,2), (7,2)]
        // we have pBitOffset = [0, 2, 6, 10]
        // Assumption: pBitOffsets has not been initialized
        f.addParam("pBitOffsets", "i32");
        // Pointer to a 1-d array of point schedules for a specific round. This stores
        // the processed point schedules from `ConstructAdditionChains`. Shape: numPoints
        f.addParam("pPointScheduleAlt", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addParam("pPointPairs1", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addParam("pPointPairs2", "i32");
        // Pointer to the output buckets
        f.addParam("pOutputBuckets", "i32");
        // Max bucket bits
        f.addLocal("maxBucketBits", "i32");


        // //
        // f.addLocal("start", "i32");
        // // Index
        // f.addLocal("i", "i32");
        // // Index
        // f.addLocal("j", "i32");
        // //
        // f.addLocal("pointsInRound", "i32");
        // // &pBitOffset[i+1]
        // f.addLocal("pBitOffsetIPlusOne", "i32");
        // // 
        // f.addLocal("numBits", "i32");
        // //
        // f.addLocal("pCount", "i32");
        // // Number of points in a single bucket
        // f.addLocal("newBucketCount", "i32");
        // //
        // f.addLocal("pCurrentOffset", "i32");
        // // Indicator
        // f.addLocal("hasEntry", "i32");
        // c.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("maxBucketBits",
                c.call(fnName + "_constructAdditionChains",
                    c.getLocal("pPointSchedules", "i32"),
                    c.getLocal("numPoints", "i32"),
                    c.getLocal("numBuckets", "i32"),
                    c.getLocal("pBucketCounts", "i32"),
                    c.getLocal("pBitOffsets", "i32"),
                    c.getLocal("pPointScheduleAlt", "i32"),
                ),
            ),
            c.if(
                c.i32_eq(c.getLocal("maxBucketBits"), c.i32_const(0)),
                c.ret(c.getLocal("pPointPairs1")),
            ),
            c.call(prefix + "_evaluateAdditionChains",
                c.getLocal("pBitOffsets"),
                c.getLocal("numPoints"),
                c.getLocal("maxBucketBits"),
                c.getLocal("pPoints"),
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("pPointPairs1"),
            ),
            // The following code updates the array pointed by pBitOffset
            // start = 0;
            // for (i = 0; i < maxBucketBits; i++) {
            //     pBitOffsetIPlusOne = pBitOffset + (i+1)*4
            //     const uint32_t pointsInRound = 
            //       (numPoints - *pBitOffsetIPlusOne) >> i;
            //     start = numPoints - pointsInRound;
            //     *pBitOffsetIPlusOne = start + pointsInRound / 2;
            // }
            c.setLocal("start", c.i32_const(0)),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("maxBucketBits"))),
                c.setLocal("pBitOffsetIPlusOne",
                    c.i32_add(
                        c.getLocal("pBitOffsets"),
                        c.i32_shl(
                            c.i32_add(c.getLocal("i"), c.i32_const(1)),
                            2,
                        ),
                    ),
                ),
                c.setLocal("pointsInRound",
                    c.i32_shr_u(
                        c.i32_sub(
                            c.getLocal("numPoints"),
                            c.i32_load(c.getLocal("pBitOffsetIPlusOne")),
                        ),
                        c.getLocal("i"),
                    ),
                ),
                c.setLocal("start",
                    c.i32_sub(
                        c.getLocal("numPoints"),
                        c.getLocal("pointsInRound"),
                    ),
                ),
                c.i32_store(
                    c.getLocal("pBitOffsetIPlusOne"),
                    s.i32_add(
                        c.getLocal("start"),
                        c.i32_shr_u(
                            c.getLocal("pointsInRound"),
                            c.i32_const(1),
                        ),
                    ),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            // Iterate over each bucket. Identify how many remaining points there are, and compute their point schedules
            // numPoints = 0;
            // for (i = 0; i < numBuckets; ++i) {
            //     pCount = &pBucketCounts[i];
            //     numBits = getMsb(*pCount);
            //     newBucketCount = 0;
            //     for (j = 0; j < numBits; ++j) {
            //         pCurrentOffset = &pBitOffsets[j];
            //         hasEntry = ((count >> j) & 1) == 1;
            //         if (hasEntry) {
            //             pPointScheduleAlt[numPoints] = (*pCurrentOffset << 32) + i;
            //             ++numPoints;
            //             ++newBucketCount;
            //             ++*pCurrentOffset;
            //         }
            //     }
            //     *pCount = newBucketCount;
            // }
            c.setLocal(c.getLocal("numPoints"), c.i32_const(0)),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numBuckets"))),
                c.setLocal("pCount",
                    c.i32_add(
                        c.getLocal("pBucketCounts"),
                        c.i32_shl(
                            c.getLocal("i"),
                            c.i32_const(2),
                        ),
                    ),
                ),
                c.setLocal("numBits", c.call(fnName + "_getMsb", c.i32_load(c.getLocal("pCount")))),
                c.setLocal("newBucketCount", c.i32_const(0)),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("numBits"))),
                    c.setLocal("pCurrentOffset",
                        c.i32_add(
                            c.getLocal("pBitOffsets"),
                            c.i32_shl(
                                c.getLocal("j"),
                                c.i32_const(2),
                            ),
                        ),
                    ),
                    c.if(
                        c.i32_eq(
                            c.i32_and(
                                c.i32_shr_u(
                                    c.getLocal("count"),
                                    c.getLocal("j"),
                                ),
                                c.i32_const(1),
                            ),
                            c.i32_const(1),
                        ),
                        [
                            ...c.call(fnName + "_storeI64",
                                c.getLocal("pPointScheduleAlt"),
                                c.getLocal("numPoints"),
                                c.i64_and(
                                    c.i64_shl(
                                        c.i64_extend_i32_u(c.i32_load(c.getLocal("pCurrentOffset"))),
                                        c.i64_const(32),
                                    ),
                                    c.i64_extend_i32_u(c.getLocal("i")),
                                ),
                            ),
                            ...c.setLocal("numPoints", c.i32_add(c.getLocal("numPoints"), c.i32_const(1))),
                            ...c.setLocal("newBucketCount", c.i32_add(c.getLocal("newBucketCount"), c.i32_const(1))),
                            ...c.setLocal(c.getLocal("pCurrentOffset"), c.i32_add(c.i32_load(c.getLocal("pCurrentOffset")), c.i32_const(1))),
                        ]
                    ),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0),
                )),
                c.i32_store(c.getLocal("pCount"), c.getLocal("newBucketCount")),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            c.ret(c.call(fnName + "_reduceBuckets",
                c.getLocal("pPointPairs1"),
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("numPoints"),
                c.getLocal("numBuckets"),
                c.getLocal("pBucketCounts"),
                c.getLocal("pBitOffsets"),
                c.getLocal("pPointSchedules"),
                c.getLocal("pPointPairs2"),
                c.getLocal("pPointPairs1"),
                c.getLocal("pOutputBuckets"),
            )),
        );
    }

    // Computes MSM over all chunks and sets the output pointed by `pResult`.
    function buildMutiexpChunks() {
        const f = module.addFunction(fnName + "_multiExpChunks");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedules", "i32");
        // Pointer to the input point vector
        f.addParam("pPoints", "i32");
        // Number of points
        f.addParam("numPoints", "i32");
        // Number of bits in a chunk
        f.addParam("chunkSize", "i32");
        // Number of chunks
        f.addParam("numChunks", "i32");
        // Pointer to the resulting G1 point
        f.addParam("pResult", "i32");
        // Pointer to an accumulator
        f.addLocal("pAccumulator", "i32");
        // Number of buckets
        f.addLocal("numBuckets", "i32");
        // Pointer to running sum
        f.addLocal("pRunningSum", "i32");
        // Round index
        f.addLocal("roundIdx", "i32");
        // Pointer to the output buckets
        f.addLocal("pOutputBuckets", "i32");
        // Index
        f.addLocal("k", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.if(
                c.i32_eqz(c.getLocal("numPoints")),
                [
                    ...c.call(prefix + "_zero", c.getLocal("pResult")),
                    ...c.ret([])
                ]
            ),
            c.setLocal(
                "pOutputBuckets",
                c.call(fnName + "_allocateMemory",
                    c.i32_mul(
                        c.getLocal("numBuckets"),
                        c.i32_const(n8g),
                    ),
                ),
            ),
            c.setLocal(
                "pAccumulator",
                c.call(fnName + "_allocateMemory",
                    c.i32_const(n8g),
                ),
            ),
            c.call(prefix + "_zero", c.getLocal("pAccumulator")),
            c.call(prefix + "_zero", c.getLocal("pResult")),
            c.setLocal(
                "pRunningSum",
                c.call(fnName + "_allocateMemory",
                    c.i32_const(n8g),
                ),
            ),
            // for (int roundIdx = 0; roundIdx < numChunks; roundIdx++) {
            //     reduce_buckets(
            //         pPointSchedule[roundIdx*numPoints],
            //         numPoints,
            //         pPoints,
            //         numChunks,
            //         pOutputBuckets,
            //     );
            //     *pRunningSum = 0;
            //     for (int k = numBuckets - 1; k >= 0; --k) {
            //         opAdd(*pRunningSum, pOutputBuckets[k], *pRunningSum);
            //         opAdd(*pAccumulator, *pRunningSum, *pAccumulator);
            //     }
            //     if (roundIdx > 0) {
            //         for (int k = 0; k < chunkSize; k++) {
            //             *pResult *= 2;
            //         }
            //     }
            //     opAdd(*pResult", *pAccumulator, *pResult);
            // }
            c.setLocal("roundIdx", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("roundIdx"), c.getLocal("numChunks"))),
                c.call(fnName + "_reduceBuckets",
                    c.i32_add(
                        c.i32_add(
                            c.getLocal("pPointSchedules"),
                            c.i32_shl(
                                c.i32_mul(
                                    c.getLocal("roundIdx"),
                                    c.getLocal("numPoints"),
                                ),
                                3,
                            ),
                        ),
                        c.i32_shl(
                            c.i32_mul(
                                c.getLocal("roundIdx"),
                                c.getLocal("numPoints"),
                            ),
                            c.i32_const(3),
                        ),
                    ),
                    c.getLocal("numPoints"),
                    c.getLocal("pPoints"),
                    c.getLocal("numChunks"),
                    c.getLocal("pOutputBuckets"),
                ),
                c.call(prefix + "_zero", c.getLocal("pRunningSum")),
                c.setLocal("k",
                    c.i32_sub(
                        c.getLocal("numBuckets"),
                        c.i32_const(1),
                    ),
                ),
                c.block(c.loop(
                    c.br_if(1, c.i32_eq(c.getLocal("k"), c.i32_const(-1))),
                    c.call(
                        opAdd,
                        c.getLocal("pRunningSum"),
                        c.i32_add(
                            c.getLocal("pOutputBuckets"),
                            c.i32_mul(
                                c.getLocal("k"),
                                c.i32_const(n8g),
                            ),
                        ),
                        c.getLocal("pRunningSum"),
                    ),
                    c.call(
                        opAdd,
                        c.getLocal("pAccumulator"),
                        c.getLocal("pRunningSum"),
                        c.getLocal("pAccumulator"),
                    ),
                    c.setLocal("k", c.i32_sub(c.getLocal("k"), c.i32_const(1))),
                    c.br(0),
                )),
                c.if(
                    c.i32_gt_s(
                        c.getLocal("roundIdx"),
                        c.i32_const(0),
                    ),
                    c.setLocal("k", c.getLocal("chunkSize")),
                    c.block(c.loop(
                        c.br_if(1, c.i32_eqz(c.getLocal("k"))),
                        c.call(prefix + "_double", c.getLocal("pResult"), c.getLocal("pResult")),
                        c.setLocal("k", c.i32_sub(c.getLocal("k"), c.i32_const(1))),
                        c.br(0),
                    )),
                ),
                c.call(
                    opAdd,
                    c.getLocal("pResult"),
                    c.getLocal("pAccumulator"),
                    c.getLocal("pResult"),
                ),
                c.setLocal("roundIdx", c.i32_add(c.getLocal("roundIdx"), c.i32_const(1))),
                c.br(0),
            )),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pOutputBuckets")
            ),
        );
    }

    // Gets the number of chunks given the `scalarSize` as the number of bits
    // in an input scalar and the `chunkSize` as the number of bits in a chunk.
    function buildGetNumChunks() {
        const f = module.addFunction(fnName + "_getNumChunks");
        // Number of bits in a scalar
        f.addParam("scalarSize", "i32");
        // Number of bits in a chunk
        f.addParam("chunkSize", "i32");
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_div_u(
                c.i32_add(
                    c.getLocal("scalarSize"),
                    c.i32_sub(
                        c.getLocal("chunkSize"),
                        c.i32_const(1),
                    ),
                ),
                c.getLocal("chunkSize"),
            )
        );
    }

    // Computes a G1 point as result given a pointer `pPoints` to the input
    // point vector, a pointer `pScalars` to the input scalar vector, `numPoints`
    // to the number of points. The result is set at the memory pointed by
    // `pResult`.
    function buildMultiexp() {
        const f = module.addFunction(fnName + "_multiExp");
        // Pointer to the input point vector
        f.addParam("pPoints", "i32");
        // Pointer to the input scalar vector
        f.addParam("pScalars", "i32");
        // Number of points
        f.addParam("numPoints", "i32");
        // Pointer to the resultinig G1 point
        f.addParam("pResult", "i32");
        // Pointer to a 2-d array of point schedules
        f.addLocal("pPointSchedules", "i32");
        // Pointer to a 2-d array of point schedules
        // TODO: Try to merge pMetadata with pPointSchedule
        f.addLocal("pMetadata", "i32");
        // Number of chunks
        f.addLocal("numChunks", "i32");
        // Number of bits in a chunk
        f.addLocal("chunkSize", "i32");
        // Number of bits in a scalar
        f.addLocal("scalarSize", "i32");
        // Number of buckets
        f.addLocal("numBuckets", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal(
                "scalarSize",
                c.i32_const(n8g * 8),
            ),
            c.setLocal(
                "chunkSize",
                c.call(fnName + "_getOptimalBucketWidth",
                    c.getLocal("numPoints"),
                ),
            ),
            c.setLocal(
                "numChunks",
                c.call(fnName + "_getNumChunks",
                    c.getLocal("scalarSize"),
                    c.getLocal("chunkSize"),
                ),
            ),
            c.setLocal(
                "numBuckets",
                c.call(fnName + "_getNumBuckets",
                    c.getLocal("numPoints"),
                ),
            ),
            // TODO: 
            // Allocates a 2-d array for point schedule.
            c.setLocal("pPointSchedules", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pPointSchedules"),
                    c.i32_shl(
                        c.i32_mul(
                            c.getLocal("numChunks"),
                            c.getLocal("numPoints"),
                        ),
                        c.i32_const(3),
                    ),
                ),
            ),
            // Allocates a 2-d array for metadata.
            // TODO: Merge this with pPointSchedule.
            c.setLocal("pMetadata", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pMetadata"),
                    c.i32_shl(
                        c.i32_mul(
                            c.getLocal("numChunks"),
                            c.getLocal("numPoints"),
                        ),
                        c.i32_const(3),
                    ),
                ),
            ),
            // Allocates a 1-d array for round counts.
            c.setLocal("pRoundCounts", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pRoundCounts"),
                    c.i32_shl(
                        c.getLocal("numChunks"),
                        c.i32_const(2),
                    ),
                )
            ),
            f.call(fnName + "_computeSchedule",
                c.getLocal("pScalars"),
                c.getLocal("numPoints"),
                c.getLocal("pPointSchedules"),
                c.getLocal("pRoundCounts"),
                c.getLocal("scalarSize"),
                c.getLocal("chunkSize"),
            ),
            // TODO: Sync with Xu
            c.call(fnName + "_OrganizeBuckets",
                c.getLocal("pPointSchedules"),
                c.getLocal("pMetadata"),
                c.getLocal("numPoints"),
                c.getLocal("numBuckets"),
            ),
            c.call(fnName + "_multiExpChunks",
                c.getLocal("pMetadata"),
                c.getLocal("pPoints"),
                c.getLocal("numPoints"),
                c.getLocal("chunkSize"),
                c.getLocal("numChunks"),
                c.getLocal("pResult"),
            ),
            // Deallocates memory
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pPointSchedules"),
            )
        );
    }

    // Tests if storeI32 and loadI32 is correct.
    function buildTestStoreLoadI32() {
        const f = module.addFunction(fnName + "_testLoadStoreI32");
        // Pointer to a 1-d array with i32 elements
        f.addParam("pArr", "i32");
        // Length of the input vector
        f.addParam("length", "i32");
        // Index
        f.addLocal("i", "i32");
        // Temporary value
        f.addLocal("tmp", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // for(i=0; i<length; i++) {
            //      tmp = pArr[i];
            //      tmp += i;
            //      pArr[i] = tmp;
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.setLocal("tmp",
                    c.call(fnName + "_loadI32",
                        c.getLocal("pArr"),
                        c.getLocal("i"),
                    ),
                ),
                c.setLocal("tmp",
                    c.i32_add(
                        c.getLocal("tmp"),
                        c.getLocal("i"),
                    ),
                ),
                c.call(fnName + "_storeI32",
                    c.getLocal("pArr"),
                    c.getLocal("i"),
                    c.getLocal("tmp"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        )
    }

    // Tests if storeI64 and loadI64 is correct.
    function buildTestStoreLoadI64() {
        const f = module.addFunction(fnName + "_testLoadStoreI64");
        // Pointer to a 1-d array with i64 elements
        f.addParam("pArr", "i32");
        // Length of the input vector
        f.addParam("length", "i32");
        // Index
        f.addLocal("i", "i32");
        // Temporary value
        f.addLocal("tmp", "i64");
        const c = f.getCodeBuilder();
        f.addCode(
            // for(i=0; i<length; i++) {
            //      tmp = pArr[i];
            //      tmp += i;
            //      pArr[i] = tmp;
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.setLocal("tmp",
                    c.call(fnName + "_loadI64",
                        c.getLocal("pArr"),
                        c.getLocal("i"),
                    ),
                ),
                c.setLocal("tmp",
                    c.i64_add(
                        c.getLocal("tmp"),
                        c.i64_extend_i32_u(c.getLocal("i"))
                    ),
                ),
                c.call(fnName + "_storeI64",
                    c.getLocal("pArr"),
                    c.getLocal("i"),
                    c.getLocal("tmp"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        )
    }

    // Tests if maxArrayValue is correct.
    function buildTestMaxArrayValue() {
        const f = module.addFunction(fnName + "_testMaxArrayValue");
        // Pointer to an array
        f.addParam("pArr", "i32");
        // Length of the array
        f.addParam("length", "i32");
        // Max value
        f.addParam("pMax", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.call(fnName + "_storeI32",
                c.getLocal("pMax"),
                c.i32_const(0),
                c.call(fnName + "_maxArrayValue",
                    c.getLocal("pArr"),
                    c.getLocal("length"),
                ),
            ),
        );
    }

    // Tests if maxArrayValue is correct.
    function buildTestGetMSB() {
        const f = module.addFunction(fnName + "_testGetMsb");
        // Pointer to an array
        f.addParam("pArr", "i32");
        // Length of the array
        f.addParam("length", "i32");
        // Pointer to an array of Msb
        f.addParam("pMsb", "i32");
        // Index
        f.addLocal("i", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("length"))),
                c.call(fnName + "_storeI32",
                    c.getLocal("pMsb"),
                    c.getLocal("i"),
                    c.call(fnName + "_getMsb",
                        c.call(fnName + "_loadI32",
                            c.getLocal("pArr"),
                            c.getLocal("i"),
                        ),
                    ),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        );
    }

    // Tests if getChunk is correct.
    function buildTestGetChunk() {
        const f = module.addFunction(fnName + "_testGetChunk");
        // Pointer to a scalar
        f.addParam("pScalar", "i32");
        // Number of bytes of the scalar
        f.addParam("scalarSize", "i32");
        // Chunk size in bits
        f.addParam("chunkSize", "i32");
        // Pointer to an array of extracted chunks.
        f.addParam("pChunks", "i32");
        // Index
        f.addLocal("i", "i32");
        // Bit to start extract
        f.addLocal("startBit", "i32");
        // Scalar size in bits
        f.addLocal("scalarSizeInBits", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("scalarSizeInBits",
                c.i32_shl(
                    c.getLocal("scalarSize"),
                    c.i32_const(3),
                ),
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.setLocal("startBit",
                    c.i32_mul(
                        c.getLocal("i"),
                        c.getLocal("chunkSize"),
                    ),
                ),
                c.br_if(1, c.i32_gt_s(c.getLocal("startBit"), c.getLocal("scalarSizeInBits")),
                ),
                c.call(fnName + "_storeI32",
                    c.getLocal("pChunks"),
                    c.getLocal("i"),
                    c.call(fnName + "_getChunk",
                        c.getLocal("pScalar"),
                        c.getLocal("scalarSize"),
                        c.getLocal("startBit"),
                        c.getLocal("chunkSize"),
                    ),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        );
    }

    buildLoadI64();
    buildStoreI64();
    buildLoadI32();
    buildStoreI32();
    buildAddAssignI32InMemoryUncheck();
    buildAllocateMemory();
    buildInitializeI32();
    buildInitializeI64();
    buildMaxArrayValue();
    buildCopyArray();
    buildGetMSB();

    buildAddAffinePointsOneRound();
    buildCountBits();
    buildConstructAdditionChains();
    buildGetChunk();
    buildGetOptimalChunkWidth();
    buildGetNumBuckets();
    // buildGetNumChunks();
    buildOrganizeBucketsOneRound();
    buildOrganizeBuckets();
    buildRearrangePoints();
    buildEvaluateAdditionChains();
    // buildReduceTable();
    // buildReduceBuckets();
    buildSinglePointComputeSchedule();
    buildComputeSchedule();
    // buildMultiexp();
    // buildMutiexpChunks();
    module.exportFunction(fnName + "_countBits");
    module.exportFunction(fnName + "_organizeBuckets");
    module.exportFunction(fnName + "_organizeBucketsOneRound");
    module.exportFunction(fnName + "_constructAdditionChains");
    module.exportFunction(fnName + "_singlePointComputeSchedule");
    module.exportFunction(fnName + "_rearrangePoints");
    module.exportFunction(fnName + "_addAffinePointsOneRound");
    module.exportFunction(fnName + "_evaluateAdditionChains");
    module.exportFunction(fnName + "_computeSchedule");

    buildTestGetMSB();
    buildTestMaxArrayValue();
    buildTestStoreLoadI32();
    buildTestStoreLoadI64();
    buildTestGetChunk();
    module.exportFunction(fnName + "_testGetMsb");
    module.exportFunction(fnName + "_testLoadStoreI32");
    module.exportFunction(fnName + "_testLoadStoreI64");
    module.exportFunction(fnName + "_testMaxArrayValue");
    module.exportFunction(fnName + "_testGetChunk");
};
