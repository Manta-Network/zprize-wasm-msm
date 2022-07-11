use wasm_bindgen::prelude::wasm_bindgen;
use ark_bls12_381::{Fq,Fr};

pub mod ops;
pub mod elliptic_ops;

#[wasm_bindgen]
pub fn compute_ff_scalar(sclar1:&ScalarVectorInput,
    scalr2:&ScalarVectorInput) {
    ops::compute_all_operations::<Fr>(
        &sclar1.scalar_vec,&scalr2.scalar_vec
    );
}


#[wasm_bindgen]
pub fn compute_ff_point(point1:&PointVectorInput,
    point2:&PointVectorInput) {
    ops::compute_all_operations::<Fq>(
        &point1.point_vec,&point2.point_vec
    );
}




#[wasm_bindgen]
pub struct PointVectorInput {
    point_vec: Vec<ark_ff::Fp384<ark_bls12_381::FqParameters>>,
}

#[wasm_bindgen]
impl PointVectorInput {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        Self {
            point_vec: ops::generate_scalar_vector::<Fq>(size),
        }
    }
}


#[wasm_bindgen]
pub struct ScalarVectorInput {
    scalar_vec: Vec<ark_ff::Fp256<ark_bls12_381::FrParameters>>,
}



#[wasm_bindgen]
impl ScalarVectorInput {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        Self {
            scalar_vec:  ops::generate_scalar_vector::<Fr>(size),
        }
    }
}


