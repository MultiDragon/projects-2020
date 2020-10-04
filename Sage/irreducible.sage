arr = []
from sage.arith import all

def seqgen(n, m=0, depth=0, seq=None):
    if seq == None:
        seq = [0 for i in range(n)]
    if m == n:
        yield seq[:depth] + [0 for i in range(n - depth)]
    elif depth == n - 1:
        pass
    else:
        for j in range((n - m) // (depth + 1) + 1):
            seq[depth] = j
            yield from seqgen(n, m + j * (depth + 1), depth + 1, seq)

def linebinom(k, A):
    return all.binomial(A + k - 1, k)

def calculate(n):
    s = 2 ** n
    for line in seqgen(n):
        prod = 1
        for j in range(n - 1):
            prod *= linebinom(line[j], arr[j + 1])
        s -= prod
    arr.append(s)
    return s

arr.append(1)
for i in range(1, 20):
    calculate(i)

print(arr)
for i in range(1, 20):
    summ = 0
    for j in divisors(i):
        summ += arr[j] * j
    print(i, summ)

