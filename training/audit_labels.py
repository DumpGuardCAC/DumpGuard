import os, sys
os.environ["KERAS_BACKEND"] = "torch"
import numpy as np, pandas as pd
from PIL import Image
import keras
import zs

MAN = sys.argv[1] if len(sys.argv) > 1 else "data/manifest_all.csv"
W = sys.argv[2] if len(sys.argv) > 2 else "../public_model/weights/best.weights.h5"
df = pd.read_csv(MAN)
CL = zs.CLASSES

base = keras.applications.MobileNetV3Large(input_shape=(224, 224, 3), include_top=False, weights=None, include_preprocessing=True, pooling="avg")
m = keras.Model(base.input, keras.layers.Dense(7, activation="softmax", name="probs")(keras.layers.Dropout(0.3)(base.output)))
m.load_weights(W)

Pm, Pc = [], []
B = 128
for i in range(0, len(df), B):
    ims = [Image.open(p).convert("RGB") for p in df.path[i:i + B]]
    Pc.append(zs.clip_probs(ims))
    X = np.stack([np.asarray(im.resize((224, 224), Image.BILINEAR), dtype="float32") for im in ims])
    Pm.append(np.asarray(m.predict_on_batch(X)))
    if (i // B) % 20 == 0:
        print(i, len(df), flush=True)
Pm, Pc = np.concatenate(Pm), np.concatenate(Pc)
y = df.cls.map({c: i for i, c in enumerate(CL)}).values
mi, ci = Pm.argmax(1), Pc.argmax(1)
df["model_pred"] = [CL[i] for i in mi]; df["model_conf"] = Pm.max(1).round(3)
df["clip_pred"] = [CL[i] for i in ci]; df["clip_conf"] = Pc.max(1).round(3)
pl_m, pl_c = Pm[np.arange(len(y)), y], Pc[np.arange(len(y)), y]
relabel = (mi == ci) & (mi != y) & (Pm.max(1) >= 0.6) & (Pc.max(1) >= 0.5)
reject = (~relabel) & (mi != y) & (ci != y) & (pl_m < 0.15) & (pl_c < 0.15)
df["action"] = np.where(relabel, "relabel", np.where(reject, "drop", "keep"))
df["new_cls"] = np.where(relabel, df.model_pred, df.cls)
df.to_csv("data/audit.csv", index=False)
print(df.groupby(["source", "action"]).size().unstack(fill_value=0).to_string())
print(df[df.action == "relabel"].groupby(["source", "cls", "new_cls"]).size().to_string())
