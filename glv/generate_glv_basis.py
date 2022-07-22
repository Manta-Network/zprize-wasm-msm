"""
GLV Basis Generation

The function `generate_basis` computes the basis vectors for GLV using extended Euclidean division.
"""

import math

def xgcd_round(a, b, prevx, prevy, x, y):
    """
    TODO: ...
    """
    q = a // b
    x, prevx = prevx - q*x, x
    y, prevy = prevy - q*y, y
    a, b = b, a % b
    return a, b, prevx, prevy, x, y

def shorter(v, u):
    """
    Returns the shorter of the two vectors in the L2 norm.
    """
    return None; # TODO: implement

def generate_basis(n, l):
    """
    Given `n` the size of the field and `l` a root of the characteristic polynomial of the endopmorphism,
    computes the two basis vectors for representing scalars over the field.
    """
    v1 = (0, 0)
    v2 = (0, 0)
    a, b = n, l
    prevx, x = 1, 0; prevy, y = 0, 1
    while b:
        if b >= math.sqrt(n):
            a_next, b_next, prevx_next, prevy_next, x_next, y_next = xgcd_round(a, b, prevx, prevy, x, y);
            v1 = (b_next, None) # TODO: `None` is either x or y
            a_next, b_next, _, _, x_next, y_next = xgcd_round(a_next, b_next, prevx_next, prevy_next, x_next, y_next);
            v2 = shorter((b, None), (b_next, None)) # TODO: `None` is either `x_next` or `y_next`
            break;
        a, b, prevx, prevy, x, y = xgcd_round(a, b, prevx, prevy, x, y);
    return v1, v2
 
def main():
    v1, v2 = generate_basis(30, 50)
    print(f'v1 = {v1}, v2 = {v2}')

if __name__ == '__main__':
    main()