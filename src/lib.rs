use ark_ec::{AffineCurve, ProjectiveCurve};
use ark_ff::{BigInteger, Field, PrimeField};
use num_bigint::{BigInt, BigUint, Sign, ToBigInt};
use ark_bn254::{Fq as F, Fr as ScalarField}; //, G1Affine as GAffine, G1Projective as G};
use ark_bls12_381;
use ark_std::{UniformRand, Zero};






//Given a scalar k and basis vectors v and u
//finds integer scalars z1 and z2, so that (k,0) is close to
//z1v + z2u
pub fn decompose_scalar(k: BigInt, v: Vec<BigInt>, u: Vec<BigInt>) -> Vec<BigInt> {
    //We first find rational solutions to
    //(k,0) = q1v + q2u
    //We can re-write this problem as a matrix A(q1,q2) = (k,0)
    //So that (q1,q2) = A^-1(k,0)
    let det = (v[0].clone() * u[1].clone()) - (v[1].clone() * u[0].clone());
    let q1 = (u[1].clone() * k.clone()) / det.clone();
    let q2 = (-v[1].clone() * k.clone()) / det.clone();

    let k1 = k - q1.clone() * v[0].clone() - q2.clone() * u[0].clone();
    let k2 : BigInt = 0 - q1 * v[1].clone() - q2 * u[1].clone();

    let mut result = Vec::new();
    result.push(k1);
    result.push(k2);
    result
}

/// 
pub fn prepare_parameters<C>(p: C::BaseField) -> (C::BaseField, C::ScalarField) 
where 
    C: ProjectiveCurve
{
    let _ = p;
    todo!()
}

pub fn mul_glv<C>(scalar: C::ScalarField, point: C) -> C
where
    C: ProjectiveCurve
{
    todo!()
}

pub fn glv_is_correct<C>() 
where 
    C: ProjectiveCurve,
{
    let mut rng = ark_std::rand::thread_rng();
    let scalar = C::ScalarField::rand(&mut rng);
    let point = C::rand(&mut rng);
    assert_eq!(
        point.mul(&scalar.into_repr()),
        mul_glv(scalar, point),
        "GLV should produce the same results as Arkworks scalar multiplication."
    );
}

#[test]
fn glv_matches_arkworks_scalar_mul()
{
    glv_is_correct::<ark_bn254::G1Projective>();
    glv_is_correct::<ark_bls12_381::G1Projective>();
}

// fn main() {
//     let beta_raw: BigUint = "2203960485148121921418603742825762020974279258880205651966".parse().unwrap();
//     let beta: F = F::from_le_bytes_mod_order(&beta_raw.to_bytes_le());
//     //Scalar to multiply P by:
//     //let k: BigInt = "52435875175126190479447740508185965837690552500527637822603658699938581184510".parse().unwrap();
//     let mut rng = ark_std::rand::thread_rng();
//     let scalar = ScalarField::rand(&mut rng);
//     let k_uint: num_bigint::BigUint = scalar.into();
//     let k: num_bigint::BigInt = k_uint.to_bigint().unwrap();
//     let testpoint = G::rand(&mut rng);
//     let kP = testpoint.mul(&scalar.into_repr());

//     //Components for first basis vector v:
//     // TODO: Generate v1 and v2 in rust.
//     let v1: BigInt = "9931322734385697763".parse().unwrap();
//     let v2: BigInt = "-147946756881789319000765030803803410728".parse().unwrap();
//     let mut v: Vec<BigInt> = Vec::new();
//     v.push(v1);
//     v.push(v2);

//     //Components for second basis vector u:
//     let u1: BigInt = "147946756881789319010696353538189108491".parse().unwrap();
//     let u2: BigInt = "9931322734385697763".parse().unwrap();
//     let mut u: Vec<BigInt> = Vec::new();
//     u.push(u1);
//     u.push(u2);


//     let decomposition = decompose_scalar(k, v, u);

//     //Check sign for k1
//     let mut P1 = G::zero();
//     let mut P2 = G::zero();
//     if Sign::Minus == decomposition[0].sign(){
//         let k1_unsigned : BigUint = BigInt::to_biguint(&-(&decomposition[0])).unwrap();
//         let k1_scalar = ScalarField::from_le_bytes_mod_order(&k1_unsigned.to_bytes_le());
//         P1 = -testpoint.mul(&k1_scalar.into_repr());
//     }
//     else {
//         let k1_unsigned: BigUint = BigInt::to_biguint(&decomposition[0]).unwrap();
//         let k1_scalar = ScalarField::from_le_bytes_mod_order(&k1_unsigned.to_bytes_le());
//         P1 = testpoint.mul(&k1_scalar.into_repr());
//     }
//     //Check sign for k2
//     if Sign::Minus == decomposition[1].sign(){
//         let k2_unsigned : BigUint = BigInt::to_biguint(&-(&decomposition[1])).unwrap();
//         let k2_scalar = ScalarField::from_le_bytes_mod_order(&k2_unsigned.to_bytes_le());
//         P2 = -endomorphism(testpoint, beta).mul(k2_scalar.into_repr());
//     }
//     else {
//         let k2_unsigned: BigUint = BigInt::to_biguint(&decomposition[1]).unwrap();
//         let k2_scalar = ScalarField::from_le_bytes_mod_order(&k2_unsigned.to_bytes_le());
//         P2 = endomorphism(testpoint, beta).mul(k2_scalar.into_repr());

//     }
//     let answer = P1 + P2;
//     assert_eq!(kP, answer);
// }

// fn endomorphism(P: G, b: F) -> GAffine {
//     let P_affine = P.into_affine();
//     let P_x = P_affine.x * b;
//     let P_y = P_affine.y;
//     let is_at_infinity = P_affine.is_zero();
//     GAffine::new(P_x, P_y, is_at_infinity)
// }
