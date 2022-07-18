use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_bls12_381::{ECProjectiveVectorInput,ec_add};
use web_sys::console;

wasm_bindgen_test_configure!(run_in_browser);

static REPEAT: usize = 1000;

#[wasm_bindgen_test]
fn benchmark() {
    for size in (10..18).step_by(2) {
        let vec = ECProjectiveVectorInput::new(1<<size);
        let start_time = instant::Instant::now();
        for _ in 0..REPEAT {
            ec_add(&vec);
        }
        let end_time = instant::Instant::now();
        
        console::log_1(
            &format!(
                "EC ADD: Input vector length: 2^{:?}, Add latency: {:?}",
                size,
                ((end_time - start_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}

