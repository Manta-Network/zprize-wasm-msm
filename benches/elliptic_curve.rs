//! Elliptic ProjectiveCurve Add Benchmarks

use ark_ec::{ AffineCurve, ProjectiveCurve};
use ark_ff::{UniformRand};
use ark_std::test_rng;
use ark_bls12_381::{G1Affine,G1Projective};
use criterion::{black_box, criterion_group, criterion_main, Criterion};

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




// Two elliptic point vectors add.
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
) //->  Vec<P>
where
    P: ProjectiveCurve,
{
    points.iter_mut()
              .zip(scalars.iter())
              .for_each(|(l, r)| (*l).mul_assign(*r));
}


fn elliptic_curve_add(c: &mut Criterion) {
    let mut group = c.benchmark_group("EC addition (Projective)");
    for size in (8..20).step_by(2) {
        let (lhs,rhs) = generate_elliptic_inputs::<G1Projective>(1 << size);
        group.bench_function(format!("(Projective) Input vector length: 2^{}", size), |b| {
            b.iter(|| {
                let _ = compute_elliptic_ops::<G1Projective>(&lhs, &rhs);
            })
        });
    }
}


fn elliptic_curve_times_scalar(c: &mut Criterion) {
    let mut group = c.benchmark_group("EC times scalar (Projective)");

    for size in (6..6).step_by(2) {
        let (mut lhs, _) = generate_elliptic_inputs::<G1Projective>(1 << size);

        let scalar_vec =  generate_scalar_inputs::<G1Projective>(1 << size);
        group.bench_function(format!("(Projective) Input vector length: 2^{}", size), |b| {
            b.iter(|| {
                let _ = projective_scalar_mul_assign::<G1Projective>(&mut lhs, &scalar_vec);
            })
        });
    }
}


criterion_group!(benches, elliptic_curve_times_scalar, elliptic_curve_add);
criterion_main!(benches);