import json, sys, time, urllib.request
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
def get(center):
    req=urllib.request.Request(f"https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchLtEpsd={center}",headers={"User-Agent":UA,"Accept":"application/json","Referer":"https://www.dhlottery.co.kr/lt645/result"})
    with urllib.request.urlopen(req,timeout=20) as r: return json.load(r)["data"]["list"]
latest=int(sys.argv[1]); rows={}
c=latest; calls=0
while c>=1:
    for attempt in range(3):
        try: lst=get(c); break
        except Exception as e:
            print("retry",c,e,file=sys.stderr); time.sleep(2)
    else: sys.exit("failed at "+str(c))
    calls+=1
    for x in lst: rows[x["ltEpsd"]]=x
    if not lst: break
    c=min(x["ltEpsd"] for x in lst)-1
    time.sleep(0.25)
print("calls",calls,"rounds",len(rows),"min",min(rows),"max",max(rows),file=sys.stderr)
out=[]
for k in sorted(rows):
    x=rows[k]
    out.append({"round":k,"date":f"{x['ltRflYmd'][:4]}-{x['ltRflYmd'][4:6]}-{x['ltRflYmd'][6:]}",
      "numbers":sorted(x[f"tm{i}WnNo"] for i in range(1,7)),"bonus":x["bnsWnNo"],
      "prizes":[{"rank":r,"winners":x[f"rnk{r}WnNope"],"amount":x[f"rnk{r}WnAmt"]} for r in range(1,6)],
      "sales":x.get("wholEpsdSumNtslAmt"),"firstBy":{"auto":x.get("winType1"),"manual":x.get("winType2"),"semiAuto":x.get("winType3")}})
json.dump(out,open(sys.argv[2],"w"),ensure_ascii=False,separators=(",",":"))
# cross-check with smok95
s={d["draw_no"]:d for d in json.load(open(sys.argv[3]))}
diff=[r["round"] for r in out if r["round"] in s and (s[r["round"]]["numbers"]!=r["numbers"] or s[r["round"]]["bonus_no"]!=r["bonus"])]
missing=[k for k in s if k not in rows]
print("diff numbers vs smok95:",diff[:20],"count",len(diff)); print("missing in official:",missing[:10],len(missing))
dd=[r["round"] for r in out if r["round"] in s and s[r["round"]]["date"][:10]!=r["date"]]
print("date diffs:",len(dd),dd[:5])
