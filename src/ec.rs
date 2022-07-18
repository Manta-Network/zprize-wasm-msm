//! EC ADD Operation

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

// Elliptic point vectors times scalar.
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