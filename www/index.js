import { compute_msm, prints, printpx, printpy, PointVectorInput, ScalarVectorInput } from "wasm-prover";
import bigInt from 'big-integer'
import * as w from "./tmp_ec_wasmsnark.wasm"

function set(pos, nums, buffer, nBytes) {
  if (!Array.isArray(nums)) {
      nums = [nums];
  }
  if (typeof nBytes === "undefined") {
      nBytes = 48;
  }

  const words = Math.floor((nBytes -1)/4)+1;
  let p = pos;

  const CHUNK = bigInt.one.shiftLeft(32);

  for (let i=0; i<nums.length; i++) {
      let v = bigInt(nums[i]);
      for (let j=0; j<words; j++) {
          const rd = v.divmod(CHUNK);
          buffer[p>>2] = rd.remainder.toJSNumber();
          v = rd.quotient;
          p += 4;
      }
      //assert(v.isZero());
  }

  return pos;
}

function get(pos, buffer, nElements, nBytes ) {
  if (typeof nBytes == "undefined") {
      if (typeof nElements == "undefined") {
          nElements = 1;
          nBytes = 48;
      } else {
          nElements = nBytes;
          nBytes = 48;
      }
  }



  const words = Math.floor((nBytes -1)/4)+1;

  const CHUNK = bigInt.one.shiftLeft(32);


  const nums = [];
  for (let i=0; i<nElements; i++) {
      let acc = bigInt.zero;
      for (let j=words-1; j>=0; j--) {
          acc = acc.times(CHUNK);
          let v = buffer[(pos>>2)+j];
          
          if (32 <32) {
              if (v&0x80000000) v = v-0x100000000;
          }
          acc = acc.add(v);
      }
      nums.push(acc);
      pos += words*4;
  }

  if (nums.length == 1) return nums[0];
  return nums;
}

function setScalar(scalar_vec, num_element, buffer_ec, data_ptr){
  
  for(let i = 0; i<num_element; i++){
    let scalar_string = prints(scalar_vec, i);
    let scalar = bigInt(scalar_string, 16);
    //let scalar = bigInt("1");
    set(data_ptr + i*32, scalar, buffer_ec, 32);
  }
  return 0;
}

function setPoint(point_vec, num_element, buffer_ec, data_ptr){
  let offset = data_ptr + num_element * 32; // we store scalar vector before offset address
  
  // for(let i = 0; i<num_element*3; i+=3){
  //   let point_stringx = printpx(point_vec, i/3);
  //   let point_stringy = printpy(point_vec, i/3);
  //   let point_x = bigInt(point_stringx, 16);
  //   let point_y = bigInt(point_stringy, 16);

  //   set(offset + i*48, point_x, buffer_ec, 48);
  //   set(offset + (i+1)*48, point_y, buffer_ec, 48);
  //   set(offset + (i+2)*48, 1, buffer_ec, 48);
  // }

  //affine
  for(let i = 0; i<num_element*2; i+=2){
    let point_stringx = printpx(point_vec, i/2);
    let point_stringy = printpy(point_vec, i/2);
    let point_x = bigInt(point_stringx, 16);
    let point_y = bigInt(point_stringy, 16);
    

    set(offset + i*48, point_x, buffer_ec, 48);
    set(offset + (i+1)*48, point_y, buffer_ec, 48);

  }
  return 0;
}

function to_mont(num_element, buffer_ec, data_ptr){
  let offset = num_element * 32; // point vec start
  
  // for(let i=0; i<num_element; i++){
  //   let point_ptr = data_ptr + offset+i * 48 *3;
  //   w.f1m_toMontgomery(point_ptr, point_ptr)
  //   w.f1m_toMontgomery(point_ptr + 48, point_ptr + 48)
  //   w.f1m_toMontgomery(point_ptr + 96, point_ptr + 96)
  // }

  //affine
  for(let i=0; i<num_element; i++){
    let point_ptr = data_ptr + offset+i * 48 *2;
    w.f1m_toMontgomery(point_ptr, point_ptr)
    w.f1m_toMontgomery(point_ptr + 48, point_ptr + 48)
  }
}

function my_compute_msm(num_element, buffer_ec, data_ptr){
  let offset = num_element * 32; // point vec start
  // console.log("in my msm");
  // console.log(get(data_ptr+offset,buffer_ec,1,48).toString(16));
  
  let result_ptr = data_ptr+ offset + num_element * 3 * 48;
  
  w.g1m_zero(result_ptr);
  for(let i=0; i<num_element; i++){
    let point_ptr = data_ptr + offset+i * 48 *3;
    // w.f1m_toMontgomery(point_ptr, point_ptr)
    // w.f1m_toMontgomery(point_ptr + 48, point_ptr + 48)
    // w.f1m_toMontgomery(point_ptr + 96, point_ptr + 96)

    let scalar_ptr = data_ptr + i * 32;

    //                               should be n8
    w.g1m_timesScalar(point_ptr, scalar_ptr, 32, point_ptr)
    
    w.g1m_add(result_ptr, point_ptr, result_ptr) 
    
  }
}



