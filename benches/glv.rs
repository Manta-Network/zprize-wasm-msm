use ark_bls12_381;
use ark_bn254;
use ark_ec::ProjectiveCurve;
use ark_std::UniformRand;
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use manta_benchmark::ecc;
use zprize_msm_wasm::{self, mul_glv};

fn arkworks_projective_scalar_multiplication_bls12_381(c: &mut Criterion) {
    let mut group = c.benchmark_group("bench");
    let mut rng = ark_std::rand::thread_rng();
    let mut point =
        black_box(ecc::sample_projective_point::<ark_bls12_381::G1Projective, _>(&mut rng));
    let scalar = black_box(ecc::sample_scalar::<ark_bls12_381::G1Affine, _>(&mut rng));
    group.bench_function(
        "arkworks projective-scalar multiplication on bls12-381",
        |b| {
            b.iter(|| {
                let _ = black_box(ecc::projective_scalar_mul_assign(&mut point, scalar));
            })
        },
    );
}

fn glv_projective_scalar_multiplication_bls12_381(c: &mut Criterion) {
    let mut group = c.benchmark_group("bench");
    let mut rng = ark_std::rand::thread_rng();
    let point =
        black_box(ecc::sample_projective_point::<ark_bls12_381::G1Projective, _>(&mut rng));
    let scalar =
        black_box(<ark_bls12_381::G1Projective as ProjectiveCurve>::ScalarField::rand(&mut rng));
    group.bench_function("glv projective-scalar multiplication on bls12-381", |b| {
        b.iter(|| {
            let _ = black_box(mul_glv(&scalar, &point));
        })
    });
}

fn arkworks_projective_scalar_multiplication_bn254(c: &mut Criterion) {
    let mut group = c.benchmark_group("bench");
    let mut rng = ark_std::rand::thread_rng();
    let mut point = black_box(ecc::sample_projective_point::<ark_bn254::G1Projective, _>(
        &mut rng,
    ));
    let scalar = black_box(ecc::sample_scalar::<ark_bn254::G1Affine, _>(&mut rng));
    group.bench_function("arkworks projective-scalar multiplication on bn254", |b| {
        b.iter(|| {
            let _ = black_box(ecc::projective_scalar_mul_assign(&mut point, scalar));
        })
    });
}

fn glv_projective_scalar_multiplication_bn254(c: &mut Criterion) {
    let mut group = c.benchmark_group("bench");
    let mut rng = ark_std::rand::thread_rng();
    let point = black_box(ecc::sample_projective_point::<ark_bn254::G1Projective, _>(
        &mut rng,
    ));
    let scalar =
        black_box(<ark_bn254::G1Projective as ProjectiveCurve>::ScalarField::rand(&mut rng));
    group.bench_function("glv projective-scalar multiplication on bn254", |b| {
        b.iter(|| {
            let _ = black_box(mul_glv(&scalar, &point));
        })
    });
}

criterion_group!(
    ecc,
    arkworks_projective_scalar_multiplication_bls12_381,
    glv_projective_scalar_multiplication_bls12_381,
    arkworks_projective_scalar_multiplication_bn254,
    glv_projective_scalar_multiplication_bn254,
);
criterion_main!(ecc);
