use ark_ec::{ AffineCurve, ProjectiveCurve};
use ark_ff::{UniformRand};
use ark_std::test_rng;
use criterion::{ criterion_group, criterion_main, Criterion};
//use ark_bls12_377::G1Affine;
use ark_bls12_381::G1Affine;


/// Generates inputs including two point vectors.
pub fn generate_elliptic_inputs<G>(
    size: usize,
) -> (
    Vec<<G::Projective as ProjectiveCurve>::Affine>,
    Vec<<G::Projective as ProjectiveCurve>::Affine>,
)
where
    G: AffineCurve,
{
    let mut rng = test_rng();
    (
        G::Projective::batch_normalization_into_affine(
            &(0..size)
                .map(|_| G::Projective::rand(&mut rng))
                .collect::<Vec<_>>(),
        ),
        G::Projective::batch_normalization_into_affine(
            &(0..size)
                .map(|_| G::Projective::rand(&mut rng))
                .collect::<Vec<_>>(),
        )

        // (0..size)
        //     .map(|_| G::ScalarField::rand(&mut rng).into_repr())
        //     .collect::<Vec<_>>(),
    )
}


pub fn compute_elliptic_ops<G>(
    point_vec1: Vec<<G::Projective as ProjectiveCurve>::Affine>,
    point_vec2: Vec<<G::Projective as ProjectiveCurve>::Affine>,
) -> Vec<<G::Projective as ProjectiveCurve>::Affine>
where
    G: AffineCurve,
{
    
    point_vec1.iter()
              .zip(point_vec2.iter())
              .map(|(l, r)| *l + *r)
              .collect::<Vec<<G::Projective as ProjectiveCurve>::Affine>>()
}



fn elliptic_ops_test(c: &mut Criterion) {
    let length = 18;
    let (point_vec1, point_vec2) = generate_elliptic_inputs::<G1Affine>(2<<length);
    let start_time = instant::Instant::now();
    let _ = compute_elliptic_ops::<G1Affine>(point_vec1, point_vec2);
    let end_time = instant::Instant::now();

    println!("Input vector length: 2^{:?}, Latency: {:?}",length,(end_time - start_time));

    
}


criterion_group!(benches, elliptic_ops_test);
criterion_main!(benches);