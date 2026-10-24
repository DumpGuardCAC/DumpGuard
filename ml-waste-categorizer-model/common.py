from PIL import Image

CLASSES = ["rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass", "ewaste_hazard", "no_object"]
C2I = {c: i for i, c in enumerate(CLASSES)}


def square_crop(im, box=None, size=256, pad=1.2, min_side=96):
    W, H = im.size
    if box is None:
        side = min(W, H)
        cx, cy = W / 2, H / 2
    else:
        x, y, w, h = box
        side = min(max(max(w, h) * pad, min_side), min(W, H))
        cx, cy = x + w / 2, y + h / 2
    x0 = min(max(cx - side / 2, 0), W - side)
    y0 = min(max(cy - side / 2, 0), H - side)
    return im.crop((int(x0), int(y0), int(x0 + side), int(y0 + side))).resize((size, size), Image.BICUBIC)
