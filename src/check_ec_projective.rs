//! Elliptic Curve Add Benchmarks

use ark_ec::{ AffineCurve, ProjectiveCurve};
use ark_ff::{UniformRand};
use ark_std::test_rng;
use ark_bls12_381::G1Projective;

/// Generates inputs including two point vectors.
pub fn generate_elliptic_inputs<G>(
    size: usize,
) -> (
    Vec<G>,
    Vec<G>,
)
where
    G: ProjectiveCurve,
{
    let mut rng = test_rng();
    (
        (0..size)
                .map(|_| G::rand(&mut rng))
                .collect::<Vec<_>>(),

        (0..size)
            .map(|_| G::rand(&mut rng))
            .collect::<Vec<_>>(),  
    )
}


pub fn compute_elliptic_ops<G>(
    point_vec1: &Vec<G>,
    point_vec2: &Vec<G>,
) -> Vec<G>
where
    G: ProjectiveCurve,
{
    
    point_vec1.iter()
              .zip(point_vec2.iter())
              .map(|(l, r)| *l + *r)
              .collect::<Vec<G>>()
}

#[cfg(test)]
mod tests{
    use super::*;
    use ark_bls12_381::{Fr, FrParameters};
    use ark_ff::{
        biginteger::BigInteger384 as BigInteger,

    };
    
    #[test]
    fn ec_add_corect(){
        let (lhs,rhs) = generate_elliptic_inputs::<G1Projective>(2);
        let mut p1 = lhs[0];
        let mut p2 = lhs[1];

        let p1x = BigInteger([
            7622990700549858015,
            13713546941542556709,
            12560975430337781823,
            15541891435126201453,
            12367723691069907442,
            1619941315378521877
        ]);
        let p1y = BigInteger([
            7503064769766296380,
            17682185531341488458,
            4876766006449067563,
            1171733563318992132,
            11348451559967720207,
            364661073872536959
        ]);
        let p1z = BigInteger([
            10675734658262686032,
            963240814171391534,
            5763008491877574369,
            14915348776474232903,
            4578719198622222604,
            1377984418915705122
        ]);
        let p2x = BigInteger([
            17308138315201938639,
            15231614684824825631,
            4220957540736821006,
            3984975709872008445,
            8341411372866811043,
            1131067719257598863
        ]);
        let p2y = BigInteger([
            4817351678075095725,
            17586559557000853883,
            9837694924606671145,
            164039902075094506,
            914858480124102985,
            1820014857799359510
        ]);
        let p2z = BigInteger([
            10116724002236296559,
            5289474606493615166,
            14330604034056669932,
            5031534622838663379,
            6520446134357048638,
            1055855224236824317
        ]);

        // set p1 and p2
        p1.x = ark_bls12_381::Fq::from(p1x);
        p1.y = ark_bls12_381::Fq::from(p1y);
        p1.z = ark_bls12_381::Fq::from(p1z);

        p2.x = ark_bls12_381::Fq::from(p2x);
        p2.y = ark_bls12_381::Fq::from(p2y);
        p2.z = ark_bls12_381::Fq::from(p2z);

        let p3 = p1+p2;
        
        assert!(p3.x.to_string()=="Fp384 \"(145B87AB9FFA5F869C95870899AA7F55978B2A911A8640F5FAEB4A877DF2FA29F4271D5E44B34C25000F2B17C570D854)\"");
        assert!(p3.y.to_string()=="Fp384 \"(05E108707C2D0615FE6D250E82987FF8CFABF734B5480D36789352B17950AE331AC70CBC0AC3FAC6B982395D281631F9)\"");        
        assert!(p3.z.to_string()=="Fp384 \"(0E9046AB3DB7EAB3AC6FA11B3192A9F355539D2F2A221B636FE7DA605E609A8A68788561A094AEA24CBB2BFF7EEBA3CA)\"");

    }

}
