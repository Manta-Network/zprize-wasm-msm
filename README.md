# MSM-WASM

* WASM time:
    ```bash
    wasm-pack test --headless --chrome --release
    ```
* Native time:
    ```bash
    cargo bench
    ```
* WASMSNARK time:
    ```bash
    mocha wasmsnark-master/test/ff_test.js
    ```

## Initial Results

###  Operation (Test on BLS 12-381)
#### ADD
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK Fr (ms)| Native Rust Fr (ms)|
| --- | --- | --- | --- | --- |
| 2^16 | 1.68 | --| 1.23 | 0.916 |
| 2^18 | 6 | --| 4.84 | 3.71 |
| 2^20 | 26 | -- | 22.41 | 15.05 |
| 2^22 | 104 | -- | 81 | 63 |
| 2^24 | 380 | - | 361 | 533 |

#### SUB
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK Fr (ms)| Native Rust Fr (ms)|
| --- | --- | --- | --- | --- |
| 2^16 | 0.77 | --| 1.62 | 0.98 |
| 2^18 | 3.4 | - | 6.48 | 2.98 |
| 2^20 | 11 | - | 25.96 | 14.85 |
| 2^22 | 51 | - | 104 | 59 |
| 2^24 | 202 | - |  454 | 454 |


#### MUL
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK Fr (ms)| Native Rust Fr (ms)|
| --- | --- | --- | --- | --- |
| 2^16 | 22 | --| 18.98 | 2.6 |
| 2^18 | 83 | - | 76.12 | 11.6 |
| 2^20 | 319 | - | 354.98 | 41.5 |
| 2^22 | 1692 | - | 1328 | 166 |
| 2^24 | - | - | 5382 | 962 |

#### DIV
**Use an inverse and mulplication to substitute division in WASMSNARK**

|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK Fr (ms)| Native Rust Fr (ms)|
| --- | --- | --- | --- | --- |
| 2^8 | 8 | - | 8.39 | 2.14 |
| 2^10 | 16 | - | 33.2 | 7.6 |
| 2^12 | 68 | - | 149.51 | 30 |
| 2^14 | 233 | - | 645.18 | 114.4 |
| 2^16 | 943 | - | 2451 | 486 |
| 2^18 | - | - | - | 1922 |



### Check FF Correctness 
* Native Rust: 
    ```bash
    cargo test --package wasm-zkp-challenge --lib -- check_ff::tests::all_operation_corect --exact --nocapture 
    ```
* WASMSNARK:
    ```bash
    mocha wasmsnark-master/test/ff_test.js
    ```

Default operand: 

Operand1: 2ADDD44F7E3B786EF46BFBDBB7949E00042DA2DE98C064CF94C25463CA1C3FBE

Operand2: 387B871A42CC7E352F862DB864633FA7433EDC24198C03528255C7E9F7A37C04



### BLS12_381 EC Add Results 
* Native time:
    ```bash
    cargo bench
    ```
* WASMSNARK time:
    ```bash
    mocha wasmsnark-master/test/bls12381_test.js
    ```
|Loop | WASM  (ms) | Native Affine (ms) | Native Projective (ms)  | WASMSNARK Projective (ms) |
| --- | --- | --- | ---| --- |
| 2^10 | --- | 8.8 | 1.83 | 4.62 |
| 2^12 | - | 35 | 6.17 | 18.06 |
| 2^14 | - | 143 | 24 | 72.3 |
| 2^16 | - | 566 | 100 | 312.46 |
| 2^18 | -| 2367 | 403 | -- |
| 2^20 | -| 9588 |--- |  -- |

### Check EC Add Correctness 
* Native Rust (Affine): 
    ```bash
    cargo test --package wasm-bls12-381 --lib -- check_ec::tests::ec_add_corect --exact --nocapture
    ```
* WASMSNARK (Projective):
    ```bash
    mocha wasmsnark-master/test/bls12381_test.js
    ```

