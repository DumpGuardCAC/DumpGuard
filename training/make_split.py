import numpy as np, pandas as pd, imagehash, random
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

random.seed(0)
np.random.seed(0)
import os
SUF = "" if int(os.environ.get("DG_S", 256)) == 256 else "_" + os.environ["DG_S"]
df = pd.read_csv(f"data/manifest_all{SUF}.csv")

CAP = {("oi", "ewaste_hazard"): 900, ("oi", "no_object"): 1500, ("garbage12", "no_object"): 500,
       ("trashnet", "*"): 400}
parts = []
for (src, cls), g in df.groupby(["source", "cls"]):
    cap = CAP.get((src, cls), CAP.get((src, "*"), None))
    if cap and src != "zerowaste_test" and len(g) > cap:
        g = g.sample(cap, random_state=0)
    parts.append(g)
df = pd.concat(parts, ignore_index=True)

groups = df.loc[df.source != "zerowaste_test", "group"].unique()
rng = np.random.RandomState(0)
rng.shuffle(groups)
n = len(groups)
val_g = set(groups[: int(n * 0.075)])
te_g = set(groups[int(n * 0.075): int(n * 0.15)])


def split(r):
    if r.source == "zerowaste_test":
        return "ext_test"
    if r.group in val_g:
        return "val"
    if r.group in te_g:
        return "test_id"
    return "train"


df["split"] = df.apply(split, axis=1)


def ph(p):
    try:
        return imagehash.phash(Image.open(p), hash_size=8).hash.flatten()
    except Exception:
        return np.zeros(64, bool)


with ThreadPoolExecutor(12) as ex:
    H = np.array(list(ex.map(ph, df.path)))
tr = np.where(df.split == "train")[0]
ev = np.where(df.split != "train")[0]
drop = set()
Ht = H[tr].astype(np.uint8)
for i in ev:
    d = (Ht != H[i].astype(np.uint8)).sum(1)
    for j in np.where(d <= 4)[0]:
        drop.add(tr[j])
print("train near-duplicates of eval images dropped:", len(drop))
df = df.drop(index=list(drop)).reset_index(drop=True)
web = df[(df.source == "web") & (df.split == "train")]
df = pd.concat([df, web, web], ignore_index=True)
df.to_csv(f"data/manifest{SUF}.csv", index=False)
print(df.groupby(["split", "cls"]).size().unstack(fill_value=0).to_string())
