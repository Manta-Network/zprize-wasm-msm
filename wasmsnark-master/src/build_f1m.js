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

const bigInt = require("big-integer");
const buildInt = require("./build_int.js");
const utils = require("./utils.js");
const buildExp = require("./build_timesscalar");

module.exports = function buildF1m(module, _q, _prefix, _intPrefix) {
    const q = bigInt(_q);
    const n64 = Math.floor((q.minus(1).bitLength() - 1)/64) +1;
    const n32 = n64*2;
    const n8 = n64*8;

    const prefix = _prefix || "f1m";
    if (module.modules[prefix]) return prefix;  // already builded

    const intPrefix = buildInt(module, n64, _intPrefix);
    const pq = module.alloc(n8, utils.bigInt2BytesLE(q, n8));

    const pR = module.alloc(utils.bigInt2BytesLE(bigInt.one.shiftLeft(n64*64).mod(q), n8));
    const pR2 = module.alloc(utils.bigInt2BytesLE(bigInt.one.shiftLeft(n64*64).square().mod(q), n8));
    const pOne = module.alloc(utils.bigInt2BytesLE(bigInt.one.shiftLeft(n64*64).mod(q), n8));
    const pZero = module.alloc(utils.bigInt2BytesLE(bigInt.zero, n8));
    const _minusOne = q.minus(bigInt.one);
    const _e = _minusOne.shiftRight(1); // e = (p-1)/2
    const pe = module.alloc(n8, utils.bigInt2BytesLE(_e, n8));

    const _ePlusOne = _e.add(bigInt.one); // e = (p-1)/2
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
        const f = module.addFunction(prefix+"_one");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(intPrefix + "_copy", c.i32_const(pOne), c.getLocal("pr")));
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

