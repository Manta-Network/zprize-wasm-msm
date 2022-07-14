use ark_bls12_381::{Fq, Fr};
use wasm_bindgen::prelude::wasm_bindgen;

pub mod check_ff;
pub mod ff;

#[wasm_bindgen]
pub fn fr_add(fr1: &FrVectorInput, fr2: &FrVectorInput) {
    ff::compute_add::<Fr>(&fr1.scalar_vec, &fr2.scalar_vec);
}

#[wasm_bindgen]
pub fn fr_sub(fr1: &FrVectorInput, fr2: &FrVectorInput) {
    ff::compute_sub::<Fr>(&fr1.scalar_vec, &fr2.scalar_vec);
}

#[wasm_bindgen]
pub fn fr_mul(fr1: &FrVectorInput, fr2: &FrVectorInput) {
    ff::compute_mul::<Fr>(&fr1.scalar_vec, &fr2.scalar_vec);
}

#[wasm_bindgen]
pub fn fr_div(fr1: &FrVectorInput, fr2: &FrVectorInput) {
    ff::compute_div::<Fr>(&fr1.scalar_vec, &fr2.scalar_vec);
}

#[wasm_bindgen]
pub struct FqVectorInput {
    point_vec: Vec<ark_ff::Fp384<ark_bls12_381::FqParameters>>,
}

#[wasm_bindgen]
impl FqVectorInput {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        Self {
            point_vec: ff::generate_scalar_vector::<Fq>(size),
        }
    }
}

#[wasm_bindgen]
pub struct FrVectorInput {
    scalar_vec: Vec<ark_ff::Fp256<ark_bls12_381::FrParameters>>,
}

#[wasm_bindgen]
impl FrVectorInput {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        Self {
            scalar_vec: ff::generate_scalar_vector::<Fr>(size),
        }
    }
}
