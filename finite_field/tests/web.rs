use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_zkp_challenge::{compute_ff_scalar,ScalarVectorInput,PointVectorInput,compute_ff_point};
use web_sys::console;

wasm_bindgen_test_configure!(run_in_browser);

static REPEAT: usize = 5;

#[wasm_bindgen_test]
fn benchmark() {
    for size in (18..20).step_by(2) {
        let start_time = instant::Instant::now();
        let scalr1 = ScalarVectorInput::new(2<<size);
        let scalr2 = ScalarVectorInput::new(2<<size);
        let point1 = PointVectorInput::new(2<<size);
        let point2 = PointVectorInput::new(2<<size);

        for _ in 0..REPEAT {
            compute_ff_scalar(&scalr1,&scalr2);
            compute_ff_point(&point1, &point2);
        }
        let end_time = instant::Instant::now();
        console::log_1(
            &format!(
                "Input vector length: 2^{:?}, Latency: {:?}",
                size,
                ((end_time - start_time) / REPEAT as u32)
            )
            .into(),
        );
    }
}
