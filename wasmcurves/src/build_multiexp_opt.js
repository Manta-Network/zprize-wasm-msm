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

    const n64g = module.modules[prefix].n64;
    const n8g = n64g * 8;

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
        f.addParam("num", "i32");
        // Returns the number of bucket 2^c
        f.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.i32_shl(
                i32_const(1),
                c.call(prefix + "_getOptimalBucketWidth", c.getLocal("num"))
            ),
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
                    c.getLocal("i"),
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
                c.br_if(
                    1,
                    c.i32_eq(
                        c.get_local("i"),
                        c.get_local("length"),
                    ),
                ),
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
                c.br_if(
                    1,
                    c.i32_eq(
                        c.get_local("i"),
                        c.get_local("length"),
                    ),
                ),
                c.i64_store(
                    c.i32_add(
                        c.getLocal("pArr"),
                        c.getLocal("i"),
                    ),
                    c.getLocal("default"),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
        )
    }

    // Computes the bit offsets when splitting points in each bucket into pairs,
    // pair of pairs, pair of pairs of pairs, etc.
    // Example:
    //    Suppose we have 3 buckets with bucket_counts = [3, 5, 2], a.k.a. [11, 101, 10]
    //    This function first sets bit_offsets as [0, 1+1, 2+2, 4] = [0, 2, 4, 4]
    //    Then, this function sets bit_offsets as [0, 2, 6, 10]
    function buildCountBits() {
        const f = module.addFunction(fnName + "_countBits");
        // A pointer to an array of the number of points in each bucket
        f.addParam("pBucketCounts", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Max number of bucket bits
        // For example, if maximum number of points in a bucket is is 7 (i.e., 111),
        // the numBits would be 3.
        f.addParam("numBits", "i32");
        // A pointer to an array of bit offsets.
        f.addParam("pBitOffsets", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("bucketCountsI", "i32");
        f.addLocal("pBitOffsetsJ", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // Initializes pBitOffsets[i] = 0 for 0 <= i <= numBits
            c.call(
                fnName + "_initializeI32",
                c.getLocal("pBitOffsets"),
                c.add_i32(
                    c.getLocal("numBits"),
                    c.i32_const(1),
                ),
                c.i32_const(0),
            ),
            // Equivalent in C:
            //  for (size_t i = 0; i < num_buckets; ++i) {
            //      for (uint32_t j = 0; j < num_bits; ++j) {
            //          bit_offsets[j + 1] += (bucket_counts[i] & (1U << j));
            //      }
            //  }
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("numBuckets")
                    )
                ),
                c.setLocal(
                    "bucketCountsI",
                    c.i32_load(
                        c.i32_add(
                            c.getLocal("pBucketCounts"),
                            c.getLocal("i"),
                        )
                    ),
                ),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(
                        1,
                        c.i32_eq(
                            c.get_local("j"),
                            c.get_local("numBits"),
                        )
                    ),
                    c.call(
                        prefix + "_addAssignI32InMemoryUncheck",
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
            // Equivalent in C:
            //  for (size_t j = 2; j < num_bits + 1; ++j) {
            //      bit_offsets[j] += bit_offsets[j - 1];
            //  }
            c.setLocal("j", c.i32_const(2)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_gt_u(
                        c.getLocal("j"),
                        c.getLocal("numBits"),
                    )
                ),
                c.setLocal(
                    "pBitOffsetsJ",
                    c.i32_add(
                        c.getLocal("pBitOffsets"),
                        c.getLocal("j"),
                    ),
                ),
                c.i32_store(
                    c.getLocal("pBitOffsetsJ"),
                    c.i32_add(
                        c.i32_load(c.getLocal("pBitOffsetsJ")),
                        c.i32_load(
                            c.i32_sub(
                                c.getLocal("pBitOffsetsJ"),
                                c.i32_const(1),
                            ),
                        ),
                    ),
                ),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // Given a pointer `pScalar` to a specific scalar, a `scalarSize` indicating the number
    // of bytes of the scalar, `chunkSize` of the chunk size in bits, a `pointIdx` indicating
    // the index of `scalar` in the input scalar vector, a pointer `pPointSchedule` to a 2-d
    // array of point schedules, a pointer `pRoundCounts` to an array of the number of points
    // in each round, and `numPoint` indicating the number of points in the input vector,
    // this function initializes `pPointSchedule` and `pRoundCounts` for this point.
    function buildSinglePointComputeSchedule() {
        const f = module.addFunction(fnName + "_singlePointComputeSchedule");
        // Pointer to a specific scalar
        f.addParam("pScalars", "i32");
        // Number of bytes of the scalar
        f.addParam("scalarSize", "i32");
        // Chunk size in bits
        f.addParam("chunkSize", "i32");
        // Index of `scalar` in the input scalar vector
        f.addParam("pointIdx", "i32");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedule", "i32");
        // Pointer to an array of the number of points in each round
        f.addParam("pRoundCounts", "i32");
        // Number of points
        f.addParam("numPoint", "i32");
        // Extracted chunk from the scalar
        f.addLocal("chunk", "i32");
        // Bit to start extract
        f.addLocal("startBit", "i32");
        // Store pointIdx as i64
        f.addLocal("pointIdxI64", "i64");
        // Chunk Index
        f.addLocal("chunkIdx", "i32");
        // Number of bits of the scalar
        f.addLocal("scalarSizeInBit", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.setLocal(
                "pointIdxI64",
                c.i64_shl(
                    c.i64_extend_i32_u(
                        c.getLocal("pointIdx")
                    ),
                    c.i64_const(32),
                ),
            ),
            c.setLocal(
                "scalarSizeInBit",
                c.i32_shl(
                    c.getLocal("scalarSize"),
                    c.i32_const(3),
                ),
            ),
            // for(chunkIdx = 0; ; chunkIdx += 1) {
            //     startBit = chunkIdx*chunkSize;
            //     if (startBit >= scalarSizeInBit) {
            //         break;
            //     }
            //     i32 chunk = getChunk(pScalars, scalarSize, startBit, chunkSize);
            //     i32 idx = chunkIdx*numPoint + pointIdx;
            //     if chunk == 0 {
            //         pPointSchedule[idx] = 0xffffffffffffffffULL;
            //     } else {
            //         pPointSchedule[idx] = (pointIdxI64 << 32 || chunk as i64);
            //         pRoundCounts[chunkIdx] += 1;
            //     }
            // }
            c.setLocal("chunkIdx", c.i32_const(0)),
            c.block(c.loop(
                c.setLocal(
                    "startBit",
                    c.i32_mul(
                        c.getLocal("chunkIdx"),
                        c.getLocal("chunkSize"),
                    ),
                ),
                c.br_if(
                    1,
                    c.i32_ge_u(
                        c.getLocal("startBit"),
                        c.getLocal("scalarSizeInBit"),
                    )
                ),
                c.setLocal(
                    "chunk",
                    c.call(prefix + "_getChunk",
                        c.getLocal("pScalars"),
                        c.getLocal("scalarSize"),
                        c.getLocal("startBit"),
                        c.getLocal("chunkSize")
                    )
                ),
                c.setLocal(
                    "idx",
                    c.i32_shl(
                        c.i32_add(
                            c.i32_mul(
                                c.getLocal("chunkIdx"),
                                c.getLocal("numPoint"),
                            ),
                            c.getLocal("pointIdx"),
                        ),
                        c.i32_const(3),
                    ),
                ),
                c.if(
                    c.i32_eq(
                        c.getLocal("chunk"),
                        c.i32_const(0),
                    ),
                    c.i64_store(
                        c.getLocal("pPointSchedule"),
                        c.getLocal("idx"),
                        c.i64_const(-1), // -1 = 0xffffffffffffffff
                    ),
                    c.i64_store(
                        c.getLocal("pPointSchedule"),
                        c.getLocal("idx"),
                        c.i64_or(
                            c.getLocal("pointIdxI64"),
                            c.i64_extend_i32_u(
                                c.getLocal("chunk")
                            )
                        ),
                    ),
                ),
                c.if(
                    c.i32_ne(
                        c.getLocal("chunk"),
                        c.i32_const(0),
                    ),
                    c.call(prefix + "_addAssignI32InMemoryUncheck",
                        c.getLocal("pRoundCounts"),
                        c.getLocal("chunkIdx"),
                        c.i32_const(1),
                    ),
                ),
                c.setLocal("chunkIdx", c.i32_add(c.getLocal("chunkIdx"), c.getLocal(1))),
                c.br(0)
            )),
        );
    }

    // Given `pScalars` as a pointer to the input scalar vector, `numInitialPoints` as the number of 
    // points in the input point/scalar vector, and `scalarSize` as the number of bytes of the scalar,
    // this function computes a schedule of msm. This function is called once at the beginning of msm.
    // More specifically, this function computes two things:
    // `pPointSchedule`:
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
    function buildComputeSchedule() {
        const f = module.addFunction(fnName + "_computeSchedule");
        // Pointer to the input scalar vector
        f.addParam("pScalars", "i32");
        // Length of the input scalar vector
        f.addParam("numInitialPoints", "i32");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedule", "i32");
        // Pointer to an array of the number of points in each round
        f.addParam("pRoundCounts", "i32");
        // Number of bytes of the scalar
        f.addParam("scalarSize", "i32");
        // Chunk size in bits
        f.addParam("chunkSize", "i32");
        // Point Index
        f.addLocal("pointIdx", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.call(prefix + "_initializeI32",
                c.getLocal("pRoundCounts"),
                c.getLocal("numInitialPoints"),
                c.i32_const(0),
            ),
            // for (int pointIdx = 0; ; pointIdx++) {
            //     if(pointIdx == numInitialPoints) break;
            //     computeSchedule(
            //         pScalars,
            //         scalarSize,
            //         chunkSize,
            //         pointIdx,
            //         pPointSchedule,
            //         pRoundCounts,
            //         numInitialPoints,
            //     );
            // }
            c.setLocal("pointIdx", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("pointIdx"),
                        c.getLocal("numInitialPoints"),
                    )
                ),
                c.call(prefix + "_singlePointComputeSchedule",
                    f.getLocal("pScalars"),
                    f.getLocal("scalarSize"),
                    f.getLocal("chunkSize"),
                    f.getLocal("pointIdx"),
                    f.getLocal("pPointSchedule"),
                    f.getLocal("pRoundCounts"),
                    f.getLocal("numInitialPoints"),
                ),
                c.setLocal("pointIdx", c.i32_add(c.getLocal("pointIdx"), c.getLocal(1))),
                c.br(0)
            )),
        );
    }

    // Expected input:
    //      pPointSchedule: 2d array of shape num_round * num_point
    //      numPoint:  length of the input point vector
    //      
    // Expected Output:
    //      pMetadata: 2d array. Each row contains sorted metadata for a round
    //
    // This function ruterns the meta data array sorted by bucket.
    // For example:
    //      Input(N*8 bytes):  [meta_11, meta_12, …, meta_1n], meta_ij should be i64
    //      Output(N*8 bytes): sort by bucket index
    //              [(3, 0), (1, 0), (0, 0), 
    //              (0, 1), (1, 1), (3, 1), (2, 1), (4, 1),
    //              (0, 2), (3, 2)] 
    function buildOrganizeBucketsOneRound() {
        const f = module.addFunction(fnName + "_OrganizeBucketsOneRound");
        const c = f.getCodeBuilder();
        f.addParam("pPointSchedule", "i32");
        f.addParam("n", "i32");// number of points
        f.addParam("bucketNum", "i32"); // number of bucket
        // results
        f.addParam("pMetadata", "i32"); //output



        // // Auxiliary array, should be initailize to 0.
        f.addParam("pTableSize", "i32");// size:2^c * 32bit. The number of points in each bucket
        f.addParam("pBucketOffset", "i32");// size: 2^c * 32 bit. The offset of the i-th bucket in pMetadata
        f.addParam("pIndex", "i32");// size:  N * 32bit. Store the number of the bucket to which the i-th point belongs

        // // for debug
        f.addParam("debug_32", "i32");
        f.addParam("debug_64", "i32");


        f.addLocal("pointIdx", "i32");
        f.addLocal("bucketIdx", "i32");
        f.addLocal("pIdxTable", "i32");
        f.addLocal("pIdxBucketOffset", "i32");
        f.addLocal("tmp", "i32");
        f.addLocal("j", "i32");
        f.addLocal("n_i64", "i64");
        f.addLocal("j_i64", "i64");
        f.addLocal("metadata", "i64");

        f.addLocal("tmp1", "i32");
        f.addLocal("tmp2", "i32");
        f.addLocal("tmp3", "i32");
        f.addLocal("tmp4", "i32");
        f.addLocal("tmp5", "i32");

        // array iterator
        f.addLocal("itTableSize", "i32");
        f.addLocal("itBucketOffset", "i32");
        f.addLocal("itIndex", "i32");
        f.addLocal("itMetadata", "i32");
        f.addLocal("itPointSchedule", "i32");

        f.addCode(
            c.setLocal("j", c.i32_const(0)),
            c.setLocal("itIndex", c.getLocal("pIndex")),
            c.setLocal("itPointSchedule", c.getLocal("pPointSchedule")),
            // Traverse all the points and calculate the number of point in each bucket
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("j"),
                        c.getLocal("n")
                    )
                ),
                c.setLocal( // low 32 bit
                    "bucketIdx",
                    c.i32_wrap_i64(
                        c.i64_and(
                            c.i64_load(c.getLocal("itPointSchedule")),
                            c.i64_const(0xFFFFFFFF)
                        )
                    )
                ),

                c.i32_store( // store idx
                    c.getLocal("itIndex"),
                    c.getLocal("bucketIdx")
                ),

                // Find the corresponding bucket
                c.setLocal(
                    "pIdxTable",
                    c.i32_add(
                        c.getLocal("pTableSize"),
                        c.i32_mul(
                            //c.i32_sub(
                            c.getLocal("bucketIdx"),
                            //    c.i32_const(1)
                            //),
                            c.i32_const(4)
                        )
                    )
                ),
                // 把当前点对应的bucket数量+1
                c.i32_store(
                    c.getLocal("pIdxTable"),
                    //0,
                    c.i32_add(
                        //c.i32_const(4),  // 数量是1，占了4个byte，pTableSize实际上存的是多少字节
                        c.i32_const(1),  // 数量是1，占了4个byte，pTableSize实际上存的是多少字节
                        c.i32_load(
                            c.getLocal("pIdxTable"),
                            0
                        )
                    )
                ),
                c.setLocal("itPointSchedule", c.i32_add(c.getLocal("itPointSchedule"), c.i32_const(8))),
                c.setLocal("itIndex", c.i32_add(c.getLocal("itIndex"), c.i32_const(4))),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),


            // Now, we have point number in each bucket. (pTablesize)
            // The following code computes BuckerOffset.
            // 对bucket数量scan，就可以得到每一个bucket的偏移
            // pBucketOffset[0] =  pMetadata
            c.i32_store(
                c.getLocal("pBucketOffset"),
                c.getLocal("pMetadata")
            ),
            // pBucketOffset[j] = pBucketOffset[j-1] + pTableSize[j-1]  j>0
            // 从pBucketOffset[1]开始
            c.setLocal("itTableSize", c.getLocal("pTableSize")),
            c.setLocal("itBucketOffset", c.i32_add(c.getLocal("pBucketOffset"), c.i32_const(4))),
            c.setLocal("j", c.i32_const(1)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("j"),
                        c.getLocal("bucketNum")
                    )
                ),
                // should implement pBucketOffset[j] = pBucketOffset[j-1] + pTableSize[j] 
                c.i32_store(
                    c.getLocal("itBucketOffset"),
                    //c.i32_load(
                    c.i32_add(
                        c.i32_mul(
                            c.i32_load(c.getLocal("itTableSize")),
                            c.i32_const(8)// 8byte per elemnt in metadata
                        ),
                        c.i32_load(c.i32_sub(c.getLocal("itBucketOffset"), c.i32_const(4))),
                    )
                    //)
                ),
                c.setLocal("itTableSize", c.i32_add(c.getLocal("itTableSize"), c.i32_const(4))),
                c.setLocal("itBucketOffset", c.i32_add(c.getLocal("itBucketOffset"), c.i32_const(4))),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),

            // The following code computes pMetadata.
            // 再便利一遍所有的点，构建meta data ，同时对meta data进行排序（根据itBucketOffset放入相应位置）
            c.setLocal("itIndex", c.getLocal("pIndex")),
            c.setLocal("itMetadata", c.getLocal("pMetadata")),
            c.setLocal("j_i64", c.i64_const(0)),
            c.setLocal("n_i64", c.i64_extend_i32_u(c.getLocal("n"))),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i64_eq(
                        c.getLocal("j_i64"),
                        c.getLocal("n_i64")
                    )
                ),

                // get mem[itIndex], i32 --> i64
                c.setLocal("bucketIdx", c.i32_load(
                    c.getLocal("itIndex")
                )),

                // j 和 mem[itIndex]拼接得到64位meta data
                c.setLocal(
                    "metadata",
                    c.i64_or(
                        // j: point index
                        c.i64_shl(
                            c.getLocal("j_i64"),
                            c.i64_const(32)
                        ),
                        c.i64_extend_i32_u(c.getLocal("bucketIdx"))

                    )
                ),
                // 从BucketOffset中获得存储meta data的位置,并把BucketOffset[bucketIdx]加8 bytes
                c.setLocal(
                    "pIdxBucketOffset",//point to BucketOffset i-th element
                    c.i32_add(
                        c.getLocal("pBucketOffset"),
                        c.i32_mul(

                            c.getLocal("bucketIdx"),
                            c.i32_const(4)
                        )
                    )
                ),

                // 设置metadata[bucketIdx]的值
                c.setLocal("tmp",
                    c.i32_load(
                        c.getLocal("pIdxBucketOffset")
                    )),
                c.i64_store(
                    c.getLocal("tmp"),
                    0,
                    c.getLocal("metadata")
                ),
                // BucketOffset[bucketIdx]往后加8 bytes
                c.i32_store(
                    c.getLocal("pIdxBucketOffset"),
                    0,
                    c.i32_add(
                        c.i32_const(8),
                        c.getLocal("tmp")
                    )
                ),

                c.setLocal("itIndex", c.i32_add(c.getLocal("itIndex"), c.i32_const(4))),
                c.setLocal("itMetadata", c.i32_add(c.getLocal("itMetadata"), c.i32_const(8))),//Metadata是64位
                c.setLocal("j_i64", c.i64_add(c.getLocal("j_i64"), c.i64_const(1))),
                c.br(0)
            )),

        );
    }

    // TODO: Add Documents
    function buildConstructAdditionChains() {
        const f = module.addFunction(fnName + "_ConstructAdditionChains");
        // Pointer to 1d array of point schedules of a specific round
        // Assuming that point schedules have been sorted by the bucket index
        f.addParam("pPointSchedule", "i32");
        // Max number of points in a bucket
        f.addParam("maxCount", "i32");
        // Pointer to a 1d array of number of points in each bucket for a specific
        // round
        f.addParam("pTableSize", "i32");
        // Pointer to a 1d array of the starting index of the i^th bucket
        f.addParam("pBitoffset", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Max bucket bits
        f.addParam("maxBucketBits", "i32");
        // A 1d array of point schedules as the addition chains. Shape:
        f.addParam("pRes", "i32");

        f.addLocal("maxBucketBits", "i32");// 32 - leading zeros
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("k", "i32");
        f.addLocal("count", "i32");
        f.addLocal("num_bits", "i32");
        f.addLocal("current_offset", "i32");
        f.addLocal("k_end", "i32");
        f.addLocal("schedule", "i64"); // meta data
        f.addLocal("pResPointOffset", "i64");// pBitoffsetCopy中的值，也就是对应于pRes在哪
        f.addLocal("address", "i64");
        // Array
        f.addLocal("pBitoffsetCopy", "i32");
        // Array iterator
        f.addLocal("itBitoffetCopy", "i32");
        f.addLocal("itBitoffet", "i32");
        f.addLocal("itTableSize", "i32");
        f.addLocal("itPointSchedule", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // alloc memery
            // pBitoffsetCopy可以被释放
            c.setLocal("pBitoffsetCopy", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pBitoffsetCopy"),
                    c.i32_mul(
                        c.i32_add(
                            c.getLocal("nBucket"),
                            c.i32_const(1)
                        ),
                        c.i32_const(4)  //32bits, 4bytes
                    )
                )
            ),
            // if maxCount ==  00000001 00000001 00000001 00000001
            //    maxBucketBits = 32 - 7
            c.setLocal(
                "maxBucketBits",
                c.i32_sub(
                    c.i32_const(32),
                    c.i32_clz(
                        c.getLocal("maxCount")
                    )
                )
            ),
            // Equivalent in C:
            //      bit_offsets_copy[i] = state.bit_offsets[i];
            // also add bitoffset+pRes here
            c.setLocal("i", c.i32_const(0)),
            c.setLocal("itBitoffet", c.getLocal("pBitoffset")),
            c.setLocal("itBitoffetCopy", c.getLocal("pBitoffsetCopy")),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("nBucket")
                    )
                ),
                c.i32_store(
                    c.getLocal("itBitoffetCopy"),
                    c.i32_add(
                        c.i32_mul(
                            c.i32_load(c.getLocal("itBitoffet")),
                            c.i32_const(8) // 8 byte per element in pRes
                        ),
                        c.getLocal("pRes")
                    )
                ),
                c.setLocal("itBitoffetCopy", c.i32_add(c.getLocal("itBitoffetCopy"), c.i32_const(4))),
                c.setLocal("itBitoffet", c.i32_add(c.getLocal("itBitoffet"), c.i32_const(4))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            // Loop over all bucket
            c.setLocal("i", c.i32_const(0)),
            c.setLocal("itTableSize", c.getLocal("pTableSize")),
            c.setLocal("itPointSchedule", c.getLocal("pPointSchedule")),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("nBucket")
                    )
                ),
                // process j-th bucket
                c.setLocal(// 当前的桶有多少point
                    "count",
                    c.i32_load(
                        c.getLocal("itTableSize")
                    )
                ),
                c.setLocal(// count占了几位
                    "num_bits",
                    c.i32_sub(
                        c.i32_const(32),
                        c.i32_clz(
                            c.getLocal("count")
                        )
                    )
                ),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(
                        1,
                        c.i32_eq(
                            c.getLocal("j"),
                            c.getLocal("num_bits")
                        )
                    ),
                    // Loop over num_bits of one bucket
                    // C: current_offset = bit_offsets_copy[j];
                    c.setLocal(
                        "current_offset",
                        c.i32_load(
                            c.i32_add(
                                c.getLocal("pBitoffsetCopy"),
                                c.i32_mul(
                                    c.i32_const(4),
                                    c.getLocal("j")
                                )
                            )
                        )
                    ),
                    // C: k_end = count & (1UL << j)
                    c.setLocal(
                        "k_end",
                        i.i32_and(
                            c.getLocal("count"),
                            c.i32_shl(
                                c.i32_const(1),
                                c.getLocal("j")
                            )
                        )
                    ),
                    // k loop, default case
                    c.setLocal(
                        "k",
                        c.i32_const(0)
                    ),
                    c.block(c.loop(
                        c.br_if(
                            1,
                            c.i32_eq(
                                c.getLocal("k"),
                                c.getLocal("k_end")
                            )
                        ),
                        //schedule = state.point_schedule[schedule_it]
                        c.setLocal(
                            "schedule",//meta data
                            c.i64_load(
                                c.getLocal("itPointSchedule")
                            )
                        ),
                        // bitOffsetCopy[bucket index]
                        c.setLocal(
                            "pResPointOffset",//pBitoffsetCopy中的值，也就是对应于pRes在哪
                            c.i32_load(// bitOffsetCopy[bucket index]
                                c.teeLocal(
                                    "address",
                                    c.i32_add(
                                        c.i32_mul(
                                            c.i32_wrap_i64(
                                                c.i64_and( // bucket index
                                                    c.getLocal("schedule"),
                                                    c.i64_const(0xFFFFFFFF)
                                                )
                                            ),
                                            c.i32_const(4)
                                        ),
                                        c.getLocal("pBitoffsetCopy")
                                    )
                                )
                            )
                        ),
                        // bitOffsetCopy[bucket index]++
                        c.i32_store(
                            "address",
                            c.i32_add(
                                c.getLocal("pResPointOffset"),
                                c.i32_const(8) //一个元素8 byte
                            )
                        ),
                        // pRes[xxx] = meta data
                        c.i64_store(
                            c.getLocal("pResPointOffset"),
                            c.getLocal("schedule")
                        ),
                        c.setLocal("itPointSchedule", c.i32_add(c.getLocal("itPointSchedule"), c.i32_const(8))),
                        c.br(0)
                    )),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),
                c.setLocal("itTableSize", c.i32_add(c.getLocal("itTableSize"), c.i32_const(4))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            // free memory
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pBitoffsetCopy")
            )
        );
    }

    // TODO: Add Documents
    function buildEvaluateAdditionChains() {
        const f = module.addFunction(fnName + "_EvaluateAdditionChains");
        //f.addParam("pPointSchedule", "i32"); // point sorted by bucket index
        //f.addParam("maxCount", "i32"); // max point number in a bucket
        //f.addParam("pTableSize", "i32"); //bucket_counts, number of points in a bucket
        f.addParam("pBitoffset", "i32");
        f.addParam("numPoints", "i32"); // number of points
        f.addParam("handle_edge_cases", "i32"); // bool type
        f.addParam("max_bucket_bits", "i32");
        f.addParam("pPoint", "i32");// original point vectors
        // Schedule is an array like this:(pointIdx,bucketIdx)
        // sorted by bit index
        // [(3, 1, 0), (0, 1, 1),
        //  (1, 1, 0), (0, 0, 0), (0, 1, 2), (3, 1, 2),
        //  (1, 1, 1), (3, 0, 1), (2, 1, 1), (4, 0, 1)]
        f.addParam("pSchedule", "i32");
        // 1d array of `numPoint` points as the result.
        f.addParam("pRes", "i32"); // result array start point. size: N*8 byte

        f.addLocal("end", "i32");
        f.addLocal("points_in_round", "i32");
        f.addLocal("start", "i32");

        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("k", "i32");

        f.addCode(
            // end = state.num_points
            c.setLocal(
                "end",
                c.getLocal("n")
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("max_bucket_bits")
                    )
                ),

                //points_in_round = (state.num_points - state.bit_offsets[i + 1]) >> (i)
                c.setLocal(
                    "points_in_round",
                    c.i32_shr_u(
                        c.i32_sub(
                            c.getLocal("n"),
                            c.i32_load(
                                c.i32_add(
                                    c.i32_mul(
                                        c.i32_add(
                                            c.i32_const(1),
                                            c.getLocal(i)
                                        ),
                                        c.i32_const(4)
                                    ),
                                    c.getLocal("pBitoffset")
                                )
                            )
                        ),
                        c.getLocal("i")
                    )
                ),

                // TODO: 应该把_AddAffinePointspres和pPaire合并？
                c.call(prefix + "_RearrangePoints", c.getLocal("n"), c.getLocal("pPoint"), c.getLocal("pSchedule"), c.getLocal("pRes")),
                c.call(prefix + "_AddAffinePoints", c.getLocal("n"), c.getLocal("points_in_round"), c.getLocal("pRes")),

                // c.if(
                //     c.getLocal("handle_edge_cases"),
                //     [

                //         ...c.call(
                //             xxxx
                //         )
                //     ],
                //     [
                //         ...c.call(
                //             xxxx
                //         )
                //     ]
                // ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }

    // one round
    function buildAddAffinePoints() {
        const f = module.addFunction(fnName + "_AddAffinePoints");
        f.addParam("n", "i32"); //number of points
        f.addParam("pointsInRound", "i32")
        //f.addParam("pPoints", "i32");
        f.addParam("pPairs", "i32");// store in paires. memory layout: x1y1(384*2bits) x2y2 x3y3 ...
        f.addParam("pRes", "i32")


        // Array
        f.addLocal("pInverse", "i32"); // pointer to inverse array, n*n8g bytes 
        f.addLocal("pScratchSpace", "i32");// store x2-x1, x4-x3, ... n*n8g

        // Array ierator
        f.addLocal("itPairs", "i32");
        f.addLocal("itScratchSpace", "i32");
        f.addLocal("itInverse", "i32");
        f.addParam("itRes", "i32")


        f.addLocal("i", "i32");
        f.addLocal("start", "i32");// n - (number in a round)
        f.addLocal("step", "i32"); // step between two point, 384/8 * 2 * 2, (sizeof(x)) * (x,y) *(2 point)
        f.addLocal("x1", "i32"); //address
        f.addLocal("y1", "i32");
        f.addLocal("x2", "i32");
        f.addLocal("y2", "i32");
        const c = f.getCodeBuilder();
        const m = c.i32_const(module.alloc(n8g));
        const X3 = c.i32_const(module.alloc(n8g));

        f.addCode(
            // alloc memory
            c.setLocal("pScratchSpace", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pScratchSpace"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8g)  // should be 384/8
                    )
                )
            ),

            c.setLocal("pInverse", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pInverse"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8g)  // should be 384/8
                    )
                )
            ),

            // start= n-pointsInRound
            c.setLocal("start", c.i32_sub(c.getLocal("n"), c.getLocal("pointsInRound"))),
            // i= n-2
            c.setLocal("i", c.i32_sub(c.getLocal("n"), c.i32_const("i"))),
            c.setLocal(
                "itPairs",
                c.i32_add(
                    c.getLocal("pPairs"),
                    c.i32_mul(
                        c.getLocal("i"),
                        c.i32_const(n8g * 2)
                    )
                )
            ),

            // while(i>start){
            //  calculate res
            //}
            c.block(c.loop(
                c.br_if(1, c.i32_lt_u(c.getLocal("i"), c.getLocal("start"))),
                // find two points Idx to add
                // c.setLocal(
                //     "pointIdx1",
                //     c.i32_wrap_i64(
                //         c.i64_shr_u(
                //             c.i64_load(c.getLocal("itPairs")),
                //             c.i64_const(32)
                //         )
                //     )   
                // ),
                // c.setLocal("itPairs", c.i32_add(c.getLocal("itPairs"), c.i32_const(8))),// fetch second point 
                // c.setLocal(
                //     "pointIdx2",
                //     c.i32_wrap_i64(
                //         c.i64_shr_u(
                //             c.i64_load(c.getLocal("itPairs")),
                //             c.i64_const(32)
                //         )
                //     )   
                // ),
                c.setLocal("x1", c.getLocal("itPairs")),
                c.setLocal("y1", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8g))),
                c.setLocal("x2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8g * 2))),
                c.setLocal("y2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8g * 3))),

                // x2-x1
                c.setLocal(
                    "itScratchSpace",
                    c.i32_add(
                        c.getLocal("pScratchSpace"),
                        c.i32_mul(
                            c.i32_shl(
                                c.getLocal("i"),
                                c.i32_const(1)
                            ),
                            c.i32_const(n8g)
                        )
                    )
                ),
                // Store x2-x1/2y1 in pScratchSpace for batch inverse, y2-y1 in y2, x1+x2 in x1
                c.call(prefix + "_sub", c.getLocal("x2"), c.getLocal("x1"), c.getLocal("itScratchSpace")),
                c.if(
                    c.call(prefix + "_isZero", c.getLocal("itScratchSpace")),
                    [
                        c.call(prefix + "_sub", c.getLocal("y1"), c.getLocal("y1"), c.getLocal("itScratchSpace")),
                        c.call(prefix + "_zero", c.getLocal("y2")),// if x2-x1=0, store 0 in y2
                    ],
                ),
                c.call(prefix + "_add", c.getLocal("x2"), c.getLocal("x1"), c.getLocal("x2")),
                c.call(prefix + "_sub", c.getLocal("y2"), c.getLocal("y1"), c.getLocal("y1")),

                c.setLocal("itPairs", c.i32_sub(c.getLocal("itPairs"), c.i32_const(n8g * 2 * 2))),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(2))),
                c.br(0)
            )),

            c.setLocal( // inverse start address
                "itInverse",
                c.i32_add(
                    c.getLocal("pPairs"),
                    c.i32_mul(
                        c.getLocal("start"),
                        c.i32_const(n8g * 2)
                    )
                )
            ),

            // get 1/(x2-x1), 1/(x4-x3), ...
            c.call(
                prefix + "_batchInverse",
                c.getLocal("itInverse"),
                c.i32_const(n8g),
                c.i32_shl(c.getLocal("pointsInRound"), c.i32_const(1)),
                c.getLocal("pInverse"),
                c.i32_const(n8g)
            ),



            // i= n-2
            c.setLocal("i", c.i32_sub(c.getLocal("n"), c.i32_const(2))),
            c.setLocal("itPairs", c.i32_add(c.getLocal("pPairs"), c.i32_mul(c.getLocal("i"), c.i32_const(n8g * 2)))),
            c.setLocal("itRes", c.i32_add(c.getLocal("pPairs"), c.i32_mul(c.i32_sub(c.getLocal("n"), c.i32_const(1)), c.i32_const(n8g * 2)))), // point to last element
            c.setLocal(
                "itInverse",
                c.i32_add(
                    c.getLocal("pInverse"),
                    c.i32_mul(
                        c.i32_shl(
                            c.getLocal("i"),
                            c.i32_const(1)
                        ),
                        c.i32_const(n8g)
                    )
                )
            ),

            // while(i>start){
            //  store res
            //}
            c.block(c.loop(
                c.br_if(1, c.i32_lt_u(c.getLocal("i"), c.getLocal("start"))),
                c.setLocal("x1", c.getLocal("itPairs")),//x1
                c.setLocal("y1", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8g))),//y1
                c.setLocal("x2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8g * 2))),//x1+x2
                c.setLocal("y2", c.i32_add(c.getLocal("itPairs"), c.i32_const(n8g * 3))),//y2-y1


                c.if(
                    c.call(prefix + "_isZero", c.getLocal("y2")),
                    // m = 3x^2+a / 2y1.  
                    // a==0 in BLS12381
                    [
                        ...c.call(
                            prefix + "_square",
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
                            prefix + "_mul",
                            c.getLocal("y2"),
                            c.getLocal("itInverse"),
                            M
                        ),

                    ]
                ),
                // store x3  
                // x3 = m^2 - x1 - x2

                c.call(prefix + "_square", M, M_square),
                c.call(prefix + "_sub", M_square, c.getLocal("x2"), "itRes"),
                // store y3
                // y3 = m * (x1 - x3) - y1
                c.call(prefix + "_sub", c.getLocal("x1"), c.getLocal("itRes"), X1_MINUS_X3),
                c.call(prefix + "_mul", M, X1_MINUS_X3, X1_MINUS_X3_MUL_M),
                c.call(prefix + "_sub", X1_MINUS_X3_MUL_M, c.getLocal("y1"), c.i32_add(c.getLocal("itRes"), c.i32_const(n8g))),

                c.setLocal("itPairs", c.i32_sub(c.getLocal("itPairs"), c.i32_const(n8g * 2 * 2))),
                c.setLocal("itRes", c.i32_sub(c.getLocal("itRes"), c.i32_const(n8g * 2))),// store one element each time
                c.setLocal("itScratchSpace", c.i32_sub(c.getLocal("itScratchSpace"), c.i32_const(n8g))),
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

    function buildRearrangePoints() {
        const f = module.addFunction(fnName + "_RearrangePoints");
        f.addParam("n", "i32");// number of points
        f.addParam("pPoint", "i32");// original point vectors
        // Schedule is an array like this:(pointIdx,bucketIdx)
        // sorted by bit index
        // [(3, 1, 0), (0, 1, 1),
        //  (1, 1, 0), (0, 0, 0), (0, 1, 2), (3, 1, 2),
        //  (1, 1, 1), (3, 0, 1), (2, 1, 1), (4, 0, 1)]
        f.addParam("pSchedule", "i32");
        // reschedule the points based on Schedule, copy results in the new memory.
        f.addParam("pRes", "i32");

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
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                // get src point address based on itSchedule
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
                            c.i32_const(n8g * 2)
                        )
                    )
                ),
                // copy to the new momory
                // copy x
                c.call(prefix + "_copy", c.getLocal("pointSrc"), c.getLocal("itRes")),
                // copy y
                c.call(prefix + "_copy", c.getLocal("pointSrc"), c.i32_add(c.getLocal("itRes"), c.i32_const(n8g))),

                c.setLocal("itSchedule", c.i32_add(c.getLocal("itSchedule"), c.i32_const(8))),
                c.setLocal("itRes", c.i32_add(c.getLocal("itRes"), c.i32_const(n8g * 2))),// one point
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),

        );

    }

    function buildGetChunk() {
        const f = module.addFunction(fnName + "_getChunk");
        f.addParam("pScalar", "i32");
        f.addParam("scalarSize", "i32");  // Number of bytes of the scalar
        f.addParam("startBit", "i32");  // Bit to start extract
        f.addParam("chunkSize", "i32");  // Chunk size in bits
        f.addLocal("bitsToEnd", "i32");
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
                c.setLocal(
                    "mask",
                    c.i32_sub(
                        c.i32_shl(
                            c.i32_const(1),
                            c.getLocal("bitsToEnd")
                        ),
                        c.i32_const(1)
                    )
                ),
                c.setLocal(
                    "mask",
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
                            )
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

    // Given a number `n`, counts the number of significant bits.
    // For example, if n = 5 (i.e., 00000000000000000000000000000101), the output is 2
    function buildGetMSB() {
        const f = module.addFunction(fnName + "_getMsb");
        f.addParam("n", "i32");
        c.setReturnType("i32");
        c.i32_sub(
            c.i32_const(31),
            c.i32_clz(c.getLocal("n")),
        );
    }

    // TODO
    function buildReduceBuckets() {
        const f = module.addFunction(fnName + "_reduceBuckets");
        // Pointer to the input point vector
        f.addParam("pPoints", "i32");
        // Pointer to a 1-d array of point schedules for a specific round
        f.addParam("pPointSchedule", "i32");
        // TODO. Update interface
        f.addParam("maxCount", "i32");
        // Pointer to a 1d array of number of points in each bucket for a specific
        // round
        // TODO: Consider not cache this. This keeps changing for each reduce_bucket. It should be computed on-the-fly in construct_addition_chain
        f.addParam("pTableSize", "i32");
        // Pointer to a 1d array of the starting index of the i^th bucket
        f.addParam("pBitOffset", "i32");
        // Length of the input point vector
        f.addParam("numPoints", "i32");
        // Number of buckets
        f.addParam("numBuckets", "i32");
        // Pointer to a 1-d array of point schedules for a specific round
        // This stores the processed point schedules from `ConstructAdditionChains`.
        f.addParam("pPointScheduleAlt", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addParam("pPointPairs1", "i32");
        // Pointer to a 1-d array of G1 points as the scratch space. Lengh: numPoints
        f.addParam("pPointPairs2", "i32");
        // Pointer to the output buckets
        f.addParam("pOutputBuckets", "i32");
        // Max bucket bits
        f.addLocal("maxBucketBits", "i32");
        //
        f.addLocal("start", "i32");
        // Index
        f.addLocal("i", "i32");
        // Index
        f.addLocal("j", "i32");
        //
        f.addLocal("pointsInRound", "i32");
        // &pBitOffset[i+1]
        f.addLocal("pBitOffsetIPlusOne", "i32");
        // 
        f.addLocal("numBits", "i32");
        //
        f.addLocal("pCount", "i32");
        // Number of points in a single bucket
        f.addLocal("newBucketCount", "i32");
        //
        f.addLocal("pCurrentOffset", "i32");
        // Indicator
        f.addLocal("hasEntry", "i32");
        c.setReturnType("i32");
        const c = f.getCodeBuilder();
        f.addCode(
            c.call(prefix + "_ConstructAdditionChains",
                c.getLocal("pPointSchedule"),
                c.getLocal("maxCount", "i32"),
                c.getLocal("pTableSize", "i32"),
                c.getLocal("pBitOffset", "i32"),
                c.getLocal("numPoints", "i32"),
                c.getLocal("numBuckets", "i32"),
                c.getLocal("maxBucketBits", "i32"),
                c.getLocal("pPointScheduleAlt", "i32"),
            ),
            c.if(
                c.i32_eq(c.getLocal("maxBucketBits"), c.i32_const(0)),
                c.ret(c.getLocal("pPointPairs1")),
            ),
            c.call(prefix + "_EvaluateAdditionChains",
                c.getLocal("pBitOffset"),
                c.getLocal("numPoints"),
                c.i32_const(0), // Default for handling edge cases
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
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("maxBucketBits")
                    )
                ),
                c.setLocal("pBitOffsetIPlusOne",
                    c.i32_add(
                        c.getLocal("pBitOffset"),
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
            //     numBits = getMsb(*pCount) + 1;
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
                c.br_if(
                    1,
                    c.i32_eq(c.getLocal("i"), c.getLocal("numBuckets")),
                ),
                c.setLocal("pCount",
                    c.i32_add(
                        c.getLocal("pBucketCounts"),
                        c.i32_shl(
                            c.getLocal("i"),
                            c.i32_const(2),
                        ),
                    ),
                ),
                c.setLocal("numBits",
                    c.i32_add(
                        c.call(prefix + "_getMsb", c.i32_load(c.getLocal("pCount"))),
                        c.i32_const(1),
                    ),
                ),
                c.setLocal("newBucketCount", c.i32_const(0)),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(
                        1,
                        c.getLocal("numBits"),
                    ),
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
                            ...c.i64_store(
                                c.i32_add(
                                    c.getLocal("pPointScheduleAlt"),
                                    c.i32_shl(
                                        c.getLocal("numPoints"),
                                        c.i32_const(3),
                                    ),
                                ),
                                c.i64_add(
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
            c.ret(c.call(prefix + "_reduceBuckets",
                c.getLocal("pPointPairs1"),
                c.getLocal("pPointScheduleAlt"),
                c.getLocal("maxCount"),
                c.getLocal("pTableSize"), // TODO
                c.getLocal("pBitOffset"),
                c.getLocal("numPoints"),
                c.getLocal("numBuckets"),
                c.getLocal("pPointSchedule"),
                c.getLocal("pPointPairs2"),
                c.getLocal("pPointPairs1"),
                c.getLocal("pOutputBuckets"),
            )),
        );
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

    // Computes MSM over all chunks and sets the output pointed by `pResult`.
    function buildMutiexpChunks() {
        const f = module.addFunction(fnName + "_multiExpChunks");
        // Pointer to a 2-d array of point schedules
        f.addParam("pPointSchedule", "i32");
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
                c.call(prefix + "_allocateMemory",
                    c.i32_mul(
                        c.getLocal("numBuckets"),
                        c.i32_const(n8g),
                    ),
                ),
            ),
            c.setLocal(
                "pAccumulator",
                c.call(prefix + "_allocateMemory",
                    c.i32_const(n8g),
                ),
            ),
            c.call(prefix + "_zero", c.getLocal("pAccumulator")),
            c.call(prefix + "_zero", c.getLocal("pResult")),
            c.setLocal(
                "pRunningSum",
                c.call(prefix + "_allocateMemory",
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
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("roundIdx"),
                        c.getLocal("numChunks"),
                    ),
                ),
                c.call(prefix + "_reduceBuckets",
                    c.i32_add(
                        c.i32_add(
                            c.getLocal("pPointSchedule"),
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
                    c.br_if(
                        1,
                        c.i32_eq(
                            c.getLocal("k"),
                            c.i32_const(-1),
                        ),
                    ),
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
        f.addLocal("pPointSchedule", "i32");
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
                c.call(prefix + "_getOptimalBucketWidth",
                    c.getLocal("numPoints"),
                ),
            ),
            c.setLocal(
                "numChunks",
                c.call(prefix + "_getNumChunks",
                    c.getLocal("scalarSize"),
                    c.getLocal("chunkSize"),
                ),
            ),
            c.setLocal(
                "numBuckets",
                c.call(prefix + "_getNumBuckets",
                    c.getLocal("numPoints"),
                ),
            ),
            // TODO: 
            // Allocates a 2-d array for point schedule.
            c.setLocal("pPointSchedule", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pPointSchedule"),
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
            f.call(prefix + "_computeSchedule",
                c.getLocal("pScalars"),
                c.getLocal("numPoints"),
                c.getLocal("pPointSchedule"),
                c.getLocal("pRoundCounts"),
                c.getLocal("scalarSize"),
                c.getLocal("chunkSize"),
            ),
            // TODO: Sync with Xu
            c.call(prefix + "_OrganizeBuckets",
                c.getLocal("pPointSchedule"),
                c.getLocal("pMetadata"),
                c.getLocal("numPoints"),
                c.getLocal("numBuckets"),
            ),
            c.call(prefix + "_multiExpChunks",
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
                c.getLocal("pPointSchedule"),
            )
        );
    }

    function buildMutiexpChunk_Old() {
        const f = module.addFunction(fnName + "_chunk");
        f.addParam("pBases", "i32");
        f.addParam("pScalars", "i32");
        f.addParam("scalarSize", "i32");  // Number of points
        f.addParam("n", "i32");  // Number of points
        f.addParam("startBit", "i32");  // bit where it starts the chunk
        f.addParam("chunkSize", "i32");  // bit where it starts the chunk
        f.addParam("pr", "i32");
        f.addLocal("nChunks", "i32");
        f.addLocal("itScalar", "i32");
        f.addLocal("endScalar", "i32");
        f.addLocal("itBase", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("nTable", "i32");
        f.addLocal("pTable", "i32");
        f.addLocal("idx", "i32");
        f.addLocal("pIdxTable", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.i32_eqz(c.getLocal("n")),
                [
                    ...c.call(prefix + "_zero", c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),
            // Allocate memory
            c.setLocal(
                "nTable",
                c.i32_shl(
                    c.i32_const(1),
                    c.getLocal("chunkSize")
                )
            ),
            c.setLocal("pTable", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pTable"),
                    c.i32_mul(
                        c.getLocal("nTable"),
                        c.i32_const(n8g)
                    )
                )
            ),

            // Reset Table
            c.setLocal("j", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("j"),
                        c.getLocal("nTable")
                    )
                ),

                c.call(
                    prefix + "_zero",
                    c.i32_add(
                        c.getLocal("pTable"),
                        c.i32_mul(
                            c.getLocal("j"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),

            // Distribute elements
            c.setLocal("itBase", c.getLocal("pBases")),
            c.setLocal("itScalar", c.getLocal("pScalars")),
            c.setLocal("endScalar",
                c.i32_add(
                    c.getLocal("pScalars"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.getLocal("scalarSize")
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("itScalar"),
                        c.getLocal("endScalar")
                    )
                ),

                c.setLocal(
                    "idx",
                    c.call(prefix + "_getChunk",
                        c.getLocal("itScalar"),
                        c.getLocal("scalarSize"),
                        c.getLocal("startBit"),
                        c.getLocal("chunkSize")
                    )
                ),

                c.if(
                    c.getLocal("idx"),
                    [
                        ...c.setLocal(
                            "pIdxTable",
                            c.i32_add(
                                c.getLocal("pTable"),
                                c.i32_mul(
                                    c.i32_sub(
                                        c.getLocal("idx"),
                                        c.i32_const(1)
                                    ),
                                    c.i32_const(n8g)
                                )
                            )
                        ),
                        ...c.call(
                            opAdd,
                            c.getLocal("pIdxTable"),
                            c.getLocal("itBase"),
                            c.getLocal("pIdxTable"),
                        )
                    ]
                ),

                c.setLocal("itScalar", c.i32_add(c.getLocal("itScalar"), c.getLocal("scalarSize"))),
                c.setLocal("itBase", c.i32_add(c.getLocal("itBase"), c.i32_const(n8b))),
                c.br(0)
            )),

            c.call(prefix + "_reduceTable", c.getLocal("pTable"), c.getLocal("chunkSize")),
            c.call(
                prefix + "_copy",
                c.getLocal("pTable"),
                c.getLocal("pr")
            ),


            c.i32_store(
                c.i32_const(0),
                c.getLocal("pTable")
            )

        );
    }

    function buildMultiexp_Old() {
        const f = module.addFunction(fnName);
        f.addParam("pBases", "i32");
        f.addParam("pScalars", "i32");
        f.addParam("scalarSize", "i32");  // Number of points
        f.addParam("n", "i32");  // Number of points
        f.addParam("pr", "i32");
        f.addLocal("chunkSize", "i32");
        f.addLocal("nChunks", "i32");
        f.addLocal("itScalar", "i32");
        f.addLocal("endScalar", "i32");
        f.addLocal("itBase", "i32");
        f.addLocal("itBit", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("nTable", "i32");
        f.addLocal("pTable", "i32");
        f.addLocal("idx", "i32");
        f.addLocal("pIdxTable", "i32");
        const c = f.getCodeBuilder();
        const aux = c.i32_const(module.alloc(n8g));
        f.addCode(
            c.call(prefix + "_zero", c.getLocal("pr")),
            c.if(
                c.i32_eqz(c.getLocal("n")),
                c.ret([])
            ),
            c.setLocal(
                "chunkSize",
                c.call(prefix + "_getOptimalBucketWidth", c.getLocal("n")),
            ),
            c.setLocal(
                "nChunks",
                c.i32_add(
                    c.i32_div_u(
                        c.i32_sub(
                            c.i32_shl(
                                c.getLocal("scalarSize"),
                                c.i32_const(3)
                            ),
                            c.i32_const(1)
                        ),
                        c.getLocal("chunkSize")
                    ),
                    c.i32_const(1)
                )
            ),
            // Allocate memory
            c.setLocal(
                "itBit",
                c.i32_mul(
                    c.i32_sub(
                        c.getLocal("nChunks"),
                        c.i32_const(1)
                    ),
                    c.getLocal("chunkSize")
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_lt_s(
                        c.getLocal("itBit"),
                        c.i32_const(0)
                    )
                ),

                // Double nChunk times
                c.if(
                    c.i32_eqz(c.call(prefix + "_isZero", c.getLocal("pr"))),
                    [
                        ...c.setLocal("j", c.i32_const(0)),
                        ...c.block(c.loop(
                            c.br_if(
                                1,
                                c.i32_eq(
                                    c.getLocal("j"),
                                    c.getLocal("chunkSize")
                                )
                            ),

                            c.call(prefix + "_double", c.getLocal("pr"), c.getLocal("pr")),

                            c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                            c.br(0)
                        ))
                    ]
                ),

                c.call(
                    fnName + "_chunk",
                    c.getLocal("pBases"),
                    c.getLocal("pScalars"),
                    c.getLocal("scalarSize"),
                    c.getLocal("n"),
                    c.getLocal("itBit"),
                    c.getLocal("chunkSize"),
                    aux
                ),

                c.call(
                    prefix + "_add",
                    c.getLocal("pr"),
                    aux,
                    c.getLocal("pr")
                ),
                c.setLocal("itBit", c.i32_sub(c.getLocal("itBit"), c.getLocal("chunkSize"))),
                c.br(0)
            ))
        );
    }

    function buildReduceTable_Old() {
        const f = module.addFunction(fnName + "_reduceTable");
        f.addParam("pTable", "i32");
        f.addParam("p", "i32");  // Number of bits of the table
        f.addLocal("half", "i32");
        f.addLocal("it1", "i32");
        f.addLocal("it2", "i32");
        f.addLocal("pAcc", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.i32_eq(c.getLocal("p"), c.i32_const(1)),
                c.ret([])
            ),
            c.setLocal(
                "half",
                c.i32_shl(
                    c.i32_const(1),
                    c.i32_sub(
                        c.getLocal("p"),
                        c.i32_const(1)
                    )
                )
            ),

            c.setLocal("it1", c.getLocal("pTable")),
            c.setLocal(
                "it2",
                c.i32_add(
                    c.getLocal("pTable"),
                    c.i32_mul(
                        c.getLocal("half"),
                        c.i32_const(n8g)
                    )
                )
            ),
            c.setLocal("pAcc",
                c.i32_sub(
                    c.getLocal("it2"),
                    c.i32_const(n8g)
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("it1"),
                        c.getLocal("pAcc")
                    )
                ),
                c.call(
                    prefix + "_add",
                    c.getLocal("it1"),
                    c.getLocal("it2"),
                    c.getLocal("it1")
                ),
                c.call(
                    prefix + "_add",
                    c.getLocal("pAcc"),
                    c.getLocal("it2"),
                    c.getLocal("pAcc")
                ),
                c.setLocal("it1", c.i32_add(c.getLocal("it1"), c.i32_const(n8g))),
                c.setLocal("it2", c.i32_add(c.getLocal("it2"), c.i32_const(n8g))),
                c.br(0)
            )),

            c.call(
                fnName + "_reduceTable",
                c.getLocal("pTable"),
                c.i32_sub(
                    c.getLocal("p"),
                    c.i32_const(1)
                )
            ),

            c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
            c.block(c.loop(
                c.br_if(1, c.i32_eqz(c.getLocal("p"))),
                c.call(prefix + "_double", c.getLocal("pAcc"), c.getLocal("pAcc")),
                c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
                c.br(0)
            )),

            c.call(prefix + "_add", c.getLocal("pTable"), c.getLocal("pAcc"), c.getLocal("pTable"))
        );
    }

    // buildAddAffinePoints();
    // buildAddAssignI32InMemoryUncheck();
    // buildAllocateMemory();
    // buildComputeSchedule();
    // buildConstructAdditionChains();
    // buildCountBits();
    // buildEvaluateAdditionChains();
    // buildGetChunk();
    // buildGetNumBuckets();
    // buildGetNumChunks();
    // buildGetOptimalChunkWidth();
    // buildInitializeI32();
    // buildInitializeI64();
    // buildMultiexp();
    // buildMutiexpChunks();
    buildOrganizeBucketsOneRound();
    // buildRearrangePoints();
    // buildReduceTable();
    // buildReduceBuckets();
    // buildSinglePointComputeSchedule();

    //module.exportFunction(fnName);
    //module.exportFunction(fnName + "_chunk");
    module.exportFunction(fnName + "_OrganizeBucketsOneRound");
};
