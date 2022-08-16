import galois
"""
GLV beta and lambda generation

Given a point P (with order n) in an elliptic curve over a finite field F will compute two parameters required for GLV optimization.
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
    x = generate_lambda(211)
    for root in x :
        print(f'root = {x}')

if __name__ == '__main__':
    main()
