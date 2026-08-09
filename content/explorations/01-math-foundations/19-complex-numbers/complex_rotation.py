import cmath
import math
z = 1 + 0j
for theta in (0, math.pi/2, math.pi, 3*math.pi/2):
    print(theta, complex(round((z*cmath.exp(1j*theta)).real, 6), round((z*cmath.exp(1j*theta)).imag, 6)))
