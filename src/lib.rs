use ark_bls12_381::{Fq, Fr};
use ark_bls12_381::G1Projective;
use ark_ec::ProjectiveCurve;
use wasm_bindgen::prelude::wasm_bindgen;

pub mod check_ec_affine;
pub mod check_ec_projective;
pub mod check_ff;
pub mod ff;
pub mod ec;

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


#[wasm_bindgen]
pub struct ECProjectiveVectorInput {
    ec_vec1: Vec<ark_ec::short_weierstrass_jacobian::GroupProjective<ark_bls12_381::g1::Parameters>>,
    ec_vec2: Vec<ark_ec::short_weierstrass_jacobian::GroupProjective<ark_bls12_381::g1::Parameters>>,
}

#[wasm_bindgen]
impl ECProjectiveVectorInput {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        Self {
            ec_vec1: ec::generate_elliptic_inputs::<G1Projective>(size).0,
            ec_vec2: ec::generate_elliptic_inputs::<G1Projective>(size).1,
        }
    }
}


#[wasm_bindgen]
pub fn ec_add(vec1: &ECProjectiveVectorInput) {
    ec::compute_elliptic_ops::<G1Projective>(&vec1.ec_vec1, &vec1.ec_vec2);
}

#[wasm_bindgen]
pub fn ec_timemssalar(point_vec: &mut ECProjectiveVectorInput, scalar_vec: &FrVectorInput) {
    ec::projective_scalar_mul_assign::<G1Projective>(&mut point_vec.ec_vec1, &scalar_vec.scalar_vec);
}

