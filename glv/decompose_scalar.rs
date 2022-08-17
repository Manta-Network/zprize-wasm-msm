    //Given a scalar k and basis vectors v and u 
    //finds integer scalars z1 and z2, so that (k,0) is close to 
    //z1v + z2u
    pub fn decompose_scalar(k: i128, v: &Vec<i128>, u: &Vec<i128>) -> Vec<f64> {
        //We first find rational solutions to 
        //(k,0) = q1v + q2u
        //We can re-write this problem as a matrix A(q1,q2) = (k,0)
        //So that (q1,q2) = A^-1(k,0)
        let det = (v[0]*u[1] - v[1]*u[0]) as f64; 
        let q1 = (u[1]*k) as f64 / det; 
        let q2 = (-v[1]*k) as f64 / det;
    
        let mut result = Vec::new();
        result.push(q1.round()); //z1
        result.push(q2.round()); //z2
        result
    }

    pub fn compute_k1_k2(z1 : i128, z2 : i128, k: i128,v: Vec<i128>, u: Vec<i128>) -> Vec<i128>{
        let mut decomposition : Vec<i128> = Vec::new();
        decomposition.push(k - z1*v[0] - z2*u[0]);
        decomposition.push(0 - z1*v[1] - z2*u[1]);
        decomposition
    }
    
    fn main() {
        let k = 50;
        println!("Hello, world!");
        let v = vec![1, 228988810152649578064853576960394133504];
        let u = vec![228988810152649578064853576960394133503, -1];
        let result = decompose_scalar(k, &v, &u);

        let decomposition = compute_k1_k2(result[0] as i128,result[1] as i128, k, v, u);
    
        for coef in decomposition {
            println!("{}", coef);
        }
    }