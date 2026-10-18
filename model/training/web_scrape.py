import os, time, csv, hashlib, requests
from concurrent.futures import ThreadPoolExecutor
Q = {
 "rigid_plastic": ["plastic water bottle","empty plastic bottle on table","plastic bottle in trash","takeout plastic container","yogurt cup plastic","crushed plastic bottle","plastic milk jug","detergent bottle","shampoo bottle","plastic bottles recycling bin","plastic food container lid","plastic cup litter"],
 "soft_plastic_foam": ["crumpled plastic bag","plastic grocery bag","empty chip bag","plastic wrap film","styrofoam cup","styrofoam takeout container","bubble wrap","foam packaging","plastic bag in trash can","candy wrapper litter","snack wrapper on ground","packing peanuts"],
 "cardboard_paper": ["cardboard box","flattened cardboard recycling","crumpled paper","newspaper pile","paper bag","pizza box","egg carton","cereal box","paper cup","cardboard in trash","paper towel roll","magazine stack"],
 "metal": ["aluminum soda can","crushed beer can","tin can food","empty tin can kitchen","aluminum foil crumpled","metal can recycling bin","energy drink can","soda can in trash","soup can","can litter on ground"],
 "glass": ["glass bottle","beer bottle empty","wine bottle empty","glass jar","broken glass","green glass bottle","glass bottles recycling","jam jar","clear glass bottle on table","brown glass bottle"],
 "ewaste_hazard": ["old smartphone","broken cell phone","used batteries","AA batteries","old laptop","electronic waste pile","light bulb","fluorescent tube","compact fluorescent bulb","phone charger cable","old remote control","power bank","paint can","aerosol spray can","car battery","button cell battery","old computer keyboard","hard drive"],
 "no_object": ["empty kitchen counter","empty desk","living room interior","open hand palm","floor tiles","wooden table","carpet floor","office desk","garage shelf","sidewalk","bathroom counter","hallway","sofa","grass lawn","bedroom interior","kitchen interior","dishes on shelf","houseplant","bookshelf","trash can lid"],
}
PAGES = int(os.environ.get("PAGES", 2))
O = "data/web"
os.makedirs(O + "/raw", exist_ok=True)
META = O + "/meta.csv"
done = set()
if os.path.exists(META):
    done = {(r["cls"], r["query"], r["page"]) for r in csv.DictReader(open(META, encoding="utf-8"))}
else:
    open(META, "w", encoding="utf-8").write("file,cls,query,page,title,creator,license,license_version,landing,url\n")


def fetch(url, p):
    try:
        r = requests.get(url, timeout=25, headers={"User-Agent": "DumpGuard-student-project/1.0"})
        if r.status_code == 200 and len(r.content) > 8000:
            open(p, "wb").write(r.content); return True
    except Exception:
        pass
    return False


calls = 0
for cls, qs in Q.items():
    for q in qs:
        for pg in range(1, PAGES + 1):
            if (cls, q, str(pg)) in done:
                continue
            while True:
                r = requests.get("https://api.openverse.org/v1/images/", params=dict(q=q, page_size=20, page=pg, license_type="all-cc", mature="false"), timeout=30)
                if r.status_code == 429:
                    print("rate limited, sleep 60", flush=True); time.sleep(60); continue
                break
            if r.status_code != 200:
                print("api", r.status_code, q, flush=True); break
            res = r.json()["results"]
            jobs = []
            for x in res:
                h = hashlib.md5(x["url"].encode()).hexdigest()[:14]
                p = f"{O}/raw/{h}.jpg"
                jobs.append((x, p))
            with ThreadPoolExecutor(10) as ex:
                oks = list(ex.map(lambda j: os.path.exists(j[1]) or fetch(j[0]["url"], j[1]), jobs))
            with open(META, "a", encoding="utf-8", newline="") as f:
                w = csv.writer(f)
                for (x, p), ok in zip(jobs, oks):
                    if ok:
                        w.writerow([p, cls, q, pg, x.get("title"), x.get("creator"), x.get("license"), x.get("license_version"), x.get("foreign_landing_url"), x["url"]])
            calls += 1
            print(cls, q, pg, sum(oks), "calls", calls, flush=True)
            time.sleep(3.2)
