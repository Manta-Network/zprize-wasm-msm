use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_bls12_381::{fr_add, fr_div, fr_mul, fr_sub};
use wasm_bls12_381::{FqVectorInput, FrVectorInput};
use web_sys::console;

wasm_bindgen_test_configure!(run_in_browser);

static REPEAT: usize = 1000;

/// TODO
#[wasm_bindgen_test]
fn ff() {
    for size in (16..18).step_by(2) {
        let start_time = instant::Instant::now();
        let fr1 = FrVectorInput::new(1 << size);
        let fr2 = FrVectorInput::new(1 << size);
        for _ in 0..REPEAT {
            fr_add(&fr1, &fr2);
        }
        let add_time = instant::Instant::now();
        for _ in 0..REPEAT {
            fr_sub(&fr1, &fr2);
        }
        let sub_time = instant::Instant::now();
        for _ in 0..REPEAT {
            fr_mul(&fr1, &fr2);
        }
        let mul_time = instant::Instant::now();
        for _ in 0..REPEAT {
            fr_div(&fr1, &fr2);
        }
        let div_time = instant::Instant::now();

        console::log_1(
            &format!(
                "Input vector length: 2^{:?}, Add latency: ???, Sub latency: ???, Mul latency: ??? Div latency: {:?}",
                size,
                ((add_time - start_time) / REPEAT as u32),
                ((sub_time - add_time) / REPEAT as u32),
                ((mul_time - sub_time) / REPEAT as u32)
                ((div_time - mul_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}

// TODO: Add Fq