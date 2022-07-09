
use criterion::{ criterion_group, criterion_main, Criterion};

use ark_ff::{PrimeField, UniformRand};
use ark_std::test_rng;
use ark_bls12_381::{Fq, Fr};


/// Randomly generates a scalar vector.
pub fn generate_scalar_vector<F>(size: usize) -> Vec<F>
where
    F: UniformRand,
{
    let mut rng = test_rng();
    (0..size).map(|_| F::rand(&mut rng)).collect::<Vec<_>>()
}

/// Finite field operations
pub trait Operations {
    /// Adds `rhs` to `self`.
    fn add(&self, rhs: &Self) -> Self;

    /// Subtracts `rhs` from `self`.
    fn sub(&self, rhs: &Self) -> Self;

    /// Multiplies `rhs` with `self`.
    fn mul(&self, rhs: &Self) -> Self;

    /// Divides `self` by `rhs`.
    fn div(&self, rhs: &Self) -> Self;
}

impl<F> Operations for Vec<F>
where
    F: PrimeField,
{
    fn add(&self, rhs: &Self) -> Self {
        self.iter()
            .zip(rhs.iter())
            .map(|(l, r)| *l + *r)
            .collect::<Vec<F>>()
    }

    fn sub(&self, rhs: &Self) -> Self {
        self.iter()
            .zip(rhs.iter())
            .map(|(l, r)| *l - *r)
            .collect::<Vec<F>>()
    }

    fn mul(&self, rhs: &Self) -> Self {
        self.iter()
            .zip(rhs.iter())
            .map(|(l, r)| *l * *r)
            .collect::<Vec<F>>()
    }

    fn div(&self, rhs: &Self) -> Self {
        self.iter()
            .zip(rhs.iter())
            .map(|(l, r)| *l / *r)
            .collect::<Vec<F>>()
    }
}



/// Vector length of finite field elements
const SIZE: usize = 1 << 22;

fn compute_all_operations<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::add(lhs, rhs);
    let _ = Operations::sub(lhs, rhs);
    let _ = Operations::mul(lhs, rhs);
    let _ = Operations::mul(lhs, rhs);
}

/// Checks whether algebra operation works.
fn all_operation_works(c: &mut Criterion) {
    let mut group = c.benchmark_group("all_operation_works");
    group.bench_function(format!("Input vector length: {}", SIZE), |b| {
                    b.iter(|| {
                        compute_all_operations::<Fq>(
                            &generate_scalar_vector::<Fq>(SIZE),
                            &generate_scalar_vector::<Fq>(SIZE),
                        );
                        compute_all_operations::<Fr>(
                            &generate_scalar_vector::<Fr>(SIZE),
                            &generate_scalar_vector::<Fr>(SIZE),
                        );
                    })
                });
} 



criterion_group!(benches, all_operation_works);
criterion_main!(benches);
