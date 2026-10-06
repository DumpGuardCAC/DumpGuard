import torch, numpy as np
from PIL import Image
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
