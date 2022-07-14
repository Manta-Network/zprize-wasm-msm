use wasm_bindgen::prelude::wasm_bindgen;
use ark_bls12_381::{Fq,Fr};

pub mod ops;
pub mod check_ff;

#[wasm_bindgen]
pub fn compute_ff_scalar(sclar1:&FrVectorInput,
    scalr2:&FrVectorInput) {
    ops::compute_all_operations::<Fr>(
        &sclar1.scalar_vec,&scalr2.scalar_vec
    );
}


#[wasm_bindgen]
pub fn compute_ff_point(point1:&FqVectorInput,
    point2:&FqVectorInput) {
    ops::compute_all_operations::<Fq>(
        &point1.point_vec,&point2.point_vec
    );
}

#[wasm_bindgen]
pub fn fr_add(fr1:&FrVectorInput,
    fr2:&FrVectorInput) {
    ops::compute_add::<Fr>(
        &fr1.scalar_vec,&fr2.scalar_vec
    );
}

#[wasm_bindgen]
pub fn fr_sub(fr1:&FrVectorInput,
    fr2:&FrVectorInput) {
    ops::compute_sub::<Fr>(
        &fr1.scalar_vec,&fr2.scalar_vec
    );
}

#[wasm_bindgen]
pub fn fr_mul(fr1:&FrVectorInput,
    fr2:&FrVectorInput) {
    ops::compute_mul::<Fr>(
        &fr1.scalar_vec,&fr2.scalar_vec
    );
}

#[wasm_bindgen]
pub fn fr_div(fr1:&FrVectorInput,
    fr2:&FrVectorInput) {
    ops::compute_div::<Fr>(
        &fr1.scalar_vec,&fr2.scalar_vec
    );
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
            point_vec: ops::generate_scalar_vector::<Fq>(size),
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
            scalar_vec:  ops::generate_scalar_vector::<Fr>(size),
        }
    }
}


