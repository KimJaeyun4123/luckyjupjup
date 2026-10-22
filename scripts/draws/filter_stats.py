import json, sys, itertools, collections
d = json.load(open(sys.argv[1]))
for x in d:
    x.setdefault('draw_no', x.get('round')); x.setdefault('date', x.get('date'))
draws = sorted(d, key=lambda x: x['draw_no'])
N = len(draws)
PRIMES = {2,3,5,7,11,13,17,19,23,29,31,37,41,43}
def feats(nums, prev=None):
    s = sorted(nums); f = {}
    f['sum'] = sum(s)
    f['odd'] = sum(n % 2 for n in s)
    f['low'] = sum(n <= 22 for n in s)              # 저수 1~22
    f['consec_pairs'] = sum(1 for a,b in zip(s,s[1:]) if b-a==1)
    runs=[]; r=1
    for a,b in zip(s,s[1:]):
        if b-a==1: r+=1
        else: runs.append(r); r=1
    runs.append(r); f['max_run']=max(runs)
    diffs = {b-a for a,b in itertools.combinations(s,2)}
    f['ac'] = len(diffs)-5
    ends = collections.Counter(n%10 for n in s); f['max_same_end']=max(ends.values())
    f['end_sum'] = sum(n%10 for n in s)
    secs = collections.Counter((n-1)//10 for n in s); f['max_sec']=max(secs.values()); f['n_secs']=len(secs)  # 10단위 구간(1-10,11-20,...,41-45)
    f['primes'] = sum(n in PRIMES for n in s)
    f['mult3'] = sum(n%3==0 for n in s)
    f['range'] = s[-1]-s[0]
    f['carry'] = len(set(s)&set(prev)) if prev else None
    return f
rows=[]
for i,x in enumerate(draws):
    prev = draws[i-1]['numbers'] if i>0 else None
    rows.append(feats(x['numbers'], prev))
def pct(cond): 
    v=[r for r in rows if cond(r)]; return f"{100*len(v)/N:.1f}%"
print(f"rounds={N} (1~{draws[-1]['draw_no']}, last {draws[-1]['date'][:10]})")
print("sum 100~175:", pct(lambda r:100<=r['sum']<=175), "| 106~170:", pct(lambda r:106<=r['sum']<=170), "| 115~165:", pct(lambda r:115<=r['sum']<=165))
print("odd 2~4:", pct(lambda r:2<=r['odd']<=4), "| odd 3:", pct(lambda r:r['odd']==3), "| odd 0 or 6:", pct(lambda r:r['odd'] in (0,6)))
print("low 2~4:", pct(lambda r:2<=r['low']<=4), "| low 0 or 6:", pct(lambda r:r['low'] in (0,6)))
print("consec_pairs 0:", pct(lambda r:r['consec_pairs']==0), "| <=1:", pct(lambda r:r['consec_pairs']<=1), "| <=2:", pct(lambda r:r['consec_pairs']<=2), "| max_run>=3:", pct(lambda r:r['max_run']>=3))
print("ac>=7:", pct(lambda r:r['ac']>=7), "| ac>=6:", pct(lambda r:r['ac']>=6), "| ac<=4:", pct(lambda r:r['ac']<=4))
print("same_end<=2:", pct(lambda r:r['max_same_end']<=2), "| <=3:", pct(lambda r:r['max_same_end']<=3))
print("end_sum 15~35:", pct(lambda r:15<=r['end_sum']<=35))
print("max_sec<=3:", pct(lambda r:r['max_sec']<=3), "| n_secs>=3:", pct(lambda r:r['n_secs']>=3), "| n_secs>=4:", pct(lambda r:r['n_secs']>=4))
print("primes 1~3:", pct(lambda r:1<=r['primes']<=3), "| 0~3:", pct(lambda r:r['primes']<=3))
print("mult3 1~3:", pct(lambda r:1<=r['mult3']<=3), "| 0~3:", pct(lambda r:r['mult3']<=3))
print("range>=20:", pct(lambda r:r['range']>=20), "| range 25~40:", pct(lambda r:25<=r['range']<=40))
cr=[r for r in rows if r['carry'] is not None]
print("carry 0:", f"{100*sum(r['carry']==0 for r in cr)/len(cr):.1f}%", "| 1:", f"{100*sum(r['carry']==1 for r in cr)/len(cr):.1f}%", "| >=2:", f"{100*sum(r['carry']>=2 for r in cr)/len(cr):.1f}%", "| <=2:", f"{100*sum(r['carry']<=2 for r in cr)/len(cr):.1f}%")
dist = collections.Counter(r['sum'] for r in rows); import statistics
print("sum mean/median/sd:", f"{statistics.mean(r['sum'] for r in rows):.1f}", statistics.median(r['sum'] for r in rows), f"{statistics.pstdev(r['sum'] for r in rows):.1f}")
print("ac dist:", sorted(collections.Counter(r['ac'] for r in rows).items()))
print("odd dist:", sorted(collections.Counter(r['odd'] for r in rows).items()))
# combined "balanced" filter pass rate on actual draws
bal = lambda r: 100<=r['sum']<=175 and 2<=r['odd']<=4 and 2<=r['low']<=4 and r['consec_pairs']<=1 and r['ac']>=7 and r['max_same_end']<=2 and r['max_sec']<=3
print("ALL balanced filters pass (actual draws):", pct(bal))
# frequency & gaps
freq=collections.Counter(n for x in draws for n in x['numbers'])
last={n:None for n in range(1,46)}
for x in draws:
    for n in x['numbers']: last[n]=x['draw_no']
gap={n:draws[-1]['draw_no']-last[n] for n in last}
print("freq top6:", freq.most_common(6)); print("freq bottom6:", freq.most_common()[-6:])
print("longest absent:", sorted(gap.items(), key=lambda kv:-kv[1])[:6])
print("expected per number:", f"{6*N/45:.1f}")
# win type share of 1st prize (auto/semi/manual) since available
wt=collections.Counter()
for x in draws:
    for k,v in (x.get('winners_combination') or {}).items(): wt[k]+=v
print("1st prize by selection type (where recorded):", dict(wt))
