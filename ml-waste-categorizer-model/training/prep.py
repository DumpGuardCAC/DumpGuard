import os, sys, json, glob, random, hashlib
import pandas as pd
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor

random.seed(0)
D = "data"
S = int(os.environ.get("DG_S", 256))
OUT = "data/crops" if S == 256 else f"data/crops{S}"
SUF = "" if S == 256 else f"_{S}"
CLASSES = ["rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass", "ewaste_hazard", "no_object"]
rows = []


def square_crop(im, box=None, pad=1.2, min_side=96):
    W, H = im.size
    if box is None:
        s = min(W, H)
        cx, cy = W / 2, H / 2
    else:
        x, y, w, h = box
        s = max(max(w, h) * pad, min_side)
        s = min(s, min(W, H))
        cx, cy = x + w / 2, y + h / 2
    x0 = min(max(cx - s / 2, 0), W - s)
    y0 = min(max(cy - s / 2, 0), H - s)
    return im.crop((int(x0), int(y0), int(x0 + s), int(y0 + s))).resize((S, S), Image.BICUBIC)


def save(job):
    src, group, cls, path, box, exif = job
    name = hashlib.md5(f"{src}|{group}|{box}".encode()).hexdigest()[:16] + ".jpg"
    outp = f"{OUT}/{src}/{cls}/{name}"
    if not os.path.exists(outp):
        try:
            im = Image.open(path)
            if exif:
                im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            if min(im.size) < 48:
                return None
            c = square_crop(im, box)
            os.makedirs(os.path.dirname(outp), exist_ok=True)
            c.save(outp, quality=92)
        except Exception as e:
            return None
    return dict(path=outp, cls=cls, source=src, group=f"{src}:{group}")


jobs = []


def folder_source(src, root, mapping, cap=None):
    for sub, cls in mapping.items():
        files = sorted(glob.glob(f"{root}/{sub}/*"))
        files = [f for f in files if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        random.shuffle(files)
        for f in files[:cap]:
            jobs.append((src, os.path.basename(f), cls, f, None, True))


folder_source("trashnet", f"{D}/trashnet/dataset-resized", {
    "cardboard": "cardboard_paper", "paper": "cardboard_paper", "glass": "glass",
    "metal": "metal", "plastic": "rigid_plastic"}, cap=400)

folder_source("garbage12", f"{D}/garbage12/garbage_classification", {
    "battery": "ewaste_hazard", "cardboard": "cardboard_paper", "paper": "cardboard_paper", "metal": "metal",
    "plastic": "rigid_plastic", "brown-glass": "glass", "green-glass": "glass", "white-glass": "glass",
    "clothes": "no_object", "shoes": "no_object"}, cap=700)

giz = sorted(glob.glob(f"{D}/giz_ewaste/COCO with Pictures/images/*.jpg"))
random.shuffle(giz)
for f in giz[:500]:
    jobs.append(("giz", os.path.basename(f), "ewaste_hazard", f, None, True))

TACO = {
    "rigid_plastic": [4, 5, 43, 44, 47],
    "soft_plastic_foam": [2, 3, 22, 36, 38, 39, 40, 41, 42, 46, 57],
    "cardboard_paper": [14, 15, 16, 17, 18, 19, 30, 33, 34],
    "metal": [0, 10, 12],
    "glass": [6, 26, 23],
    "ewaste_hazard": [1],
}
cat2cls = {c: k for k, v in TACO.items() for c in v}
t = json.load(open(f"{D}/taco/annotations.json"))
imgs = {i["id"]: i for i in t["images"]}
for a in t["annotations"]:
    cls = cat2cls.get(a["category_id"])
    if not cls:
        continue
    x, y, w, h = a["bbox"]
    if w < 40 or h < 40:
        continue
    im = imgs[a["image_id"]]
    jobs.append(("taco", f"{a['image_id']}", cls, f"{D}/taco/{im['file_name']}", (x, y, w, h), True))

for sub, cls in (("hazard", "ewaste_hazard"), ("background", "no_object")):
    fs = sorted(glob.glob(f"{D}/openimages/img/{sub}/*.jpg"))
    for f in fs:
        jobs.append(("oi", os.path.basename(f), cls, f, None, False))

zw = "data/zerowaste/extract/splits_final_deblurred"
ZW = {"cardboard": "cardboard_paper", "metal": "metal", "rigid_plastic": "rigid_plastic", "soft_plastic": "soft_plastic_foam"}
ZCAP = {"train": {"rigid_plastic": 900, "metal": 400, "soft_plastic_foam": 900, "cardboard_paper": 400},
        "val": {"rigid_plastic": 150, "metal": 60, "soft_plastic_foam": 150, "cardboard_paper": 100},
        "test": {"rigid_plastic": 315, "metal": 63, "soft_plastic_foam": 300, "cardboard_paper": 300}}
for sp in ("train", "val", "test"):
    d = json.load(open(f"{zw}/{sp}/labels.json"))
    names = {c["id"]: c["name"] for c in d["categories"]}
    imgs = {i["id"]: i for i in d["images"]}
    per = {}
    for a in d["annotations"]:
        cls = ZW.get(names[a["category_id"]])
        x, y, w, h = a["bbox"]
        if cls and w >= 60 and h >= 60:
            per.setdefault(cls, []).append(a)
    for cls, lst in per.items():
        random.shuffle(lst)
        for a in lst[:ZCAP[sp][cls]]:
            im = imgs[a["image_id"]]
            src = "zerowaste_test" if sp == "test" else "zerowaste"
            jobs.append((src, f"{sp}{a['image_id']}", cls, f"{zw}/{sp}/data/{im['file_name']}", tuple(a["bbox"]), False))

print("jobs", len(jobs), flush=True)
with ThreadPoolExecutor(12) as ex:
    res = [r for r in ex.map(save, jobs) if r]
df = pd.DataFrame(res)
df.to_csv(f"data/manifest_all{SUF}.csv", index=False)
print(df.groupby(["source", "cls"]).size().unstack(fill_value=0).to_string())
