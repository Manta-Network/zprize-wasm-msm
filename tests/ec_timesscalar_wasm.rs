use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_bls12_381::{ECProjectiveVectorInput, FrVectorInput, ec_timemssalar};
use web_sys::console;

wasm_bindgen_test_configure!(run_in_browser);

static REPEAT: usize = 100;

#[wasm_bindgen_test]
fn benchmark() { 
    for size in (6..14).step_by(2) {
        let mut point_vec = ECProjectiveVectorInput::new(1 << size);
        let scalar_vec = FrVectorInput::new(1 << size);

        let start_time = instant::Instant::now();
        for _ in 0..REPEAT {
            ec_timemssalar(&mut point_vec, &scalar_vec);
        }
        let end_time = instant::Instant::now();
        
        console::log_1(
            &format!(
                "EC timesacalar: Input vector length: 2^{:?}, latency: {:?}",
                size,
                ((end_time - start_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}
