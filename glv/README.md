Given s point P in an elliptic curve over a finite field F_q, GLV optimizes the computation of kP with k in F.



Firstly, generate_beta_lambda will compute two parameters required for the optimization, namely beta and lambda. 

Secondly, generate_glv_basis will compute two vectors u and v required for 
2) Calculate the order of P in E and let lambda be a solution of x^2 + x = -1 mod (Order of P).
3) Calculate basis vectors v and u with generate_glv_basis(q, lambda).
4) Calculate integer coefficients, z1 and z2, with decompose_scalar(k, v, u)
5) Let (k1,k2) = (k,0) - [z1v + z2u]
6) Calculate k1P + k2Phi(P).