import os, sys, hashlib
os.environ["KERAS_BACKEND"] = "torch"
import torch, numpy as np, pandas as pd
from PIL import Image, ImageOps
import keras
from transformers import CLIPModel, CLIPProcessor, OwlViTProcessor, OwlViTForObjectDetection

CLASSES = ["rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass", "ewaste_hazard", "no_object"]
PROMPTS = {
    "rigid_plastic": ["a photo of a rigid plastic bottle", "a photo of a hard plastic container or cup", "a photo of a plastic jug or tub"],
    "soft_plastic_foam": ["a photo of a plastic bag or plastic wrapper", "a photo of crumpled plastic film", "a photo of styrofoam or foam packaging"],
    "cardboard_paper": ["a photo of a cardboard box", "a photo of crumpled paper or a paper bag", "a photo of cardboard or paper waste"],
    "metal": ["a photo of a metal soda can", "a photo of a tin can or aluminum can", "a photo of crumpled aluminum foil"],
    "glass": ["a photo of a glass bottle", "a photo of a glass jar", "a photo of broken glass"],
    "ewaste_hazard": ["a photo of a battery", "a photo of a smartphone or electronic device", "a photo of a light bulb or electronics waste"],
    "no_object": ["a photo of an empty table or floor", "a photo of a room with no trash", "a photo of a plain background"],
}
OWL_Q = {
    "rigid_plastic": ["a plastic bottle", "a plastic container", "a plastic cup"],
    "soft_plastic_foam": ["a plastic bag", "a plastic wrapper", "styrofoam", "bubble wrap"],
    "cardboard_paper": ["a cardboard box", "a piece of paper", "a paper bag", "an egg carton"],
    "metal": ["a metal can", "a tin can", "aluminum foil"],
    "glass": ["a glass bottle", "a glass jar", "broken glass"],
    "ewaste_hazard": ["a battery", "a smartphone", "a laptop", "a light bulb", "a paint can", "an aerosol can", "a charger", "a remote control"],
}
S = 256
dev = "cuda" if torch.cuda.is_available() else "cpu"
_clip = _owl = None


def clip():
    global _clip
    if _clip is None:
        m = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(dev).eval()
        p = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        texts = [t for c in CLASSES for t in PROMPTS[c]]
        with torch.no_grad():
            te = m.get_text_features(**p(text=texts, return_tensors="pt", padding=True).to(dev))
            te = te if torch.is_tensor(te) else te.pooler_output
            te = te / te.norm(dim=-1, keepdim=True)
        _clip = (m, p, te)
    return _clip


@torch.no_grad()
def clip_probs(images, bs=64):
    m, p, te = clip()
    out = []
    for i in range(0, len(images), bs):
        px = p(images=images[i:i + bs], return_tensors="pt").to(dev)
        ie = m.get_image_features(**px)
        ie = ie if torch.is_tensor(ie) else ie.pooler_output
        ie = ie / ie.norm(dim=-1, keepdim=True)
        s = (100 * ie @ te.T).view(len(ie), len(CLASSES), 3).mean(2)
        out.append(s.softmax(-1).cpu().numpy())
    return np.concatenate(out)


def owl():
    global _owl
    if _owl is None:
        _owl = (OwlViTForObjectDetection.from_pretrained("google/owlvit-base-patch32").to(dev).eval(),
                OwlViTProcessor.from_pretrained("google/owlvit-base-patch32"))
    return _owl


@torch.no_grad()
def best_box(im, cls, thr=0.12):
    m, p = owl()
    qs = OWL_Q[cls]
    inp = p(text=[qs], images=im, return_tensors="pt").to(dev)
    o = m(**inp)
    W, H = im.size
    s = max(W, H)
    res = p.image_processor.post_process_object_detection(o, threshold=thr, target_sizes=torch.tensor([[s, s]]).to(dev))[0]
    if len(res["scores"]) == 0:
        return None
    k = int(res["scores"].argmax())
    x0, y0, x1, y1 = res["boxes"][k].tolist()
    x0, x1 = max(0, x0), min(W, x1)
    y0, y1 = max(0, y0), min(H, y1)
    if x1 - x0 < 24 or y1 - y0 < 24:
        return None
    return x0, y0, x1 - x0, y1 - y0, float(res["scores"][k])


def audit(manifest, weights):
    df = pd.read_csv(manifest)
    base = keras.applications.MobileNetV3Large(input_shape=(224, 224, 3), include_top=False, weights=None, include_preprocessing=True, pooling="avg")
    m = keras.Model(base.input, keras.layers.Dense(7, activation="softmax", name="probs")(keras.layers.Dropout(0.3)(base.output)))
    m.load_weights(weights)

    Pm, Pc = [], []
    B = 128
    for i in range(0, len(df), B):
        ims = [Image.open(p).convert("RGB") for p in df.path[i:i + B]]
        Pc.append(clip_probs(ims))
        X = np.stack([np.asarray(im.resize((224, 224), Image.BILINEAR), dtype="float32") for im in ims])
        Pm.append(np.asarray(m.predict_on_batch(X)))
        if (i // B) % 20 == 0:
            print(i, len(df), flush=True)
    Pm, Pc = np.concatenate(Pm), np.concatenate(Pc)
    y = df.cls.map({c: i for i, c in enumerate(CLASSES)}).values
    mi, ci = Pm.argmax(1), Pc.argmax(1)
    df["model_pred"] = [CLASSES[i] for i in mi]; df["model_conf"] = Pm.max(1).round(3)
    df["clip_pred"] = [CLASSES[i] for i in ci]; df["clip_conf"] = Pc.max(1).round(3)
    pl_m, pl_c = Pm[np.arange(len(y)), y], Pc[np.arange(len(y)), y]
    relabel = (mi == ci) & (mi != y) & (Pm.max(1) >= 0.6) & (Pc.max(1) >= 0.5)
    reject = (~relabel) & (mi != y) & (ci != y) & (pl_m < 0.15) & (pl_c < 0.15)
    df["action"] = np.where(relabel, "relabel", np.where(reject, "drop", "keep"))
    df["new_cls"] = np.where(relabel, df.model_pred, df.cls)
    df.to_csv("data/audit.csv", index=False)
    print(df.groupby(["source", "action"]).size().unstack(fill_value=0).to_string())
    print(df[df.action == "relabel"].groupby(["source", "cls", "new_cls"]).size().to_string())
    return df


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


def any_object(im):
    return any(best_box(im, k, 0.2) for k in ["ewaste_hazard", "rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass"])


def clean(a):
    out, stats = [], {}
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
            b = best_box(im, "ewaste_hazard", thr=0.2)
            if b is None:
                stats["haz_nobox_" + r.source] = stats.get("haz_nobox_" + r.source, 0) + 1; continue
            c = crop(im, b[:4])
            p = clip_probs([c])[0]
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


if __name__ == "__main__":
    manifest = sys.argv[1] if len(sys.argv) > 1 else "data/manifest_all.csv"
    weights = sys.argv[2] if len(sys.argv) > 2 else "../weights/best.weights.h5"
    clean(audit(manifest, weights))
