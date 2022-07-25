# MSM-WASM

## Environment Setup

* Update `node.js` version:
    ```bash
    npm cache clean -f
    npm install -g n
    n stable 
    node --version # Should be at least v16.16.0
    ```
    
* Install Mocha
    ```bash
    npm install mocha
    mocha --version # Should be at least 10.0.0
    ```

* Install `big-integer` js module
    ```bash
    npm install big-integer
    ```

## Benchmark

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
    mocha wasmsnark-master/test/bls12381_test.js
    ```

* ffjavascript time:
    ```bash
    mocha /ffjavascript-master/test/ff_ec.js
    ```

## FF Results

###  Operation (Test on BLS 12-381)
#### ADD
|Loop | WASM Fr(ms) |  WASMSNARK Fr (ms)| Native Rust Fr (ms)| ffjavascript Fr (ms)|
| --- | --- |  --- | --- | --- |
| 2^16 | 1.68 |  1.23 | 0.916 | 3.28 |
| 2^18 | 6 |  4.84 | 3.71 | 13.12 |
| 2^20 | 26 |  22.41 | 15.05 | 56 |
| 2^22 | 104 |  81 | 63 | 272 |
| 2^24 | 380 |  361 | 533 | 850 |

|Loop | WASM Fq(ms)  | WASMSNARK Fq (ms)| Native Rust Fq (ms)| ffjavascript Fq (ms)|
| --- | --- |  --- | --- | --- | 
| 2^16 | 2 | 2.47 | 1.01 | 3.86 |
| 2^18 | 13 | 11.2 | 5.21 | 14.82 |
| 2^20 | 46 | 41.6 | 20.2 | 59.23 |
| 2^22 | 134 | 174 | 171 |  --- |



#### SUB
|Loop | WASM Fr(ms)  | WASMSNARK Fr (ms)| Native Rust Fr (ms)| ffjavascript Fr (ms)|
| --- | --- |  --- | --- | --- |
| 2^16 | 0.77 |  1.62 | 0.98 | 1.41 |
| 2^18 | 3.4 |  6.48 | 2.98 |6.41 |
| 2^20 | 11 |  25.96 | 14.85 |  23 |
| 2^22 | 51 |  104 | 59 | 123 |
| 2^24 | 202 |   454 | 454 |--- |

|Loop | WASM Fq(ms)  | WASMSNARK Fq (ms)| Native Rust Fq (ms)|  ffjavascript Fq (ms)|
| --- | --- |  --- | --- | --- |
| 2^16 | 1.8 | 1.32 | 1.2 | 1.49 |
| 2^18 | 8 | 5.09 | 5.2 | 5.98 |
| 2^20 | 36 | 20.65 | 19.9 | 22.57 |
| 2^22 | 119 | 86 | 155 | --- |


#### MUL
|Loop | WASM Fr(ms)  | WASMSNARK Fr (ms)| Native Rust Fr (ms)| ffjavascript Fr (ms)|
| --- | ---  | --- | --- | --- |
| 2^16 | 22 |  18.98 | 2.6 | 64 |
| 2^18 | 83 |  76.12 | 11.6 | 231 |
| 2^20 | 319 |  354.98 | 41.5 | 971 |
| 2^22 | 1692 | 1328 | 166 | 4074 |
| 2^24 | - |  5382 | 962 |--- |

|Loop | WASM Fq(ms)  | WASMSNARK Fq (ms)| Native Rust Fq (ms)| ffjavascript Fq (ms)|
| --- | ---  | --- | --- | --- |
| 2^16 | 42 | 38 | 5.4 |  68 |
| 2^18 | 221 | 165 | 22 | 274 |
| 2^20 | 830 | 707 | 89 | 1112 |
| 2^22 | 2780 | 2905 | 508 | --- |

#### DIV
**Use an inverse and mulplication to substitute division in WASMSNARK**

|Loop | WASM Fr(ms)  | WASMSNARK Fr (ms)| Native Rust Fr (ms)| ffjavascript Fr (ms)|
| --- | ---  | --- | --- | --- |
| 2^8 | 8 |  8.39 | 2.14 | 27.53 |
| 2^10 | 16 | 33.2 | 7.6 | 118.47 |
| 2^12 | 68 |  149.51 | 30 | 449 |
| 2^14 | 233 |  645.18 | 114.4 | 1660 |
| 2^16 | 943 |  2451 | 486 | --- |

|Loop | WASM Fq(ms)  | WASMSNARK Fq (ms)| Native Rust Fq (ms)| ffjavascript Fq (ms)|
| 2^8 | 7.2 | 23 | 4 | 42 |
| 2^10 | 28 | 94 | 16 | 172 |
| 2^12 | 123 | 363 | 65 | 686 |
| 2^14 | 532 | 1409 | 266 | 2793 |


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



## EC Results
### BLS12_381 EC Add Results 
* Native time:
    ```bash
    cargo bench
    ```
* WASMSNARK time:
    ```bash
    mocha wasmsnark-master/test/bls12381_test.js
    ```
|Loop | WASM  (ms) |  Native Projective (ms)  | WASMSNARK Projective (ms) | ffjavascript Projective (ms) |
| --- | --- | ---| --- | --- |
| 2^10 | 10.6 |  1.83 | 4.62 | 8.7 |
| 2^12 | 42 |  6.17 | 18.06 | 35 |
| 2^14 | 170 |  24 | 72.3 | 146 |
| 2^16 | 679 | 100 | 312.46 | 535 |
| 2^18 | --- | 403 | --- | --- |


|Loop | WASM  Affine(ms) | Native Affine (ms)  |
| --- | --- | --- | 
| 2^10 | 38.7 | 20.5 |
| 2^12 | 150 | 72 |
| 2^14 | 586 | 300 |
| 2^16 | 2404 | 1246 | 

### Check EC Add Correctness 
* Native Rust (Affine): 
    ```bash
    cargo test --package wasm-bls12-381 --lib -- check_ec_affine::tests::ec_add_corect --exact --nocapture
    ```
* Native Rust (Projective): 
    ```bash
    cargo test --package wasm-bls12-381 --lib -- check_ec_projective::tests::ec_add_corect --exact --nocapture
    ```
* WASMSNARK (Projective):
    ```bash
    mocha wasmsnark-master/test/bls12381_test.js
    ```

 ### BLS12_381 EC Times Scalar Results 
 |Loop | WASM  (ms) | Native Projective (ms)  | WASMSNARK Projective (ms) | ffjavascript Projective (ms) |
| --- | --- |  ---| --- | --- |
| 2^6 | 158 | 22 | 79 | 67 |
| 2^8 | 612 | 93 | 332 | 282 |
| 2^10 | 2454 | 391 | 1245 | 1101 |
| 2^12 | 9767 | 1419 | 4977 | 4245 |
| 2^14 | --- | 5805 | --- | --- |


 |Loop | WASM Affine  (ms) | Native Affine (ms)  | 
 | --- | --- |  ---| 
| 2^6 | 130 |  23.6 |
| 2^8 | 521 |  102 | 
| 2^10 | 2085 |  367 |
| 2^12 | --- |  1507| 
