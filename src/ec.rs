//! EC ADD Operation

//! Elliptic Curve Add Benchmarks

use std::ops::MulAssign;

use ark_ec::{ AffineCurve, ProjectiveCurve};
use ark_ff::{UniformRand};
use ark_std::test_rng;
use ark_bls12_381::G1Projective;

/// Generates inputs including two projective point vectors.
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

// Generate scalar vector.
pub fn generate_scalar_inputs<A>(size: usize) -> Vec<A::ScalarField>
where
    A: ProjectiveCurve,
{
    let mut rng = test_rng();
    (0..size)
        .map(|_| A::ScalarField::rand(&mut rng))
        .collect::<Vec<_>>()
}

// Projective projective add.
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

// Projective times scalar.
pub fn projective_scalar_mul_assign<P>(
    points: &mut Vec<P>, 
    scalars: &Vec<P::ScalarField>
) 
where
    P: ProjectiveCurve,
{
    points.iter_mut()
              .zip(scalars.iter())
              .for_each(|(l, r)| (*l).mul_assign(*r));
}

// Generate two EC affine inpput vectors.
pub fn generate_elliptic_inputs_affine<G>(
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
    )
}

// Affine add affine.
pub fn compute_elliptic_ops_affine<G>(
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

// Elliptic point vectors times scalar (Affine).
pub fn affine_scalar_mul<G>(
    point_vec1: &Vec<G>,
    scalars: &Vec<G::ScalarField>
) 
where
    G: AffineCurve,
{
    for (p, s) in point_vec1.iter().zip(scalars.iter()){
        let _ = (*p).mul(*s);
    }
}