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

const buildInt = require("./build_int.js");
const utils = require("./utils.js"); 
const buildExp = require("./build_timesscalar");
const buildBatchInverse = require("./build_batchinverse");
const buildBatchConvertion = require("./build_batchconvertion");
const buildBatchOp = require("./build_batchop");
const { bitLength, modInv, modPow, isPrime, isOdd, square } = require("./bigint.js");

module.exports = function buildF1m(module, _q, _prefix, _intPrefix) {
    const q = BigInt(_q);
    const n64 = Math.floor((bitLength(q - 1n) - 1)/64) +1;
    const n32 = n64*2;
    const n8 = n64*8;

    const prefix = _prefix || "f1m";
    if (module.modules[prefix]) return prefix;  // already builded

    const intPrefix = buildInt(module, n64, _intPrefix);
    const pq = module.alloc(n8, utils.bigInt2BytesLE(q, n8));

    const pR2 = module.alloc(utils.bigInt2BytesLE(square(1n << BigInt(13*30)) % q, n8));
    //const pR2_30limb = module.alloc(utils.bigInt2BytesLE(square(1n << BigInt(13*30)) % q, n8));

    const pOne = module.alloc(utils.bigInt2BytesLE((1n << BigInt(13*30)) % q, n8));
    const pZero = module.alloc(utils.bigInt2BytesLE(0n, n8));
    const _minusOne = q - 1n;
    const _e = _minusOne >> 1n; // e = (p-1)/2
    const pe = module.alloc(n8, utils.bigInt2BytesLE(_e, n8));

    const _ePlusOne = _e + 1n; // e = (p-1)/2
    const pePlusOne = module.alloc(n8, utils.bigInt2BytesLE(_ePlusOne, n8));

    module.modules[prefix] = {
        pq: pq,
        pR2: pR2,
        n64: n64,
        q: q,
        pOne: pOne,
        pZero: pZero,
        pePlusOne: pePlusOne
    };

    function buildOne() {
        const pOne_30limb = module.alloc(utils.bigInt2BytesLE((1n << BigInt(13 * 30)) % q, n8));
        const f = module.addFunction(prefix+"_one");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(intPrefix + "_copy", c.i32_const(pOne_30limb), c.getLocal("pr")));
    }

    function buildAdd() {
        const f = module.addFunction(prefix+"_add");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.call(intPrefix+"_add", c.getLocal("x"),  c.getLocal("y"), c.getLocal("r")),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );
    }

    function buildSub() {
        const f = module.addFunction(prefix+"_sub");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.call(intPrefix+"_sub", c.getLocal("x"),  c.getLocal("y"), c.getLocal("r")),
                c.drop(c.call(intPrefix+"_add", c.getLocal("r"),  c.i32_const(pq), c.getLocal("r")))
            )
        );
    }

    function buildNeg() {
        const f = module.addFunction(prefix+"_neg");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(prefix + "_sub", c.i32_const(pZero), c.getLocal("x"), c.getLocal("r"))
        );
    }


    function buildIsNegative() {
        const f = module.addFunction(prefix+"_isNegative");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
            c.call(intPrefix + "_gte", AUX, c.i32_const(pePlusOne) )
        );
    }

    function buildSign() {
        const f = module.addFunction(prefix+"_sign");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if (
                c.call(intPrefix + "_isZero", c.getLocal("x")),
                c.ret(c.i32_const(0))
            ),
            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
            c.if(
                c.call(intPrefix + "_gte", AUX, c.i32_const(pePlusOne)),
                c.ret(c.i32_const(-1))
            ),
            c.ret(c.i32_const(1))
        );
    }


    function buildMReduct() {
        const carries = module.alloc(n32*n32*8);

        const f = module.addFunction(prefix+"_mReduct");
        f.addParam("t", "i32");
        f.addParam("r", "i32");
        f.addLocal("np32", "i64");
        f.addLocal("c", "i64");
        f.addLocal("m", "i64");

        const c = f.getCodeBuilder();

        const np32 = Number(0x100000000n - modInv(q, 0x100000000n));

        f.addCode(c.setLocal("np32", c.i64_const(np32)));

        for (let i=0; i<n32; i++) {
            f.addCode(c.setLocal("c", c.i64_const(0)));

            f.addCode(
                c.setLocal(
                    "m",
                    c.i64_and(
                        c.i64_mul(
                            c.i64_load32_u(c.getLocal("t"), i*4),
                            c.getLocal("np32")
                        ),
                        c.i64_const("0xFFFFFFFF")
                    )
                )
            );

            for (let j=0; j<n32; j++) {

                f.addCode(
                    c.setLocal("c",
                        c.i64_add(
                            c.i64_add(
                                c.i64_load32_u(c.getLocal("t"), (i+j)*4),
                                c.i64_shr_u(c.getLocal("c"), c.i64_const(32))
                            ),
                            c.i64_mul(
                                c.i64_load32_u(c.i32_const(pq), j*4),
                                c.getLocal("m")
                            )
                        )
                    )
                );

                f.addCode(
                    c.i64_store32(
                        c.getLocal("t"),
                        (i+j)*4,
                        c.getLocal("c")
                    )
                );
            }

            f.addCode(
                c.i64_store32(
                    c.i32_const(carries),
                    i*4,
                    c.i64_shr_u(c.getLocal("c"), c.i64_const(32))
                )
            );
        }

        f.addCode(
            c.call(
                prefix+"_add",
                c.i32_const(carries),
                c.i32_add(
                    c.getLocal("t"),
                    c.i32_const(n32*4)
                ),
                c.getLocal("r")
            )
        );
    }



    // function buildMul() {

    //     const f = module.addFunction(prefix+"_mul");
    //     f.addParam("x", "i32");
    //     f.addParam("y", "i32");
    //     f.addParam("r", "i32");
    //     f.addLocal("c0", "i64");
    //     f.addLocal("c1", "i64");
    //     f.addLocal("np32", "i64");


    //     for (let i=0;i<n32; i++) {
    //         f.addLocal("x"+i, "i64");
    //         f.addLocal("y"+i, "i64");
    //         f.addLocal("m"+i, "i64");
    //         f.addLocal("q"+i, "i64");
    //     }

    //     const c = f.getCodeBuilder();

    //     const np32 = Number(0x100000000n - modInv(q, 0x100000000n));

    //     f.addCode(c.setLocal("np32", c.i64_const(np32)));

    //     const loadX = [];
    //     const loadY = [];
    //     const loadQ = [];
    //     function mulij(i, j) {
    //         let X,Y;
    //         if (!loadX[i]) {
    //             X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
    //             loadX[i] = true;
    //         } else {
    //             X = c.getLocal("x"+i);
    //         }
    //         if (!loadY[j]) {
    //             Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
    //             loadY[j] = true;
    //         } else {
    //             Y = c.getLocal("y"+j);
    //         }

    //         return c.i64_mul( X, Y );
    //     }

    //     function mulqm(i, j) {
    //         let Q,M;
    //         if (!loadQ[i]) {
    //             Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
    //             loadQ[i] = true;
    //         } else {
    //             Q = c.getLocal("q"+i);
    //         }
    //         M = c.getLocal("m"+j);

    //         return c.i64_mul( Q, M );
    //     }


    //     let c0 = "c0";
    //     let c1 = "c1";

    //     for (let k=0; k<n32*2-1; k++) {
    //         for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
    //             const j= k-i;

    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulij(i,j)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }


    //         for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
    //             const j= k-i;

    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulqm(i,j)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }
    //         if (k<n32) {
    //             f.addCode(
    //                 c.setLocal(
    //                     "m"+k,
    //                     c.i64_and(
    //                         c.i64_mul(
    //                             c.i64_and(
    //                                 c.getLocal(c0),
    //                                 c.i64_const(0xFFFFFFFF)
    //                             ),
    //                             c.getLocal("np32")
    //                         ),
    //                         c.i64_const("0xFFFFFFFF")
    //                     )
    //                 )
    //             );


    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulqm(0,k)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }


    //         if (k>=n32) {
    //             f.addCode(
    //                 c.i64_store32(
    //                     c.getLocal("r"),
    //                     (k-n32)*4,
    //                     c.getLocal(c0)
    //                 )
    //             );
    //         }
    //         [c0, c1] = [c1, c0];
    //         f.addCode(
    //             c.setLocal(c1,
    //                 c.i64_shr_u(
    //                     c.getLocal(c0),
    //                     c.i64_const(32)
    //                 )
    //             )
    //         );
    //     }
    //     f.addCode(
    //         c.i64_store32(
    //             c.getLocal("r"),
    //             n32*4-4,
    //             c.getLocal(c0)
    //         )
    //     );

    //     f.addCode(
    //         c.if(
    //             c.i32_wrap_i64(c.getLocal(c1)),
    //             c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
    //             c.if(
    //                 c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
    //                 c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
    //             )
    //         )
    //     );

    // }


    function buildMul(){
        // 30bit
        const f = module.addFunction(prefix+"_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("xy", "i32");

        f.addLocal("i", "i32");
        f.addLocal("xi", "i64");
        f.addLocal("qi", "i64");
        f.addLocal("tmp", "i64");
        f.addLocal("mu", "i64");
        f.addLocal("wordMax", "i64");

        let n = 13;
        let w = 30;
        let wordMax =  0x3fffffff;
        let nSafeTerms = 2 ** (64 - 2 * w);
        // how much j steps we can do before a carry:
        let nSafeSteps = 2 ** (64 - 2 * w - 1);


        for (let i=0;i<n; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
            f.addLocal("y_continuous"+i, "i64");
            //f.addLocal("m"+i, "i64");
            //f.addLocal("q"+i, "i64");
            f.addLocal("s"+i, "i64");
            f.addLocal("xy"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const mu = Number((1n << 30n) - modInv(q, (1n << 30n))); 
        f.addCode(c.setLocal("mu", c.i64_const(mu)));

        f.addCode(c.setLocal("wordMax", c.i64_const(wordMax)));

        function bigintToLegs(x0, w, n) {
            /**
             * @type {bigint[]}
             */
            let legs = Array(n);
            let wn = BigInt(w);
            let wordMax = (1n << wn) - 1n;
            for (let i = 0; i < n; i++) {
              legs[i] = x0 & wordMax;
              x0 >>= wn;
            }
            return legs;
        }
        let P = bigintToLegs(q, w, n);


        // 32 bit -> 30 bit
        for(let i = 1; i < n32; i++){
            f.addCode(
                c.setLocal(
                    "x"+i,
                    c.i64_or(
                        c.i64_shr_u(
                            c.i64_load32_u( c.getLocal("x"), (i-1)*4),
                            c.i64_const(32 - 2 * i)
                        ),
                        c.i64_shl(
                            c.i64_and(
                                c.i64_load32_u( c.getLocal("x"), i*4),
                                c.i64_const((1 << (30-2*i)) - 1)
                            ),
                            c.i64_const(2*i)
                        ),
                        // c.i64_const(0)
                        
                    )    
                )
            );
            f.addCode(
                c.setLocal(
                    "y"+i,
                    c.i64_or(
                        c.i64_shr_u(
                            c.i64_load32_u( c.getLocal("y"), (i-1)*4),
                            c.i64_const(32 - 2 * i)
                        ),
                        c.i64_shl(
                            c.i64_and(
                                c.i64_load32_u( c.getLocal("y"), i*4),
                                c.i64_const((1 << (30-2*i)) - 1)
                            ),
                            c.i64_const(2*i)
                        )
                    )   
                )
            );
        }

        f.addCode(
            c.setLocal(
                "x"+0,
                c.i64_and(
                    c.i64_load32_u( c.getLocal("x"), 0) ,
                    c.i64_const(0x3fffffff)
                ) 
            ),
            c.setLocal(
                "y"+0,
                c.i64_and(
                    c.i64_load32_u( c.getLocal("y"), 0) ,
                    c.i64_const(0x3fffffff)
                ) 
            ),
            c.setLocal(
                "x"+(n-1),
                c.i64_shr_u(
                    c.i64_load32_u( c.getLocal("x"), (n32-1)*4) ,
                    c.i64_const(32-n*2+2)
                    
                ) 
            ),
            c.setLocal(
                "y"+(n-1),
                c.i64_shr_u(
                    c.i64_load32_u( c.getLocal("y"), (n32-1)*4) ,
                    c.i64_const(32-n*2+2)
                ) 
            )
        );


        // for (let i = 0; i < n; i++) {
        //     line(local.set(Y[i], i64.load(local.get(y), { offset: i * 8 })));
        // }
        // for (let i = 0; i < n; i++) {
        //     f.addCode(
        //         c.setLocal(
        //             "y"+i,
        //             c.i64_load( c.getLocal("y"), i*8)
        //         )
        //     );
        // }

        // for (let i = 0; i < 12; i++) {
        //     f.addCode(
        //         c.setLocal(
        //             "y_continuous"+i,
        //             c.i64_load( c.getLocal("y"), i*8)
        //         )
        //     );
        // }

        // for(let i = 0; i < 12 ; i++){
        //     f.addCode(
        //         c.setLocal(
        //             "y"+(i+1),
        //             c.i64_and(
        //                 c.getLocal("y_continuous"+i),
        //                 c.i64_const(1<<i-1)
        //             )
        //         ),
        //         c.setLocal(
        //             "y"+(i+1),
        //             c.i64_or(
        //                 c.i64_shl(
        //                     c.i64_and(
        //                         c.getLocal("y_continuous"+i),
        //                         c.i64_const(1<<i-1)
        //                     ),
        //                     c.i64_const(1<<i-1)
        //                 ),
        //                 c.getLocal("y"+(i+1))
        //             )

        //         )
        //     );
        // }



        
        for (let i = 0; i < n; i+=1) {
            //line(local.set(xi, i64.load(i32.add(x, i))));
            let didCarry = false;
            let doCarry = 0 % nSafeSteps === 0;
            f.addCode(
                c.setLocal(
                    "xi",
                    //c.i64_load( c.getLocal("x"), i*8)
                    c.getLocal("x"+i)
                )
            );
            f.addCode(
                //     local.get(S[0]),
                // i64.mul(xi, Y[0]),
                // i64.add(),
                // local.set(tmp),
                c.setLocal(
                    "tmp",
                    c.i64_add(
                        c.getLocal("s0"),
                        c.i64_mul(c.getLocal("xi"), c.getLocal("y0"))
                    )
                ),
                // local.set(qi, i64.and(i64.mul(mu, i64.and(tmp, wordMax)), wordMax)),
                c.setLocal(
                    "qi",
                    c.i64_and(
                        c.getLocal("wordMax"),
                        c.i64_mul(
                            c.getLocal("mu"),
                            c.i64_and(
                                c.getLocal("tmp"),
                                c.i64_const(wordMax)
                            )
                        )
                    )
                    
                ),
                //     local.get(tmp),
                //     i64.mul(qi, P[0]),
                //     i64.add(),
                //     join(i64.const(w), i64.shr_u()) // we just put carry on the stack, use it later
                
                // c.i64_shr_u(
                //     c.i64_add(
                //         c.getLocal("tmp"),
                //         c.i64_mul(c.getLocal("qi"), c.i64_const(P[0]))
                //     ),
                //     c.i64_const(w)
                // )
                c.getLocal("tmp"),
                c.i64_mul(c.getLocal("qi"), c.i64_const(P[0])),
                c.i64_add([],[]),
                c.i64_const(w),
                c.i64_shr_u([],[])
    
            );

            // for (let j = 1; j < n - 1; j++) {
            //     // S[j] + x[i]*y[j] + qi*p[j], or
            //     // stack + S[j] + x[i]*y[j] + qi*p[j]
            //     // ... = S[j-1], or  = (stack, S[j-1])
            //     didCarry = doCarry;
            //     doCarry = j % nSafeSteps === 0;
            //     comment(`j = ${j}${doCarry ? ", do carry" : ""}`);
            //     lines(
            //       local.get(S[j]),
            //       didCarry && i64.add(), // add carry from stack
            //       i64.mul(xi, Y[j]),
            //       i64.add(),
            //       i64.mul(qi, P[j]),
            //       i64.add(),
            //       doCarry && join(local.tee(tmp), i64.const(w), i64.shr_u()), // put carry on the stack
            //       doCarry && i64.and(tmp, wordMax), // mod 2^w the current result
            //       local.set(S[j - 1])
            //     );
            //   }
            for (let j = 1; j < n - 1; j++) {
                // S[j] + x[i]*y[j] + qi*p[j], or
                // stack + S[j] + x[i]*y[j] + qi*p[j]
                // ... = S[j-1], or  = (stack, S[j-1])
                didCarry = doCarry;
                doCarry = j % nSafeSteps === 0;
                f.addCode(
                    c.getLocal("s"+j),
                );
                if(didCarry){
                    f.addCode(c.i64_add([],[])) //i64.add
                }
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j)),
                    c.i64_add([],[]), //i64.add
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]) //i64.add
                );
                if(doCarry){
                    f.addCode(
                        // c.i64_shr_u(
                        //     c.teeLocal("tmp",[]),
                        //     c.i64_const(w)
                        // ),
                        c.teeLocal("tmp",[]),
                        c.i64_const(w),
                        c.i64_shr_u([],[]),
                        c.i64_and(c.getLocal("tmp"), c.i64_const(wordMax))
                    );
                }
                f.addCode(c.setLocal("s"+(j-1),[]));
            }
            
            let j = n - 1;
            didCarry = doCarry;
            doCarry = j % nSafeSteps === 0;
            if(doCarry){
                f.addCode(
                    c.getLocal("s"+j),
                );
                if(didCarry){
                    f.addCode(
                        c.i64_add([],[]), //i64.add
                    );
                }
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j)),
                    //[0x7c], //i64.add
                    c.i64_add([],[]),
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]),
                    // c.i64_shr_u(
                    //     c.teeLocal("tmp",[]),
                    //     c.i64_const(w)
                    // ),
                    c.teeLocal("tmp",[]),
                    c.i64_const(w),
                    c.i64_shr_u([],[]),
                    c.i64_and(c.getLocal("tmp"), c.i64_const(wordMax)),
                    c.setLocal("s"+(j-1),[]),
                    c.setLocal("s"+j,[])
                );
            }else{
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j))
                );
                if(didCarry){
                    f.addCode(
                        c.i64_add([],[])
                    );
                }
                f.addCode(
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]),
                    c.setLocal("s"+(j-1),[])
                );
            }

        }
        // for (let j = 1; j < n; j++) {
        //     lines(
        //       i64.store(xy, i64.and(S[j - 1], wordMax), { offset: 8 * (j - 1) }),
        //       local.set(S[j], i64.add(S[j], i64.shr_u(S[j - 1], w)))
        //     );
        //   }
        // line(i64.store(xy, S[n - 1], { offset: 8 * (n - 1) }));

        for (let j = 1; j < n; j++) {
            f.addCode(
                // c.i64_store(
                //     c.getLocal("xy"),
                //     8 * (j - 1),
                //     c.i64_and(
                //         c.getLocal("s"+(j-1)),
                //         c.i64_const(wordMax)
                //     )
                // ),
                c.setLocal(
                    "xy"+(j-1),
                    c.i64_and(
                        c.getLocal("s"+(j-1)),
                        c.i64_const(wordMax)
                    )
                ),
                c.setLocal(
                    "s"+j,
                    c.i64_add(
                        c.getLocal("s"+j),
                        c.i64_shr_u(
                            c.getLocal("s"+(j-1)),
                            c.i64_const(w)
                        )
                    )
                )
            );
          }
          // line(i64.store(xy, S[n - 1], { offset: 8 * (n - 1) }));
          f.addCode(
            // c.i64_store(
            //     c.getLocal("xy"),
            //     8 * (n - 1),
            //     c.getLocal("s"+(n-1))
            // )
            c.setLocal(
                "xy"+(n-1),
                c.getLocal("s"+(n-1))
            )
          );

          // 30 bit --> 32 bit
          for (let j = 0; j < n - 1; j++) {
            f.addCode(
                c.setLocal(
                    "xy"+j,
                    c.i64_or(
                        c.i64_shl(
                            c.getLocal("xy"+(j+1)),
                            c.i64_const(32-2*j-2)
                        ),
                        c.i64_shr_u(
                            c.getLocal("xy"+(j)),
                            c.i64_const(2*j)
                        )
                    )
                )
            );
          }
          f.addCode(
            c.setLocal(
                "xy"+(n-1),
                c.i64_shr_u(
                    c.getLocal("xy"+(n-1)),
                    c.i64_const(2*(n-1))
                )
            )
          );
          
          
          for (let j = 0; j < n32; j++){
            f.addCode(
                c.i64_store32(
                    c.getLocal("xy"),
                    4*j,
                    c.getLocal("xy"+j)
                )
            );
          }

          f.addCode(
            c.if(
                c.call(intPrefix+"_gte", c.getLocal("xy"), c.i32_const(pq)  ),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("xy"), c.i32_const(pq), c.getLocal("xy"))),
            )
        );


    }

    function buildMul_30bit_backup(){
        const f = module.addFunction(prefix+"_30bitMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("xy", "i32");

        f.addLocal("i", "i32");
        f.addLocal("xi", "i64");
        f.addLocal("qi", "i64");
        f.addLocal("tmp", "i64");
        f.addLocal("mu", "i64");
        f.addLocal("wordMax", "i64");

        let n = 13;
        let w = 30;
        let wordMax =  0x3fffffff;
        let nSafeTerms = 2 ** (64 - 2 * w);
        // how much j steps we can do before a carry:
        let nSafeSteps = 2 ** (64 - 2 * w - 1);


        for (let i=0;i<n; i++) {
            //f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
            f.addLocal("y_continuous"+i, "i64");
            //f.addLocal("m"+i, "i64");
            //f.addLocal("q"+i, "i64");
            f.addLocal("s"+i, "i64");
            f.addLocal("xy"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const mu = Number((1n << 30n) - modInv(q, (1n << 30n))); 
        f.addCode(c.setLocal("mu", c.i64_const(mu)));

        f.addCode(c.setLocal("wordMax", c.i64_const(wordMax)));

        function bigintToLegs(x0, w, n) {
            /**
             * @type {bigint[]}
             */
            let legs = Array(n);
            let wn = BigInt(w);
            let wordMax = (1n << wn) - 1n;
            for (let i = 0; i < n; i++) {
              legs[i] = x0 & wordMax;
              x0 >>= wn;
            }
            return legs;
        }
        let P = bigintToLegs(q, w, n);


        // for (let i = 0; i < n; i++) {
        //     line(local.set(Y[i], i64.load(local.get(y), { offset: i * 8 })));
        // }
        for (let i = 0; i < n; i++) {
            f.addCode(
                c.setLocal(
                    "y"+i,
                    c.i64_load( c.getLocal("y"), i*8)
                )
            );
        }

        // for (let i = 0; i < 12; i++) {
        //     f.addCode(
        //         c.setLocal(
        //             "y_continuous"+i,
        //             c.i64_load( c.getLocal("y"), i*8)
        //         )
        //     );
        // }

        // for(let i = 0; i < 12 ; i++){
        //     f.addCode(
        //         c.setLocal(
        //             "y"+(i+1),
        //             c.i64_and(
        //                 c.getLocal("y_continuous"+i),
        //                 c.i64_const(1<<i-1)
        //             )
        //         ),
        //         c.setLocal(
        //             "y"+(i+1),
        //             c.i64_or(
        //                 c.i64_shl(
        //                     c.i64_and(
        //                         c.getLocal("y_continuous"+i),
        //                         c.i64_const(1<<i-1)
        //                     ),
        //                     c.i64_const(1<<i-1)
        //                 ),
        //                 c.getLocal("y"+(i+1))
        //             )

        //         )
        //     );
        // }



        
        for (let i = 0; i < n; i+=1) {
            //line(local.set(xi, i64.load(i32.add(x, i))));
            let didCarry = false;
            let doCarry = 0 % nSafeSteps === 0;
            f.addCode(
                c.setLocal(
                    "xi",
                    c.i64_load( c.getLocal("x"), i*8)
                )
            );
            f.addCode(
                //     local.get(S[0]),
                // i64.mul(xi, Y[0]),
                // i64.add(),
                // local.set(tmp),
                c.setLocal(
                    "tmp",
                    c.i64_add(
                        c.getLocal("s0"),
                        c.i64_mul(c.getLocal("xi"), c.getLocal("y0"))
                    )
                ),
                // local.set(qi, i64.and(i64.mul(mu, i64.and(tmp, wordMax)), wordMax)),
                c.setLocal(
                    "qi",
                    c.i64_and(
                        c.getLocal("wordMax"),
                        c.i64_mul(
                            c.getLocal("mu"),
                            c.i64_and(
                                c.getLocal("tmp"),
                                c.i64_const(wordMax)
                            )
                        )
                    )
                    
                ),
                //     local.get(tmp),
                //     i64.mul(qi, P[0]),
                //     i64.add(),
                //     join(i64.const(w), i64.shr_u()) // we just put carry on the stack, use it later
                
                // c.i64_shr_u(
                //     c.i64_add(
                //         c.getLocal("tmp"),
                //         c.i64_mul(c.getLocal("qi"), c.i64_const(P[0]))
                //     ),
                //     c.i64_const(w)
                // )
                c.getLocal("tmp"),
                c.i64_mul(c.getLocal("qi"), c.i64_const(P[0])),
                c.i64_add([],[]),
                c.i64_const(w),
                c.i64_shr_u([],[])
    
            );

            // for (let j = 1; j < n - 1; j++) {
            //     // S[j] + x[i]*y[j] + qi*p[j], or
            //     // stack + S[j] + x[i]*y[j] + qi*p[j]
            //     // ... = S[j-1], or  = (stack, S[j-1])
            //     didCarry = doCarry;
            //     doCarry = j % nSafeSteps === 0;
            //     comment(`j = ${j}${doCarry ? ", do carry" : ""}`);
            //     lines(
            //       local.get(S[j]),
            //       didCarry && i64.add(), // add carry from stack
            //       i64.mul(xi, Y[j]),
            //       i64.add(),
            //       i64.mul(qi, P[j]),
            //       i64.add(),
            //       doCarry && join(local.tee(tmp), i64.const(w), i64.shr_u()), // put carry on the stack
            //       doCarry && i64.and(tmp, wordMax), // mod 2^w the current result
            //       local.set(S[j - 1])
            //     );
            //   }
            for (let j = 1; j < n - 1; j++) {
                // S[j] + x[i]*y[j] + qi*p[j], or
                // stack + S[j] + x[i]*y[j] + qi*p[j]
                // ... = S[j-1], or  = (stack, S[j-1])
                didCarry = doCarry;
                doCarry = j % nSafeSteps === 0;
                f.addCode(
                    c.getLocal("s"+j),
                );
                if(didCarry){
                    f.addCode(c.i64_add([],[])) //i64.add
                }
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j)),
                    c.i64_add([],[]), //i64.add
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]) //i64.add
                );
                if(doCarry){
                    f.addCode(
                        // c.i64_shr_u(
                        //     c.teeLocal("tmp",[]),
                        //     c.i64_const(w)
                        // ),
                        c.teeLocal("tmp",[]),
                        c.i64_const(w),
                        c.i64_shr_u([],[]),
                        c.i64_and(c.getLocal("tmp"), c.i64_const(wordMax))
                    );
                }
                f.addCode(c.setLocal("s"+(j-1),[]));
            }
            
            let j = n - 1;
            didCarry = doCarry;
            doCarry = j % nSafeSteps === 0;
            if(doCarry){
                f.addCode(
                    c.getLocal("s"+j),
                );
                if(didCarry){
                    f.addCode(
                        c.i64_add([],[]), //i64.add
                    );
                }
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j)),
                    //[0x7c], //i64.add
                    c.i64_add([],[]),
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]),
                    // c.i64_shr_u(
                    //     c.teeLocal("tmp",[]),
                    //     c.i64_const(w)
                    // ),
                    c.teeLocal("tmp",[]),
                    c.i64_const(w),
                    c.i64_shr_u([],[]),
                    c.i64_and(c.getLocal("tmp"), c.i64_const(wordMax)),
                    c.setLocal("s"+(j-1),[]),
                    c.setLocal("s"+j,[])
                );
            }else{
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j))
                );
                if(didCarry){
                    f.addCode(
                        c.i64_add([],[])
                    );
                }
                f.addCode(
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]),
                    c.setLocal("s"+(j-1),[])
                );
            }

        }
        // for (let j = 1; j < n; j++) {
        //     lines(
        //       i64.store(xy, i64.and(S[j - 1], wordMax), { offset: 8 * (j - 1) }),
        //       local.set(S[j], i64.add(S[j], i64.shr_u(S[j - 1], w)))
        //     );
        //   }
        // line(i64.store(xy, S[n - 1], { offset: 8 * (n - 1) }));

        for (let j = 1; j < n; j++) {
            f.addCode(
                // c.i64_store(
                //     c.getLocal("xy"),
                //     8 * (j - 1),
                //     c.i64_and(
                //         c.getLocal("s"+(j-1)),
                //         c.i64_const(wordMax)
                //     )
                // ),
                c.setLocal(
                    "xy"+(j-1),
                    c.i64_and(
                        c.getLocal("s"+(j-1)),
                        c.i64_const(wordMax)
                    )
                ),
                c.setLocal(
                    "s"+j,
                    c.i64_add(
                        c.getLocal("s"+j),
                        c.i64_shr_u(
                            c.getLocal("s"+(j-1)),
                            c.i64_const(w)
                        )
                    )
                )
            );
          }
          // line(i64.store(xy, S[n - 1], { offset: 8 * (n - 1) }));
          f.addCode(
            // c.i64_store(
            //     c.getLocal("xy"),
            //     8 * (n - 1),
            //     c.getLocal("s"+(n-1))
            // )
            c.setLocal(
                "xy"+(n-1),
                c.getLocal("s"+(n-1))
            )
          );

          // 30 bit --> 32 bit
          for (let j = 0; j < n - 1; j++) {
            f.addCode(
                c.setLocal(
                    "xy"+j,
                    c.i64_or(
                        c.i64_shl(
                            c.getLocal("xy"+(j+1)),
                            c.i64_const(32-2*j-2)
                        ),
                        c.i64_shr_u(
                            c.getLocal("xy"+(j)),
                            c.i64_const(2*j)
                        )
                    )
                )
            );
          }
          f.addCode(
            c.setLocal(
                "xy"+(n-1),
                c.i64_shr_u(
                    c.getLocal("xy"+(n-1)),
                    c.i64_const(2*(n-1))
                )
            )
          );
          
          
          for (let j = 0; j < n32; j++){
            f.addCode(
                c.i64_store32(
                    c.getLocal("xy"),
                    4*j,
                    c.getLocal("xy"+j)
                )
            );
          }

    }

    function buildMul_backup(){
        //30
        const f = module.addFunction(prefix+"_30bitMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("xy", "i32");

        f.addLocal("i", "i32");
        f.addLocal("xi", "i64");
        f.addLocal("qi", "i64");
        f.addLocal("tmp", "i64");
        f.addLocal("mu", "i64");
        f.addLocal("wordMax", "i64");

        let n = 13;
        let w = 30;
        let wordMax =  0x3fffffff;
        let nSafeTerms = 2 ** (64 - 2 * w);
        // how much j steps we can do before a carry:
        let nSafeSteps = 2 ** (64 - 2 * w - 1);


        for (let i=0;i<n; i++) {
            //f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
            f.addLocal("y_continuous"+i, "i64");
            //f.addLocal("m"+i, "i64");
            //f.addLocal("q"+i, "i64");
            f.addLocal("s"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const mu = Number((1n << 30n) - modInv(q, (1n << 30n))); 
        f.addCode(c.setLocal("mu", c.i64_const(mu)));

        f.addCode(c.setLocal("wordMax", c.i64_const(wordMax)));

        function bigintToLegs(x0, w, n) {
            /**
             * @type {bigint[]}
             */
            let legs = Array(n);
            let wn = BigInt(w);
            let wordMax = (1n << wn) - 1n;
            for (let i = 0; i < n; i++) {
              legs[i] = x0 & wordMax;
              x0 >>= wn;
            }
            return legs;
        }
        let P = bigintToLegs(q, w, n);


        // for (let i = 0; i < n; i++) {
        //     line(local.set(Y[i], i64.load(local.get(y), { offset: i * 8 })));
        // }
        for (let i = 0; i < n; i++) {
            f.addCode(
                c.setLocal(
                    "y"+i,
                    c.i64_load( c.getLocal("y"), i*8)
                )
            );
        }

        // for (let i = 0; i < 12; i++) {
        //     f.addCode(
        //         c.setLocal(
        //             "y_continuous"+i,
        //             c.i64_load( c.getLocal("y"), i*8)
        //         )
        //     );
        // }

        // for(let i = 0; i < 12 ; i++){
        //     f.addCode(
        //         c.setLocal(
        //             "y"+(i+1),
        //             c.i64_and(
        //                 c.getLocal("y_continuous"+i),
        //                 c.i64_const(1<<i-1)
        //             )
        //         ),
        //         c.setLocal(
        //             "y"+(i+1),
        //             c.i64_or(
        //                 c.i64_shl(
        //                     c.i64_and(
        //                         c.getLocal("y_continuous"+i),
        //                         c.i64_const(1<<i-1)
        //                     ),
        //                     c.i64_const(1<<i-1)
        //                 ),
        //                 c.getLocal("y"+(i+1))
        //             )

        //         )
        //     );
        // }



        
        for (let i = 0; i < n; i+=1) {
            //line(local.set(xi, i64.load(i32.add(x, i))));
            let didCarry = false;
            let doCarry = 0 % nSafeSteps === 0;
            f.addCode(
                c.setLocal(
                    "xi",
                    c.i64_load( c.getLocal("x"), i*8)
                )
            );
            f.addCode(
                //     local.get(S[0]),
                // i64.mul(xi, Y[0]),
                // i64.add(),
                // local.set(tmp),
                c.setLocal(
                    "tmp",
                    c.i64_add(
                        c.getLocal("s0"),
                        c.i64_mul(c.getLocal("xi"), c.getLocal("y0"))
                    )
                ),
                // local.set(qi, i64.and(i64.mul(mu, i64.and(tmp, wordMax)), wordMax)),
                c.setLocal(
                    "qi",
                    c.i64_and(
                        c.getLocal("wordMax"),
                        c.i64_mul(
                            c.getLocal("mu"),
                            c.i64_and(
                                c.getLocal("tmp"),
                                c.i64_const(wordMax)
                            )
                        )
                    )
                    
                ),
                //     local.get(tmp),
                //     i64.mul(qi, P[0]),
                //     i64.add(),
                //     join(i64.const(w), i64.shr_u()) // we just put carry on the stack, use it later
                
                // c.i64_shr_u(
                //     c.i64_add(
                //         c.getLocal("tmp"),
                //         c.i64_mul(c.getLocal("qi"), c.i64_const(P[0]))
                //     ),
                //     c.i64_const(w)
                // )
                c.getLocal("tmp"),
                c.i64_mul(c.getLocal("qi"), c.i64_const(P[0])),
                c.i64_add([],[]),
                c.i64_const(w),
                c.i64_shr_u([],[])
    
            );

            // for (let j = 1; j < n - 1; j++) {
            //     // S[j] + x[i]*y[j] + qi*p[j], or
            //     // stack + S[j] + x[i]*y[j] + qi*p[j]
            //     // ... = S[j-1], or  = (stack, S[j-1])
            //     didCarry = doCarry;
            //     doCarry = j % nSafeSteps === 0;
            //     comment(`j = ${j}${doCarry ? ", do carry" : ""}`);
            //     lines(
            //       local.get(S[j]),
            //       didCarry && i64.add(), // add carry from stack
            //       i64.mul(xi, Y[j]),
            //       i64.add(),
            //       i64.mul(qi, P[j]),
            //       i64.add(),
            //       doCarry && join(local.tee(tmp), i64.const(w), i64.shr_u()), // put carry on the stack
            //       doCarry && i64.and(tmp, wordMax), // mod 2^w the current result
            //       local.set(S[j - 1])
            //     );
            //   }
            for (let j = 1; j < n - 1; j++) {
                // S[j] + x[i]*y[j] + qi*p[j], or
                // stack + S[j] + x[i]*y[j] + qi*p[j]
                // ... = S[j-1], or  = (stack, S[j-1])
                didCarry = doCarry;
                doCarry = j % nSafeSteps === 0;
                f.addCode(
                    c.getLocal("s"+j),
                );
                if(didCarry){
                    f.addCode(c.i64_add([],[])) //i64.add
                }
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j)),
                    c.i64_add([],[]), //i64.add
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]) //i64.add
                );
                if(doCarry){
                    f.addCode(
                        // c.i64_shr_u(
                        //     c.teeLocal("tmp",[]),
                        //     c.i64_const(w)
                        // ),
                        c.teeLocal("tmp",[]),
                        c.i64_const(w),
                        c.i64_shr_u([],[]),
                        c.i64_and(c.getLocal("tmp"), c.i64_const(wordMax))
                    );
                }
                f.addCode(c.setLocal("s"+(j-1),[]));
            }
            
            let j = n - 1;
            didCarry = doCarry;
            doCarry = j % nSafeSteps === 0;
            if(doCarry){
                f.addCode(
                    c.getLocal("s"+j),
                );
                if(didCarry){
                    f.addCode(
                        c.i64_add([],[]), //i64.add
                    );
                }
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j)),
                    //[0x7c], //i64.add
                    c.i64_add([],[]),
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]),
                    // c.i64_shr_u(
                    //     c.teeLocal("tmp",[]),
                    //     c.i64_const(w)
                    // ),
                    c.teeLocal("tmp",[]),
                    c.i64_const(w),
                    c.i64_shr_u([],[]),
                    c.i64_and(c.getLocal("tmp"), c.i64_const(wordMax)),
                    c.setLocal("s"+(j-1),[]),
                    c.setLocal("s"+j,[])
                );
            }else{
                f.addCode(
                    c.i64_mul(c.getLocal("xi"), c.getLocal("y"+j))
                );
                if(didCarry){
                    f.addCode(
                        c.i64_add([],[])
                    );
                }
                f.addCode(
                    c.i64_mul(c.getLocal("qi"), c.i64_const(P[j])),
                    c.i64_add([],[]),
                    c.setLocal("s"+(j-1),[])
                );
            }

        }
        // for (let j = 1; j < n; j++) {
        //     lines(
        //       i64.store(xy, i64.and(S[j - 1], wordMax), { offset: 8 * (j - 1) }),
        //       local.set(S[j], i64.add(S[j], i64.shr_u(S[j - 1], w)))
        //     );
        //   }
        // line(i64.store(xy, S[n - 1], { offset: 8 * (n - 1) }));

        for (let j = 1; j < n; j++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("xy"),
                    8 * (j - 1),
                    c.i64_and(
                        c.getLocal("s"+(j-1)),
                        c.i64_const(wordMax)
                    )
                ),
                c.setLocal(
                    "s"+j,
                    c.i64_add(
                        c.getLocal("s"+j),
                        c.i64_shr_u(
                            c.getLocal("s"+(j-1)),
                            c.i64_const(w)
                        )
                    )
                )
            );
          }
          // line(i64.store(xy, S[n - 1], { offset: 8 * (n - 1) }));
          f.addCode(
            c.i64_store(
                c.getLocal("xy"),
                8 * (n - 1),
                c.getLocal("s"+(n-1))
            )
          );
    }

    // function buildSquare() {

    //     const f = module.addFunction(prefix+"_square");
    //     f.addParam("x", "i32");
    //     f.addParam("r", "i32");
    //     f.addLocal("c0", "i64");
    //     f.addLocal("c1", "i64");
    //     f.addLocal("c0_old", "i64");
    //     f.addLocal("c1_old", "i64");
    //     f.addLocal("np32", "i64");


    //     for (let i=0;i<n32; i++) {
    //         f.addLocal("x"+i, "i64");
    //         f.addLocal("m"+i, "i64");
    //         f.addLocal("q"+i, "i64");
    //     }

    //     const c = f.getCodeBuilder();

    //     const np32 = Number(0x100000000n - modInv(q, 0x100000000n));

    //     f.addCode(c.setLocal("np32", c.i64_const(np32)));


    //     const loadX = [];
    //     const loadQ = [];
    //     function mulij(i, j) {
    //         let X,Y;
    //         if (!loadX[i]) {
    //             X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
    //             loadX[i] = true;
    //         } else {
    //             X = c.getLocal("x"+i);
    //         }
    //         if (!loadX[j]) {
    //             Y = c.teeLocal("x"+j, c.i64_load32_u( c.getLocal("x"), j*4));
    //             loadX[j] = true;
    //         } else {
    //             Y = c.getLocal("x"+j);
    //         }

    //         return c.i64_mul( X, Y );
    //     }

    //     function mulqm(i, j) {
    //         let Q,M;
    //         if (!loadQ[i]) {
    //             Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
    //             loadQ[i] = true;
    //         } else {
    //             Q = c.getLocal("q"+i);
    //         }
    //         M = c.getLocal("m"+j);

    //         return c.i64_mul( Q, M );
    //     }


    //     let c0 = "c0";
    //     let c1 = "c1";
    //     let c0_old = "c0_old";
    //     let c1_old = "c1_old";

    //     for (let k=0; k<n32*2-1; k++) {
    //         f.addCode(
    //             c.setLocal(c0, c.i64_const(0)),
    //             c.setLocal(c1, c.i64_const(0)),
    //         );
    //         for (let i=Math.max(0, k-n32+1); (i<((k+1)>>1) )&&(i<n32); i++) {
    //             const j= k-i;

    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulij(i,j)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }

    //         // Multiply by 2
    //         f.addCode(
    //             c.setLocal(c0,
    //                 c.i64_shl(
    //                     c.i64_and(
    //                         c.getLocal(c0),
    //                         c.i64_const(0xFFFFFFFF)
    //                     ),
    //                     c.i64_const(1)
    //                 )
    //             )
    //         );

    //         f.addCode(
    //             c.setLocal(c1,
    //                 c.i64_add(
    //                     c.i64_shl(
    //                         c.getLocal(c1),
    //                         c.i64_const(1)
    //                     ),
    //                     c.i64_shr_u(
    //                         c.getLocal(c0),
    //                         c.i64_const(32)
    //                     )
    //                 )
    //             )
    //         );

    //         if (k%2 == 0) {
    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulij(k>>1, k>>1)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }

    //         // Add the old carry

    //         if (k>0) {
    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         c.i64_and(
    //                             c.getLocal(c0_old),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.i64_add(
    //                             c.getLocal(c1),
    //                             c.i64_shr_u(
    //                                 c.getLocal(c0),
    //                                 c.i64_const(32)
    //                             )
    //                         ),
    //                         c.getLocal(c1_old)
    //                     )
    //                 )
    //             );
    //         }


    //         for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
    //             const j= k-i;

    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulqm(i,j)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }
    //         if (k<n32) {
    //             f.addCode(
    //                 c.setLocal(
    //                     "m"+k,
    //                     c.i64_and(
    //                         c.i64_mul(
    //                             c.i64_and(
    //                                 c.getLocal(c0),
    //                                 c.i64_const(0xFFFFFFFF)
    //                             ),
    //                             c.getLocal("np32")
    //                         ),
    //                         c.i64_const("0xFFFFFFFF")
    //                     )
    //                 )
    //             );


    //             f.addCode(
    //                 c.setLocal(c0,
    //                     c.i64_add(
    //                         c.i64_and(
    //                             c.getLocal(c0),
    //                             c.i64_const(0xFFFFFFFF)
    //                         ),
    //                         mulqm(0,k)
    //                     )
    //                 )
    //             );

    //             f.addCode(
    //                 c.setLocal(c1,
    //                     c.i64_add(
    //                         c.getLocal(c1),
    //                         c.i64_shr_u(
    //                             c.getLocal(c0),
    //                             c.i64_const(32)
    //                         )
    //                     )
    //                 )
    //             );
    //         }

    //         if (k>=n32) {
    //             f.addCode(
    //                 c.i64_store32(
    //                     c.getLocal("r"),
    //                     (k-n32)*4,
    //                     c.getLocal(c0)
    //                 )
    //             );
    //         }
    //         f.addCode(
    //             c.setLocal(
    //                 c0_old,
    //                 c.getLocal(c1)
    //             ),
    //             c.setLocal(
    //                 c1_old,
    //                 c.i64_shr_u(
    //                     c.getLocal(c0_old),
    //                     c.i64_const(32)
    //                 )
    //             )
    //         );
    //     }
    //     f.addCode(
    //         c.i64_store32(
    //             c.getLocal("r"),
    //             n32*4-4,
    //             c.getLocal(c0_old)
    //         )
    //     );

    //     f.addCode(
    //         c.if(
    //             c.i32_wrap_i64(c.getLocal(c1_old)),
    //             c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
    //             c.if(
    //                 c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
    //                 c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
    //             )
    //         )
    //     );
    // }

    function buildSquare() {

        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
    }

    function buildToMontgomery() {
        // 30 limb
        const pR2_30limb = module.alloc(utils.bigInt2BytesLE(square(1n << BigInt(13*30)) % q, n8));
        const f = module.addFunction(prefix+"_toMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(prefix+"_mul", c.getLocal("x"), c.i32_const(pR2_30limb), c.getLocal("r")));
    }

    function buildFromMontgomery() {
        // 30 limb
        const pAux2 = module.alloc(n8);

        const f = module.addFunction(prefix+"_fromMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(intPrefix + "_one", c.i32_const(pAux2) ));
        f.addCode(c.call(prefix+"_mul", c.getLocal("x"), c.i32_const(pAux2), c.getLocal("r")));

    }

    // function buildFromMontgomery() { 

    //     const pAux2 = module.alloc(n8*2);

    //     const f = module.addFunction(prefix+"_fromMontgomery");
    //     f.addParam("x", "i32");
    //     f.addParam("r", "i32");

    //     const c = f.getCodeBuilder();
    //     f.addCode(c.call(intPrefix + "_copy", c.getLocal("x"), c.i32_const(pAux2) ));
    //     f.addCode(c.call(intPrefix + "_zero", c.i32_const(pAux2 + n8) ));
    //     f.addCode(c.call(prefix+"_mReduct", c.i32_const(pAux2), c.getLocal("r")));
    // }

    // function buildToMontgomery() {
    //     const f = module.addFunction(prefix+"_toMontgomery");
    //     f.addParam("x", "i32");
    //     f.addParam("r", "i32");

    //     const c = f.getCodeBuilder();
    //     f.addCode(c.call(prefix+"_mul", c.getLocal("x"), c.i32_const(pR2), c.getLocal("r")));
    // }
    
    

    function buildInverse() {

        const f = module.addFunction(prefix+ "_inverse");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(prefix + "_fromMontgomery", c.getLocal("x"), c.getLocal("r")));
        f.addCode(c.call(intPrefix + "_inverseMod", c.getLocal("r"), c.i32_const(pq), c.getLocal("r")));
        f.addCode(c.call(prefix + "_toMontgomery", c.getLocal("r"), c.getLocal("r")));
    }

    // Calculate various valuse needed for sqrt


    let _nqr = 2n;
    if (isPrime(q)) {
        while (modPow(_nqr, _e, q) !== _minusOne) _nqr = _nqr + 1n;
    }

    let s2 = 0;
    let _t = _minusOne;

    while ((!isOdd(_t))&&(_t !== 0n)) {
        s2++;
        _t = _t >> 1n;
    }
    const pt = module.alloc(n8, utils.bigInt2BytesLE(_t, n8));

    const _nqrToT = modPow(_nqr, _t, q);
    const pNqrToT = module.alloc(utils.bigInt2BytesLE((_nqrToT << BigInt(n64*64)) % q, n8));

    const _tPlusOneOver2 = (_t + 1n) >> 1n;
    const ptPlusOneOver2 = module.alloc(n8, utils.bigInt2BytesLE(_tPlusOneOver2, n8));

    function buildSqrt() {

        const f = module.addFunction(prefix+ "_sqrt");
        f.addParam("n", "i32");
        f.addParam("r", "i32");
        f.addLocal("m", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");

        const c = f.getCodeBuilder();

        const ONE = c.i32_const(pOne);
        const C = c.i32_const(module.alloc(n8));
        const T = c.i32_const(module.alloc(n8));
        const R = c.i32_const(module.alloc(n8));
        const SQ = c.i32_const(module.alloc(n8));
        const B = c.i32_const(module.alloc(n8));

        f.addCode(

            // If (n==0) return 0
            c.if(
                c.call(prefix + "_isZero", c.getLocal("n")),
                c.ret(
                    c.call(prefix + "_zero", c.getLocal("r"))
                )
            ),

            c.setLocal("m", c.i32_const(s2)),
            c.call(prefix + "_copy", c.i32_const(pNqrToT), C),
            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(pt), c.i32_const(n8), T),
            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(ptPlusOneOver2), c.i32_const(n8), R),

            c.block(c.loop(
                c.br_if(1, c.call(prefix + "_eq", T, ONE)),

                c.call(prefix + "_square", T, SQ),
                c.setLocal("i", c.i32_const(1)),
                c.block(c.loop(
                    c.br_if(1, c.call(prefix + "_eq", SQ, ONE)),
                    c.call(prefix + "_square", SQ, SQ),
                    c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                    c.br(0)
                )),

                c.call(prefix + "_copy", C, B),
                c.setLocal("j", c.i32_sub(c.i32_sub( c.getLocal("m"), c.getLocal("i")), c.i32_const(1)) ),
                c.block(c.loop(
                    c.br_if(1, c.i32_eqz(c.getLocal("j"))),
                    c.call(prefix + "_square", B, B),
                    c.setLocal("j", c.i32_sub(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),

                c.setLocal("m", c.getLocal("i")),
                c.call(prefix + "_square", B, C),
                c.call(prefix + "_mul", T, C, T),
                c.call(prefix + "_mul", R, B, R),

                c.br(0)
            )),

            c.if(
                c.call(prefix + "_isNegative", R),
                c.call(prefix + "_neg", R, c.getLocal("r")),
                c.call(prefix + "_copy", R, c.getLocal("r")),
            )
        );
    }

    function buildIsSquare() {
        const f = module.addFunction(prefix+"_isSquare");
        f.addParam("n", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const ONE = c.i32_const(pOne);
        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("n")),
                c.ret(c.i32_const(1))
            ),
            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(pe), c.i32_const(n8), AUX),
            c.call(prefix + "_eq", AUX, ONE)
        );
    }


    function buildLoad() {
        const f = module.addFunction(prefix+"_load");
        f.addParam("scalar", "i32");
        f.addParam("scalarLen", "i32");
        f.addParam("r", "i32");
        f.addLocal("p", "i32");
        f.addLocal("l", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        const c = f.getCodeBuilder();

        const R = c.i32_const(module.alloc(n8));
        const pAux = module.alloc(n8);
        const AUX = c.i32_const(pAux);

        f.addCode(
            c.call(intPrefix + "_zero", c.getLocal("r")),
            c.setLocal("i", c.i32_const(n8)),
            c.setLocal("p", c.getLocal("scalar")),
            c.block(c.loop(
                c.br_if(1, c.i32_gt_u(c.getLocal("i"), c.getLocal("scalarLen"))),

                c.if(
                    c.i32_eq(c.getLocal("i"), c.i32_const(n8)),
                    c.call(prefix + "_one", R),
                    c.call(prefix + "_mul", R, c.i32_const(pR2), R)
                ),
                c.call(prefix + "_mul", c.getLocal("p"), R, AUX),
                c.call(prefix + "_add", c.getLocal("r"), AUX, c.getLocal("r")),

                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(n8))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(n8))),
                c.br(0)
            )),

            c.setLocal("l", c.i32_rem_u( c.getLocal("scalarLen"), c.i32_const(n8))),
            c.if(c.i32_eqz(c.getLocal("l")), c.ret([])),
            c.call(intPrefix + "_zero", AUX),
            c.setLocal("j", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("l"))),

                c.i32_store8(
                    c.getLocal("j"),
                    pAux,
                    c.i32_load8_u(c.getLocal("p")),
                ),
                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(1))),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),

            c.if(
                c.i32_eq(c.getLocal("i"), c.i32_const(n8)),
                c.call(prefix + "_one", R),
                c.call(prefix + "_mul", R, c.i32_const(pR2), R)
            ),
            c.call(prefix + "_mul", AUX, R, AUX),
            c.call(prefix + "_add", c.getLocal("r"), AUX, c.getLocal("r")),
        );
    }

    function buildTimesScalar() {
        const f = module.addFunction(prefix+"_timesScalar");
        f.addParam("x", "i32");
        f.addParam("scalar", "i32");
        f.addParam("scalarLen", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call(prefix + "_load", c.getLocal("scalar"), c.getLocal("scalarLen"), AUX),
            c.call(prefix + "_toMontgomery", AUX, AUX),
            c.call(prefix + "_mul", c.getLocal("x"), AUX, c.getLocal("r")),
        );
    }

    function buildIsOne() {
        const f = module.addFunction(prefix+"_isOne");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();
        f.addCode(
            c.ret(c.call(intPrefix + "_eq", c.getLocal("x"), c.i32_const(pOne)))
        );
    }


    module.exportFunction(intPrefix + "_copy", prefix+"_copy");
    module.exportFunction(intPrefix + "_zero", prefix+"_zero");
    module.exportFunction(intPrefix + "_isZero", prefix+"_isZero");
    module.exportFunction(intPrefix + "_eq", prefix+"_eq");

    buildIsOne();
    buildAdd();
    buildSub();
    buildNeg();
    buildMReduct();
    buildMul();
    buildSquare();
    //buildSquareOld();
    buildToMontgomery();
    buildFromMontgomery();
    buildIsNegative();
    buildSign();
    buildInverse();
    buildOne();
    buildLoad();
    buildTimesScalar();
    buildBatchInverse(module, prefix);
    buildBatchConvertion(module, prefix + "_batchToMontgomery", prefix + "_toMontgomery", n8, n8);
    buildBatchConvertion(module, prefix + "_batchFromMontgomery", prefix + "_fromMontgomery", n8, n8);
    buildBatchConvertion(module, prefix + "_batchNeg", prefix + "_neg", n8, n8);
    buildBatchOp(module, prefix + "_batchAdd", prefix + "_add", n8, n8);
    buildBatchOp(module, prefix + "_batchSub", prefix + "_sub", n8, n8);
    buildBatchOp(module, prefix + "_batchMul", prefix + "_mul", n8, n8);

    // buildMul_30bit();
    // module.exportFunction(prefix + "_30bitMul");

    module.exportFunction(prefix + "_add");
    module.exportFunction(prefix + "_sub");
    module.exportFunction(prefix + "_neg");
    module.exportFunction(prefix + "_isNegative");
    module.exportFunction(prefix + "_isOne");
    module.exportFunction(prefix + "_sign");
    module.exportFunction(prefix + "_mReduct");
    module.exportFunction(prefix + "_mul");
    module.exportFunction(prefix + "_square");
    //module.exportFunction(prefix + "_squareOld");
    module.exportFunction(prefix + "_fromMontgomery");
    module.exportFunction(prefix + "_toMontgomery");
    module.exportFunction(prefix + "_inverse");
    module.exportFunction(prefix + "_one");
    module.exportFunction(prefix + "_load");
    module.exportFunction(prefix + "_timesScalar");
    buildExp(
        module,
        prefix + "_exp",
        n8,
        prefix + "_mul",
        prefix + "_square",
        intPrefix + "_copy",
        prefix + "_one",
    );
    module.exportFunction(prefix + "_exp");
    module.exportFunction(prefix + "_batchInverse");
    if (isPrime(q)) {
        buildSqrt();
        buildIsSquare();
        module.exportFunction(prefix + "_sqrt");
        module.exportFunction(prefix + "_isSquare");
    }
    module.exportFunction(prefix + "_batchToMontgomery");
    module.exportFunction(prefix + "_batchFromMontgomery");
    // console.log(module.functionIdxByName);

    return prefix;
};
