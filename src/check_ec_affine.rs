//! Elliptic Curve Add Benchmarks

use ark_ec::{ AffineCurve, ProjectiveCurve};
use ark_ff::{UniformRand};
use ark_std::test_rng;
use ark_bls12_381::G1Affine;

/// Generates inputs including two point vectors.
pub fn generate_elliptic_inputs<G>(
    size: usize,
) -> (
    Vec<<G::Projective as ProjectiveCurve>::Affine>,
    Vec<<G::Projective as ProjectiveCurve>::Affine>,
)
where
    G: AffineCurve,
{
    let mut rng = test_rng();
    (
        G::Projective::batch_normalization_into_affine(
            &(0..size)
                .map(|_| G::Projective::rand(&mut rng))
                .collect::<Vec<_>>(),
        ),
        G::Projective::batch_normalization_into_affine(
            &(0..size)
                .map(|_| G::Projective::rand(&mut rng))
                .collect::<Vec<_>>(),
        )
        //G::Projective::batch_normalization();

        // (0..size)
        //     .map(|_| G::ScalarField::rand(&mut rng).into_repr())
        //     .collect::<Vec<_>>(),
    )
}


pub fn compute_elliptic_ops<G>(
    point_vec1: &Vec<<G::Projective as ProjectiveCurve>::Affine>,
    point_vec2: &Vec<<G::Projective as ProjectiveCurve>::Affine>,
) -> Vec<<G::Projective as ProjectiveCurve>::Affine>
where
    G: AffineCurve,
{
    
    point_vec1.iter()
              .zip(point_vec2.iter())
              .map(|(l, r)| *l + *r)
              .collect::<Vec<<G::Projective as ProjectiveCurve>::Affine>>()
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
        let (lhs,rhs) = generate_elliptic_inputs::<G1Affine>(2);
        let mut p1 = lhs[0];
        let mut p2 = lhs[1];

        //p1.into_projective();
        println!("projective:{:?}",p1.into_projective());
        println!("projective:{:?}",p1);

        let p1x = BigInteger([
            1966261954655348031,
            5731413129826153240,
            15095122238703470501,
            4681017584518357560,
            6574875576842048829,
            1829231488545761578
        ]);
        let p1y = BigInteger([
            3774031170070494122,
            12588957839539536863,
            5337873936852570527,
            4297638390619080094,
            1498511210690604774,
            1497339654947580546
        ]);
        let p2x = BigInteger([
            11801634263024262672,
            7774160182574066130,
            17504672021508774312,
            7987095069023847116,
            12536851020341999149,
            713488309883134185
        ]);
        let p2y = BigInteger([
            6685322520580378312,
            2144895941524481040,
            8487891351798887969,
            15491172252985590303,
            9338239879895333561,
            1351753874645275807
        ]);

        // set p1 and p2
        p1.x = ark_bls12_381::Fq::from(p1x);
        p1.y = ark_bls12_381::Fq::from(p1y);

        p2.x = ark_bls12_381::Fq::from(p2x);
        p2.y = ark_bls12_381::Fq::from(p2y);


        let p3 = p1+p2;
        
        assert!(p3.x.to_string()=="Fp384 \"(0513C7F15BD0A3C9C1FC1AA95D00FCF668066EC5B99015A8063E9400FD62B4CD35D4B84B28BE97A7D10769697E64B0ED)\"");
        assert!(p3.y.to_string()=="Fp384 \"(1478657E45FA945D49B22D7D95F8F9A4C0621AC66E1C9B41C73FA8DA66BC131F8DE19C51A977427AF2A5CA6E2031ABD0)\"");
        
    }

}