const pre = document.getElementById("wasm-prover");

const REPEAT = 5;

const median = arr => {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b);
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};


function ns(p, buffer_ec) {
  w.f1m_fromMontgomery(p, p);
  const n = get(p,buffer_ec,1, 48);
  w.f1m_toMontgomery(p, p);
  //return n.toString()
  return "0x" + n.toString(16);
}

function printG1( p, buffer_ec) {
  let n8 = 48;
  console.log("ADDR: "+ p+" Point(" + ns(p,buffer_ec) + " , " + ns(p+n8,buffer_ec) + " , " + ns(p+n8*2,buffer_ec) + ")"   );
}


function printScalar(p, buffer_ec){
  console.log("ADDR: "+ p+ " Scalar value: "+get(p,buffer_ec,1,32).toString(16));
}

function printSandG(p, element, buffer_ec){
  for(let i =p;i<p+element*32;i+=32){
    printScalar(i,buffer_ec);
  }
  for(let j=p+element*32;j<p+element*32+48*3*element;j+=48*3){
    printG1(j,buffer_ec);
  }
}

function wasm_bench_msm() {
  let out_text = "";
  for (let size = 8; size <= 8 ; size += 2) {
    
    // const point_vec = new PointVectorInput(Math.pow(2, size));
    // const scalar_vec = new ScalarVectorInput(Math.pow(2, size));
    const test_size = 1<<8;
    const point_vec = new PointVectorInput(test_size);//96*4 = 384
    const scalar_vec = new ScalarVectorInput(test_size);// 64

    // test ec operations
    const buffer_ec = new Uint32Array(w.mem.buffer);
    
    const data_ptr = 1114120
    

   // set scalar and point vec 
   setScalar(scalar_vec,test_size,buffer_ec, data_ptr);
   setPoint(point_vec, test_size, buffer_ec, data_ptr);
   to_mont(test_size, buffer_ec, data_ptr)



   
   
  // rust wasm test
  console.log("rust generated scalar: "+ prints(scalar_vec,0))
  console.log("rust generated pointx: "+ printpx(point_vec,0))
  console.log("rust generated pointy: "+ printpy(point_vec,0)) 
  // printScalar(1114144,buffer);
  // set(1114144,1,buffer,32);
  // printScalar(1114144,buffer);

  // baseline msm
  console.log("compute_msm results: " + compute_msm(point_vec, scalar_vec));


  // check my simple msm (Should change setPoint and to_mont function, diiferent memory layout now)
  // console.log("my_compute_msm resuls: ")
  // my_compute_msm(test_size,buffer_ec, data_ptr);
  // let p = data_ptr + test_size * 32 + test_size * 3 *48;
  // printG1(p, buffer_ec)
  // w.g1m_affine(p, p)
  // printG1(p, buffer_ec)

  // check wasmsnark multiexp
  // printG1(147680, buffer_ec)
  // printScalar(147680, buffer_ec)
  // w.g1m_zero(147680)
  // printScalar(147680, buffer_ec)
  // w.g1m_multiexp(data_ptr, data_ptr+ 32*test_size, test_size, 1, 147680) 
  // printG1(147680, buffer_ec)
  // w.g1m_affine(147680, 147680)
  // printG1(147680, buffer_ec)


  // check wasmcurve multiexp
  // w.g1m_zero(147680)
  // printG1(data_ptr+ 32*test_size, buffer_ec)
  // printScalar(data_ptr, buffer_ec)
  // w.g1m_multiexpAffine(data_ptr+ 32*test_size,data_ptr,  32, test_size, 147680) 
  // w.g1m_normalize(147680, 147680)
  // printG1(147680, buffer_ec)

      const perf = Array.from(
      { length: REPEAT },
      (_, i) => {
        const t0 = performance.now();
        
        w.g1m_multiexp(data_ptr, data_ptr+ 32*test_size, test_size, 8, 1147680) 
        //w.g1m_multiexpAffine(data_ptr, data_ptr+ 32*test_size, 256/8, test_size, 1147680) 
        //compute_msm(point_vec, scalar_vec);      
        //my_compute_msm(test_size,buffer_ec, data_ptr);  // Should change setPoint and to_mont function, diiferent memory layout now
        const t1 = performance.now();
        return t1-t0;
      }
    );
    let cur_res = `Input vector length: 2^${size}, latency: ${median(perf)} ms \n`;
    out_text = out_text.concat(cur_res);
    
  }
  return out_text;
}

pre.textContent = wasm_bench_msm();

