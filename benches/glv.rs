
use ark_bls12_381::{G1Affine, G1Projective};
use core::iter::repeat_with;
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use zprize_msm_wasm;

// fn projective_scalar_multiplication(c: &mut Criterion) {
//     let mut group = c.benchmark_group("bench");
//     let mut rng = OsRng;
//     let mut point = black_box(ecc::sample_projective_point::<G1Projective, _>(&mut rng));
//     let scalar = black_box(ecc::sample_scalar::<G1Affine, _>(&mut rng));
//     group.bench_function("projective-scalar multiplication", |b| {
//         b.iter(|| {
//             let _ = black_box(ecc::projective_scalar_mul_assign(&mut point, scalar));
//         })
//     });
// }

fn projective_scalar_multiplication(c: &mut Criterion) {
    let mut group = c.benchmark_group("bench");
    let mut rng = OsRng;
    let mut point = black_box(ecc::sample_projective_point::<G1Projective, _>(&mut rng));
    let scalar = black_box(ecc::sample_scalar::<G1Affine, _>(&mut rng));
    group.bench_function("projective-scalar multiplication", |b| {
        b.iter(|| {
            let _ = black_box(ecc::projective_scalar_mul_assign(&mut point, scalar));
        })
    });
}


criterion_group!(
    ecc,
    projective_scalar_multiplication,
);
criterion_main!(ecc);