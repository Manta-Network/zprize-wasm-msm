import {Protoboard, set, get} from './protoboard'
import bigInt from 'big-integer'


import * as wasm from './tmp.wasm'
import * as webassem from  './wasm_zkp_challenge_bg.wasm'

console.log(webassem)
console.log(wasm)

let arrayBuffer = wasm.mem.buffer
const buffer = new Uint32Array(arrayBuffer);
buffer[0] = 3333
buffer[8] = 20

let a = bigInt("12343213214324234213423523153521523423423112343213214324234213423523154234231")
set(0,a,buffer)


// add a and 0
wasm.f1m_add(0,32,64)

console.log(buffer)

// check the result
console.log(get(64,buffer).toString())

// check the return value
let a_c = 4312
var button = document.getElementById('wasmsnark');
button.textContent = wasm.f1m_one(a_c);



    











