//! Finite Filed Operations

use ark_ff::{PrimeField, UniformRand};
use ark_std::test_rng;

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

pub fn compute_add<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::add(lhs, rhs);
}

pub fn compute_sub<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::sub(lhs, rhs);
}

pub fn compute_mul<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::mul(lhs, rhs);
}

pub fn compute_div<F>(lhs: &Vec<F>, rhs: &Vec<F>)
where
    F: PrimeField,
{
    let _ = Operations::div(lhs, rhs);
}
