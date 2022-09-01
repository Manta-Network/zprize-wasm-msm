# MSM benchmark
 |Loop | Z-prize MSM  (ms) | wasmsnark (ms)  | wasmcurve (ms) | 
| --- | --- |  ---| --- | 
| 2^8 | 135 | 75 | 45 | 
| 2^10 | --- | --- | --- | 
| 2^12 | --- | --- | --- | 
| 2^14 | --- | --- | --- |

Use the **index.js**  and **\*.wasm** in MSM repo.
* wasmsnark: 
    Uncomment 
    ```js
    import * as w from "./tmp_ec_wasmsnark.wasm" // line 4
    ``` 
    and
    ```js
    w.g1m_multiexpAffine(data_ptr+ 32*test_size,data_ptr,  32, test_size, 147680) // line 263
    ``` 

* wasmcurve: 
    Uncomment 
    ```js
    import * as w from "./tmp_ec_wasmsnark.wasm" // line 3
    ``` 
    and
    ```js
    w.g1m_multiexpAffine(data_ptr+ 32*test_size,data_ptr,  32, test_size, 147680) // line 262
    ``` 
