import os, sys, json, math
os.environ["KERAS_BACKEND"] = "torch"
import numpy as np, pandas as pd, torch, keras
from PIL import Image
from torch.utils.data import Dataset, DataLoader
from torchvision.transforms import v2 as T

SMOKE = "--smoke" in sys.argv
CLASSES = ["rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass", "ewaste_hazard", "no_object"]
C2I = {c: i for i, c in enumerate(CLASSES)}
IMG = int(os.environ.get("DG_IMG", 224))
MAN = os.environ.get("DG_MANIFEST", "data/manifest.csv")
BS = 64
OUT = next((a for a in sys.argv[1:] if not a.startswith("--")), "out/run1")
os.makedirs(OUT, exist_ok=True)
keras.utils.set_random_seed(0)
keras.mixed_precision.set_global_policy("mixed_bfloat16")

df = pd.read_csv(MAN)
if SMOKE:
    df = df.groupby(["split", "cls"]).sample(frac=1, random_state=0).groupby(["split", "cls"]).head(20)

train_tf = T.Compose([
    T.RandomResizedCrop(IMG, scale=(0.45, 1.0), ratio=(0.75, 1.33), antialias=True),
    T.RandomHorizontalFlip(),
    T.RandomApply([T.RandomRotation(25)], p=0.5),
    T.ColorJitter(brightness=(0.25, 1.35), contrast=(0.6, 1.4), saturation=(0.5, 1.4), hue=0.04),
    T.RandomGrayscale(0.05),
    T.RandomApply([T.GaussianBlur(5, sigma=(0.1, 2.0))], p=0.25),
])
eval_tf = T.Compose([T.Resize((IMG, IMG), antialias=True)])


class DS(Dataset):
    def __init__(self, d, aug, cw=None):
        self.cw = cw
        self.p = d.path.tolist()
        self.y = [C2I[c] for c in d.cls]
        self.aug = aug

    def __len__(self):
        return len(self.p)

    def __getitem__(self, i):
        im = Image.open(self.p[i]).convert("RGB")
        x = torch.from_numpy(np.asarray(im)).permute(2, 0, 1)
        x = (train_tf if self.aug else eval_tf)(x)
        if self.aug and torch.rand(1) < 0.2:
            x = (x.float() + torch.randn(x.shape) * 8).clamp(0, 255).to(torch.uint8)
        w = self.cw[self.y[i]] if self.aug else 1.0
        return x.permute(1, 2, 0).float(), self.y[i], torch.tensor(w, dtype=torch.float32)


class Prog(keras.callbacks.Callback):
    def on_train_batch_end(self, batch, logs=None):
        if batch % 25 == 0:
            print("  batch", batch, {k: round(float(v), 3) for k, v in (logs or {}).items()}, flush=True)


def _winit(_):
    torch.set_num_threads(1)
    import cv2


def loader(split, aug, shuffle, cw=None):
    d = df[df.split == split]
    return DataLoader(DS(d, aug, cw), batch_size=BS, shuffle=shuffle, num_workers=0 if SMOKE else 8,
                      persistent_workers=not SMOKE, drop_last=aug, worker_init_fn=_winit,
                      prefetch_factor=None if SMOKE else 4)


def main():
    counts = df[df.split == "train"].cls.value_counts()
    cw = {C2I[c]: float(len(df[df.split == "train"]) / (len(CLASSES) * counts[c])) for c in CLASSES}
    cw = {k: min(v, 3.0) for k, v in cw.items()}
    tr, va = loader("train", True, True, cw), loader("val", False, False)
    print("train", len(tr.dataset), "val", len(va.dataset), "class weights", {CLASSES[k]: round(v, 2) for k, v in cw.items()})


    def build():
        base = keras.applications.MobileNetV3Large(input_shape=(IMG, IMG, 3), include_top=False, weights="imagenet",
                                                   include_preprocessing=True, pooling="avg", minimalistic=False)
        x = keras.layers.Dropout(0.3)(base.output)
        out = keras.layers.Dense(len(CLASSES), activation="softmax", dtype="float32", name="probs")(x)
        return keras.Model(base.input, out), base


    model, base = build()
    loss = keras.losses.SparseCategoricalCrossentropy()

    E1, E2 = (1, 1) if SMOKE else (4, 14)
    base.trainable = False
    model.compile(optimizer=keras.optimizers.AdamW(1e-3, weight_decay=1e-4), loss=loss, metrics=["accuracy"])
    model.fit(tr, validation_data=va, epochs=E1, callbacks=[Prog()], verbose=2)

    base.trainable = True
    for l in base.layers[:100]:
        l.trainable = False
    for l in base.layers:
        if isinstance(l, keras.layers.BatchNormalization):
            l.trainable = False
    steps = E2 * len(tr)
    lr = keras.optimizers.schedules.CosineDecay(3e-4, steps, alpha=0.02)
    model.compile(optimizer=keras.optimizers.AdamW(lr, weight_decay=1e-4), loss=loss, metrics=["accuracy"])
    cbs = [keras.callbacks.ModelCheckpoint(f"{OUT}/best.weights.h5", save_weights_only=True, monitor="val_accuracy",
                                           mode="max", save_best_only=True),
           keras.callbacks.EarlyStopping(monitor="val_accuracy", mode="max", patience=4, restore_best_weights=True)]
    model.fit(tr, validation_data=va, epochs=E2, callbacks=cbs + [Prog()], verbose=2)
    model.save_weights(f"{OUT}/last.weights.h5")
    json.dump(CLASSES, open(f"{OUT}/labels.json", "w"))
    print("saved")


if __name__ == "__main__":
    main()
