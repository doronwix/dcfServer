import sys
import json
import numpy as np
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
"""x=[110360000000,89950000000,85320000000,93580000000,86833000000,77849000000,73723000000,69943000000,62484000000]
y=[2018,2017,2016,2015,2014,2013,2012,2011,2010]"""
f_i = interp1d(x, y)
f_x = extrap1d(f_i)
print(f_x([2019, 2020, 2021, 2022, 2023]))

""" x = sys.argv[1]
y = sys.argv[2]
f_i = interp1d(x, y)
f_x = extrap1d(f_i)
print(f_x([2019,2020])) """
