// Copyright 2019-2022 Manta Network.
// This file is part of manta-rs.
//
// manta-rs is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// manta-rs is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with manta-rs.  If not, see <http://www.gnu.org/licenses/>.

//! Finite Field Benchmarks

use criterion::{black_box, criterion_group, criterion_main, Criterion};

use ark_bls12_381::{Fq, Fr};
use ark_ff::{PrimeField, UniformRand};
use ark_std::test_rng;
use wasm_bls12_381::ff::{generate_scalar_vector, Operations};

// fn fr_addition(c: &mut Criterion) {
//     let mut group = c.benchmark_group("bench");
//     let size = 1<<
//     let lhs = generate_scalar_vector::<Fr>(1<<size);

//     let mut lhs = black_box(ecc::sample_affine_point::<G1Affine, _>(&mut rng));
//     let rhs = black_box(ecc::sample_affine_point(&mut rng));
//     group.bench_function("affine-affine addition", |b| {
//         b.iter(|| {
//             let _ = black_box(ecc::affine_affine_add_assign(&mut lhs, &rhs));
//         })
//     });
// }

fn fr_add(c: &mut Criterion) {
    let mut group = c.benchmark_group("fr addition");
    for size in (12..24).step_by(2) {
        let lhs = black_box(generate_scalar_vector::<Fr>(1 << size));
        let rhs = black_box(generate_scalar_vector::<Fr>(1 << size));
        group.bench_function(format!("Input vector length: 2^{}", size), |b| {
            b.iter(|| {
                let _ = black_box(Operations::add(&lhs, &rhs));
            })
        });
    }
}

fn fr_sub(c: &mut Criterion) {
    let mut group = c.benchmark_group("fr subtraction");
    for size in (12..24).step_by(2) {
        let lhs = black_box(generate_scalar_vector::<Fr>(1 << size));
        let rhs = black_box(generate_scalar_vector::<Fr>(1 << size));
        group.bench_function(format!("Input vector length: 2^{}", size), |b| {
            b.iter(|| {
                let _ = black_box(Operations::sub(&lhs, &rhs));
            })
        });
    }
}

fn fr_mul(c: &mut Criterion) {
    let mut group = c.benchmark_group("fr subtraction");
    for size in (12..24).step_by(2) {
        let lhs = black_box(generate_scalar_vector::<Fr>(1 << size));
        let rhs = black_box(generate_scalar_vector::<Fr>(1 << size));
        group.bench_function(format!("Input vector length: 2^{}", size), |b| {
            b.iter(|| {
                let _ = black_box(Operations::sub(&lhs, &rhs));
            })
        });
    }
}


criterion_group!(benches, fr_add, fr_sub);
criterion_main!(benches);
