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
