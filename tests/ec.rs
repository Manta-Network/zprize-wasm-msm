use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_bls12_381::{ec_add, ec_timemssalar, ECProjectiveVectorInput, FrVectorInput};
use wasm_bls12_381::{ec_add_affine, ec_timemssalar_affine, ECAffineVectorInput};

use web_sys::console;

wasm_bindgen_test_configure!(run_in_browser);

/// Benchmarks scalar multiplication between a vector of scalars and a vector of elliptic curve points.
// #[wasm_bindgen_test]
// fn scalar_mul_projective() {
//     let REPEAT = 1000;
//     for size in (14..22).step_by(2) {
//         let mut point_vec = ECProjectiveVectorInput::new(1 << size);
//         let scalar_vec = FrVectorInput::new(1 << size);

//         let start_time = instant::Instant::now();
//         for _ in 0..REPEAT {
//             ec_timemssalar(&mut point_vec, &scalar_vec);
//         }
//         let end_time = instant::Instant::now();

//         console::log_1(
//             &format!(
//                 "EC timesacalar (projective): Input vector length: 2^{:?}, latency: {:?}",
//                 size,
//                 ((end_time - start_time) / REPEAT as u32)
//             )
//             .into(),
//         );
//     }
// }

/// Benchmarks scalar multiplication between a vector of scalars and a vector of elliptic curve points.
#[wasm_bindgen_test]
fn scalar_mul_affine() {
    let REPEAT = 1000;
    for size in (6..12).step_by(2) {
        let point_vec = ECAffineVectorInput::new(1 << size);
        let scalar_vec = FrVectorInput::new(1 << size);

        let start_time = instant::Instant::now();
        for _ in 0..REPEAT {
            ec_timemssalar_affine(&point_vec, &scalar_vec);
        }
        let end_time = instant::Instant::now();

        console::log_1(
            &format!(
                "EC timesacalar (affine): Input vector length: 2^{:?}, latency: {:?}",
                size,
                ((end_time - start_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}

/// Benchmarks addition of two vectors of projective curve points.
// #[wasm_bindgen_test]
// fn add_projective() {
//     let REPEAT = 100;
//     for size in (14..22).step_by(2) {
//         let vec = ECProjectiveVectorInput::new(1 << size);
//         let start_time = instant::Instant::now();
//         for _ in 0..REPEAT {
//             ec_add(&vec);
//         }
//         let end_time = instant::Instant::now();

//         console::log_1(
//             &format!(
//                 "EC ADD (projective): Input vector length: 2^{:?}, Add latency: {:?}",
//                 size,
//                 ((end_time - start_time) / REPEAT as u32)
//             )
//             .into(),
//         );
//     }
// }

/// Benchmarks addition of two vectors of projective curve points.
#[wasm_bindgen_test]
fn add_affine() {
    let REPEAT = 100;
    for size in (10..18).step_by(2) {
        let vec = ECAffineVectorInput::new(1 << size);
        let start_time = instant::Instant::now();
        for _ in 0..REPEAT {
            ec_add_affine(&vec);
        }
        let end_time = instant::Instant::now();

        console::log_1(
            &format!(
                "EC ADD: Input vector length (affine): 2^{:?}, Add latency: {:?}",
                size,
                ((end_time - start_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}

