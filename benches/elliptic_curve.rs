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


fn elliptic_curve_add(c: &mut Criterion) {
    let mut group = c.benchmark_group("ec addition");
    for size in (8..20).step_by(2) {
        let (lhs,rhs) = generate_elliptic_inputs::<G1Projective>(1 << size);
        group.bench_function(format!("(Projective) Input vector length: 2^{}", size), |b| {
            b.iter(|| {
                let _ = compute_elliptic_ops::<G1Projective>(&lhs, &rhs);
            })
        });
    }
}


criterion_group!(benches, elliptic_curve_add);
criterion_main!(benches);