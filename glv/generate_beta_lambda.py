import galois
"""
beta and lambda generation for GLV

Given a point P, with order n, in an elliptic curve over a finite field F will compute two parameters required for GLV optimization.
"""
def generate_beta(modulus):
    '''
    Given a modulus of a finite field, it will compute cube roots of unity in that field. 
    '''
    GF = galois.GF(modulus)
    f = galois.Poly([1,0,0,-1],field = GF);f
    return f.roots()

def generate_lambda(order):
    '''
    Given the order of a point P on an elliptic curve, it will generate lambda, a parameter required for GLV.
    '''
    GF = galois.GF(order)
    g = galois.Poly([1,1,1],field = GF);g
    return g.roots()



def main():
    print(f'betas are = {generate_beta(103)}')
    print(f'lambdas are = {generate_lambda(52435875175126190479447740508185965837690552500527637822603658699938581184513)}')

if __name__ == '__main__':
    main()

