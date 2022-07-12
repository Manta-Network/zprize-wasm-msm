# MSM-WASM

* WASM time:
    ```bash
    wasm-pack test --headless --chrome --release
    ```
    edit ops.rs ```compute_all_operations``` to change test ops.
* Native time:
    ```bash
    cargo bench
    ```
* WASMSNARK time:
    ```bash
    mocha wasmsnark-master/test/ff_test.js
    ```



## Initial Results

### FF Results
All operations time 
|Input Vecotr Length | WASM (ms) | Native (ms) | Ratio |
| --- | --- | --- | --- |
| 2^12 | 14.2 | 1.5557 | 9.6x |
| 2^14 | 49.84 | 6.8604 | 7.3x |
| 2^16 | 219.4 | 31.386 | 7.0x |
| 2^18 | 844.72 | 129.68 | 6.5x |
| 2^20 | 3498 | 576.91 | 6.0x |
| 2^22 | 12714 | 2349 | 5.4x |

###  Operation
Test WASMSNARK and Native Rust on Fr. 
#### ADD
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK | Native Rust|
| --- | --- | --- | --- | --- |
| 2^18 | 199.42 | 204.12 | 23 | 48 |
| 2^20 | 939.18 | 759.92 | 67 | 224 |
| 2^22 | 3538 | 3474 | 215 | 693 |
| 2^24 | - | - | 846 | 2559 |

#### SUB
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK | Native Rust|
| --- | --- | --- | --- | --- |
| 2^18 | 207 | 191 | 9 | 48 |
| 2^20 | 794 | 803 | 30 | 204 |
| 2^22 | 3492 | 3059 | 102 | 639 |
| 2^24 | - | - |  416| 2659 |


#### MUL
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK | Native Rust |
| --- | --- | --- | --- | --- |
| 2^18 | 403 | 713 | - | 64 |
| 2^20 | 2061 | 4026 | - | 200 |
| 2^22 | 7796 | 9956 | - | 836 |
| 2^24 | - | - | - | 3161 |

### Check Correctness (ADD and SUB)
* Native Rust: For now, you should first edit the **[[bench]]** in Cargo.toml, and then run:
    ```bash
    cargo bench
    ```
* WASMSNARK:
    ```bash
    mocha wasmsnark-master/test/ff_test.js

Then you can get something like this: 

WASMSNARK:

Operand1: 674E1D7463D34C49F9C9F388646067D796542CCBF66F38D3AB574D0EE422C588

Operand2: 5FB51E0EE491C6F26F2FD3AB01162C4D3AD3AFF73FC213510EBBF34FAA74C07E

Operand1 add operand2: 3.758009297654969e+76

Operand1 sub operand2: 3.4365133756038387e+75

Native Rust:

ADD: 531594301EC795F435BFEF2B5BD4BC1F7D6A38C03632F025BA13405F8E978605

SUB 0798FF657F4185578A9A1FDD634A3B8A5B807CD4B6AD25829C9B59BF39AE050A



### BLS12_381 EC Results (Doubling add)
(test on macbook)
|Loop | WASM (ms) | Native (ms) | WASMSNARK |
| --- | --- | --- | --- |
| 2^12 | - | 140 | - |
| 2^14 | - | 553 | - |
| 2^16 | -| 2704 | - |
| 2^18 | - | 9512 | - |
