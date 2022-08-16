use ark_ec::{AffineCurve, ProjectiveCurve};
use ark_ff::{BigInteger, Field, PrimeField};
use num_bigint::{BigInt, BigUint, Sign, ToBigInt};
// We'll use the BLS12-381 G1 curve for this example.
//use ark_bls12_381::{Fq as F, Fr as ScalarField, G1Affine as GAffine, G1Projective as G};
use ark_bls12_381::{Fq as F, Fr as ScalarField, G1Affine as GAffine, G1Projective as G};
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
    let k2 = 0 - q1 * v[1].clone() - q2 * u[1].clone();

    let mut result = Vec::new();
    result.push(k1);
    result.push(k2);
    result
}

fn main() {
    let beta_raw: BigUint = "4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436".parse().unwrap();
    let beta: F = F::from_le_bytes_mod_order(&beta_raw.to_bytes_le());
    //Scalar to multiply P by:
    //let k: BigInt = "52435875175126190479447740508185965837690552500527637822603658699938581184510".parse().unwrap();
    let mut rng = ark_std::rand::thread_rng();
    let scalar = ScalarField::rand(&mut rng);
    let k_uint: num_bigint::BigUint = scalar.into();
    let k: num_bigint::BigInt = k_uint.to_bigint().unwrap();
    let testpoint = G::rand(&mut rng);
    let kP = testpoint.mul(&scalar.into_repr());

    //Components for first basis vector v:
    let v1: BigInt = "1".parse().unwrap();
    let v2: BigInt = "228988810152649578064853576960394133504".parse().unwrap();
    let mut v: Vec<BigInt> = Vec::new();
    v.push(v1);
    v.push(v2);

    //Components for second basis vector u:
    let u1: BigInt = "228988810152649578064853576960394133503".parse().unwrap();
    let u2: BigInt = "-1".parse().unwrap();
    let mut u: Vec<BigInt> = Vec::new();
    u.push(u1);
    u.push(u2);

    let decomposition = decompose_scalar(k, v, u);
    //Check signs for k1 and k2:
    let k1_unsigned: BigUint = BigInt::to_biguint(&decomposition[0]).unwrap();
    let k1_scalar = ScalarField::from_le_bytes_mod_order(&k1_unsigned.to_bytes_le());
    let k2_unsigned: BigUint = BigInt::to_biguint(&decomposition[1]).unwrap();
    let k2_scalar = ScalarField::from_le_bytes_mod_order(&k2_unsigned.to_bytes_le());

    let P1 = testpoint.mul(&k1_scalar.into_repr());
    let P2 = endomorphism(testpoint, beta).mul(k2_scalar.into_repr());

    let answer = P1 + P2;
    let answer_affine = answer.into_affine();

    assert_eq!(kP, answer);
    println!("{}",answer_affine.x);
    println!("{}",answer_affine.y);

}

fn endomorphism(P: G, b: F) -> GAffine {
    let P_affine = P.into_affine();
    let P_x = P_affine.x * b;
    let P_y = P_affine.y;
    let is_at_infinity = P_affine.is_zero();
    GAffine::new(P_x, P_y, is_at_infinity)
}
