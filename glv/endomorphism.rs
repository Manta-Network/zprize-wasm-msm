use ark_ec::{ProjectiveCurve, AffineCurve};
use ark_ff::{PrimeField, Field};
// We'll use the BLS12-381 G1 curve for this example.
use ark_bls12_381::{G1Projective as G, G1Affine as GAffine, Fr as ScalarField};
use ark_std::{Zero, UniformRand,rand};
use ark_bls12_381::Fq as F;

fn endomorphism(P : G, b : F) -> GAffine { 
    let P_affine = P.into_affine();
    let P_x = P_affine.x*b;
    let P_y = P_affine.y;
    let is_at_infinity = P_affine.is_zero();
    GAffine::new(P_x, P_y, is_at_infinity)
}


