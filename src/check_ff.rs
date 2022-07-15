
use crate::ff::{generate_scalar_vector};

#[cfg(test)]
mod tests{
    use super::*; 
    use ark_bls12_381::{Fr, FrParameters};
    use ark_ff::{
        biginteger::BigInteger256 as BigInteger,
    };
    
    #[test]
    /// Checks whether algebra operation works.
    fn all_operation_corect() {
        let bigint_1 = BigInteger([
            10719222850664546238,
            301075827032876239,
            17612447688858836480,
            3088858357331359854,
        ]);
        let bigint_2 = BigInteger([
            9391632405647031300,
            4845552296702772050,
            3424474836643299239,
            4069995235118972469,
        ]);
        const MODULUS_MINUS_ONE: BigInteger = BigInteger([
            0xffffffff00000000,
            0x53bda402fffe5bfe,
            0x3339d80809a1d805,
            0x73eda753299d7d48,
        ]);
        

        let lhs= ark_bls12_381::Fr::from(bigint_1);
        let rhs= ark_bls12_381::Fr::from(bigint_2);
        println!("lhs{}:?",lhs.to_string());
        println!("rhs{}:?",rhs.to_string());

        let q_minus_one= ark_bls12_381::Fr::from(MODULUS_MINUS_ONE); // q-1

        let c  = ark_bls12_381::Fr::from(1);// 1
        let d  = ark_bls12_381::Fr::from(2);// 2
        let e = c-d;  // q - 1
        let f = c + e; // 0

        println!("lhs {:?}", lhs.to_string());
        println!("rhs {:?}", rhs.to_string());


        // test +-*/ 
        assert!((lhs+rhs).to_string()=="Fp256 \"(63595B69C107F6A423F229941BF7DDA7476C7F02B24C682217181C4DC1BFBBC2)\"", "add error");
        assert!((lhs-rhs).to_string()=="Fp256 \"(664FF488650C7781F81FA62B5CD3365E14AC6ABD7F32BD7C126C8C78D278C3BB)\"", "sub error");
        assert!((lhs*rhs).to_string()=="Fp256 \"(347703AEEF1EB02552B6365C5EA24EC5FFCB2456C44D668B5AE1D4667535951F)\"", "mul error");
        assert!((lhs/rhs).to_string()=="Fp256 \"(427D8B799CA353FA64575246ED0F662AA437E96577EB58E2EFA8DAF3EA9C922E)\"", "div error");
        
        // test MODULUS
        assert!((lhs/rhs) == (c/rhs*lhs), "combination of inverse and mul equal div");    
        assert!(f==ark_bls12_381::Fr::from(0),"q-1+1 should be zero");
        assert!(q_minus_one==e);
        
    } 
}


