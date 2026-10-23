import os, hashlib
import numpy as np, pandas as pd
from PIL import Image, ImageOps
import zs
S = 256
a = pd.read_csv("data/audit.csv")
out, stats = [], {}
HAZ = zs.OWL_Q["ewaste_hazard"]


def crop(im, b, pad=1.2, min_side=96):
    W, H = im.size
    x, y, w, h = b
    s = min(max(max(w, h) * pad, min_side), min(W, H))
    cx, cy = x + w / 2, y + h / 2
    x0 = min(max(cx - s / 2, 0), W - s); y0 = min(max(cy - s / 2, 0), H - s)
    return im.crop((int(x0), int(y0), int(x0 + s), int(y0 + s))).resize((S, S), Image.BICUBIC)


def orig(r):
    base = r.group.split(":", 1)[1]
    if r.source == "oi":
        return f"data/openimages/img/{'hazard' if r.cls == 'ewaste_hazard' else 'background'}/{base}"
    return f"data/giz_ewaste/COCO with Pictures/images/{base}"


def hazard_box(im):
    best = None
    for q in HAZ:
        pass
    return zs.best_box(im, "ewaste_hazard", thr=0.2)


def any_object(im):
    return any(zs.best_box(im, k, 0.2) for k in ["ewaste_hazard", "rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass"])


n = 0
for r in a.itertuples():
    n += 1
    if n % 500 == 0:
        print(n, len(a), flush=True)
    if r.source in ("zerowaste", "zerowaste_test"):
        out.append(dict(path=r.path, cls=r.cls, source=r.source, group=r.group)); continue
    if r.source in ("taco", "trashnet", "garbage12"):
        if r.action == "drop":
            stats["drop_" + r.source] = stats.get("drop_" + r.source, 0) + 1; continue
        c = r.new_cls
        if c != r.cls:
            stats["relabel_" + r.source] = stats.get("relabel_" + r.source, 0) + 1
        out.append(dict(path=r.path, cls=c, source=r.source, group=r.group)); continue
    try:
        im = ImageOps.exif_transpose(Image.open(orig(r))).convert("RGB")
    except Exception:
        stats["unreadable"] = stats.get("unreadable", 0) + 1; continue
    if r.cls == "ewaste_hazard":
        b = hazard_box(im)
        if b is None:
            stats["haz_nobox_" + r.source] = stats.get("haz_nobox_" + r.source, 0) + 1; continue
        c = crop(im, b[:4])
        p = zs.clip_probs([c])[0]
        if p.argmax() != 5 and p[5] < 0.3:
            stats["haz_clipreject_" + r.source] = stats.get("haz_clipreject_" + r.source, 0) + 1; continue
        name = hashlib.md5(orig(r).encode()).hexdigest()[:16] + ".jpg"
        op = f"data/crops/{r.source}_rc/ewaste_hazard/{name}"
        os.makedirs(os.path.dirname(op), exist_ok=True); c.save(op, quality=92)
        out.append(dict(path=op, cls="ewaste_hazard", source=r.source, group=r.group))
    else:
        if any_object(im):
            stats["bg_has_object"] = stats.get("bg_has_object", 0) + 1; continue
        out.append(dict(path=r.path, cls="no_object", source=r.source, group=r.group))
df = pd.DataFrame(out)
df.to_csv("data/manifest_all_clean.csv", index=False)
print(stats)
print(df.groupby(["source", "cls"]).size().unstack(fill_value=0).to_string())
