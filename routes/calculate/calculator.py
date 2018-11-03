import sys, json, numpy as np
from scipy.interpolate import interp1d
from scipy import arange, array, exp


def extrap1d(interpolator):

    xs = interpolator.x
    ys = interpolator.y
   
    def pointwise(x):
        if x < xs[0]:
            return ys[0]+(x-xs[0])*(ys[1]-ys[0])/(xs[1]-xs[0])
        elif x > xs[-1]:
            return ys[-1]+(x-xs[-1])*(ys[-1]-ys[-2])/(xs[-1]-xs[-2])
        else:
            return interpolator(x)

    def ufunclike(xs):
        return array(map(pointwise, array(xs)))

    return ufunclike

x = json.loads(sys.argv[1])
y = json.loads(sys.argv[2])
f_i = interp1d(x, y)
f_x = extrap1d(f_i)
print(f_x([2019,2020]))

""" x = sys.argv[1]
y = sys.argv[2]
f_i = interp1d(x, y)
f_x = extrap1d(f_i)
print(f_x([2019,2020])) """
