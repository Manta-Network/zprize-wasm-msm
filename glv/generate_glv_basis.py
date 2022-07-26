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
    if math.sqrt(v[0]*v[0] + v[1]*v[1]) < math.sqrt(u[0]*u[0] + u[1]*u[1]):
        return v
    else:
        return u; # TODO: implement

def generate_basis(n, l):
    """
    Given `n` the size of the field and `l` a root of the characteristic polynomial of the endomorphism,
    computes the two basis vectors for representing scalars over the field.
    """
    v1 = (0, 0)
    v2 = (0, 0)
    a, b = l, n
    prevx, x = 1, 0; prevy, y = 0, 1
    while b:
        if b >= math.sqrt(n):
            a_next, b_next, prevx_next, prevy_next, x_next, y_next = xgcd_round(a, b, prevx, prevy, x, y);
            v1 = (b_next, -y) # TODO: `None` is either x or y
            a_next, b_next, _, _, x_next, y_next = xgcd_round(a_next, b_next, prevx_next, prevy_next, x_next, y_next);
            v2 = shorter((b, -y_next), (b_next, -y_next)) # TODO: `None` is either `x_next` or `y_next`
            break;
        a, b, prevx, prevy, x, y = xgcd_round(a, b, prevx, prevy, x, y);
    return v1, v2
 
def main():
    v1, v2 = generate_basis(199, 196)
    print(f'v1 = {v1}, v2 = {v2}')
    a_next, b_next, prevx_next, prevy_next, x_next, y_next = xgcd_round(199, 196, 1, 0, 0, 1);
    print(f'a_next = {a_next}, b_next = {b_next},prevx_next = {prevx_next}, prevy_next = {prevx_next},x_next = {x_next}, y_next = {y_next}')


if __name__ == '__main__':
    main()