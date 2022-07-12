
use criterion::{ criterion_group, criterion_main, Criterion};

use ark_ff::{PrimeField, UniformRand, BigInteger};
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





fn compute_all_operations<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::add(lhs, rhs);
    let _ = Operations::sub(lhs, rhs);
    let _ = Operations::mul(lhs, rhs);
    let _ = Operations::mul(lhs, rhs);
}

fn compute_add<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::add(lhs, rhs);
}

fn compute_sub<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::sub(lhs, rhs);
}

fn compute_mul<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::mul(lhs, rhs);
}


/// Checks whether algebra operation works.
fn all_operation_works(c: &mut Criterion) {
    for size in (18..26).step_by(2) {
        let start_time = instant::Instant::now();
        compute_add::<Fr>(
            &generate_scalar_vector::<Fr>(1<<size),
            &generate_scalar_vector::<Fr>(1<<size),
        );
        let add_time = instant::Instant::now();
    
        
        compute_sub::<Fr>(
            &generate_scalar_vector::<Fr>(1<<size),
            &generate_scalar_vector::<Fr>(1<<size),
        );
        let sub_time = instant::Instant::now();

        compute_mul::<Fr>(
            &generate_scalar_vector::<Fr>(1<<size),
            &generate_scalar_vector::<Fr>(1<<size),
        );
        let mul_time = instant::Instant::now();

        println!("Vector size: 2^{:?}, add: {:?}, sub: {:?}, mul: {:?}",
        size,
        (add_time - start_time),
        (sub_time - add_time),
        (mul_time - sub_time)
    )
    }
} 



criterion_group!(benches, all_operation_works);
criterion_main!(benches);
