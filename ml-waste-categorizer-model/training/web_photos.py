# Step 2: scrape real-scene web photos, then filter them with the zero-shot models into data/web.
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

# Filter and crop the scraped photos
import csv, os, sys, hashlib
import numpy as np, pandas as pd
from PIL import Image, ImageOps
import zs

S = int(os.environ.get("DG_S", 256))
O = "data/web"
rows = list(csv.DictReader(open(f"{O}/meta.csv", encoding="utf-8")))
seen, uniq = set(), []
for r in rows:
    if r["file"] not in seen:
        seen.add(r["file"]); uniq.append(r)


def crop(im, box, pad=1.2, min_side=96):
    W, H = im.size
    x, y, w, h = box
    s = min(max(max(w, h) * pad, min_side), min(W, H))
    cx, cy = x + w / 2, y + h / 2
    x0 = min(max(cx - s / 2, 0), W - s); y0 = min(max(cy - s / 2, 0), H - s)
    return im.crop((int(x0), int(y0), int(x0 + s), int(y0 + s))).resize((S, S), Image.BICUBIC)


keep, rej = [], []
for i, r in enumerate(uniq):
    cls = r["cls"]
    try:
        im = ImageOps.exif_transpose(Image.open(r["file"])).convert("RGB")
    except Exception:
        rej.append((r["file"], cls, "unreadable")); continue
    if min(im.size) < 160:
        rej.append((r["file"], cls, "small")); continue
    name = hashlib.md5(r["file"].encode()).hexdigest()[:16] + ".jpg"
    outp = f"{O}/crops/{cls}/{name}"
    if cls == "no_object":
        s = min(im.size); W, H = im.size
        c = im.crop(((W - s) // 2, (H - s) // 2, (W + s) // 2, (H + s) // 2)).resize((S, S), Image.BICUBIC)
        p = zs.clip_probs([c])[0]
        if p[6] < 0.4 or any(zs.best_box(im, k, 0.2) for k in zs.OWL_Q):
            rej.append((r["file"], cls, f"bg clip={p[6]:.2f}")); continue
        score = float(p[6])
    else:
        b = zs.best_box(im, cls)
        if b is None:
            rej.append((r["file"], cls, "no box")); continue
        c = crop(im, b[:4])
        p = zs.clip_probs([c])[0]
        k = zs.CLASSES.index(cls)
        if p.argmax() != k and p[k] < 0.3:
            rej.append((r["file"], cls, f"clip says {zs.CLASSES[p.argmax()]} {p.max():.2f}")); continue
        score = float(p[k])
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    c.save(outp, quality=92)
    keep.append(dict(path=outp, cls=cls, source="web", group="web:" + name[:-4], clip=round(score, 3), query=r["query"], license=r["license"], landing=r["landing"], creator=r["creator"]))
    if i % 50 == 0:
        print(i, len(uniq), "kept", len(keep), flush=True)
pd.DataFrame(keep).to_csv(f"{O}/manifest_web.csv", index=False)
pd.DataFrame(rej, columns=["file", "cls", "reason"]).to_csv(f"{O}/rejects.csv", index=False)
print(pd.DataFrame(keep).groupby("cls").size())
