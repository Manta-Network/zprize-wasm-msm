
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
        

        let lhs= ark_bls12_381::Fr::from(bigint_1);
        println!("lhs{}:?",lhs.to_string());
        
        
    } 
}


