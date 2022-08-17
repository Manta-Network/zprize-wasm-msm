import Protoboard from './protoboard'
import bigInt from 'big-integer'



function loadWebAssembly(filename, imports) {
  
  // Fetch the file and compile it
  return fetch(filename)
    .then(response => response.arrayBuffer())
    .then(buffer => WebAssembly.compile(buffer))
    .then(module => {
      
      // Create the imports for the module, including the
      // standard dynamic library imports
      imports = imports || {};
      imports.env = imports.env || {};
      // imports.env.memoryBase = imports.env.memoryBase || 0;
      // imports.env.tableBase = imports.env.tableBase || 0;
      if (!imports.env.memory) {
        imports.env.memory = new WebAssembly.Memory({ initial: 256 });
      }
      if (!imports.env.table) {
        imports.env.table = new WebAssembly.Table({ initial: 0, element: 'anyfunc' });
      }
      imports.debug = 
      {
        log32: function (c1) {
            if (c1<0) c1 = 0x100000000+c1;
            let s=c1.toString(16);
            while (s.length<8) s = "0"+s;
            protoboard.log(s + ": " + c1.toString());
        },
        log64: function (c1, c2) {
            if (c1<0) c1 = 0x100000000+c1;
            if (c2<0) c2 = 0x100000000+c2;
            const n = bigInt(c1) +  bigInt(c2).shiftLeft(32);
            let s=n.toString(16);
            while (s.length<16) s = "0"+s;
            protoboard.log(s + ": " + n.toString());
        }
    }
      // Create the instance.
      return new WebAssembly.Instance(module, imports);
    });
}



// loads the module and uses it.
loadWebAssembly('tmp.wasm')
  .then(instance => {
    
    var exports = instance.exports; // the exports of that instance
   
    
    var button = document.getElementById('wasmsnark');
    button.textContent = 'Call a method in the WebAssembly module';

    console.log(instance.env)
    
    let pd = new Protoboard();
    Object.assign(pd, instance.exports);
   

    const A = bigInt.one.shiftLeft(255).minus(1111111);
    const B = bigInt.one.shiftLeft(256).minus(2000000000);
  
    const pA = pd.alloc();
    const pB = pd.alloc();
    const pC = pd.alloc();
    pd.set(pA, A);
    pd.set(pB, B);

    let mem_a = new WebAssembly.Memory({initial:8});
    let mem_b = new WebAssembly.Memory({initial:8});
    let mem_c = new WebAssembly.Memory({initial:8});
    let a_a = new Uint32Array(mem_a.buffer);
    let a_b = new Uint32Array(mem_b.buffer);
    let a_c = new Uint32Array(mem_c.buffer);
    //let a_c = 123;
    a_a[0] = 3;
    a_a[7] = 4;
    a_a[1] = 2222222222;
    a_a[7] = 2;

    a_b[3] = 4;

    
    console.log(pd.i32[3])
  
    exports.f1m_add(a_a,a_b,a_c);
    //exports.f1m_one(a_c)
    
    button.textContent = exports.f1m_profilingInstruction();
    button.textContent = a_c;
    
  }
);

















// (async () => {
//   const wasmModule = await WebAssembly.compile(wasmBuffer);
//   const instance = await WebAssembly.instantiate(wasmModule, {
//     env: {
//         "memory": new WebAssembly.Memory({
//           initial: 256,
//       })
//     },
//     debug: {
//         log32: function (c1) {
//             if (c1<0) c1 = 0x100000000+c1;
//             let s=c1.toString(16);
//             while (s.length<8) s = "0"+s;
//             protoboard.log(s + ": " + c1.toString());
//         },
//         log64: function (c1, c2) {
//             if (c1<0) c1 = 0x100000000+c1;
//             if (c2<0) c2 = 0x100000000+c2;
//             const n = bigInt(c1) +  bigInt(c2).shiftLeft(32);
//             let s=n.toString(16);
//             while (s.length<16) s = "0"+s;
//             protoboard.log(s + ": " + n.toString());
//         }
//     }
// });
//   const { f1m_add,test_f1m_add } = instance.exports;
  
//   let out_text = "";
//   let a = bigInt(1);
//   let b = bigInt(2);

//   return out_text;

// })();


// const pre = document.getElementById("wasmsnark");

// const REPEAT = 5; 



// function wasm_bench() {
//   let out_text = "";
//   let a = bigInt(1);
//   let b = bigInt(2);

//   return out_text;
// }

// pre.textContent = 11111;

