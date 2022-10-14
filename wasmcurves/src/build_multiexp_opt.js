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

    // Fr: 32 bytes = 256 bits
    const n8r = 32;

    const n8 = 48; // only for our msm implementation 
    const prefixField = "f1m";// only for our msm implementation 
    opMixedAdd = "g1m_addMixed";
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
        // A pointer to an array of bit offsets. Shape: maxBucketBits+1
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
                c.br_if(1, c.i32_ge_u(c.getLocal("j"), c.getLocal("maxBucketBitsPlusOne"))),
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
        // Pointer to an array of the number of points in each round. 
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
    //    a pointer to an array of the number of points with non-zero bucket index in each round. Note that scalar 
    //    corresponding to a specific round may be zero, so this number of points is not the same for all rounds.
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
        // Pointer to an array of the number of points in each round. Shape: numChunks
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

    // Given a point pArr to a 2-d array, returns a 1-d array `pCounts` where the i^th element is
    //  the number of non-zero elements in the i^th row of pArr.
    function buildCountNonZero() {
        const f = module.addFunction(fnName + "_countNonZero");
        // Pointer to the input array. Shape: numRow * numCol
        f.addParam("pArr", "i32");
        // Number of rows
        f.addParam("numRow", "i32");
        // Number of columns
        f.addParam("numCol", "i32");
        // Pointer to a 1-d array. Shape: numRow
        f.addParam("pCounts", "i32");
        // Index
        f.addLocal("i", "i32");
        // Index
        f.addLocal("j", "i32");
        // Counts
        f.addLocal("count", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numRow"))),
                c.setLocal("count", c.i32_const(0)),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("numCol"))),
                    c.if(
                        c.i32_ne(
                            c.call(fnName + "_loadI32",
                                c.getLocal("pArr"),
                                c.i32_add(
                                    c.i32_mul(
                                        c.getLocal("i"),
                                        c.getLocal("numCol"),
                                    ),
                                    c.getLocal("j"),
                                ),
                            ),
                            c.i32_const(0),
                        ),
                        c.setLocal("count", c.i32_add(c.getLocal("count"), c.i32_const(1))),
                    ),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0),
                )),
                c.call(fnName + "_storeI32",
                    c.getLocal("pCounts"),
                    c.getLocal("i"),
                    c.getLocal("count"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
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
    //      Output: 
    //             pMetadata: sort point schedules by bucket index
    //              [(3,1), (5,1),
    //               (4,2),
    //               (1,3), (6,3)]
    //              Note that (0, 0) and (2,0) are skipped since bucket 0 does not need any computation.
    //             pBucketCounts:
    //              [0, 2, 1, 2]
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
        f.addParam("pBucketCount", "i32");
        // Pointer to an array of starting index of each bucket. Shape: numBuckets+1
        f.addLocal("pBucketOffsets", "i32");
        // Pointer to an array of the bucket index of each point. Shape: numPoints
        f.addLocal("pPointBucketIdx", "i32");
        // Bucket index
        f.addLocal("bucketIdx", "i32");
        // Index
        f.addLocal("i", "i32");
        // Number of points with bucket index 0
        f.addLocal("countBucket0", "i32");
        f.addCode(
            c.call(fnName + "_initializeI32",
                c.getLocal("pBucketCount"),
                c.getLocal("numBuckets"),
                c.i32_const(0),
            ),
            c.setLocal("pBucketOffsets",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(
                        c.i32_add(
                            c.getLocal("numBuckets"),
                            c.i32_const(1),
                        ),
                        c.i32_const(2)
                    ),
                ),
            ),
            c.setLocal("pPointBucketIdx",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(c.getLocal("numPoints"), c.i32_const(2)),
                ),
            ),
            c.setLocal("countBucket0", c.i32_const(0)),
            // for(i=0; i<numPoints; i++) {
            //      bucketIdx = (pPointSchedule[i] & 0x7FFFFFFF) as i32
            //      if(bucketIdx == 0x7FFFFFFF) {
            //          pPointBucketIdx[i] = 0;
            //          countBucket0++;
            //      } else {
            //          pPointBucketIdx[i] = bucketIdx;
            //          pBucketCount[bucketIdx] += 1;
            //      }
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
                c.if(
                    c.i32_eq(
                        c.getLocal("bucketIdx"),
                        c.i32_const(0x7FFFFFFF),
                    ),
                    [
                        ...c.call(fnName + "_storeI32",
                            c.getLocal("pPointBucketIdx"),
                            c.getLocal("i"),
                            c.i32_const(0),
                        ),
                        ...c.setLocal("countBucket0", c.i32_add(c.getLocal("countBucket0"), c.i32_const(1))),
                    ],
                    [
                        ...c.call(fnName + "_storeI32",
                            c.getLocal("pPointBucketIdx"),
                            c.getLocal("i"),
                            c.getLocal("bucketIdx"),
                        ),
                        ...c.call(fnName + "_addAssignI32InMemoryUncheck",
                            c.getLocal("pBucketCount"),
                            c.getLocal("bucketIdx"),
                            c.i32_const(1),
                        ),
                    ],
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
            //      if (bucketIdx != 0) {
            //          pMetadata[pBucketOffsets[bucketIdx]] = pPointSchedules[i];
            //          pBucketOffsets[bucketIdx] += 1;
            //      }
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
                c.if(
                    c.i32_ne(
                        c.getLocal("bucketIdx"),
                        c.i32_const(0),
                    ),
                    [
                        ...c.call(fnName + "_storeI64",
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
                        ...c.call(fnName + "_addAssignI32InMemoryUncheck",
                            c.getLocal("pBucketOffsets"),
                            c.getLocal("bucketIdx"),
                            c.i32_const(1),
                        ),
                    ]
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            // for(i=0; i<countBucket0; i++) {
            //      pMetadata[numPoints-1-i] = 0xffffffffffffffffn;
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("countBucket0"),
                    ),
                ),
                c.call(fnName + "_storeI64",
                    c.getLocal("pMetadata"),
                    c.i32_sub(
                        c.i32_sub(
                            c.getLocal("numPoints"),
                            c.i32_const(1),
                        ),
                        c.getLocal("i"),
                    ),
                    c.i64_const(0xffffffffffffffffn),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            c.i32_store(c.i32_const(0), c.getLocal("pBucketOffsets")),
        );
    }

    // Given the pointer `pPointSchedules` to the point schedules of all rounds, 
    // `numPoints` as the length of the input point vector, `bucketNum` as the number
    // of buckets, this function sorted the point schedules by the bucket index for
    // each round and stores the results in the 2d array pointed to by `pMetadata`.
    // In addition, this function initializes pBucketCounts.
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
        // Pointer to a 2-d array of the number of points in each bucket for each chunk. Shape: numChunks * numBuckets
        f.addParam("pBucketCounts", "i32");
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
            //          &pBucketCounts[i*numBuckets]
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
                    c.i32_add(
                        c.getLocal("pBucketCounts"),
                        c.i32_shl(
                            c.i32_mul(c.getLocal("i"), c.getLocal("numBuckets")),
                            c.i32_const(2),
                        ),
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
        // Pointer to 1d array of the starting index of the i^th bit. Shape: maxBucketBits + 1
        // For example, if the processed addition chain is
        //      [(3,2),
        //       (8,1), (9,1),
        //       (4,2), (5,2), (6,2), (7,2)]
        // we have pBitOffset = [0, 1, 3, 7]
        f.addParam("pBitOffsets", "i32");
        // Pointer to 1d array of point schedules as the addition chains. Shape:
        f.addParam("pMetadata", "i32");
        // Pointer to max bucket bits. This function computes max bucket bits and stores in this location.
        f.addParam("pMaxBucketBits", "i32");
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
            c.setLocal("maxCount", c.call(fnName + "_maxArrayValue", c.getLocal("pBucketCounts"), c.getLocal("numBuckets"))),
            c.setLocal("maxBucketBits", c.call(fnName + "_getMsb", c.getLocal("maxCount"))),
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
            c.call(fnName + "_storeI32",
                c.getLocal("pMaxBucketBits"),
                c.i32_const(0),
                c.getLocal("maxBucketBits"),
            ),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pBitOffsetsCopy")
            ),
        );
    }

    // Given a pointer `pPoints` to the input point vector that has been processed by reorderPoints(),
    // a pointer `pBitOffsets` to 1d array of the starting index of the i^th bit, `numPoints`
    // as the length of the input point vector, `maxBucketBits` as the max bucket bits,
    // this function evaluates a chain of pairewise additions and stores the results in a vector
    // pointed by `pPoint`.
    //
    // For example:
    // Input:
    //      pPoints:
    //          [p3, p8, p9, p4, p5, p6, p7, p0, p1, p2]
    //      pPointSchedules: (used in reorderPoints)
    //          [(3,2),
    //           (8,1), (9,1),
    //           (4,2), (5,2), (6,2), (7,2)]
    //      Note: p0, p1, p2 is ignored since their bucket index is 0.
    // Output:
    //      pPoint:
    //      [p3,
    //       p8, p9
    //       p4, p8+p9, p4+p5, p4+p5+p6+p7]
    function buildEvaluateAdditionChains() {
        const f = module.addFunction(fnName + "_evaluateAdditionChains");
        // Pointer to the input point vector. Shape: numPoints
        f.addParam("pPoints", "i32");
        // Pointer to 1d array of the starting index of the i^th bit. Shape: numBuckets + 1
        f.addParam("pBitOffsets", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Max bucket bits
        f.addParam("maxBucketBits", "i32");
        // Number of points to be computed in this round. Since evaluateAdditionChains() may
        // be called repeatedly, `pointsInRound` may be unequal to `numPoints`.
        f.addLocal("pointsInRound", "i32");
        // Index
        f.addLocal("i", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // for (i=0; i<maxBucketBits; i++) {
            //    pointsInRound = (numPoints - pBitOffsets[i + 1]) >> i
            //    addAffinePointsOneRound(numPoints, pointsInRound, pPoints);
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("maxBucketBits"))),
                c.setLocal("pointsInRound",
                    c.i32_shr_u(
                        c.i32_sub(
                            c.getLocal("numPoints"),
                            c.call(fnName + "_loadI32",
                                c.getLocal("pBitOffsets"),
                                c.i32_add(
                                    c.getLocal("i"),
                                    c.i32_const(1),
                                ),
                            ),
                        ),
                        c.getLocal("i")
                    ),
                ),
                c.call(fnName + "_addAffinePointsOneRound",
                    c.getLocal("numPoints"),
                    c.getLocal("pointsInRound"),
                    c.getLocal("pPoints"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // Given the pointer `pPointSchedule` to the point schedules of the current round
    // constructed by `constructAdditionChains`, `numPoints` as the length of the input
    // point vector, `pPoints` as the pointer to initial point vectors, this function
    // copies points from `pPoints` to `pReorderedPoints`  following the order of `pPointSchedule`.
    // 
    // For example:
    //      Input: 
    //          pPointSchedule
    //              [(3,2),
    //               (8,1), (9,1),
    //               (4,2), (5,2), (6,2), (7,2)]
    //              Here, (i,j) indicates the i^th point in the j^th buckets.
    //          pPoints
    //              [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9]   
    //              Here, pi is i-th point, and in affine representation (x, y). 
    //              Each point use n8*2 bytes. 
    //      Output: 
    //          pPointSchedule
    //              [p3, p8, p9, p4, p5, p6, p7]
    //              Note: p0, p1, p2 are dropped since their bucket index is 0.
    function buildReorderPoints() {
        const f = module.addFunction(fnName + "_reorderPoints");
        // Pointer to the input point vector
        f.addParam("pPoints", "i32");
        // Pointer to a 1d array of point schedules
        f.addParam("pPointSchedule", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Number of points in bucket0
        f.addParam("countBucket0", "i32")
        // Pointer to a 1d array of reordered points
        f.addParam("pReorderedPoints", "i32");
        const c = f.getCodeBuilder();
        f.addLocal("i", "i32");
        f.addLocal("pointIdx", "i32");
        f.addCode(
            // for (i=0; i<numPoints; i++) {
            //    pointIdx = pPointSchedule[i] >> 32;
            //    pReorderedPoints[i] = pPoints[pointIdx];
            // }
            c.setLocal("numPoints", c.i32_sub(c.getLocal("numPoints"), c.getLocal("countBucket0"))),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numPoints"))),
                c.setLocal("pointIdx",
                    c.i32_wrap_i64(
                        c.i64_shr_u(
                            c.call(fnName + "_loadI64",
                                c.getLocal("pPointSchedule"),
                                c.getLocal("i"),
                            ),
                            c.i64_const(32),
                        ),
                    ),
                ),
                c.call(prefix + "_copyAffine",
                    c.i32_add(
                        c.getLocal("pPoints"),
                        c.i32_mul(
                            c.getLocal("pointIdx"),
                            c.i32_const(n8 * 2)
                        )
                    ),
                    c.i32_add(
                        c.getLocal("pReorderedPoints"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8 * 2)
                        )
                    ),
                ),
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

    // Given a pointer `pPoints` to the input point vector, a pointer `pPointSchedules` to a 1d
    // array of point schedules for the current round, `numPoints` as the length of the input point
    // vector, `numBuckets` as the number of buckets, a pointer `pBucketCounts` to a 1d array
    // of number of points in each bucket for a specific round, this function returns
    // `pPointScheduleAlt`:
    //      [(Index_0, bucket_i0), (Index_1, bucket_i1), ..., (Index_m, bucket_im)]
    //      Here, bucket_ij is the j^th non-zero bucket with at least 1 point, and Index_0 is 
    //      the location storing the reduced point of the j^th smallest non-zero bucket with 
    //      at least 1 point.
    // `pPointPairs1`:
    //      [P0, P1, ..., Pn]
    //      An array of processed points. Only the point corresponding to Index_i is useful.
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
        // Pointer to 1d array of the starting index of the i^th bit. Shape: maxBucketBits + 1
        // For example, if the processed addition chain is
        //      [(0,0), (3,2),
        //       (1,0), (2,0), (8,1), (9,1),
        //       (4,2), (5,2), (6,2), (7,2)]
        // we have pBitOffset = [0, 2, 6, 10]
        // Assumption: pBitOffsets has not been initialized
        f.addParam("pBitOffsets", "i32");
        // Pointer to a 1-d array of point schedules for a specific round. This stores
        // the processed point schedules from `ConstructAdditionChains`. Shape: numPoints
        // Assumption: pPointScheduleAlt has not been initialized. Just for reusing memory.
        f.addParam("pPointScheduleAlt", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addParam("pPointPairs1", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addParam("pPointPairs2", "i32");
        f.setReturnType("i32");
        // Max bucket bits
        f.addLocal("maxBucketBits", "i32");
        // Index to start a new bit in pBitOffsets
        f.addLocal("start", "i32");
        // Index
        f.addLocal("i", "i32");
        // Index
        f.addLocal("j", "i32");
        // Number of points in the current round
        f.addLocal("pointsInRound", "i32");
        // &pBitOffset[i+1]
        f.addLocal("pBitOffsetIPlusOne", "i32");
        // Number of bits in the current bucket
        f.addLocal("numBits", "i32");
        // Pointer to the count for a specific bucket
        f.addLocal("pCount", "i32");
        // Number of points in a single bucket after evaluate addition chain
        f.addLocal("newBucketCount", "i32");
        // Pointer to the bit offsets for the current bucket and bit
        f.addLocal("pCurrentOffset", "i32");
        // Pointer to the max bucket bits
        f.addLocal("pMaxBucketBits", "i32");
        // Number of points in the bucket zero
        f.addLocal("bucketZeroCount", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("pMaxBucketBits", c.call(fnName + "_allocateMemory", c.i32_const(4))),
            c.call(fnName + "_constructAdditionChains",
                c.getLocal("pPointSchedules"),
                c.getLocal("numPoints"),
                c.getLocal("numBuckets"),
                c.getLocal("pBucketCounts"),
                c.getLocal("pBitOffsets"),
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("pMaxBucketBits"),
            ),
            c.setLocal("maxBucketBits",
                c.call(fnName + "_loadI32",
                    c.getLocal("pMaxBucketBits"),
                    c.i32_const(0),
                ),
            ),
            c.setLocal("bucketZeroCount",
                c.i32_sub(
                    c.getLocal("numPoints"),
                    c.call(fnName + "_loadI32",
                        c.getLocal("pBitOffsets"),
                        c.getLocal("maxBucketBits"),
                    ),
                ),
            ),
            c.call(fnName + "_reorderPoints",
                c.getLocal("pPoints"),
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("numPoints"),
                c.getLocal("bucketZeroCount"),
                c.getLocal("pPointPairs1"),
            ),
            c.if(
                c.i32_le_u(c.getLocal("maxBucketBits"), c.i32_const(1)),
                c.ret(c.getLocal("pPointPairs1")),
            ),
            c.setLocal("numPoints",
                c.i32_sub(
                    c.getLocal("numPoints"),
                    c.getLocal("bucketZeroCount"),
                ),
            ),
            c.call(fnName + "_evaluateAdditionChains",
                c.getLocal("pPointPairs1"),
                c.getLocal("pBitOffsets"),
                c.getLocal("numPoints"),
                c.getLocal("maxBucketBits"),
            ),
            // for (i = 0; i < maxBucketBits; i++) {
            //     pBitOffsetIPlusOne = pBitOffset + (i+1)*4
            //     pointsInRound = (numPoints - *pBitOffsetIPlusOne) >> i;
            //     start = numPoints - pointsInRound;
            //     *pBitOffsetIPlusOne = start + pointsInRound / 2;
            // }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("maxBucketBits"))),
                c.setLocal("pBitOffsetIPlusOne",
                    c.i32_add(
                        c.getLocal("pBitOffsets"),
                        c.i32_shl(
                            c.i32_add(c.getLocal("i"), c.i32_const(1)),
                            c.i32_const(2),
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
                    c.i32_add(
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
            // numPoints = 0;
            // for (i = 0; i < numBuckets; ++i) {
            //     pCount = &pBucketCounts[i];
            //     numBits = getMsb(*pCount);
            //     newBucketCount = 0;
            //     for (j = 0; j < numBits; ++j) {
            //         pCurrentOffset = &pBitOffsets[j];
            //         hasEntry = ((*pCount >> j) & 1) == 1;
            //         if (hasEntry) {
            //             pPointSchedules[numPoints] = (*pCurrentOffset << 32) + i;
            //             ++numPoints;
            //             ++newBucketCount;
            //             ++*pCurrentOffset;
            //         }
            //     }
            //     *pCount = newBucketCount;
            // }
            c.setLocal("numPoints", c.i32_const(0)),
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
                                    c.i32_load(c.getLocal("pCount")),
                                    c.getLocal("j"),
                                ),
                                c.i32_const(1),
                            ),
                            c.i32_const(1),
                        ),
                        [
                            ...c.call(fnName + "_storeI64",
                                c.getLocal("pPointSchedules"),
                                c.getLocal("numPoints"),
                                c.i64_or(
                                    c.i64_shl(
                                        c.i64_extend_i32_u(c.i32_load(c.getLocal("pCurrentOffset"))),
                                        c.i64_const(32),
                                    ),
                                    c.i64_extend_i32_u(c.getLocal("i")),
                                ),
                            ),
                            ...c.setLocal("numPoints", c.i32_add(c.getLocal("numPoints"), c.i32_const(1))),
                            ...c.setLocal("newBucketCount", c.i32_add(c.getLocal("newBucketCount"), c.i32_const(1))),
                            ...c.call(fnName + "_addAssignI32InMemoryUncheck",
                                c.getLocal("pCurrentOffset"),
                                c.i32_const(0),
                                c.i32_const(1),
                            ),
                        ]
                    ),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0),
                )),
                c.i32_store(c.getLocal("pCount"), c.getLocal("newBucketCount")),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pMaxBucketBits")
            ),
            c.ret(c.call(fnName + "_reduceBuckets",
                c.getLocal("pPointPairs1"),
                c.getLocal("pPointSchedules"),
                c.getLocal("numPoints"),
                c.getLocal("numBuckets"),
                c.getLocal("pBucketCounts"),
                c.getLocal("pBitOffsets"),
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("pPointPairs2"),
                c.getLocal("pPointPairs1"),
            )),
        );
    }

    // Input:
    //    pPointSchedules:
    //    [(0, BucketIdx_0), (1, BucketIdx_1), ..., (m-1, BucketIdx_{m-1})]
    //    Here, BucketIdx_i is the index of the i^th bucket with at least 1 point.
    //    pPointBuckets:
    //    [p_0, p_1, ..., p_{m-1}]
    //    Here, p_i stores the single point of the i^th bucket with at least 1 point.
    // Output:
    //    pAccumulator:
    //    pAccumulator = \sum_{i=0}^{m-1} BucketIdx_i * p_i
    function buildReduceBucketsToSinglePoint() {
        const f = module.addFunction(fnName + "_reduceBucketsToSinglePoint");
        // Pointer to a 1-d array of point schedules
        f.addParam("pPointSchedules", "i32");
        // Pointer to points in each bucket.
        f.addParam("pPointBuckets", "i32");
        // Number of buckets with at least 1 point
        f.addParam("numNonZeroBuckets", "i32");
        // A single point accumulator
        f.addParam("pAccumulator", "i32");
        // Pointer to running sum
        f.addParam("pRunningSum", "i32");
        // Index
        f.addLocal("i", "i32");
        // Index
        f.addLocal("j", "i32");
        // Gap between two bucket index with at least 1 point
        f.addLocal("gap", "i32");
        // Gap - 1
        f.addLocal("gapMinusOne", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.call(prefix + "_zero", c.getLocal("pAccumulator")),
            c.call(prefix + "_zero", c.getLocal("pRunningSum")),
            // for(i=numNonZeroBuckets-1; i>=0; i--) {
            //    opAdd(*pRunningSum, pPointBuckets[i], *pRunningSum);
            //    opAdd(*pAccumulator, *pRunningSum, *pAccumulator);
            //    if(i==0) {
            //        gap = pPointSchedules[i] & 0x7FFFFFFF;
            //    } else {
            //        gap = (pPointSchedules[i] & 0x7FFFFFFF) - (pPointSchedules[i-1] & 0x7FFFFFFF);
            //    }
            //    for(j=0; j<gap-1; j++) {
            //        pAccumulator = pAccumulator + pRunningSum;
            //    }
            // }
            c.setLocal("i", c.i32_sub(c.getLocal("numNonZeroBuckets"), c.i32_const(1))),
            c.block(c.loop(
                c.br_if(1, c.i32_lt_s(c.getLocal("i"), c.i32_const(0))),
                c.call(opMixedAdd,
                    c.getLocal("pRunningSum"),
                    c.i32_add(
                        c.getLocal("pPointBuckets"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8 * 2),// 48 * 2
                        ),
                    ),
                    c.getLocal("pRunningSum"),
                ),
                c.call(opAdd,
                    c.getLocal("pAccumulator"),
                    c.getLocal("pRunningSum"),
                    c.getLocal("pAccumulator"),
                ),
                c.if(c.i32_eq(c.getLocal("i"), c.i32_const(0)),
                    c.setLocal("gap",
                        c.i32_wrap_i64(
                            c.i64_and(
                                c.call(fnName + "_loadI64",
                                    c.getLocal("pPointSchedules"),
                                    c.getLocal("i"),
                                ),
                                c.i64_const(0x7FFFFFFF),
                            ),
                        ),
                    ),
                    c.setLocal("gap",
                        c.i32_sub(
                            c.i32_wrap_i64(
                                c.i64_and(
                                    c.call(fnName + "_loadI64",
                                        c.getLocal("pPointSchedules"),
                                        c.getLocal("i"),
                                    ),
                                    c.i64_const(0x7FFFFFFF),
                                ),
                            ),
                            c.i32_wrap_i64(
                                c.i64_and(
                                    c.call(fnName + "_loadI64",
                                        c.getLocal("pPointSchedules"),
                                        c.i32_sub(
                                            c.getLocal("i"),
                                            c.i32_const(1),
                                        ),
                                    ),
                                    c.i64_const(0x7FFFFFFF),
                                ),
                            ),
                        ),
                    ),
                ),
                c.setLocal("gapMinusOne", c.i32_sub(c.getLocal("gap"), c.i32_const(1))),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("gapMinusOne"))),
                    c.call(opAdd,
                        c.getLocal("pAccumulator"),
                        c.getLocal("pRunningSum"),
                        c.getLocal("pAccumulator"),
                    ),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0),
                )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        );
    }

    // Adds the accumulator of the current chunk `pAccumulatorSingleChunk` with the accumulator
    // of all chunks `pAccumulator`.
    function buildAccumulateAcrossChunks() {
        const f = module.addFunction(fnName + "_accumulateAcrossChunks");
        // Pointer to the accumulator of all chunks
        f.addParam("pAccumulator", "i32");
        // Pointer to the accumulator of a single chunk
        f.addParam("pAccumulatorSingleChunk", "i32");
        // Index of the current chunk
        f.addParam("chunkIdx", "i32");
        // Number of bits in a chunk
        f.addParam("chunkSize", "i32");
        // Index
        f.addLocal("i", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // if(chunkIdx > 0) {
            //     for (int i = 0; i < chunkSize; i++) {
            //         *pAccumulator *= 2;
            //     }
            // }
            // opAdd(*pAccumulator, *pAccumulatorSingleChunk, *pAccumulator);
            c.if(c.i32_ne(c.getLocal("chunkIdx"), c.i32_const(0)),
                [
                    ...c.setLocal("i", c.i32_const(0)),
                    ...c.block(c.loop(
                        c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("chunkSize"))),
                        c.call(prefix + "_double", c.getLocal("pAccumulator"), c.getLocal("pAccumulator")),
                        c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                        c.br(0),
                    )),
                ],
            ),
            // Note: both pAccumulator and pAccumulatorSingleChunk are projective points.
            c.call(opAdd, c.getLocal("pAccumulator"), c.getLocal("pAccumulatorSingleChunk"), c.getLocal("pAccumulator")),
        );
    }

    // Computes MSM over a single chunk and sets the output pointed by `pResult`.
    function buildMutiexpSingleChunk() {
        const f = module.addFunction(fnName + "_multiExpSingleChunk");
        // Pointer to a 1-d array of point schedules. Shahpe: numPoints
        f.addParam("pPointSchedules", "i32");
        // Pointer to the input point vector
        f.addParam("pPoints", "i32");
        // Number of buckets with at least 1 point
        f.addParam("numNonZeroBuckets", "i32");
        // Pointer to a 1-d array of the number of points in each bucket. Shape: numBuckets
        f.addParam("pBucketCounts", "i32");
        // Number of points
        f.addParam("numPoints", "i32");
        // Number of bits in a chunk
        f.addParam("chunkSize", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Round index
        f.addParam("roundIdx", "i32");
        // Pointer to an accumulator.
        f.addParam("pAccumulator", "i32");
        // Pointer to the resulting G1 point
        f.addParam("pResult", "i32");
        // Pointer to running sum. Only for memory reuse.
        f.addParam("pRunningSum", "i32");
        // Pointer to a 1-d array of bit offsets. Shape: maxBucketBits+1
        // Assumption: This has not been initialized. Just for reusing memory.
        f.addParam("pBitOffsets", "i32");
        // Pointer to a 1-d array of point schedules for a specific round. This stores
        // the processed point schedules from `ConstructAdditionChains`. Shape: numPoints
        // Assumption: pPointScheduleAlt has not been initialized. Just for reusing memory.
        f.addParam("pPointScheduleAlt", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints. Only for memory reuse.
        f.addParam("pPointPairs1", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints. Only for memory reuse.
        f.addParam("pPointPairs2", "i32");
        // Pointer to the output buckets.
        f.addLocal("pOutputBuckets", "i32");
        // Index
        f.addLocal("k", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("pOutputBuckets",
                c.call(fnName + "_reduceBuckets",
                    c.getLocal("pPoints"),
                    c.getLocal("pPointSchedules"),
                    c.getLocal("numPoints"),
                    c.getLocal("numBuckets"),
                    c.getLocal("pBucketCounts"),
                    c.getLocal("pBitOffsets"),
                    c.getLocal("pPointScheduleAlt"),
                    c.getLocal("pPointPairs1"),
                    c.getLocal("pPointPairs2"),
                ),
            ),
            c.call(fnName + "_reduceBucketsToSinglePoint",
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("pOutputBuckets"),
                c.getLocal("numNonZeroBuckets"),
                c.getLocal("pAccumulator"),
                c.getLocal("pRunningSum"),
            ),
            c.call(fnName + "_accumulateAcrossChunks",
                c.getLocal("pResult"),//pAccumulator
                c.getLocal("pAccumulator"),//pAccumulatorSingleChunk
                c.getLocal("roundIdx"),
                c.getLocal("chunkSize"),
            ),
        );
    }


    // Computes MSM over all chunks and sets the output pointed by `pResult`.
    function buildMutiexpChunks() {
        const f = module.addFunction(fnName + "_multiExpChunks");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedules", "i32");
        // Pointer to the input point vector
        f.addParam("pPoints", "i32");
        // Pointer to a 1-d array of the number of buckets with at least 1 point for each chunk. Shape: numChunks
        f.addParam("pNumNonZeroBuckets", "i32");
        // Pointer to a 2-d array of the number of points in each bucket for each chunk. Shape: numChunk * numBuckets
        f.addParam("pBucketCounts", "i32");
        // Number of points
        f.addParam("numPoints", "i32");
        // Number of bits in a chunk
        f.addParam("chunkSize", "i32");
        // Number of chunks
        f.addParam("numChunks", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Pointer to the resulting G1 point
        f.addParam("pResult", "i32");
        // Pointer to an accumulator
        f.addLocal("pAccumulator", "i32");
        // Pointer to running sum
        f.addLocal("pRunningSum", "i32");
        // Pointer to a 1-d array of bit offsets. Shape: maxBucketBits+1
        // Assumption: This has not been initialized. Just for reusing memory.
        f.addLocal("pBitOffsets", "i32");
        // Pointer to a 1-d array of point schedules for a specific round. This stores
        // the processed point schedules from `ConstructAdditionChains`. Shape: numPoints
        // Assumption: pPointScheduleAlt has not been initialized. Just for reusing memory.
        f.addLocal("pPointScheduleAlt", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addLocal("pPointPairs1", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addLocal("pPointPairs2", "i32");
        // Round index
        f.addLocal("roundIdx", "i32");
        // Pointer to the output buckets
        f.addLocal("pOutputBuckets", "i32");
        // Index
        f.addLocal("k", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.if(c.i32_eqz(c.getLocal("numPoints")),
                [
                    ...c.call(prefix + "_zero", c.getLocal("pResult")),
                    ...c.ret([])
                ]
            ),
            c.setLocal("pBitOffsets",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(
                        c.i32_add(
                            c.getLocal("numPoints"), // An upper bound of maxBucketBits
                            c.i32_const(1),
                        ),
                        c.i32_const(2),
                    ),
                ),
            ),
            c.setLocal("pPointScheduleAlt",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(
                        c.getLocal("numPoints"),
                        c.i32_const(3),
                    ),
                ),
            ),
            c.setLocal("pPointPairs1",
                c.call(fnName + "_allocateMemory",
                    c.i32_mul(
                        c.i32_const(n8g),
                        c.getLocal("numPoints"),
                    ),
                ),
            ),
            c.setLocal("pPointPairs2",
                c.call(fnName + "_allocateMemory",
                    c.i32_mul(
                        c.i32_const(n8g),
                        c.getLocal("numPoints"),
                    ),
                ),
            ),
            c.setLocal("pAccumulator", c.call(fnName + "_allocateMemory", c.i32_const(n8g))),
            c.setLocal("pRunningSum", c.call(fnName + "_allocateMemory", c.i32_const(n8g))),
            c.call(prefix + "_zero", c.getLocal("pResult")),
            c.setLocal("roundIdx", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("roundIdx"), c.getLocal("numChunks"))),
                c.call(fnName + "_multiExpSingleChunk",
                    c.i32_add(
                        c.getLocal("pPointSchedules"),
                        c.i32_shl(
                            c.i32_mul(
                                c.getLocal("roundIdx"),
                                c.getLocal("numPoints"),
                            ),
                            c.i32_const(3),
                        ),
                    ),
                    c.getLocal("pPoints"),
                    c.call(fnName + "_loadI32",
                        c.getLocal("pNumNonZeroBuckets"),
                        c.getLocal("roundIdx"),
                    ),
                    c.i32_add(
                        c.getLocal("pBucketCounts"),
                        c.i32_shl(
                            c.i32_mul(
                                c.getLocal("roundIdx"),
                                c.getLocal("numBuckets"),
                            ),
                            c.i32_const(2),
                        ),
                    ),
                    c.getLocal("numPoints"),
                    c.getLocal("chunkSize"),
                    c.getLocal("numBuckets"),
                    c.getLocal("roundIdx"),
                    c.getLocal("pAccumulator"),
                    c.getLocal("pResult"),
                    c.getLocal("pRunningSum"),
                    c.getLocal("pBitOffsets"),
                    c.getLocal("pPointScheduleAlt"),
                    c.getLocal("pPointPairs1"),
                    c.getLocal("pPointPairs2"),
                ),
                c.setLocal("roundIdx", c.i32_add(c.getLocal("roundIdx"), c.i32_const(1))),
                c.br(0),
            )),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pBitOffsets")
            ),
        );
    }

    // Gets the number of chunks given the `scalarSize` as the number of bits
    // in an input scalar and the `chunkSize` as the number of bits in a chunk.
    function buildGetNumChunks() {
        const f = module.addFunction(fnName + "_getNumChunks");
        // Number of bytes in a scalar
        f.addParam("scalarSize", "i32");
        // Number of bits in a chunk
        f.addParam("chunkSize", "i32");
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_div_u(
                c.i32_add(
                    c.i32_shl(
                        c.getLocal("scalarSize"),
                        c.i32_const(3),
                    ),
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
        // Number of bytes of the scalar
        f.addLocal("scalarSize", "i32");
        // Number of buckets
        f.addLocal("numBuckets", "i32");
        // Pointer to an array of the number of points in each round. 
        f.addLocal("pRoundCounts", "i32");
        // Pointer to a 1-d array of the number of buckets with at least 1 point for each chunk. Shape: numChunks
        f.addLocal("pNumNonZeroBuckets", "i32");
        // Pointer to a 2-d array of the number of points in each bucket for each chunk. Shape: numChunks * numBuckets
        f.addLocal("pBucketCounts", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal("scalarSize", c.i32_const(n8r)),
            // c.setLocal("chunkSize",
            //     c.call(fnName + "_getOptimalBucketWidth",
            //         c.getLocal("numPoints"),
            //     ),
            // ),
            c.setLocal("chunkSize", c.i32_const(5)), // For testing only
            c.setLocal("numChunks",
                c.call(fnName + "_getNumChunks",
                    c.getLocal("scalarSize"),
                    c.getLocal("chunkSize"),
                ),
            ),
            // c.setLocal("numBuckets", c.call(fnName + "_getNumBuckets", c.getLocal("numPoints"))),
            c.setLocal("numBuckets", c.i32_const(32)), // For testing only
            c.setLocal("pPointSchedules",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(
                        c.i32_mul(c.getLocal("numChunks"), c.getLocal("numPoints")),
                        c.i32_const(3),
                    ),
                ),
            ),
            c.setLocal("pMetadata",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(
                        c.i32_mul(c.getLocal("numChunks"), c.getLocal("numPoints")),
                        c.i32_const(3),
                    ),
                ),
            ),
            c.setLocal("pRoundCounts",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(c.getLocal("numChunks"), c.i32_const(2)),
                ),
            ),
            c.setLocal("pBucketCounts",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(
                        c.i32_mul(c.getLocal("numChunks"), c.getLocal("numBuckets")),
                        c.i32_const(2),
                    ),
                ),
            ),
            c.setLocal("pNumNonZeroBuckets",
                c.call(fnName + "_allocateMemory",
                    c.i32_shl(c.getLocal("numChunks"), c.i32_const(2)),
                ),
            ),
            c.call(fnName + "_computeSchedule",
                c.getLocal("pScalars"),
                c.getLocal("numPoints"),
                c.getLocal("scalarSize"),
                c.getLocal("chunkSize"),
                c.getLocal("numChunks"),
                c.getLocal("pPointSchedules"),
                c.getLocal("pRoundCounts"),
            ),
            c.call(fnName + "_organizeBuckets",
                c.getLocal("pPointSchedules"),
                c.getLocal("numPoints"),
                c.getLocal("numChunks"),
                c.getLocal("numBuckets"),
                c.getLocal("pMetadata"),
                c.getLocal("pBucketCounts"),
            ),
            c.call(fnName + "_countNonZero",
                c.getLocal("pBucketCounts"),
                c.getLocal("numChunks"),
                c.getLocal("numBuckets"),
                c.getLocal("pNumNonZeroBuckets"),
            ),
            c.call(fnName + "_multiExpChunks",
                c.getLocal("pMetadata"),
                c.getLocal("pPoints"),
                c.getLocal("pNumNonZeroBuckets"),
                c.getLocal("pBucketCounts"),
                c.getLocal("numPoints"),
                c.getLocal("chunkSize"),
                c.getLocal("numChunks"),
                c.getLocal("numBuckets"),
                c.getLocal("pResult"),
            ),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pPointSchedules"),
            ),
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

    buildReduceBucketsToSinglePoint();
    buildAccumulateAcrossChunks();
    buildAddAffinePointsOneRound();
    buildCountBits();
    buildConstructAdditionChains();
    buildGetChunk();
    buildGetOptimalChunkWidth();
    buildGetNumBuckets();
    buildGetNumChunks();
    buildOrganizeBucketsOneRound();
    buildOrganizeBuckets();
    buildReorderPoints();
    buildEvaluateAdditionChains();
    buildSinglePointComputeSchedule();
    buildComputeSchedule();
    buildReduceBuckets();
    buildMutiexpSingleChunk();
    buildMutiexpChunks();
    buildCountNonZero();
    buildMultiexp();
    module.exportFunction(fnName + "_countBits");
    module.exportFunction(fnName + "_organizeBuckets");
    module.exportFunction(fnName + "_organizeBucketsOneRound");
    module.exportFunction(fnName + "_constructAdditionChains");
    module.exportFunction(fnName + "_singlePointComputeSchedule");
    module.exportFunction(fnName + "_reorderPoints");
    module.exportFunction(fnName + "_addAffinePointsOneRound");
    module.exportFunction(fnName + "_evaluateAdditionChains");
    module.exportFunction(fnName + "_computeSchedule");
    module.exportFunction(fnName + "_reduceBuckets");
    module.exportFunction(fnName + "_reduceBucketsToSinglePoint");
    module.exportFunction(fnName + "_accumulateAcrossChunks");
    module.exportFunction(fnName + "_multiExpSingleChunk");
    module.exportFunction(fnName + "_multiExpChunks");
    module.exportFunction(fnName + "_countNonZero");
    module.exportFunction(fnName + "_multiExp");

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
