
use criterion::{ criterion_group, criterion_main, Criterion};
use ark_ff::{PrimeField, UniformRand};
use ark_std::test_rng;
use ark_bls12_381::{Fr};
 

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




/// Checks whether algebra operation works.
fn all_operation_corect(c: &mut Criterion) {
    let a = generate_scalar_vector::<Fr>(2);
    let b = generate_scalar_vector::<Fr>(2);

    
    let c  = ark_bls12_381::Fr::from(1);
    let d  = ark_bls12_381::Fr::from(2);
    let e = c-d;
    // c.to_string();

    println!("a   {:?}",&a[0].to_string());
    println!("b   {:?}",&b[1].to_string());
    println!("a+b {:?}", (a[0]+b[1]).to_string());
    println!("a-b {:?}", (a[0]-b[1]).to_string());
    println!("a*b {:?}", (a[0]*b[1]).to_string());
    println!("a/b {:?}", (a[0]/b[1]).to_string());

    println!("c   {:?}",&c.to_string());
    println!("d   {:?}",&d.to_string());
    println!("e   {:?}",&e.to_string());
    println!("e*d {:?}", (e*d).to_string());

} 



criterion_group!(benches, all_operation_corect);
criterion_main!(benches);
