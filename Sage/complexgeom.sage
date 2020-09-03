# R.<p,q,r,s,z,Z>=QQ[] # p,q,r,s lie on omega, z and Z are variables
cg_vars = var(
    ['V%s'%i for i in range(100)] + 
    ['v%s'%i for i in range(100)] +
    ['p','q','r','s','Z','z']) # various variables, v_i and V_i are conjugated
substitutions = dict(
    [(var("v%s"%i), var("V%s"%i)) for i in range(100)] +
    [(var("V%s"%i),var("v%s"%i)) for i in range(100)] +
    [(p,1/p),(q,1/q),(r,1/r),(s,1/s),(z,Z),(Z,z)]
) # this is a list of substitutions to conjugate a polynomial

## Complex conjugation, used everywhere
def conj(P):
    if type(P) == sage.rings.integer.Integer or type(P) == sage.rings.rational.Rational or type(P) == sage.rings.real_mpfr.RealLiteral:
        return P
    return P.substitute(substitutions)

## Solving equations for z/Z and double equations for z & Z
def cg_solve(P):
    # solving az + b = 0, answer is b/(-a)=P(0)/(P(0)-P(1))
    if P.substitute(Z=0,z=0) == P.substitute(Z=1,z=0):
        pass
    else:
        P = conj(P)
    if P.substitute(Z=0,z=0) == P.substitute(Z=1,z=0):
        pass
    else:
        raise BaseException("Too few equations to solve")
    az = P.substitute(Z=0,z=0)
    ao = P.substitute(Z=0,z=1)
    if az == ao:
        raise BaseException("No solutions")
    ans = az / (az - ao)
    return ans

def cg_intersect(P,Q):
    # P = az + bZ + c, Q = dz + eZ + f
    # so it's enough to solve Pe - Qb = 0
    return cg_solve(P*(Q(Z=1,z=0) - Q(Z=0,z=0)) - Q*(P(Z=1,z=0) - P(Z=0,z=0)))

## Basic functions such as Line, Perpendicular, etc
# Line through K and L
def line(k, l):
    return z*conj(k-l) - Z*(k-l) - conj(k)*l + conj(l)*k

# Perpendicular to KL from S
def perp(start, k, l):
    return z*conj(k-l) + Z*(k-l) - start*conj(k-l) - conj(start)*(k-l)

# Perpendicular to KL from KL middle
def perp_bisector(k,l):
    return perp((k+l)/2, k, l)

# Intersection of tangents to Omega from K and L, with the points lying on Omega
def omega_tangent_intersection(k, l):
    return 2*k*l/(k+l)

# Tangent to Omega through K
def omega_tangent(k):
    return line(k, omega_tangent_intersection(k, p))

# Intersection of OnOut with Omega, with On lying on Omega
def omega_intersection(on, out):
    return (out - on) / (1 - on * conj(out))

# Excenter of triangle KLM
def excenter(k,l,m):
    return cg_intersect(perp_bisector(k,l),perp_bisector(l,m))

# Excenter of triangle circumscribed around Omega, if Omega touches its lines at V1, V2, V3
def excenter_touch(v1 = p, v2 = q, v3 = r):
    return 2*v1*v2*v3*(v1+v2+v3) / ((v1+v2)*(v2+v3)*(v3+v1))

# Euler Circle Center of triangle circumscribed around Omega, if Omega touches its lines at V1, V2, V3
def euler_center_touch(v1 = p, v2 = q, v3 = r):
    return (v1*v2+v2*v3+v3*v1)^2 / ((v1+v2)*(v2+v3)*(v3+v1))

# Feuerbach Point of triangle circumscribed around Omega, if Omega touches its lines at V1, V2, V3
def feuerbach_touch(v1 = p, v2 = q, v3 = r):
    return (v1*v2+v2*v3+v3*v1) / (v1+v2+v3)

## Checkers
# Check if P is always real, f.e. quotient of two parallel segments
def is_real(P):
    if P == conj(P):
        return 1
    else:
        return 0

# Check if P is always imaginary, f.e. quotient of two perpendicular segments
def is_imaginary(P):
    if P + conj(P) == 0:
        return 1
    else:
        return 0

# Check if point P lies on Omega
def is_omega(P):
    if P * conj(P) == 1:
        return 1
    else:
        return 0

## Metric functions
# Squared length of t segment (or OT segment)
def norm(t):
    return t * conj(t)

# Scalar product of k and l vectors (or OK and OL)
def scalar_product(k, l):
    # if k = a+bi, then a = 1/2(k+conj(k)) and b = 1/2(k-conj(k))
    return (k*l + conj(k*l))/2

# Squared cosine of angle between k and l segments
def cg_cos(k, l):
    return scalar_product(k,l)^2 / (norm(k) * norm(l))

