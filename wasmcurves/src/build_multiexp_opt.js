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
                c.call(fnName + "_getOptimalBucketWidth", c.getLocal("num"))
            ),
        );
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
        f.addLocal("pBitOffsetsJPlusOne", "i32");
        const c = f.getCodeBuilder();
        f.addCode(
            // Initializes pBitOffsets[i] = 0 for 0 <= i <= numBits
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_gt_u(
                        c.get_local("i"),
                        c.get_local("numBits"),
                    ),
                ),
                c.i32_store(
                    c.i32_add(
                        c.getLocal("pBitOffsets"),
                        c.getLocal("i"),
                    ),
                    c.i32_const(0),
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0),
            )),
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
                    c.setLocal(
                        "pBitOffsetsJPlusOne",
                        c.i32_add(
                            c.getLocal("pBitOffsets"),
                            c.i32_add(
                                c.getLocal("j"),
                                c.i32_const(1),
                            ),
                        ),
                    ),
                    // bit_offsets[j + 1] += (bucket_counts[i] & (1U << j));
                    c.i32_store(
                        c.getLocal("pBitOffsetsJPlusOne"),
                        c.i32_add(
                            c.i32_load(c.getLocal("pBitOffsetsJPlusOne")),
                            c.i32_and(
                                c.getLocal("bucketCountsI"),
                                c.i32_shl(
                                    c.i32_const(1),
                                    c.getLocal("j"),
                                ),
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
                    )

                ),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
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

    function buildMutiexpChunk() {
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
                    c.call(fnName + "_getChunk",
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

            c.call(fnName + "_reduceTable", c.getLocal("pTable"), c.getLocal("chunkSize")),
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

    function buildMultiexp() {
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

    function buildReduceTable() {
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

    function buildMyBatchAffineMergeBLS12381() {
        const f = module.addFunction(prefix + "_MyBatchAffineMergeBLS12381");
        //console.log(prefixField); f1m
        //console.log(prefix); g1m
        f.addParam("pIn1", "i32");
        f.addParam("pIn2", "i32");
        f.addParam("n", "i32");
        f.addParam("pOut", "i32");

        f.addLocal("pAux", "i32");
        f.addLocal("itIn1", "i32");
        f.addLocal("itIn2", "i32");
        f.addLocal("itAux", "i32");
        f.addLocal("itOut", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const tmp = c.i32_const(module.alloc(n8));
        const tmp2 = c.i32_const(module.alloc(n8));

        const Y2 = c.i32_const(module.alloc(n8));
        const Y1 = c.i32_const(module.alloc(n8));
        const X1 = c.i32_const(module.alloc(n8));
        const M = c.i32_const(module.alloc(n8));
        const X3 = c.i32_const(module.alloc(n8));
        const Y3 = c.i32_const(module.alloc(n8));
        const X1_square = c.i32_const(module.alloc(n8));
        const X1_squareX1_square = c.i32_const(module.alloc(n8));
        const X1_squareX1_squareX1_square = c.i32_const(module.alloc(n8));
        const Y2_MINUS_Y1 = c.i32_const(module.alloc(n8));
        const M_square = c.i32_const(module.alloc(n8));
        const M_square_MINUS_X1 = c.i32_const(module.alloc(n8));
        const M_square_MINUS_X1_X2 = c.i32_const(module.alloc(n8));
        const X1_MINUS_X3 = c.i32_const(module.alloc(n8));
        const X1_MINUS_X3_MUL_M = c.i32_const(module.alloc(n8));

        // f.addCode(
        //     c.call(prefixField + "_add", c.getLocal("itIn2"), c.getLocal("itIn2"), c.i32_add(c.getLocal("pOut"), c.i32_const(n8)))
        // );
        // f.addCode(
        //     c.call(prefixField + "_add", c.getLocal("itIn2"), c.getLocal("itIn2"), c.getLocal("pOut"))
        // );


        f.addCode(
            c.setLocal("pAux", c.i32_load(c.i32_const(0))),
            c.setLocal("itAux", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pAux"),
                    c.i32_mul(c.getLocal("n"), c.i32_const(n8 * 2))
                )
            ),
            c.setLocal("itIn1", c.getLocal("pIn1")),
            c.setLocal("itIn2", c.getLocal("pIn2")),
            c.setLocal("itOut", c.getLocal("pOut")),
            c.setLocal("i", c.i32_const(0)),

            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("n"))),

                // x2 - x1
                c.call(prefixField + "_sub", c.getLocal("itIn1"), c.getLocal("itIn2"), c.getLocal("itAux")),
                c.setLocal("itIn1", c.i32_add(c.getLocal("itIn1"), c.i32_const(n8 * 2))),
                c.setLocal("itIn2", c.i32_add(c.getLocal("itIn2"), c.i32_const(n8 * 2))),
                c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),

            // pAux-------itAux
            c.call(
                prefixField + "_batchInverse",
                c.getLocal("pAux"),
                c.i32_const(n8),
                c.getLocal("n"),
                c.getLocal("itAux"),
                c.i32_const(n8)
            ),


            //c.setLocal("itAux", c.getLocal("pAux")),
            c.setLocal("itIn1", c.getLocal("pIn1")),
            c.setLocal("itIn2", c.getLocal("pIn2")),

            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("n"))),


                c.if(
                    c.call(prefixField + "_isZero", c.getLocal("itAux")),
                    // m = 3x^2+a / 2y1.  
                    // a==0 in BLS12381
                    [
                        ...c.call(
                            prefixField + "_square",
                            c.getLocal("itIn1"),
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
                            c.getLocal("itAux"),
                            M,
                        ),

                    ],
                    // m = y2-y1 / (x2-x1)
                    [
                        ...c.call(
                            prefixField + "_sub",
                            c.i32_add(c.getLocal("itIn2"), c.i32_const(n8)),
                            c.i32_add(c.getLocal("itIn1"), c.i32_const(n8)),
                            Y2_MINUS_Y1,
                        ),
                        ...c.call(
                            prefixField + "_mul",
                            Y2_MINUS_Y1,
                            c.getLocal("itAux"),
                            M
                        ),

                    ]
                ),
                // store x3  
                // x3 = m^2 - x1 - x2

                c.call(prefixField + "_square", M, M_square),
                c.call(prefixField + "_sub", M_square, c.getLocal("itIn1"), M_square_MINUS_X1),
                c.call(prefixField + "_sub", M_square_MINUS_X1, c.getLocal("itIn2"), c.getLocal("itOut")),
                // store y3
                // y3 = m * (x1 - x3) - y1
                c.call(prefixField + "_sub", c.getLocal("itIn1"), c.getLocal("itOut"), X1_MINUS_X3),
                c.call(prefixField + "_mul", M, X1_MINUS_X3, X1_MINUS_X3_MUL_M),
                c.call(prefixField + "_sub", X1_MINUS_X3_MUL_M, c.i32_add(c.getLocal("itIn1"), c.i32_const(n8)), c.i32_add(c.getLocal("itOut"), c.i32_const(n8))),

                c.setLocal("itIn1", c.i32_add(c.getLocal("itIn1"), c.i32_const(n8 * 2))),
                c.setLocal("itIn2", c.i32_add(c.getLocal("itIn2"), c.i32_const(n8 * 2))),
                c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(n8 * 2))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),

            c.i32_store(
                c.i32_const(0),
                c.getLocal("pAux")
            )
        );
    }

    function buildGetRoundNum() {
        const f = module.addFunction(fnName + "_roundNum");
        f.addParam("pTabelSize", "i32"); // point to  bucketSize
        f.addParam("n", "i32"); // number of bucket, nTable 
        f.addLocal("itTableSize", "i32");
        f.addLocal("i", "i32");
        f.addLocal("currentSize", "i32");
        f.addLocal("maxSize", "i32");
        f.setReturnType("i32");

        f.addCode(
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),
                // should implement pBucketOffset[j] = pBucketOffset[j-1] + pTableSize[j] 

                // currentSize - leading zero numbers
                // clz(00000000_10000000_00000000_00000000) == 8
                c.setLocal("currentSize",
                    c.i32_sub(
                        c.i32_const(32),
                        c.i32_clz(
                            c.i32_load(c.getLocal("itTableSize"))
                        )
                    )
                ),

                c.if(
                    c.i32_gt_u(
                        c.getLocal("currentSize"),
                        c.getLocal("maxSize")
                    ),
                    c.setLocal("maxSize", c.getLocal("currentSize"))
                ),


                c.setLocal("itTableSize", c.i32_add(c.getLocal("itTableSize"), c.i32_const(4))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            c.getLocal("maxSize")
        );
    }

    function buildGetBitOffset() {
        // 遍历pTabelSize中每一个数roundNum轮，每一轮将对应的bitOffset+1
        // bitoffset 的长度为 1+roundNum
        // 返回类似于[0, 2, 6, 10]这样的数组
        const f = module.addFunction(fnName + "_bitOffset");
        f.addParam("pTabelSize", "i32"); // point to  bucketSize
        f.addParam("n", "i32"); // number of bucket, nTable
        f.addParam("pOut", "i32");// 结果的开始地址，结尾是pBitOffset+n*4
        f.addParam("roundNum", "i32");
        f.addLocal("itTableSize", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("currentSize", "i32");
        f.addLocal("maxSize", "i32");
        f.addLocal("pResIdx", "i32");//累加bitoffset哪一个位置

        f.addCode(
            c.block(c.loop(
                c.br_if( //遍历所有的bucket
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                //获得当前bucket中点的数目
                c.setLocal("currentSize",  //例如，currentSize==7,   111
                    c.i32_load(c.getLocal("itTableSize"))
                ),

                c.setLocal("j", c.i32_sub(c.getLocal("roundNum"), c.i32_const(1))),
                c.block(c.loop(//遍历这个数目所有的bit，bitoffset相应位置加1
                    c.br_if(1, c.i32_eqz(c.getLocal("j"))),

                    c.if(
                        c.i32_ne(
                            c.i32_const(0),
                            c.i32_and(
                                c.i32_shl(i32_const(1), c.getLocal("j")),
                                c.getLocal("currentSize")
                            )
                        ),
                        // 为1，需要累加
                        [
                            ...c.setLocal(//获得对应的位置
                                "pResIdx",
                                c.i32_add(
                                    c.getLocal("pOut"),
                                    c.i32_mul(
                                        c.i32_const(4),//i32
                                        c.getLocal("j")
                                    )
                                )
                            ),
                            // BitOffset[pResIdx]++
                            ...c.i32_store(
                                c.getLocal("pResIdx"),
                                0,
                                c.i32_add(
                                    c.i32_const(1),  // 数量加1，暂时不考虑加上i32的byte数量，可能需要修改为4，更加方便后续使用？
                                    c.i32_load(
                                        c.getLocal("pResIdx"),
                                        0
                                    )
                                )
                            )
                            ///...c.getLocal(xx)
                        ],
                        //为0，什么也不做     
                    ),
                    c.setLocal("j", c.i32_sub(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),

                c.setLocal("itTableSize", c.i32_add(c.getLocal("itTableSize"), c.i32_const(4))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }

    function buildArrangePoint() {
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
        f.addLocal("j_i64", "i64");
        f.addLocal("nTable", "i32");
        f.addLocal("pTable", "i32");
        f.addLocal("idx", "i32");
        f.addLocal("pIdxTable", "i32");
        f.addLocal("pIdxBucketOffset", "i32");// 临时变量，存储第i个bucket的offset
        f.addLocal("tmp", "i32");

        f.addLocal("bucketIdx", "i64");// 临时变量，存储一个点的bucket idex
        f.addLocal("metadata", "i64");// 临时变量，存储一个点的meta data

        f.addLocal("pTableSize", "i32"); // accumulate each tabel size, and then call batchaffine add function
        f.addLocal("itTableSize", "i32")
        //f.addLocal("pTableSizeOffset", "i32"); // accumulate each tabel size, and then call batchaffine add function

        f.addLocal("pMetadata", "i32");// N points for batch add
        f.addLocal("itMetadata", "i32");

        f.addLocal("pBucketOffset", "i32");
        f.addLocal("itBucketOffset", "i32");

        f.addLocal("pIndex", "i32");// store each point index
        f.addLocal("itIndex", "i32");// 遍历pIndex用的

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

            c.setLocal("pTableSize", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pTableSize"),
                    c.i32_mul(
                        c.getLocal("nTable"),
                        c.i32_const(4)  //32bit? 4byte
                    )
                )
            ),

            c.setLocal("pBucketOffset", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pBucketOffset"),
                    c.i32_mul(
                        c.getLocal("nTable"),
                        c.i32_const(4)  //32bit? 4byte
                    )
                )
            ),

            c.setLocal("pMetadata", c.i32_load(c.i32_const(0))),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pMetadata"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(8)  //64bit? 8byte
                    )
                )
            ),

            c.setLocal("pIndex", c.i32_load(c.i32_const(0))),//记录了某一个点属于第几个bucket，copy的时候使用
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pIndex"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(4)  //32bit? 4byte
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

            // Reset TableSize
            c.setLocal("j", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("j"),
                        c.getLocal("nTable")
                    )
                ),

                f.addCode(
                    c.i32_store(
                        c.getLocal("pTableSize"),
                        j * 4,
                        c.i32_const(0)
                    )
                ),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),


            // Distribute elements
            c.setLocal("itBase", c.getLocal("pBases")),
            c.setLocal("itScalar", c.getLocal("pScalars")),
            c.setLocal("itIndex", c.getLocal("pIndex")),
            c.setLocal("endScalar",
                c.i32_add(
                    c.getLocal("pScalars"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.getLocal("scalarSize")
                    )
                )
            ),

            // 遍历所有的点，计算出每一个bucket的数量
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("itScalar"),
                        c.getLocal("endScalar")
                    )
                ),

                // get idx
                c.setLocal(
                    "idx",
                    c.call(fnName + "_getChunk",
                        c.getLocal("itScalar"),
                        c.getLocal("scalarSize"),
                        c.getLocal("startBit"),
                        c.getLocal("chunkSize")
                    )
                ),

                // 按照顺序存储每一个点属于的bucket的index，在copy的时候使用
                c.i32_store( // store idx
                    c.i32_add(c.getLocal("itIndex")),
                    0,
                    c.getLocal("idx")
                ),

                c.if(
                    c.getLocal("idx"),
                    [
                        // 获得当前点在size table中的偏移
                        ...c.setLocal(
                            "pIdxTable",
                            c.i32_add(
                                c.getLocal("pTableSize"),
                                c.i32_mul(
                                    c.i32_sub(
                                        c.getLocal("idx"),
                                        c.i32_const(1)
                                    ),
                                    c.i32_const(4)
                                )
                            )
                        ),
                        // 把当前点对应的bucket数量+1
                        ...c.i32_store(
                            c.getLocal("pIdxTable"),
                            0,
                            c.i32_add(
                                c.i32_const(4),  // 数量是1，占了4个byte，pTableSize实际上存的是多少字节
                                c.i32_load(
                                    c.getLocal("pIdxTable"),
                                    0
                                )
                            )
                        ),
                        // ...c.call(
                        //     opAdd,
                        //     c.getLocal("pIdxTable"),
                        //     c.getLocal("itBase"),
                        //     c.getLocal("pIdxTable"),
                        // )
                    ]
                ),
                c.setLocal("itScalar", c.i32_add(c.getLocal("itScalar"), c.getLocal("scalarSize"))),
                c.setLocal("itBase", c.i32_add(c.getLocal("itBase"), c.i32_const(n8b))),
                c.setLocal("itIndex", c.i32_add(c.getLocal("itIndex"), c.i32_const(4))),
                c.br(0)
            )),

            // 对bucket数量scan，就可以得到每一个bucket的偏移
            // pBucketOffset[0] =  pMetadata
            c.i32_store(
                c.getLocal("pBucketOffset"),
                //c.i32_load(
                c.getLocal("pMetadata")
                //)
            ),
            // pBucketOffset[j] = pBucketOffset[j-1] + pTableSize[j-1]  j>0
            c.setLocal(c.getLocal("itTableSize"), c.getLocal("pTableSize")),
            //从pBucketOffset[1]开始
            c.setLocal(c.getLocal("itBucketOffset"), c.i32_add(c.getLocal("pBucketOffset"), c.i32_const(4))),
            c.setLocal("j", c.i32_const(1)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("j"),
                        c.getLocal("nTable")
                    )
                ),
                // should implement pBucketOffset[j] = pBucketOffset[j-1] + pTableSize[j] 
                c.i32_store(
                    c.getLocal("itBucketOffset"),
                    c.i32_load(
                        c.i32_add(
                            c.i32_load(c.getLocal("itTableSize")),
                            c.i32_load(c.i32_sub(c.getLocal("itBucketOffset"), c.i32_const(4))),
                        )
                    )
                ),
                c.setLocal("itTableSize", c.i32_add(c.getLocal("itTableSize"), c.i32_const(4))),
                c.setLocal("itBucketOffset", c.i32_add(c.getLocal("itBucketOffset"), c.i32_const(4))),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),

            // 再便利一遍所有的点，构建meta data ，同时对meta data进行排序（根据itBucketOffset放入相应位置）
            c.setLocal("itIndex", c.getLocal("pIndex")),
            c.setLocal(c.getLocal("itMetadata"), c.getLocal("pMetadata")),
            c.setLocal("j_i64", c.i64_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i64_eq(
                        c.getLocal("j"),
                        c.getLocal("n")
                    )
                ),

                // mem[itIndex] i32 --> i64
                c.setLocal("bucketIdx", i64_extend_i32_u(c.i32_load(
                    c.getLocal("itIndex")
                ))),

                // j 和 mem[itIndex]拼接得到64位meta data
                c.setLocal(
                    "metadata",
                    c.i64_add(
                        // j: point index
                        c.i64_shl(
                            c.getLocal("j"),
                            c.i64_const(32)
                        ),
                        // mem[itIndex]: bucketIdx
                        c.getLocal("bucketIdx")
                    )
                ),
                // 从BucketOffset中获得存储meta data的位置,并把BucketOffset[bucketIdx]加8 bytes
                c.setLocal(
                    "pIdxBucketOffset",
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
                        c.setLocal("tmp")
                    )
                ),

                c.setLocal("itIndex", c.i32_add(c.getLocal("itIndex"), c.i32_const(4))),
                c.setLocal("itMetadata", c.i32_add(c.getLocal("itMetadata"), c.i32_const(8))),//Metadata是64位
                c.setLocal("j_i64", c.i64_add(c.getLocal("j_i64"), c.i64_const(1))),
                c.br(0)
            )),

            // 到目前为止完成了第一次metadata的设置

            // 按照顺序copy N个点

            // 调用batchadd函数，将结果存储到pTable地址中

            // c.call(fnName + "_reduceTable", c.getLocal("pTable"), c.getLocal("chunkSize")),
            // c.call(
            //     prefix + "_copy",
            //     c.getLocal("pTable"),
            //     c.getLocal("pr")
            // ),


            // c.i32_store(
            //     c.i32_const(0),
            //     c.getLocal("pTable")
            // )

        );
    }

    buildArrangePoint();
    buildCountBits();
    buildGetBitOffset();
    buildGetChunk();
    buildGetNumBuckets();
    buildGetOptimalChunkWidth();
    buildGetRoundNum();
    buildMultiexp();
    buildMutiexpChunk();
    buildMyBatchAffineMergeBLS12381();
    buildReduceTable();

    module.exportFunction(fnName);
    module.exportFunction(fnName + "_chunk");
};
