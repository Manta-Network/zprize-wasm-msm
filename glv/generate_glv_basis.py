"""
GLV Basis Generation

The function `generate_basis` computes the basis vectors for GLV using extended Euclidean division.
"""
import math

def shorter(v, u):
    """
    Returns the shorter of the two vectors in the L2 norm.
    """
    if math.sqrt(v[0]*v[0] + v[1]*v[1]) < math.sqrt(u[0]*u[0] + u[1]*u[1]):
        return v
    else:
        return u; 

def generate_basis(n, l):
    """
    Given `n` the order of the point P and `l` a root of the characteristic polynomial of the endomorphism,
    computes the two basis vectors for representing scalars over the field.
    """
    v1 = (0, 0)
    v2 = (0, 0)
    next_r, r = l, n
    next_x, x = 0, 1; next_y, y = 1, 0

    while r >= math.sqrt(n):
        v1 = (next_r,-next_y)
        v2 = (r, -y)
        q = r // next_r
        r, next_r = next_r, r - q*next_r
        x, next_x = next_x, x - q*next_x
        y, next_y = next_y, y - q*next_y
        v2 = shorter(v2, (next_r, -next_y))
    return v1, v2
 
def main():
    v1, v2 = generate_basis(211, 196)
    print(f'v1 = {v1}, v2 = {v2}')


if __name__ == '__main__':
    main()