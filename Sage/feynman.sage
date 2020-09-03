cachePlus = {}
cacheMinus = {}

def findPathsPlus(x,y,rotate_exists):
	if (str(x) + ":" + str(y) + ":" + str(rotate_exists) in cachePlus):
		return cachePlus[str(x) + ":" + str(y) + ":" + str(rotate_exists)]
	elif y == 1 and x == 1:
		return (0, 1) # right coord calculates +, left -
	elif y == 1 and x == 3 and rotate_exists:
		return (3, 4)
	elif y == 1 and x == -1 and rotate_exists:
		return (-3, 4)
	elif y == 1:
		return (0, 0)
	else:
		L = findPathsPlus(x-1,y-1,rotate_exists)
		R = findPathsMinus(x-1,y-1,rotate_exists)
		cachePlus[str(x) + ":" + str(y) + ":" + str(rotate_exists)] = multVec(addVec(L,primize(R)), 1 / sqrt(2))
		return cachePlus[str(x) + ":" + str(y) + ":" + str(rotate_exists)]

def findPathsMinus(x,y,rotate_exists):
	if (str(x) + ":" + str(y) + ":" + str(rotate_exists) in cacheMinus):
		return cacheMinus[str(x) + ":" + str(y) + ":" + str(rotate_exists)]
	elif y == 1:
		return (0, 0)
	else:
		L = findPathsPlus(x+1,y-1,rotate_exists)
		R = findPathsMinus(x+1,y-1,rotate_exists)
		cacheMinus[str(x) + ":" + str(y) + ":" + str(rotate_exists)] = multVec(addVec(R,primize(L)), 1 / sqrt(2))
		return cacheMinus[str(x) + ":" + str(y) + ":" + str(rotate_exists)]

def findPaths(x,y,rotate_exists):
	return addVec(findPathsMinus(x,y,rotate_exists),findPathsPlus(x,y,rotate_exists))

def primize(v):
	return (v[1], -v[0])

def addVec(v1, v2):
	return (v1[0]+v2[0], v1[1]+v2[1])

def multVec(v, n):
	return (v[0]*n, v[1]*n)

def cprodVec(v1,v2):
	return (v1[0]*v2[0]-v1[1]*v2[1],v1[0]*v2[1]+v2[0]*v1[1]) 

def newHuygens(x,y,rotate_exists):
	summ = (0,0)
	for a in range(-3*y,3*y):
		add = cprodVec(findPathsPlus(a,y,rotate_exists), findPaths(x-a+1,y,false))
		summ = addVec(summ, add)
	for a in range(-3*y,3*y):
		add = cprodVec(findPathsMinus(a,y,rotate_exists), findPaths(-x+a+1,y,false))
		summ = addVec(summ, add)
	return multVec(primize(summ),1/5)

def testHuygens(max_y, rotate_exists):
	for y in range(1,max_y):
		for x in range(-3*y,3*y):
			h = newHuygens(x,y,rotate_exists)
			t = findPaths(x,y*2-1,rotate_exists)
			if h != t:
				print("!!!", x, y, h, t)
				return false

	print("good, good")

def a1_test(x, y):
     a = (-1)^y * 2^((y-3)/2)
     start = x/2
     end = y/2
     return a * sum((-2)^(1-t-y/2) * binomial(t+y/2-1,2*t) * binomial(2*t,t+x/2), t, start, end)

def a2_test(x, y):
	a1 = 2^((1-y)/2)*binomial(y-1, (y-x)/2)
	a2 = (-1)^y * 2^((y-3)/2)
	print(a1, a2)
	start = x/2
	end = y/2
	return a1 - a2 * sum((-2)^(1-t-y/2) * binomial(t+y/2-1,2*t) * binomial(2*t,t+x/2) * (t+y/2+x) / (y/2-t), t, start, end)

def testFormula(max_y):
	for y in range(1, max_y):
		for x in range(2 - y, y, 2):
			t = findPathsMinus(x, y, false)[0]
			q = a1_test(x, y)
			if t != q:
				print("!!!", x, y, t, q)
				return false
	print("good, good")

def testFormula2(max_y):
	for y in range(1, max_y):
		for x in range(2 - y, y - 2, 2):
			t = findPathsPlus(x, y, false)[1]
			q = a2_test(x, y)
			if t != q:
				print("!!!", x, y, t, q)
				return false
	print("good, good")
