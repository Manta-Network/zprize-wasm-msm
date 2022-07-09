# MSM-WASM

* WASM time:
    ```bash
    wasm-pack test --headless --chrome --release
    ```
    edit ops.rs ```compute_all_operations``` to change test ops.
* WASMSNARK time:
    ```bash
    mocha wasmsnark-master/test/int_test.js
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
The vector size of wasmsnark is 256.

Check the correctness (TODO)
#### ADD
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK |
| --- | --- | --- | --- |
| 2^18 | 199.42 | 204.12 | - |
| 2^20 | 939.18 | 759.92 | 26 |
| 2^22 | 3538 | 3474 | 115 |
| 2^24 | - | - | 464 |

#### SUB
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK |
| --- | --- | --- | --- |
| 2^18 | 207 | 191 | - |
| 2^20 | 794 | 803 | 33 |
| 2^22 | 3492 | 3059 | 111 |
| 2^24 | - | - |  429|


#### MUL
|Loop | WASM Fr(ms) | WASM Fq (ms) | WASMSNARK |
| --- | --- | --- | --- |
| 2^18 | 403 | 713 | - |
| 2^20 | 2061 | 4026 | 143 |
| 2^22 | 7796 | 9956 | 533 |
| 2^24 | - | - | 1991 |