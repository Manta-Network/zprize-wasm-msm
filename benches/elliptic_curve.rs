//! Elliptic ProjectiveCurve Add Benchmarks

use ark_bls12_381::{G1Affine, G1Projective};
use ark_ec::{AffineCurve, ProjectiveCurve};
use ark_ff::UniformRand;
use ark_std::test_rng;
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use wasm_bls12_381::ec::{ generate_elliptic_inputs,projective_scalar_mul_assign, compute_elliptic_ops, generate_scalar_inputs, affine_scalar_mul};
use wasm_bls12_381::ec::{ generate_elliptic_inputs_affine, compute_elliptic_ops_affine};

// Projective points add
fn elliptic_curve_add_projective(c: &mut Criterion) {
    let mut group = c.benchmark_group("EC addition (Projective)");
    for size in (8..20).step_by(2) {
        let (lhs, rhs) = black_box(generate_elliptic_inputs::<G1Projective>(1 << size));
        group.bench_function(
            format!("(Projective) Input vector length: 2^{}", size),
            |b| {
                b.iter(|| {
                    let _ = black_box(compute_elliptic_ops::<G1Projective>(&lhs, &rhs));
                })
            },
        );
    }
}

// Affine points add
fn elliptic_curve_add_affine(c: &mut Criterion) {
    let mut group = c.benchmark_group("EC addition (Affine)");
    for size in (10..18).step_by(2) {
        let (lhs, rhs) = black_box(generate_elliptic_inputs_affine::<G1Affine>(1 << size));
        group.bench_function(
            format!("(Affine) Input vector length: 2^{}", size),
            |b| {
                b.iter(|| {
                    let _ = black_box(compute_elliptic_ops_affine::<G1Affine>(&lhs, &rhs));
                })
            },
        );
    }
}

// Projective mul scalar.
fn elliptic_curve_times_scalar_projective(c: &mut Criterion) {
    let mut group = c.benchmark_group("EC times scalar (Projective)");

    for size in (6..6).step_by(2) {
        let (mut lhs, _) = black_box(generate_elliptic_inputs::<G1Projective>(1 << size));
        let scalar_vec = black_box(generate_scalar_inputs::<G1Projective>(1 << size));
        group.bench_function(
            format!("(Projective) Input vector length: 2^{}", size),
            |b| {
                b.iter(|| {
                    let _ = black_box(projective_scalar_mul_assign::<G1Projective>(&mut lhs, &scalar_vec));
                })
            },
        );
    }
}

// Affien mul scalar.
fn elliptic_curve_times_scalar_affine(c: &mut Criterion) {
    let mut group = c.benchmark_group("EC times scalar (Affine)");

    for size in (6..10).step_by(2) {
        let (lhs, _) = black_box(generate_elliptic_inputs_affine::<G1Affine>(1 << size));
        let scalar_vec = black_box(generate_scalar_inputs::<G1Projective>(1 << size));
        group.bench_function(
            format!("(Affine) Input vector length: 2^{}", size),
            |b| {
                b.iter(|| {
                    let _ = black_box(affine_scalar_mul::<G1Affine>(&lhs, &scalar_vec));
                })
            },
        );
    }
}
criterion_group!(benches, elliptic_curve_add_affine,elliptic_curve_add_projective);
//criterion_group!(benches, elliptic_curve_times_scalar_projective, elliptic_curve_add_projective, elliptic_curve_times_scalar_affine, elliptic_curve_add_affine);
criterion_main!(benches);
