import itertools, collections
PRIMES = {2,3,5,7,11,13,17,19,23,29,31,37,41,43}
T=0; c=collections.Counter()
for s in itertools.combinations(range(1,46),6):
    T+=1
    sm=sum(s); odd=sum(n&1 for n in s); low=sum(n<=22 for n in s)
    cp=sum(1 for a,b in zip(s,s[1:]) if b-a==1)
    ac=len({b-a for a,b in itertools.combinations(s,2)})-5
    mse=max(collections.Counter(n%10 for n in s).values())
    msec=max(collections.Counter((n-1)//10 for n in s).values())
    pr=sum(n in PRIMES for n in s)
    if 100<=sm<=175: c['sum100_175']+=1
    if 2<=odd<=4: c['odd2_4']+=1
    if 2<=low<=4: c['low2_4']+=1
    if cp<=1: c['consec_le1']+=1
    if cp==0: c['consec_0']+=1
    if ac>=7: c['ac_ge7']+=1
    if mse<=2: c['same_end_le2']+=1
    if msec<=3: c['sec_le3']+=1
    if 1<=pr<=3: c['prime1_3']+=1
    if 100<=sm<=175 and 2<=odd<=4 and 2<=low<=4 and cp<=1 and ac>=7 and mse<=2 and msec<=3: c['ALL']+=1
print("total combos", T)
for k,v in c.items(): print(f"{k}: {100*v/T:.1f}%  ({v:,})")
