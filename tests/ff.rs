use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_bls12_381::{fr_add, fr_div, fr_mul, fr_sub};
use wasm_bls12_381::{fq_add, fq_div, fq_mul, fq_sub};
use wasm_bls12_381::{FqVectorInput, FrVectorInput};
use web_sys::console;

wasm_bindgen_test_configure!(run_in_browser);

static REPEAT: usize = 100;

// #[wasm_bindgen_test]
// fn fr() {
//     for size in (16..18).step_by(2) {
//         let start_time = instant::Instant::now();
//         let fr1 = FrVectorInput::new(1 << size);
//         let fr2 = FrVectorInput::new(1 << size);
//         for _ in 0..REPEAT {
//             fr_add(&fr1, &fr2);
//         }
//         let add_time = instant::Instant::now();
//         for _ in 0..REPEAT {
//             fr_sub(&fr1, &fr2);
//         }
//         let sub_time = instant::Instant::now();
//         for _ in 0..REPEAT {
//             fr_mul(&fr1, &fr2);
//         }
//         let mul_time = instant::Instant::now();
//         for _ in 0..REPEAT {
//             fr_div(&fr1, &fr2);
//         }
//         let div_time = instant::Instant::now();

//         console::log_1(
//             &format!(
//                 "Fr Input vector length: 2^{:?}, Add latency: ???, Sub latency: ???, Mul latency: ??? Div latency: {:?}",
//                 size,
//                 ((add_time - start_time) / REPEAT as u32),
//                 ((sub_time - add_time) / REPEAT as u32),
//                 ((mul_time - sub_time) / REPEAT as u32)
//                 ((div_time - mul_time) / REPEAT as u32)
//             )
//             .into(),
//         );
//     }
// }

#[wasm_bindgen_test]
fn fq() {
    for size in (18..24).step_by(2) {
        let start_time = instant::Instant::now();
        let fq1 = FqVectorInput::new(1 << size);
        let fq2 = FqVectorInput::new(1 << size);
        for _ in 0..REPEAT {
            fq_add(&fq1, &fq2);
        }
        let add_time = instant::Instant::now();
        for _ in 0..REPEAT {
            fq_sub(&fq1, &fq2);
        }
        let sub_time = instant::Instant::now();
        for _ in 0..REPEAT {
            fq_mul(&fq1, &fq2);
        }
        let mul_time = instant::Instant::now();
        // for _ in 0..REPEAT {
        //     fq_div(&fq1, &fq2);
        // }
        // let div_time = instant::Instant::now();

        console::log_1(
            &format!(
                "Fq Input vector length: 2^{:?}, Add latency: {:?}, Sub latency: {:?}, Mul latency: {:?} Div latency: ?",
                size,
                ((add_time - start_time) / REPEAT as u32),
                ((sub_time - add_time) / REPEAT as u32),
                ((mul_time - sub_time) / REPEAT as u32)
                //((div_time - mul_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}