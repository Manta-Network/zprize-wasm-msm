module.exports = function buildMultiexpOpt(module, prefix) {
    const n64g = module.modules[prefix].n64; // prefix g1m
    const n8g = n64g * 8; // 144

    // Fr: 32 bytes = 256 bits
    const n8r = 32;

    const n8 = 48; // only for our msm implementation 
    const prefixField = "f1";
    opMixedAdd = "g1m_addMixed";
    opAffineAdd = "g1m_addAffine";

    // Given a pointer `pScalar` to a 
    // scalar `k` and basis vectors `v` and `u` finds integer scalars `k1` and `k2`,
    // so that `(k, 0)` is close to `k1v + k2u`, meaning the norm of the difference `||(k,0) - (k1v + k2u)||`
    // is at most `max(||v||, ||u||)`.
    // 
    function buildDecomposeScalar() {
        const f = module.addFuntion(prefix + "_decomposeScalar");
        // Pointer to a scalar
        f.addParam("pScalar", "i32");

    }


}