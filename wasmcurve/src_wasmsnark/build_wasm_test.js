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

function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ("00" + x.toString(16)).slice(-2)).join("");
}


module.exports = function buildF1m(module, _q, _prefix, _intPrefix) {
    

    const prefix = _prefix || "f1m";
    if (module.modules[prefix]) return prefix;  // already builded
    module.modules[prefix] = {
        
    };

    function buildTestWasmBinary() {
        const f = module.addFunction(prefix+"_testWasmBinary");
        f.addParam("x", "i32");
        f.addParam("pr", "i32");
        f.addLocal("acc", "i32");
        f.addLocal("acc2", "i32");

        f.addLocal("acc_i64", "i64");
        f.addLocal("acc2_i64", "i64");

        const c = f.getCodeBuilder();

        // for(let i=0;i<5;i++){
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        // }
        for(let i=0;i<5;i++){
            f.addCode(
                c.setLocal(
                    "acc_i64",
                    c.i64_add(
                        c.getLocal("acc_i64"),
                        c.i64_const(1)
                    )
                )
            )
        }
        for(let i=0;i<6;i++){
            f.addCode(
                c.setLocal(
                    "acc2_i64",
                    c.i64_add(
                        c.getLocal("acc2_i64"),
                        c.i64_const(1)
                    )
                )
            )
        }
        for(let i=0;i<6401;i++){
            f.addCode(
                c.setLocal(
                    "acc_i64",
                    c.i64_add(
                        c.getLocal("acc_i64"),
                        c.getLocal("acc2_i64")
                    )
                )
            )
        }

        for(let i=0;i<12;i++){
            f.addCode(
                c.i64_store32(
                    c.getLocal("pr"),
                    i*8,
                    c.i64_and(
                        c.getLocal("acc_i64"),
                        c.i64_const(0xFFFFFFFF)
                    )
                    
                )
            );
        }

        // for(let i=0;i<5;i++){
        //     f.addCode(
        //         c.setLocal(
        //             "acc",
        //             c.i32_add(
        //                 c.getLocal("acc"),
        //                 c.i32_const(1)
        //             )
        //         )
        //     )
        // }

        // for(let i=0;i<50;i++){
        //     f.addCode(
        //         c.setLocal(
        //             "acc2",
        //             c.i32_add(
        //                 c.getLocal("acc2"),
        //                 c.getLocal("acc")
        //                 //c.i32_const(1)
        //             )
        //         )
        //     )
        // }
        // for(let i=0;i<2;i++){
        //     f.addCode(
        //         c.setLocal(
        //             "acc",
        //             c.i32_mul(
        //                 c.getLocal("acc"),
        //                 c.getLocal("acc2")
        //             )
        //         )
        //     )
        // }
        
        // //store
        // f.addCode(
        //     c.i32_store(
        //         c.getLocal("pr"),
        //         0,
        //         c.getLocal("acc")
        //     )
        // )
        
        
        // for(let i =0; i<= 8;i++){
        //     f.addCode(
        //         c.i64_store32(
        //             c.getLocal("r"),
        //             i*4,
        //             //n32*4*2-4,
        //             c.i64_and(
        //                 c.getLocal("r"+i+"_new"),
        //                 c.i64_const(0xFFFFFFFF)
        //             )                             
        //         )
        //     )   
        // }
        

        // for(let i=0;i<5;i++){
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        //     f.addCode(c.drop(c.i32_const(2)))
        // }
        
        
        //console.log(buf2hex(c.drop(c.i32_const(2))))
        
    }


    function buildFullArrangeMul() {
        const n32 = 8;
        const f = module.addFunction(prefix+"_fullArrangeMul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        
        //f.addLocal("tmp3","i32")
        

        f.addLocal("tmp", "i64");
        

        const c = f.getCodeBuilder();

        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }
        
        f.addLocal("tmp_i64","i64")
        f.addLocal("tmp2_i64","i64")
        

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
            //return c.i64_mul( c.i64_const(2), c.i64_const(3) );
            return c.i64_mul( X, Y ); 
        }

        for(let i=0;i<15;i++){
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
            f.addCode(c.drop(c.i32_const(2)))
        }
        
        // n32*n32 mul
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

        // test getlocal
        // for(let k=0;k<100;k++){
        //     for (let i=0; i<n32; i++) {
        //         for(let j=0;j<n32-1;j++){
        //             f.addCode(
        //                 c.setLocal(
        //                     "r"+i+"-"+(j+1),
        //                     c.getLocal("r"+i+"-"+j)
        //                 )
        //             )
        //         }
        //     }
        // }
        

        
        // use mul results
        for (let i=0; i<n32; i++) {//80ms
            for(let j=0;j<n32-1;j++){
                
                f.addCode(
                    c.setLocal(
                        "tmp_i64",
                        c.i64_or(
                            c.i64_and(
                                // c.i64_const(4321),
                                // c.i64_const(1234)
                                // c.getLocal("r0-0"),
                                // c.getLocal("r0-1"),
                                c.getLocal("r"+i+"-"+j),
                                c.getLocal("r"+i+"-"+(j+1)),
                            ),
                            c.getLocal("tmp_i64")
                        )
                    )
                )
            }
        }

        
        // f.addCode(
        //         c.setLocal(
        //             "tmp_i64",
        //             c.i64_mul(
        //                 c.i64_load32_u( c.getLocal("y"), 0),
        //                 c.i64_load32_u( c.getLocal("x"), 0)
        //             )
        //         )
        // )

        // set 'r'
        for(let j =0;j<1;j++){
            for(let i =0; i<= n32*2-1;i++){//30ms
                f.addCode(
                    c.i64_store32(
                        c.getLocal("r"),
                        i*4,
                    
                        c.getLocal("tmp_i64")                           
                    )
                )   
            }
        }

       
        

        
    


        
        
        console.log(buf2hex(c.drop(c.i32_const(2))))

       
        
        
    }

    function build_profiling_instruction(){
        const f = module.addFunction(prefix+"_profilingInstruction");
        const c = f.getCodeBuilder();
        f.setReturnType("i32")

        f.addCode(
            c.i32_const(321321)
        )
        
    }

    function buildIntAdd() {
        let n32 = 8;
        const f = module.addFunction(prefix+"_add");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.setReturnType("i32");
        f.addLocal("c", "i64");

        const c = f.getCodeBuilder();

        f.addCode(c.setLocal(
            "c",
            c.i64_add(
                c.i64_load32_u(c.getLocal("x")),
                c.i64_load32_u(c.getLocal("y"))
            )
        ));

        f.addCode(c.i64_store32(
            c.getLocal("r"),
            c.getLocal("c"),
        ));

        for (let i=1; i<n32; i++) {
            f.addCode(c.setLocal( "c",
                c.i64_add(
                    c.i64_add(
                        c.i64_load32_u(c.getLocal("x"), 4*i),
                        c.i64_load32_u(c.getLocal("y"), 4*i)
                    ),
                    c.i64_shr_u (c.getLocal("c"), c.i64_const(32))
                )
            ));

            f.addCode(c.i64_store32(
                c.getLocal("r"),
                i*4,
                c.getLocal("c")
            ));
        }

        

        f.addCode(c.i32_wrap_i64(c.i64_shr_u (c.getLocal("c"), c.i64_const(32))));
    }

    function buildOne() {
        const f = module.addFunction(prefix+"_one");
        f.addParam("pr", "i32");
        f.setReturnType("i32");////

        const c = f.getCodeBuilder();

        f.addCode(
            c.i64_store(
                c.getLocal("pr"),
                0,
                c.i64_const(1)
            )
        );
        for (let i=1; i<4; i++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("pr"),
                    i*8,
                    c.i64_const(0)
                )
            );
        }

        f.addCode(////
            c.getLocal("pr")
        );
    }

    //buildTestWasmBinary()
    //buildFullArrangeMul()
    buildIntAdd()
    build_profiling_instruction()
    buildOne()
    
    //module.exportFunction(prefix + "_testWasmBinary");
    //module.exportFunction(prefix + "_fullArrangeMul");
    module.exportFunction(prefix + "_add");
    module.exportFunction(prefix + "_one");
    module.exportFunction(prefix + "_profilingInstruction");

    return prefix;
};