/*
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
*/


    function buildIsNegative() {
        const f = module.addFunction(prefix+"_isNegative");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
            c.i32_and(
                c.i32_load(AUX),
                c.i32_const(1)
            )
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

        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();

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



    function buildMul() {

        const f = module.addFunction(prefix+"_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");
        f.addLocal("np32", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
            f.addLocal("m"+i, "i64");
            f.addLocal("q"+i, "i64");
        }

        const c = f.getCodeBuilder();

        // np32 = 4294967295 = FFFFFFFF = 100000000 - 1 
        // q 52435875175126190479447740508185965837690552500527637822603658699938581184513
        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();
        
        //console.log("pq "+ pq.toString(16));
        


        f.addCode(c.setLocal("np32", c.i64_const(np32)));



        const loadX = [];
        const loadY = [];
        const loadQ = [];
        function mulij(i, j) {
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }

            return c.i64_mul( X, Y );
        }

        function mulqm(i, j) {
            let Q,M;
            if (!loadQ[i]) {
                // get corresponding q (offset i*4)
                Q = c.teeLocal("q"+i, c.i64_load32_u(  c.i32_const(0),pq+i*4 ));
                loadQ[i] = true;
            } else {
                Q = c.getLocal("q"+i);
            }
            M = c.getLocal("m"+j);

            return c.i64_mul( Q, M );
        }


        let c0 = "c0";
        let c1 = "c1";

    
 
        // console.log(c.i32_const(0));
        // console.log(pq+1);
        // console.log(c.i64_load32_u(c.i32_const(0), pq+4  ));
        // console.log(n64);
        // console.log(bigInt.one.shiftLeft(n64*64).square().mod(q));
        // f.addCode(
        //     c.i64_store32(
        //         c.getLocal("r"),
        //         0,
        //         c.i64_load32_u(c.i32_const(0), 504  )
        //     )
        // )
        // c.setLocal("r",
        //     c.i64_load32_u(c.i32_const(0), pq+4  )
        // )

        // mul begin
        for (let k=0; k<n32*2-1; k++) {
            // calculate pos k results
            // this takes 
            for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
                
                const j= k-i;
                
                // c0 = (c0 & 0xFFFFFFFF) + x_i * y_j
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                // c1 = c1 + (c0 >> 32)
                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }// finsih calculate pos k

            // below takes 60ms
            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                // c0 = (c0 & 0xFFFFFFFF) + q_i * mj
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(i,j)
                        )
                    )
                );

                // c1 = c1 + (c0 >> 32)
                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            
            if (k<n32) {
                // mk =  ((c0 & 0xFFFFFFFF) * np32 ) & 0xFFFFFFFF 
                f.addCode(
                    c.setLocal(
                        "m"+k,
                        c.i64_and(
                            c.i64_mul(
                                c.i64_and(
                                    c.getLocal(c0),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                c.getLocal("np32")
                            ),
                            c.i64_const("0xFFFFFFFF")
                        )
                    ) // set mk
                );

                // c0 = (c0 & 0xFFFFFFFF) +  q_0 * mk     
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(0,k)
                        )
                    )
                ); // set c0

                // c1 = c1 + c0>>32
                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            } // k<n32 end


            // r_{(k-n32)*4} = c0
            if (k>=n32) {
                f.addCode(
                    c.i64_store32(
                        c.getLocal("r"),
                        (k-n32)*4,
                        c.getLocal(c0)
                    )
                );
            } // k>=n32 end

            // for next loop
            [c0, c1] = [c1, c0];
            f.addCode(
                c.setLocal(c1,
                    c.i64_shr_u(
                        c.getLocal(c0),
                        c.i64_const(32)
                    )
                )
            );
        }// loop over all k end

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4-4,
                c.getLocal(c0)
            )
        );

        f.addCode(
            c.if(
                c.i32_wrap_i64(c.getLocal(c1)),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );
    }


    function buildSquare() {

        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");
        f.addLocal("c0_old", "i64");
        f.addLocal("c1_old", "i64");
        f.addLocal("np32", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("m"+i, "i64");
            f.addLocal("q"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();

        f.addCode(c.setLocal("np32", c.i64_const(np32)));


        const loadX = [];
        const loadQ = [];
        function mulij(i, j) {
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadX[j]) {
                Y = c.teeLocal("x"+j, c.i64_load32_u( c.getLocal("x"), j*4));
                loadX[j] = true;
            } else {
                Y = c.getLocal("x"+j);
            }

            return c.i64_mul( X, Y );
        }

        function mulqm(i, j) {
            let Q,M;
            if (!loadQ[i]) {
                Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
                loadQ[i] = true;
            } else {
                Q = c.getLocal("q"+i);
            }
            M = c.getLocal("m"+j);

            return c.i64_mul( Q, M );
        }


        let c0 = "c0";
        let c1 = "c1";
        let c0_old = "c0_old";
        let c1_old = "c1_old";

        for (let k=0; k<n32*2-1; k++) {
            f.addCode(
                c.setLocal(c0, c.i64_const(0)),
                c.setLocal(c1, c.i64_const(0)),
            );
            for (let i=Math.max(0, k-n32+1); (i<((k+1)>>1) )&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            // Multiply by 2
            f.addCode(
                c.setLocal(c0,
                    c.i64_shl(
                        c.i64_and(
                            c.getLocal(c0),
                            c.i64_const(0xFFFFFFFF)
                        ),
                        c.i64_const(1)
                    )
                )
            );

            f.addCode(
                c.setLocal(c1,
                    c.i64_add(
                        c.i64_shl(
                            c.getLocal(c1),
                            c.i64_const(1)
                        ),
                        c.i64_shr_u(
                            c.getLocal(c0),
                            c.i64_const(32)
                        )
                    )
                )
            );

            if (k%2 == 0) {
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(k>>1, k>>1)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            // Add the old carry

            if (k>0) {
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            c.i64_and(
                                c.getLocal(c0_old),
                                c.i64_const(0xFFFFFFFF)
                            ),
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.i64_add(
                                c.getLocal(c1),
                                c.i64_shr_u(
                                    c.getLocal(c0),
                                    c.i64_const(32)
                                )
                            ),
                            c.getLocal(c1_old)
                        )
                    )
                );
            }


            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }
            if (k<n32) {
                f.addCode(
                    c.setLocal(
                        "m"+k,
                        c.i64_and(
                            c.i64_mul(
                                c.i64_and(
                                    c.getLocal(c0),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                c.getLocal("np32")
                            ),
                            c.i64_const("0xFFFFFFFF")
                        )
                    )
                );


                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(0,k)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            if (k>=n32) {
                f.addCode(
                    c.i64_store32(
                        c.getLocal("r"),
                        (k-n32)*4,
                        c.getLocal(c0)
                    )
                );
            }
            f.addCode(
                c.setLocal(
                    c0_old,
                    c.getLocal(c1)
                ),
                c.setLocal(
                    c1_old,
                    c.i64_shr_u(
                        c.getLocal(c0_old),
                        c.i64_const(32)
                    )
                )
            );
        }
        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4-4,
                c.getLocal(c0_old)
            )
        );

        f.addCode(
            c.if(
                c.i32_wrap_i64(c.getLocal(c1_old)),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );
    }


    function buildSquareOld() {
        const f = module.addFunction(prefix+"_squareOld");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
    }

    function buildToMontgomery() {
        const f = module.addFunction(prefix+"_toMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(prefix+"_mul", c.getLocal("x"), c.i32_const(pR2), c.getLocal("r")));
    }

    function buildFromMontgomery() {

        const pAux2 = module.alloc(n8*2);

        const f = module.addFunction(prefix+"_fromMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(intPrefix + "_copy", c.getLocal("x"), c.i32_const(pAux2) ));
        f.addCode(c.call(intPrefix + "_zero", c.i32_const(pAux2 + n8) ));
        f.addCode(c.call(prefix+"_mReduct", c.i32_const(pAux2), c.getLocal("r")));
    }

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


    let _nqr = bigInt(2);
    if (q.isPrime()) {
        while (!_nqr.modPow(_e, q).equals(_minusOne)) _nqr = _nqr.add(bigInt.one);
    }

    const pnqr = module.alloc(utils.bigInt2BytesLE(_nqr.shiftLeft(n64*64).mod(q), n8));

    let s2 = 0;
    let _t = _minusOne;

    while ((!_t.isOdd())&&(!_t.isZero())) {
        s2++;
        _t = _t.shiftRight(1);
    }
    const pt = module.alloc(n8, utils.bigInt2BytesLE(_t, n8));

    const _nqrToT = _nqr.modPow(_t, q);
    const pNqrToT = module.alloc(utils.bigInt2BytesLE(_nqrToT.shiftLeft(n64*64).mod(q), n8));

    const _tPlusOneOver2 = _t.add(1).shiftRight(1);
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


    function buildCacheMulF1m() {

        const f = module.addFunction(prefix+"_cachemulf1m");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");
        f.addLocal("np32", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
            f.addLocal("m"+i, "i64");
            f.addLocal("q"+i, "i64");
        }

        const c = f.getCodeBuilder();

        // np32 = 4294967295 = FFFFFFFF = 100000000 - 1 
        // q 52435875175126190479447740508185965837690552500527637822603658699938581184513
        const np32 = bigInt("100000000",16).minus( q.modInv(bigInt("100000000",16))).toJSNumber();
        
        //console.log("pq "+ pq.toString(16));
        


        f.addCode(c.setLocal("np32", c.i64_const(np32)));



        const loadX = [];
        const loadY = [];
        const loadQ = [];
        function mulij(i, j) { //30ms
            //return c.i64_const(123);
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            return c.i64_mul( X, Y );
            
        }

        function mulqm(i, j) { //30ms
            //return c.i64_const(111);

            let Q,M;
            if (!loadQ[i]) {
                // get corresponding q (offset i*4)
                Q = c.teeLocal("q"+i, c.i64_load32_u(  c.i32_const(0),pq+i*4 ));
                loadQ[i] = true;
            } else {
                Q = c.getLocal("q"+i);
            }
            M = c.getLocal("m"+j);

            return c.i64_mul( Q, M );
        }


        let c0 = "c0";
        let c1 = "c1";

    
 
        // console.log(c.i32_const(0));
        // console.log(pq+1);
        // console.log(c.i64_load32_u(c.i32_const(0), pq+4  ));
        // console.log(n64);
        // console.log(bigInt.one.shiftLeft(n64*64).square().mod(q));
        // f.addCode(
        //     c.i64_store32(
        //         c.getLocal("r"),
        //         0,
        //         c.i64_load32_u(c.i32_const(0), 504  )
        //     )
        // )
        // c.setLocal("r",
        //     c.i64_load32_u(c.i32_const(0), pq+4  )
        // )

        // mul begin
        for (let k=0; k<n32*2-1; k++) {
            // calculate pos k results
            // this takes 
            for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
                
                const j= k-i;
                
                // c0 = (c0 & 0xFFFFFFFF) + x_i * y_j
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                // c1 = c1 + (c0 >> 32)
                f.addCode(
                    c.setLocal(c1,
                        
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }// finsih calculate pos k

            // below takes 60ms
            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                // c0 = (c0 & 0xFFFFFFFF) + q_i * mj
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(i,j)
                        )
                    )
                );

                // c1 = c1 + (c0 >> 32)
                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            
            if (k<n32) {
                // mk =  ((c0 & 0xFFFFFFFF) * np32 ) & 0xFFFFFFFF 
                f.addCode(
                    c.setLocal(
                        "m"+k,
                        c.i64_and(
                            c.i64_mul(
                                c.i64_and(
                                    c.getLocal(c0),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                c.getLocal("np32")
                            ),
                            c.i64_const("0xFFFFFFFF")
                        )
                    ) // set mk
                );

                // c0 = (c0 & 0xFFFFFFFF) +  q_0 * mk     
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(0,k)
                        )
                    )
                ); // set c0

                // c1 = c1 + c0>>32
                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            } // k<n32 end


            // r_{(k-n32)*4} = c0
            if (k>=n32) {
                f.addCode(
                    c.i64_store32(
                        c.getLocal("r"),
                        (k-n32)*4,
                        c.getLocal(c0)
                    )
                );
            } // k>=n32 end

            // for next loop
            [c0, c1] = [c1, c0];
            f.addCode(
                c.setLocal(c1,
                    c.i64_shr_u(
                        c.getLocal(c0),
                        c.i64_const(32)
                    )
                )
            );
        }// loop over all k end

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4-4,
                c.getLocal(c0)
            )
        );

        f.addCode(
            c.if(
                c.i32_wrap_i64(c.getLocal(c1)),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );

    }

    function buildCacheMul() {

        const f = module.addFunction(prefix+"_cachemul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i, "i64");
        }
        f.addLocal("tmp2","i64")
        f.addLocal("tmp3","i32")
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        // for(let i=0; i<n32;i++){
        //     f.addCode(c.setLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4)));
            
            
        //     //f.addCode(c.drop(c.getLocal("x")))
        //     //f.addCode(c.drop(c.i64_load32_u( c.getLocal("x"), i*4)))
        //     //f.addCode(c.setLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4)));

        //     //f.addCode(c.setLocal("x"+i, c.i64_const(i)));
        // }
        // for(let i=0; i<n32;i++){
        //     f.addCode(c.setLocal("y"+i, c.i64_load32_u( c.getLocal("y"), i*4)));
        //     //f.addCode(c.setLocal("y"+i, c.i64_const(i+11111)));
        // }
        
        
        
        function mulij(i, j) { // 270 -> 35ms if return const(1)
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            // f.addCode(c.drop(c.getLocal("y"+0)))
            // f.addCode(c.drop(c.getLocal("y"+1)))
            // f.addCode(c.drop(c.getLocal("y"+2)))
            // f.addCode(c.drop(c.getLocal("y"+0)))
            // f.addCode(c.drop(c.getLocal("y"+1)))
            // f.addCode(c.drop(c.getLocal("y"+2)))
            // f.addCode(c.drop(c.getLocal("y"+0)))
            // f.addCode(c.drop(c.getLocal("y"+1)))
            // f.addCode(c.drop(c.getLocal("y"+2)))
            // f.addCode(c.drop(c.i64_mul(c.getLocal("y"+i), c.getLocal("y"+j))))
            // X = c.getLocal("x"+i);
            // Y = c.getLocal("y"+j);
            //console.log(c.getLocal("y"+j));
            // change i64_mul to i64_add, no improvement
            //return c.i64_mul( X, Y ); //240-270
            //console.log(c.i64_mul( c.i64_const(0x3), c.i64_const(0x4) ))
            //return c.i64_mul( X, c.i64_const(0x4321) )//117
            //return c.i64_mul( c.i64_const(0x1234), c.i64_const(0x4321) ); //38
            //return c.i64_mul(c.getLocal("x"+i), c.getLocal("y"+j))//33 全是0

            //return c.i64_mul(X,c.i64_mul(X,c.i64_mul(X,c.i64_mul(X,Y))))//447,478
            //return c.i64_mul(X,c.i64_mul(X,c.i64_mul(X,Y)))//364
            //return c.i64_mul(Y,c.i64_mul(X,c.i64_mul(X,Y)))//370
            //return c.i64_mul(c.i64_mul(X,Y),c.i64_mul(X,Y))///370
            return c.i64_mul(X,c.i64_mul(X,Y))//300
            
            
            // return c.i64_and( X, Y ); //250
            return c.i64_mul( X, Y ); // 250
            //return c.i64_const(1);//32
        }
        console.log("n32 in f1m cache mul:"+ n32)
        for (let i=0; i<n32*2-1; i++) {

            f.addLocal("tmp_i64"+i,"i64");
        }
            

        for(let i = 0;i < n32;i++){
            for(let j = 0; j< n32 ; j++){ // store 
                if(j==0 || i == n32-1){
                    if(i==0){  //(0,0)
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                0,  
                                c.teeLocal(
                                    "r0",       
                                    c.i64_and(// mulij low 32bit 
                                        c.i64_const(0xFFFFFFFF),
                                        c.teeLocal(
                                            "tmp",
                                            mulij(i,j)
                                        )
                                    )    
                                )
                            )
                        )
                        // 012345678
                        f.addCode(
                            c.setLocal(
                                "r1",
                                c.i64_add(
                                    c.getLocal("r1"),
                                    c.i64_shr_u(
                                        c.getLocal("tmp"),
                                        c.i64_const(32)
                                    )
                                )
                            )
                        )
                    }
                    else if(j==0 && i == 1){ // store (1,0)
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                (i+j)*4,  
                                c.teeLocal(
                                    "r"+(i+j),
                                    c.i64_add( 
                                        c.getLocal("r"+(i+j)),// accumulated r_ij
                                        c.i64_and(// mulij low 32bit 
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp",
                                                mulij(i,j)
                                            )
                                        )
                                    )   
                                )
                            )
                        )
                        // 012345678
                        f.addCode(
                            c.setLocal(
                                "r"+(i+j+1),
                                c.i64_add(
                                    c.getLocal("r"+(i+j+1)),
                                    c.i64_shr_u(
                                        c.getLocal("tmp"),
                                        c.i64_const(32)
                                    )
                                )
                            )
                        )
                    }
                    
                    else{  // store (i,0) - (0,0) - (1,0)
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                (i+j)*4,  
                                c.teeLocal(
                                    "r"+(i+j),
                                    c.i64_add(// merge i+j-1 to i+j
                                        c.i64_add( 
                                            c.getLocal("r"+(i+j)),// accumulated r_ij
                                            c.i64_and(// mulij low 32bit 
                                                c.i64_const(0xFFFFFFFF),
                                                c.teeLocal(
                                                    "tmp",
                                                    mulij(i,j)
                                                )
                                            )
                                        ),
                                        c.i64_shr_u(
                                            c.getLocal("r"+(i+j-1)),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        )
                        
                        // f.addCode(
                        //         c.setLocal(
                        //             "tmp2",
                        //             c.i64_add(// merge i+j-1 to i+j
                        //                 c.i64_add( 
                        //                     c.getLocal("r"+(i+j)),// accumulated r_ij
                        //                     c.i64_and(// mulij low 32bit 
                        //                         c.i64_const(0xFFFFFFFF),
                        //                         c.teeLocal(
                        //                             "tmp",
                        //                             mulij(i,j)
                        //                         )
                        //                     )
                        //                 ),
                        //                 c.i64_shr_u(
                        //                     c.getLocal("r"+(i+j-1)),
                        //                     c.i64_const(32)
                        //                 )
                        //             )
                        //         )   
                        // )
                        // f.addCode(
                        //     c.setLocal(
                        //       "tmp3",
                        //          //(i+j)*4,  
                        //          c.i32_wrap_i64(c.getLocal("tmp2"))
                        //          //c.getLocal("tmp2")
                        //      )
                        //  )
                        // //  f.addCode(
                        // //     c.drop(
                        // //         c.i32_load(
                        // //             c.getLocal("r"),
                        // //             (i+j)*4
                        // //         )
                        // //     )
                        // //  )
                        //  f.addCode(
                        //     c.i32_store(
                        //         c.getLocal("r"),
                        //            (i+j)*4,  
                        //            c.getLocal("tmp3")
                        //        )
                        //  )
                        
                        
                        
                        // 012345678
                        f.addCode(
                            c.setLocal(
                                "r"+(i+j+1),
                                c.i64_add(
                                    c.getLocal("r"+(i+j+1)),
                                    c.i64_shr_u(
                                        c.getLocal("tmp"),
                                        c.i64_const(32)
                                    )
                                )
                            )
                        )
                    }
                }
                else{ // we dont need to store
                    f.addCode(
                        c.setLocal(
                            "r"+(i+j),
                            c.i64_add(
                                c.getLocal("r"+(i+j)),
                                c.i64_and(
                                    c.i64_const(0xFFFFFFFF),
                                    c.teeLocal(
                                        "tmp",
                                        mulij(i,j)
                                    )
                                )
                            )
                        )
                    )
                    // 012345678
                    f.addCode(
                        c.setLocal(
                            "r"+(i+j+1),
                            c.i64_add(
                                c.getLocal("r"+(i+j+1)),
                                c.i64_shr_u(
                                    c.getLocal("tmp"),
                                    c.i64_const(32)
                                )
                            )
                        )
                    )
                }
                
            }
        }
 

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,

                c.i64_add(
                    c.getLocal("r"+(n32*2-1)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-2)),
                        c.i64_const(32)
                    )
                )                             
            )
        );

        // f.addCode(
        //     c.i64_store32(
        //         c.getLocal("r"),
        //         n32*4*2-32,

        //         c.i64_add(
        //             c.getLocal("r"+(n32*2-1)),
        //             c.i64_shr_u(
        //                 c.getLocal("r"+(n32*2-2)),
        //                 c.i64_const(32)
        //             )
        //         )                             
        //     )
        // );
        // f.addCode(
        //     c.i64_store32(
        //         c.getLocal("r"),
        //         n32*4*2-40,

        //         c.i64_add(
        //             c.getLocal("r"+(n32*2-1)),
        //             c.i64_shr_u(
        //                 c.getLocal("r"+(n32*2-2)),
        //                 c.i64_const(32)
        //             )
        //         )                             
        //     )
        // );
        // f.addCode(
        //     c.i64_store32(
        //         c.getLocal("r"),
        //         n32*4*2-48,

        //         c.i64_add(
        //             c.getLocal("r"+(n32*2-1)),
        //             c.i64_shr_u(
        //                 c.getLocal("r"+(n32*2-2)),
        //                 c.i64_const(32)
        //             )
        //         )                             
        //     )
        // );
        
        
        // test mul and get set local
        // without following code: 250-270
        // 8*8         =64 : 358
        // 7*13(n32+6)=112:  451
        // 60*2       =120: 431
        // 50*4       =200: 546
        // 160*2      =320: 800   
        // n32*n32        : 385,360,344
        // for (let j=0; j<n32; j++) {
        //     for (let i=0; i<n32; i++) {

        //         f.addCode(c.i64_store32(
        //             c.getLocal("r"),
        //             i*4,
        //             //c.getLocal("tmp_i64"+i),
        //             //c.i64_mul( c.getLocal("tmp_i64"+i), c.getLocal("tmp_i64"+(i+1)) )
        //             c.i64_mul( c.getLocal("r0"), c.getLocal("r1" ))
                    
        //         ));
        //     }
        // }

        // test get set local
        // without following code: 250-270
        // 2*8             =16: 303,254,261, 
        // 8*8             =64 : 339
        // 7(n32)*13(n32+6)=112:  426(mul)
        // 60*2            =120: 428(mul)
        // 50*4            =200: 536,633(mul)
        // 160*2           =320: 755(mul) 
        // n32*n32        : 360

        // for (let j=0; j<n32; j++) {
        //     for (let i=0; i<n32; i++) {

        //         f.addCode(c.i64_store32(
        //             c.getLocal("r"),
        //             i*4,
        //             //c.getLocal("tmp_i64"+i),
        //             //c.getLocal("tmp_i64"+i)
        //             c.getLocal("r0")
        //         ));
        //     }
        // }

        
    }

    function buildFullArrangeMul() {

        const f = module.addFunction(prefix+"_fullArrangeMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        // for (let i=0;i<=n32*2-1; i++) {
        //     f.addLocal("r"+i, "i64");
        // }
        f.addLocal("tmp2","i64")
        f.addLocal("tmp3","i32")

        for (let i=0;i<n32; i++) {
            for(let j=0;j<n32; j++){
                f.addLocal("r"+i+"-"+j, "i64");
            }
        }
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i+"_old", "i64");
        }
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i+"_new", "i64");
        }
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        
        
        
        function mulij(i, j) { 
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }

            return c.i64_mul( X, Y ); 
        }
        
        for (let i=0; i<n32; i++) {
            for(let j=0;j<n32;j++){
                f.addCode(
                    c.setLocal(
                        "r"+i+"-"+j,
                        mulij(i,j)
                    )
                )
            }
        }

        function recursionAdd_le_n32(i,j,n32){
            if(j>1){
                //console.log(i+" "+j)
                let adder = recursionAdd_le_n32(i+1,j-1,n32);
                
                return c.i64_add(
                            c.i64_add(
                                c.i64_and(
                                    c.getLocal("r"+i+"-"+j),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                adder
                            ),
                            c.i64_shr_u(
                                c.getLocal("r"+i+"-"+(j-1)),
                                c.i64_const(32)
                            )
                            
                        )
            }
            else if(j==1){
                //console.log(i+" "+j)
                return c.i64_add(
                        c.i64_add(
                            c.i64_and(
                                c.getLocal("r"+i+"-"+j),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            c.i64_shr_u(
                                c.getLocal("r"+i+"-"+(j-1)),
                                c.i64_const(32)
                            )
                        ),
                        c.i64_and(
                            c.getLocal("r"+(i+1)+"-"+(j-1)),
                            c.i64_const(0xFFFFFFFF)
                        ),
                    )
            }
        }

        function recursionAdd_ge_n32(i,j,n32){
            if(j<n32-1){
                let adder = recursionAdd_ge_n32(i-1,j+1,n32);
                return c.i64_add(
                            c.i64_add(
                                c.i64_and(
                                    c.getLocal("r"+i+"-"+j),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                adder
                            ),
                            c.i64_shr_u(
                                c.getLocal("r"+i+"-"+(j-1)),
                                c.i64_const(32)
                            )
                        )
            }
            else if(j==n32-1){
                return c.i64_add(
                        c.i64_add(
                            c.i64_and(
                                c.getLocal("r"+i+"-"+j),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            c.i64_shr_u(
                                c.getLocal("r"+i+"-"+(j-1)),
                                c.i64_const(32)
                            )
                        ),
                        c.i64_shr_u(
                            c.getLocal("r"+(i-1)+"-"+j),
                            c.i64_const(32)
                        ),
                    )
            }
        }
        // 1-7
        for (let i=1; i<=n32-1; i++) {
            f.addCode(
                c.setLocal(
                    "r"+i+"_old",
                    recursionAdd_le_n32(0,i,n32)
                )
            )
        }

        // 8-14            15
        for (let i=n32; i<n32*2-1; i++) {
            f.addCode(
                c.setLocal(
                    "r"+i+"_old",
                    recursionAdd_ge_n32(n32-1,i-n32+1,n32)
                    //recursionAdd_le_n32(0,i,n32)
                )
            )
        }

        // test add speed
        // for(let k=0;k<3;k++){
        //     for (let i=0; i<n32; i++) {
        //         for(let j=0;j<n32;j++)
        //             f.addCode(
        //                 c.setLocal(
        //                     "r"+j+"_old",
        //                     c.i64_add(
                               
        //                         c.i64_add(
        //                             c.getLocal("r"+i+"-"+j),
        //                             c.getLocal("r"+j+"-"+i)
        //                         ),
        //                         c.getLocal("r"+j+"_old")
        //                     )
        //                 )
        //             )
        //     }
        // }
        
        

        for (let i=1; i<=n32*2-1; i++) {
            f.addCode(
                c.setLocal(
                    "r"+i+"_new",
                    c.i64_add(
                        c.getLocal("r"+i+"_old"),
                        c.getLocal("r"+(i-1)+"_old")
                    )
                )
            )
        }

        for(let i =0; i<= n32*2-1;i++){
            f.addCode(
                c.i64_store32(
                    c.getLocal("r"),
                    i*4,
                    //n32*4*2-4,
                    c.i64_and(
                        c.getLocal("r"+i+"_new"),
                        c.i64_const(0xFFFFFFFF)
                    )                             
                )
            )   
        }
        
    }

    function buildSlideWindowMul() {

        const f = module.addFunction(prefix+"_slideWindowMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i, "i64");
        }
        f.addLocal("tmp2","i64")
        f.addLocal("tmp3","i32")
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        
        
        function mulij(i, j) { 
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            
            return c.i64_mul( X, Y ); 
            
        }
        
        for (let i=0; i<n32*2-1; i++) {

            f.addLocal("tmp_i64"+i,"i64");
        }

        let window_size = 2
            
        for(let i = 0;i < n32;i+=window_size){
            for(let j = 0; j<n32; j+=window_size){
                for(let ii = 0; ii<window_size;ii++){
                    for(let jj = 0;jj<window_size;jj++){
                        let pos_i = ii+i;
                        let pos_j = jj+j;

                        //console.log(pos_i+" "+pos_j);
                        
                        if(pos_j==0 || ((pos_i-ii) == n32-2 && jj==0 )){
                            if(pos_i==0){  //(0,0)
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        0,  
                                        c.teeLocal(
                                            "r0",       
                                            c.i64_and(// mulij low 32bit 
                                                c.i64_const(0xFFFFFFFF),
                                                c.teeLocal(
                                                    "tmp",
                                                    mulij(pos_i,pos_j)
                                                )
                                            )    
                                        )
                                    )
                                )
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r1",
                                        c.i64_add(
                                            c.getLocal("r1"),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                            else if(pos_j==0 && pos_i == 1){ // store (1,0)
                                //console.log(pos_i+" "+pos_j);
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        (pos_i+pos_j)*4,  
                                        c.teeLocal(
                                            "r"+(pos_i+pos_j),
                                            c.i64_add( 
                                                c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                c.i64_and(// mulij low 32bit 
                                                    c.i64_const(0xFFFFFFFF),
                                                    c.teeLocal(
                                                        "tmp",
                                                        mulij(pos_i,pos_j)
                                                    )
                                                )
                                            )   
                                        )
                                    )
                                )
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                            
                            else{  // store (i,0) - (0,0) - (1,0)
                                //console.log(pos_i+" "+pos_j);
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        (pos_i+pos_j)*4,  
                                        c.teeLocal(
                                            "r"+(pos_i+pos_j),
                                            c.i64_add(// merge i+j-1 to i+j
                                                c.i64_add( 
                                                    c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                    c.i64_and(// mulij low 32bit 
                                                        c.i64_const(0xFFFFFFFF),
                                                        c.teeLocal(
                                                            "tmp",
                                                            mulij(pos_i,pos_j)
                                                        )
                                                    )
                                                ),
                                                c.i64_shr_u(
                                                    c.getLocal("r"+(pos_i+pos_j-1)),
                                                    c.i64_const(32)
                                                )
                                            )
                                        )
                                    )
                                )
                                
                            
                                
                                
                                
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                        }
                        else{ // we dont need to store
                            f.addCode(
                                c.setLocal(
                                    "r"+(pos_i+pos_j),
                                    c.i64_add(
                                        c.getLocal("r"+(pos_i+pos_j)),
                                        c.i64_and(
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp",
                                                mulij(pos_i,pos_j)
                                            )
                                        )
                                    )
                                )
                            )
                            // 012345678
                            f.addCode(
                                c.setLocal(
                                    "r"+(pos_i+pos_j+1),
                                    c.i64_add(
                                        c.getLocal("r"+(pos_i+pos_j+1)),
                                        c.i64_shr_u(
                                            c.getLocal("tmp"),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        }

                    }//end for
                }
            }
        }
        
 
        f.addCode(//13ms
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-8,

                c.i64_add(
                    c.getLocal("r"+(n32*2-2)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-3)),
                        c.i64_const(32)
                    )
                )                             
            )
        );

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,

                c.i64_add(
                    c.getLocal("r"+(n32*2-1)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-2)),
                        c.i64_const(32)
                    )
                )                             
            )
        );
        
             
    }
    
    function buildSlideWindowRearrangeMul() {

        const f = module.addFunction(prefix+"_slideWindowRearrangeMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        for (let i=0;i<=n32*2; i++) {
            f.addLocal("r"+i, "i64");
        }
        f.addLocal("tmp2","i64")
        f.addLocal("tmp3","i32")
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        
        
        function mulij(i, j) { 
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            
            return c.i64_mul( X, Y ); 
            
        }
        
        // for (let i=0; i<n32*2-1; i++) {

        //     f.addLocal("tmp_i64"+i,"i64");
        // }

        let window_size = 2
            
        for(let i = 0;i < n32;i+=window_size){
            for(let j = 0; j<n32; j+=window_size){
                for(let ii = 0; ii<window_size;ii++){
                    for(let jj = 0;jj<window_size;jj++){
                        let pos_i = ii+i;
                        let pos_j = jj+j;

                        //console.log(pos_i+" "+pos_j);
                        
                        if(pos_j==0 || ((pos_i-ii) == n32-2 && jj==0 )){
                            if(pos_i==0){  //(0,0)
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        0,  
                                        c.teeLocal(
                                            "r0",       
                                            c.i64_and(// mulij low 32bit 
                                                c.i64_const(0xFFFFFFFF),
                                                c.teeLocal(
                                                    "tmp",
                                                    mulij(pos_i,pos_j)
                                                )
                                            )    
                                        )
                                    )
                                )
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r1",
                                        c.i64_add(
                                            c.getLocal("r1"),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                            else if(pos_j==0 && pos_i == 1){ // store (1,0)
                                //console.log(pos_i+" "+pos_j);
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        (pos_i+pos_j)*4,  
                                        c.teeLocal(
                                            "r"+(pos_i+pos_j),
                                            c.i64_add( 
                                                c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                c.i64_and(// mulij low 32bit 
                                                    c.i64_const(0xFFFFFFFF),
                                                    c.teeLocal(
                                                        "tmp",
                                                        mulij(pos_i,pos_j)
                                                    )
                                                )
                                            )   
                                        )
                                    )
                                )
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                            
                            else{  // store (i,0) - (0,0) - (1,0)
                                //console.log(pos_i+" "+pos_j);
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        (pos_i+pos_j)*4,  
                                        c.teeLocal(
                                            "r"+(pos_i+pos_j),
                                            c.i64_add(// merge i+j-1 to i+j
                                                c.i64_add( 
                                                    c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                    c.i64_and(// mulij low 32bit 
                                                        c.i64_const(0xFFFFFFFF),
                                                        c.teeLocal(
                                                            "tmp",
                                                            mulij(pos_i,pos_j)
                                                        )
                                                    )
                                                ),
                                                c.i64_shr_u(
                                                    c.getLocal("r"+(pos_i+pos_j-1)),
                                                    c.i64_const(32)
                                                )
                                            )
                                        )
                                    )
                                )
                                
                            
                      
                                
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                        }
                        else{ // we dont need to store
                            f.addCode(// setlocal mulij共占了10ms。其他的90ms
                            // add(c.and(..), 1): 不耗时间
                            // add( getlocal, 1): 不耗时间
                            // add( getlocal , mulij): 耗时间
                            // mul(c.and(..), 1): 不耗时间
                            // 直接改成mul（）：不耗时间

                                c.setLocal(
                                    "r"+(pos_i+pos_j),
                                    //c.getLocal("r"+(pos_i+pos_j))
                                    c.i64_add(//add耗时
                                    
                                        c.getLocal("r"+(pos_i+pos_j)),
                                        //c.i64_const(1),
                                        //mulij(pos_i,pos_j)
                                        c.i64_and(
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(//基本不耗时
                                                "tmp",
                                                mulij(pos_i,pos_j)
                                            )
                                        )
                                        
                                    )
                                    
                                  
                                    //mulij(pos_i,pos_j) //基本不耗时
                                    //c.getLocal("r"+(pos_i+pos_j)) //基本不耗时
                                )
                            )
                            //012345678
                            f.addCode(//70-80ms
                                c.setLocal(
                                    "r"+(pos_i+pos_j+1),
                                    c.i64_add(
                                        c.getLocal("r"+(pos_i+pos_j+1)),
                                        c.i64_shr_u(
                                            c.getLocal("tmp"),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        }

                    }//end for
                }
            }
        }

        //  n32 *n32 add 占90ms
        // load store conflict
        // for(let j=0;j<n32*10;j++){
        //     for(let i=0;i<n32;i++){
        //         f.addCode(
        //             c.setLocal(
        //                 "r"+(n32*2-2),
        //                 c.i64_add(
        //                     //c.getLocal("r"+(i)),
        //                     //c.getLocal("r"+(i+8))
        //                     c.getLocal("r"+(n32*2-2)),
        //                     c.getLocal("r"+(n32*2-2))
        //                 )
        //             )
        //         )
        //     }
        // }
        
 
        f.addCode(//13ms
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-8,

                c.i64_add(
                    c.getLocal("r"+(n32*2-2)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-3)),
                        c.i64_const(32)
                    )
                )                             
            )
        );

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,

                c.i64_add(
                    c.getLocal("r"+(n32*2-1)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-2)),
                        c.i64_const(32)
                    )
                )                             
            )
        );
        
             
    }

    function buildSlideWindowRearrangeMul_wrong2() {

        const f = module.addFunction(prefix+"_slideWindowRearrangeMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i, "i64");
        }
        f.addLocal("tmp00","i64")
        f.addLocal("tmp01","i64")
        f.addLocal("tmp10","i64")
        f.addLocal("tmp11","i64")
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        
        
        function mulij(i, j) { 
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            
            return c.i64_mul( X, Y ); 
            
        }
        
        for (let i=0; i<n32*2-1; i++) {

            f.addLocal("tmp_i64"+i,"i64");
        }

        let window_size = 2
            
        for(let i = 0;i < n32;i+=window_size){
            for(let j = 0; j<n32; j+=window_size){
                
                    f.addCode(
                        c.setLocal(
                            "r"+(i+j+1),
                            c.i64_add(
                                c.getLocal("r"+(i+j+1)),
                                c.i64_add(
                                    c.i64_shr_u(  //tmp00 high32
                                        c.teeLocal(
                                            "tmp00",
                                            mulij(i,j)
                                        ),
                                        c.i64_const(32)
                                    ),
                                    c.i64_add(
                                        c.i64_and(// tmp10 low32
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp10",
                                                mulij(i+1,j)
                                            )
                                        ),
                                        c.i64_and(// tmp11 low32
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp01",
                                                mulij(i,j+1)
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )

                    f.addCode(//tmp00 low32 
                        c.setLocal(
                            "r"+(i+j),
                            c.i64_add(
                                c.getLocal("r"+(i+j)),
                                c.i64_and(
                                    c.i64_const(0xFFFFFFFF),
                                    c.getLocal("tmp00")
                                )
                            )
                        )
                    )

                    f.addCode(
                        c.setLocal(
                            "r"+(i+j+2),
                            c.i64_add(
                                c.i64_add(
                                    c.getLocal("r"+(i+j+2)),
                                    c.i64_add(
                                        c.i64_shr_u(//tmp01 high32
                                            c.getLocal("tmp01"),
                                            c.i64_const(32)
                                        ),
                                        c.i64_shr_u(//tmp10 high32
                                            c.getLocal("tmp10"),
                                            c.i64_const(32)
                                        )
                                    )
                                ),
                                c.i64_and(// tmp11 low32
                                    c.i64_const(0xFFFFFFFF),
                                    c.teeLocal(
                                        "tmp11",
                                        mulij(i+1,j+1)
                                    )
                                )

                            )
                        )
                    )
                    f.addCode(// tmp11 high32  330->300
                        c.setLocal(
                            "r"+(i+j+3),
                            c.i64_add(
                                c.getLocal("r"+(i+j+3)),
                                c.i64_shr_u(
                                    c.getLocal("tmp11"),
                                    c.i64_const(32)
                                )
                            )
                        )
                    )
                    if(i==0&&j==0){
                        //store 00
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                (i+j)*4,  
                                c.getLocal("r"+(i+j)),// accumulated r_ij
                                
                            )
                        )

                        //store (0,1)
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                (i+j+1)*4,  
                                c.teeLocal(
                                    "r"+(i+j),
                                    c.i64_add(// merge i+j-1 to i+j
                                        c.getLocal("r"+(i+j+1)),// accumulated r_ij
                                        c.i64_shr_u(
                                            c.getLocal("r"+(i+j)),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        )

                    }
                    else if(j==0||i==n32-2){
                        //store
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                (i+j)*4,  
                                c.teeLocal(
                                    "r"+(i+j),
                                    c.i64_add(// merge i+j-1 to i+j
                                        c.getLocal("r"+(i+j)),// accumulated r_ij
                                        c.i64_shr_u(
                                            c.getLocal("r"+(i+j-1)),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        )

                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                (i+j+1)*4,  
                                c.teeLocal(
                                    "r"+(i+j),
                                    c.i64_add(// merge i+j-1 to i+j
                                        c.getLocal("r"+(i+j+1)),// accumulated r_ij
                                        c.i64_shr_u(
                                            c.getLocal("r"+(i+j)),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        )        
                    }

            }
        }
        
        
 
        f.addCode(//13ms
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-8,

                c.i64_add(
                    c.getLocal("r"+(n32*2-2)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-3)),
                        c.i64_const(32)
                    )
                )                             
            )
        );
        
        
        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,

                c.i64_add(
                    c.getLocal("r"+(n32*2-1)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-2)),
                        c.i64_const(32)
                    )
                )                             
            )
        );
        
        // 310->393
        // for(let j=0;j<n32;j++){
        //     for(let i=1;i<n32;i++){
        //         f.addCode(
        //             c.i64_store32(
        //                 c.getLocal("r"),
        //                 i*4*2-4,
        
        //                 c.i64_add(
        //                     c.getLocal("r"+(i*2-1)),
        //                     c.i64_shr_u(
        //                         c.getLocal("r"+(i*2-2)),
        //                         c.i64_const(32)
        //                     )
        //                 )                             
        //             )
        //         );
        //     }
        // }
             
    }

    function buildSlideWindowRearrangeMul_wrong() {

        const f = module.addFunction(prefix+"_slideWindowRearrangeMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i, "i64");
        }
        f.addLocal("tmp00","i64")
        f.addLocal("tmp01","i64")
        f.addLocal("tmp10","i64")
        f.addLocal("tmp11","i64")
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        
        
        function mulij(i, j) { 
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            
            return c.i64_mul( X, Y ); 
            
        }
        
        for (let i=0; i<n32*2-1; i++) {

            f.addLocal("tmp_i64"+i,"i64");
        }

        let window_size = 2
            
        for(let i = 0;i < n32;i+=window_size){
            for(let j = 0; j<n32; j+=window_size){
                if(j==0 && i==0){ // store (i,0)
                    //if(){//store (0,0) and (1,0)
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                0,  
                                // c.teeLocal(
                                //     "r0",       
                                c.i64_and(// mulij low 32bit 
                                    c.i64_const(0xFFFFFFFF),
                                    c.teeLocal(
                                        "tmp00",
                                        mulij(0,0)
                                    )
                                )    
                                //)
                            )
                        )
                        f.addCode(
                            c.i64_store32(
                                c.getLocal("r"),
                                4,  
                                // c.teeLocal(
                                //     "r"+(pos_i+pos_j),
                                c.i64_add(// merge i+j-1 to i+j
                                    c.i64_add( 
                                        c.i64_shr_u(
                                            c.getLocal("tmp00"),
                                            c.i64_const(32)
                                        ),
                                        c.i64_and(// mulij low 32bit 
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp01",
                                                mulij(0,1)
                                            )
                                        )
                                    ),
                                    c.i64_and(// mulij low 32bit 
                                        c.i64_const(0xFFFFFFFF),
                                        c.teeLocal(
                                            "tmp10",
                                            mulij(1,0)
                                        )
                                    )
                                )
                                //)
                            )
                        )
                        f.addCode( // set r2 
                            c.setLocal(
                                "r2",
                                c.i64_add(
                                    c.i64_add(
                                        c.getLocal("r2"),
                                        c.i64_add(
                                            c.i64_shr_u(//tmp10 high32
                                                c.getLocal("tmp10"),
                                                c.i64_const(32)
                                            ),
                                            c.i64_shr_u(//tmp01 high32
                                                c.getLocal("tmp01"),
                                                c.i64_const(32)
                                            )
                                        )
                                    ),
                                    c.i64_and(// tmp11 low32
                                        c.i64_const(0xFFFFFFFF),
                                        c.teeLocal(
                                            "tmp11",
                                            mulij(1,1)
                                        )
                                    )

                                )
                            )
                        )
                        f.addCode(// tmp11 high32
                            c.setLocal(
                                "r3",
                                // c.i64_add(
                                //     c.getLocal("r3"),
                                c.i64_shr_u(
                                    c.getLocal("tmp11"),
                                    c.i64_const(32)
                                )
                                //)
                            )
                        )
                        
                    //}
                    
                }
                // without else if 30ms
                else if(j==0 || (i==n32-2 && j!=0)){ // store(n32-2,j)
                    // store (i,0) - (0,0) - (1,0)
                    //console.log(i+" "+j)
                        f.addCode(//store 0
                            c.i64_store32( 
                                c.getLocal("r"),
                                (i+j)*4,  
                                c.teeLocal(
                                    "r"+(i+j),
                                    c.i64_add(// merge i+j-1 to i+j
                                        c.i64_add( 
                                            c.getLocal("r"+(i+j)),// accumulated r_ij
                                            c.i64_and(// tmp00 low 32bit 
                                                c.i64_const(0xFFFFFFFF),
                                                c.teeLocal(
                                                    "tmp00",
                                                    mulij(i,j)
                                                )
                                            )
                                        ),
                                        c.i64_shr_u(
                                            c.getLocal("r"+(i+j-1)),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        )

                        f.addCode(//store 1 
                            c.i64_store32( 
                                c.getLocal("r"),
                                (i+j+1)*4,  
                                c.teeLocal(
                                    "r"+(i+j+1),
                                    c.i64_add(// merge i+j-1 to i+j
                                        c.i64_add( 
                                            c.i64_shr_u(
                                                c.getLocal("r"+(i+j)),
                                                c.i64_const(32)
                                            ),
                                            
                                            c.i64_add(
                                                c.i64_and(// tmp10 low 32bit 
                                                    c.i64_const(0xFFFFFFFF),
                                                    c.teeLocal(
                                                        "tmp10",
                                                        mulij(i+1,j)
                                                    )
                                                ),
                                                c.i64_and(// tmp01 low 32bit 
                                                    c.i64_const(0xFFFFFFFF),
                                                    c.teeLocal(
                                                        "tmp01",
                                                        mulij(i,j+1)
                                                    )
                                                )
                                            ),
                                            c.i64_shr_u(
                                                c.getLocal("tmp00"),
                                                c.i64_const(32)
                                            )    
                                        ),
                                        c.getLocal("r"+(i+j+1)),// accumulated r_ij
                                        
                                    )
                                )
                            )
                        )

                        
                        f.addCode( // set r2
                            c.setLocal(
                                "r"+(i+j+2),
                                c.i64_add(
                                    c.i64_add(
                                        c.getLocal("r"+(i+j+2)),
                                        c.i64_add(
                                            c.i64_shr_u(//tmp10 high32
                                                c.getLocal("tmp10"),
                                                c.i64_const(32)
                                            ),
                                            c.i64_shr_u(//tmp01 high32
                                                c.getLocal("tmp01"),
                                                c.i64_const(32)
                                            )
                                        )
                                    ),
                                    c.i64_and(// tmp11 low32
                                        c.i64_const(0xFFFFFFFF),
                                        c.teeLocal(
                                            "tmp11",
                                            mulij(i+1,j+1)
                                        )
                                    )

                                )
                            )
                        )
                               
                        
                        f.addCode(
                            c.setLocal(
                                "r"+(i+j+3),
                                c.i64_add(
                                    c.getLocal("r"+(i+j+3)),//tmp11 high
                                    c.i64_shr_u(
                                        c.getLocal("tmp11"),
                                        c.i64_const(32)
                                    )
                                )
                            )
                        )

                    
                }
                // without else, 100ms
                else{// dont need to store
                    
                    f.addCode(
                        c.setLocal(
                            "r"+(i+j+1),
                            c.i64_add(
                                c.getLocal("r"+(i+j+1)),
                                c.i64_add(
                                    c.i64_shr_u(  //tmp00 high32
                                        c.teeLocal(
                                            "tmp00",
                                            mulij(i,j)
                                        ),
                                        c.i64_const(32)
                                    ),
                                    c.i64_add(
                                        c.i64_and(// tmp10 low32
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp10",
                                                mulij(i+1,j)
                                            )
                                        ),
                                        c.i64_and(// tmp11 low32
                                            c.i64_const(0xFFFFFFFF),
                                            c.teeLocal(
                                                "tmp01",
                                                mulij(i,j+1)
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )

                    f.addCode(//tmp00 low32
                        c.setLocal(
                            "r"+(i+j),
                            c.i64_add(
                                c.getLocal("r"+(i+j)),
                                c.i64_and(
                                    c.i64_const(0xFFFFFFFF),
                                    c.getLocal("tmp00")
                                )
                            )
                        )
                    )

                    f.addCode(
                        c.setLocal(
                            "r"+(i+j+2),
                            c.i64_add(
                                c.i64_add(
                                    c.getLocal("r"+(i+j+2)),
                                    c.i64_add(
                                        c.i64_shr_u(//tmp01 high32
                                            c.getLocal("tmp01"),
                                            c.i64_const(32)
                                        ),
                                        c.i64_shr_u(//tmp10 high32
                                            c.getLocal("tmp10"),
                                            c.i64_const(32)
                                        )
                                    )
                                ),
                                c.i64_and(// tmp11 low32
                                    c.i64_const(0xFFFFFFFF),
                                    c.teeLocal(
                                        "tmp11",
                                        mulij(i+1,j+1)
                                    )
                                )

                            )
                        )
                    )
                    f.addCode(// tmp11 high32
                        c.setLocal(
                            "r"+(i+j+3),
                            c.i64_add(
                                c.getLocal("r"+(i+j+3)),
                                c.i64_shr_u(
                                    c.getLocal("tmp11"),
                                    c.i64_const(32)
                                )
                            )
                        )
                    )

                }

                
            }
        }
        
 
        f.addCode(//13ms
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-8,

                c.i64_add(
                    c.getLocal("r"+(n32*2-2)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-3)),
                        c.i64_const(32)
                    )
                )                             
            )
        );

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,

                c.i64_add(
                    c.getLocal("r"+(n32*2-1)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-2)),
                        c.i64_const(32)
                    )
                )                             
            )
        );
        
             
    }

    function buildSlideWindowRearrangeMul_backup() {

        const f = module.addFunction(prefix+"_slideWindowRearrangeMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        
        
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");

        f.addLocal("tmp", "i64");
        


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        for (let i=0;i<=n32*2-1; i++) {
            f.addLocal("r"+i, "i64");
        }
        f.addLocal("tmp00","i64")
        f.addLocal("tmp01","i64")
        f.addLocal("tmp10","i64")
        f.addLocal("tmp11","i64")
        

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        
        
        function mulij(i, j) { 
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }
            
            return c.i64_mul( X, Y ); 
            
        }
        
        for (let i=0; i<n32*2-1; i++) {

            f.addLocal("tmp_i64"+i,"i64");
        }

        let window_size = 2
            
        for(let i = 0;i < n32;i+=window_size){
            for(let j = 0; j<n32; j+=window_size){
                for(let ii = 0; ii<window_size;ii++){
                    for(let jj = 0;jj<window_size;jj++){
                        let pos_i = ii+i;
                        let pos_j = jj+j;

                        
                        //nedd to refactor
                        if(pos_j==0 || ((pos_i-ii) == n32-2 && jj==0 )){
                            //console.log(pos_i+" "+pos_j);
                            if(pos_i==0){  //(0,0)
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        0,  
                                        c.teeLocal(
                                            "r0",       
                                            c.i64_and(// mulij low 32bit 
                                                c.i64_const(0xFFFFFFFF),
                                                c.teeLocal(
                                                    "tmp",
                                                    mulij(pos_i,pos_j)
                                                )
                                            )    
                                        )
                                    )
                                )
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r1",
                                        c.i64_add(
                                            c.getLocal("r1"),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                            else if(pos_j==0 && pos_i == 1){ // store (1,0)
                                //console.log(pos_i+" "+pos_j);
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        (pos_i+pos_j)*4,  
                                        c.teeLocal(
                                            "r"+(pos_i+pos_j),
                                            c.i64_add( 
                                                c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                c.i64_and(// mulij low 32bit 
                                                    c.i64_const(0xFFFFFFFF),
                                                    c.teeLocal(
                                                        "tmp",
                                                        mulij(pos_i,pos_j)
                                                    )
                                                )
                                            )   
                                        )
                                    )
                                )
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                            else{  // store (i,0) - (0,0) - (1,0)
                                //console.log(pos_i+" "+pos_j);
                                f.addCode(
                                    c.i64_store32(
                                        c.getLocal("r"),
                                        (pos_i+pos_j)*4,  
                                        c.teeLocal(
                                            "r"+(pos_i+pos_j),
                                            c.i64_add(// merge i+j-1 to i+j
                                                c.i64_add( 
                                                    c.i64_and(// mulij low 32bit 
                                                        c.i64_const(0xFFFFFFFF),
                                                        c.teeLocal(
                                                            "tmp",
                                                            mulij(pos_i,pos_j)
                                                        )
                                                    ),
                                                    c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                ),
                                                c.i64_shr_u(
                                                    c.getLocal("r"+(pos_i+pos_j-1)),
                                                    c.i64_const(32)
                                                )
                                            )
                                        )
                                    )
                                )
                                       
                                // 012345678
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )
                            }
                        }
                        
                        else if(pos_j==1||((pos_i-ii) == n32-2 && jj==1 )){ // we dont need to store
                            f.addCode(
                                      c.setLocal(
                                        "r"+(pos_i+pos_j),
                                        
                                            c.i64_add( 
                                                c.getLocal("r"+(pos_i+pos_j)),// accumulated r_ij
                                                c.i64_and(// mulij low 32bit 
                                                    c.i64_const(0xFFFFFFFF),
                                                    c.teeLocal(
                                                        "tmp",
                                                        mulij(pos_i,pos_j)
                                                    )
                                                )
                                            )   
                                    ) 
                            )
                             
                            f.addCode(
                                c.setLocal(
                                    "r"+(pos_i+pos_j+1),
                                    c.i64_add(
                                        c.getLocal("r"+(pos_i+pos_j+1)),
                                        c.i64_shr_u(
                                            c.getLocal("tmp"),
                                            c.i64_const(32)
                                        )
                                    )
                                )
                            )
                        }
                        /*
                        window
                        | tmp00 | tmp01 |
                        | tmp10 | tmp11 |
                        */
                        else{ // we dont need to store
                            
                            if(ii==0&&jj==0){
                                //console.log(pos_i + " " +pos_j)
                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+1),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+1)),
                                            c.i64_add(
                                                c.i64_shr_u(  //tmp00 high32
                                                    c.teeLocal(
                                                        "tmp00",
                                                        mulij(pos_i,pos_j)
                                                    ),
                                                    c.i64_const(32)
                                                ),
                                                c.i64_add(
                                                    c.i64_and(// tmp10 low32
                                                        c.i64_const(0xFFFFFFFF),
                                                        c.teeLocal(
                                                            "tmp10",
                                                            mulij(pos_i+1,pos_j)
                                                        )
                                                    ),
                                                    c.i64_and(// tmp11 low32
                                                        c.i64_const(0xFFFFFFFF),
                                                        c.teeLocal(
                                                            "tmp01",
                                                            mulij(pos_i,pos_j+1)
                                                        )
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )

                                f.addCode(//tmp00 low32
                                    c.setLocal(
                                        "r"+(pos_i+pos_j),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j)),
                                            c.i64_and(
                                                c.i64_const(0xFFFFFFFF),
                                                c.getLocal("tmp00")
                                            )
                                        )
                                    )
                                )

                                f.addCode(
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+2),
                                        c.i64_add(
                                            c.i64_add(
                                                c.getLocal("r"+(pos_i+pos_j+2)),
                                                c.i64_add(
                                                    c.i64_shr_u(//tmp01 high32
                                                        c.getLocal("tmp01"),
                                                        c.i64_const(32)
                                                    ),
                                                    c.i64_shr_u(//tmp10 high32
                                                        c.getLocal("tmp10"),
                                                        c.i64_const(32)
                                                    )
                                                )
                                            ),
                                            c.i64_and(// tmp11 low32
                                                c.i64_const(0xFFFFFFFF),
                                                c.teeLocal(
                                                    "tmp11",
                                                    mulij(pos_i+1,pos_j+1)
                                                )
                                            )

                                        )
                                    )
                                )
                                //7   800000007ffffffff800000007ffffffff800000007fffffffff445441b900000000000000000000000000000000000000000010f446fff6f0d260ec0c00
                                //7fffffffffffffffffffffffffffffffffffffffffffffffffffffffc45441b90000000000000000000000000000000000000000000000000007e51960ec0c00
                                f.addCode(// tmp11 high32
                                    c.setLocal(
                                        "r"+(pos_i+pos_j+3),
                                        c.i64_add(
                                            c.getLocal("r"+(pos_i+pos_j+3)),
                                            c.i64_shr_u(
                                                c.getLocal("tmp11"),
                                                c.i64_const(32)
                                            )
                                        )
                                    )
                                )

                            }
                        }

                    }//end for
                }
            }
        }
        
 
        f.addCode(//13ms
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-8,

                c.i64_add(
                    c.getLocal("r"+(n32*2-2)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-3)),
                        c.i64_const(32)
                    )
                )                             
            )
        );

        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,

                c.i64_add(
                    c.getLocal("r"+(n32*2-1)),
                    c.i64_shr_u(
                        c.getLocal("r"+(n32*2-2)),
                        c.i64_const(32)
                    )
                )                             
            )
        );
        
             
    }

    function buildTestWasmBinary() {
        const f = module.addFunction(prefix+"_testWasmBinary");
        // f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        // f.addCode(c.call(intPrefix + "_copy", c.i32_const(pOne), c.getLocal("pr")));
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        f.addCode(c.drop(c.i32_const(2)))
        
    }

    buildTestWasmBinary()
    module.exportFunction(prefix + "_testWasmBinary");


    

    // buildCacheMulF1m();
    // buildCacheMul();
    // buildSlideWindowMul();
    // buildSlideWindowRearrangeMul();
    // buildFullArrangeMul();

        

    // buildAdd();
    // buildSub();
    // buildNeg();
    // buildMReduct();
    // buildMul();
    // buildSquare();
    // buildSquareOld();
    // buildToMontgomery();
    // buildFromMontgomery();
    // buildIsNegative();
    // buildInverse();
    // buildOne();
    // buildLoad();
    // buildTimesScalar();

    

    // module.exportFunction(prefix + "_cachemulf1m");
    // module.exportFunction(prefix + "_cachemul");
    // module.exportFunction(prefix + "_slideWindowMul");
    // module.exportFunction(prefix + "_slideWindowRearrangeMul");
    // module.exportFunction(prefix + "_fullArrangeMul");
    
    

    // module.exportFunction(prefix + "_add");
    // module.exportFunction(prefix + "_sub");
    // module.exportFunction(prefix + "_neg");
    // module.exportFunction(prefix + "_isNegative");
    // module.exportFunction(prefix + "_mReduct");
    // module.exportFunction(prefix + "_mul");
    // module.exportFunction(prefix + "_square");
    // module.exportFunction(prefix + "_squareOld");
    // module.exportFunction(prefix + "_fromMontgomery");
    // module.exportFunction(prefix + "_toMontgomery");
    // module.exportFunction(prefix + "_inverse");
    // module.exportFunction(intPrefix + "_copy", prefix+"_copy");
    // module.exportFunction(intPrefix + "_zero", prefix+"_zero");
    // module.exportFunction(intPrefix + "_isZero", prefix+"_isZero");
    // module.exportFunction(intPrefix + "_eq", prefix+"_eq");
    // module.exportFunction(prefix + "_one");
    // module.exportFunction(prefix + "_load");
    // module.exportFunction(prefix + "_timesScalar");

    // buildExp(
    //     module,
    //     prefix + "_exp",
    //     n8,
    //     prefix + "_mul",
    //     prefix + "_square",
    //     intPrefix + "_copy",
    //     prefix + "_one",
    // );
    // module.exportFunction(prefix + "_exp");
    // if (q.isPrime()) {
    //     buildSqrt();
    //     buildIsSquare();
    //     module.exportFunction(prefix + "_sqrt");
    //     module.exportFunction(prefix + "_isSquare");
    // }
    return prefix;
};
