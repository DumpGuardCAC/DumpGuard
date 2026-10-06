import os, sys, json
os.environ["KERAS_BACKEND"] = "torch"
import numpy as np, pandas as pd, torch, keras
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, classification_report
import train as T

RUN = sys.argv[1]
CL = T.CLASSES
IMG = T.IMG


def build():
    base = keras.applications.MobileNetV3Large(input_shape=(IMG, IMG, 3), include_top=False, weights=None,
                                               include_preprocessing=True, pooling="avg")
    x = keras.layers.Dropout(0.3)(base.output)
    return keras.Model(base.input, keras.layers.Dense(7, activation="softmax", name="probs")(x))


def predict(model, split):
    d = T.df[T.df.split == split]
    dl = T.DataLoader(T.DS(d, False), batch_size=128, shuffle=False, num_workers=6)
    P = np.concatenate([model.predict_on_batch(b[0].numpy()) for b in dl])
    return np.asarray(P, dtype=np.float64), np.array([T.C2I[c] for c in d.cls])


def nll_T(P, y, t):
    L = np.log(np.clip(P, 1e-9, 1)) / t
    L -= L.max(1, keepdims=True)
    Q = np.exp(L)
    Q /= Q.sum(1, keepdims=True)
    return -np.log(Q[np.arange(len(y)), y] + 1e-12).mean(), Q


def main():
    model = build()
    model.load_weights(f"{RUN}/best.weights.h5")
    res, out = {}, {}
    Pv, yv = predict(model, "val")
    temps = np.arange(0.5, 3.01, 0.05)
    Tbest = float(temps[np.argmin([nll_T(Pv, yv, t)[0] for t in temps])])
    res["temperature"] = round(Tbest, 2)
    for split in ["val", "test_id", "ext_test"]:
        P, y = predict(model, split)
        _, Q = nll_T(P, y, Tbest)
        pred = Q.argmax(1)
        conf = Q.max(1)
        present = sorted(set(y))
        acc = float((pred == y).mean())
        keep = conf >= 0.65
        cm = confusion_matrix(y, pred, labels=range(7))
        rec = {CL[i]: round(float(cm[i, i] / max(cm[i].sum(), 1)), 3) for i in present}
        res[split] = dict(n=int(len(y)), accuracy=round(acc, 4), recall=rec,
                          frac_above_65=round(float(keep.mean()), 3),
                          acc_above_65=round(float((pred[keep] == y[keep]).mean()), 4) if keep.any() else None)
        fig, ax = plt.subplots(figsize=(7, 6))
        cmn = cm / np.maximum(cm.sum(1, keepdims=True), 1)
        ax.imshow(cmn, cmap="Greys", vmin=0, vmax=1)
        ax.set_xticks(range(7)); ax.set_yticks(range(7))
        ax.set_xticklabels(CL, rotation=45, ha="right"); ax.set_yticklabels(CL)
        for i in range(7):
            for j in range(7):
                if cm[i, j]:
                    ax.text(j, i, cm[i, j], ha="center", va="center", color="white" if cmn[i, j] > .5 else "black", fontsize=8)
        ax.set_xlabel("predicted"); ax.set_ylabel("true"); ax.set_title(f"{split} (acc {acc:.3f})")
        fig.tight_layout(); fig.savefig(f"{RUN}/cm_{split}.png", dpi=130); plt.close(fig)
        print(split, json.dumps(res[split]))
        print(classification_report(y, pred, labels=present, target_names=[CL[i] for i in present], digits=3))
    json.dump(res, open(f"{RUN}/report.json", "w"), indent=2)


if __name__ == "__main__":
    main()
