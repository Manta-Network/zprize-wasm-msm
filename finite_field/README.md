
## Dependencies:

* [Rust toolchain](https://www.rust-lang.org/tools/install)
* [npm](https://www.npmjs.com/get-npm)
* `wasm-pack` package:
    ```bash
    cargo install wasm-pack
    ```
* `chrome`:
    ```bash
    apt install google-chrome-stable
    ```
* `chromedriver`:
    ```bash
    apt install chromium-chromedriver
    ```

## Run the benchmark

* WASM time:
    ```bash
    ./serve.sh
    ```
    You can view the result at `localhost:8080`.
* Headless WASM time:
    ```bash
    wasm-pack test --headless --chrome --release
    ```
    edit ops.rs ```compute_all_operations``` to change test ops.
* Native time:
    ```bash
    cargo bench
    ```

## Initial Results

### FF Results

|Input Vecotr Length | WASM (ms) | Native (ms) | Ratio |
| --- | --- | --- | --- |
| 2^12 | 14.2 | 1.5557 | 9.6x |
| 2^14 | 49.84 | 6.8604 | 7.3x |
| 2^16 | 219.4 | 31.386 | 7.0x |
| 2^18 | 844.72 | 129.68 | 6.5x |
| 2^20 | 3498 | 576.91 | 6.0x |
| 2^22 | 12714 | 2349 | 5.4x |
 

