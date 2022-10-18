// Init

// Function1
// DecomposeScalar
// k -> k1, k2

// Function2
// Endomorphism
// (x,y) -> (beta*x, y)

// Function3
// Test on single scalar multiplication
const utils = require("./utils.js");

module.exports = function buildGLV(module, prefix, fnName) {

    const n8r = 32;
    const n8q = 48;
    const intField = "int";
    const f1mField = "f1m";
    const g1mField = "g1m";

    const u = 100000; 
    const pu = module.alloc(n8r, utils.bigInt2BytesLE(u, n8r * 2));

    const v = 1; 
    const pv = module.alloc(n8r, utils.bigInt2BytesLE(v, n8r * 2));

    

    const beta = 1; 
    const pbeta = module.alloc(n8q, utils.bigInt2BytesLE(beta, n8q));

    const k1 = c.i32_const(module.alloc(n8r * 2));
    const k2 = c.i32_const(module.alloc(n8r * 2));

    function buildDecomposeScalar(){
        const f = module.addFunction(fnName + "_decomposeScalar");
        const c = f.getCodeBuilder();
        f.addParam("pScalar", "i32");
        f.addParam("numScalars", "i32");
        f.addParam("pScalarRes", "i32");

        f.addLocal("i", "i32");
        f.addLocal("itScalar", "i32");
        f.addLocal("itScalarRes", "i32");

        const pq1 = c.i32_const(module.alloc(n8r * 2));
        const pq2 = c.i32_const(module.alloc(n8r * 2));
        const q1_mul_v0 = c.i32_const(module.alloc(n8r * 2));
        const q2_mul_u0 = c.i32_const(module.alloc(n8r * 2));
        const q1_mul_v1 = c.i32_const(module.alloc(n8r * 2));
        const q2_mul_u1 = c.i32_const(module.alloc(n8r * 2));

        const x2 = c.i32_const(module.alloc(n8r * 2)); 

        f.addcode(
            c.setLocal("itScalar", c.getLocal("pScalar")),
            c.setLocal("itScalarRes", c.getLocal("pScalarRes")),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numScalars"))),
                
                //  
                c.call(intField + "_mul", c.getLocal("itScalar"),  c.getLocal("placehoder1"), pq2), 
                c.call(intField + "_mul", c.getLocal("itScalar"),  c.getLocal("placehoder2"), pq2), 
                
                c.call(intField + "_mul", pq1, c.i32_const(v0), q1_mul_v0),
                c.call(intField + "_mul", pq2, c.i32_const(u0), q2_mul_u0),
                c.call(intField + "_mul", pq1, c.i32_const(v1), q1_mul_v1),
                c.call(intField + "_mul", pq2, c.i32_const(u1), q2_mul_u1),

                c.call(intField + ""),



                c.setLocal("itScalar", c.i32_add(c.getLocal("itScalar"), c.i32_const(n8r))),
                c.setLocal("itScalarRes", c.i32_add(c.getLocal("itScalarRes"), c.i32_const(n8r * 2))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );

    }


    function buildEndomorphism(){
        const f = module.addFunction(fnName + "_endomorphism");
        const c = f.getCodeBuilder();
        f.addParam("pPoint", "i32");
        f.addParam("numPoints", "i32");
        f.addParam("pPointRes", "i32");

        f.addLocal("i", "i32");
        f.addLocal("itPoint", "i32");
        f.addLocal("itPointRes", "i32");

        f.addcode(
            c.setLocal("itPoint", c.getLocal("pScalar")),
            c.setLocal("itPointRes", c.getLocal("pPointRes")),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("numPoints"))),

                c.call(g1mField + "_copyAffine", c.getLocal("itPoint"), c.getLocal("itPointRes")),
                c.call(f1mField + "_mul", c.i32_add(c.getLocal("itPoint"), c.i32_const(n8q * 2)), c.i32_const(pbeta), c.i32_add(c.getLocal("itPointRes"), c.i32_const(n8q * 2))),
                c.call(f1mField + "_copy", c.i32_add(c.getLocal("itPoint"), c.i32_const(n8q * 3)), c.i32_add(c.getLocal("itPointRes"), c.i32_const(n8q * 3))),
                
                c.setLocal("itPoint", c.i32_add(c.getLocal("itPoint"), c.i32_const(n8q * 4))),
                c.setLocal("itPointRes", c.i32_add(c.getLocal("itPointRes"), c.i32_const(n8q * 4))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );

    }
};