import os, random, subprocess, zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import requests
from huggingface_hub import snapshot_download, hf_hub_download

D = "data"
O = f"{D}/openimages"
os.makedirs(D, exist_ok=True)

hf_hub_download("garythung/trashnet", "dataset-resized.zip", repo_type="dataset", local_dir=f"{D}/trashnet")
zipfile.ZipFile(f"{D}/trashnet/dataset-resized.zip").extractall(f"{D}/trashnet")
print("trashnet done", flush=True)

snapshot_download("RandyHuynh5815/TACO-Waste-Recognition", repo_type="dataset", local_dir=f"{D}/taco", max_workers=8)
print("taco done", flush=True)

snapshot_download("GIZ/e-waste-dataset-COCO-labels", repo_type="dataset", local_dir=f"{D}/giz_ewaste", max_workers=8)
print("giz done", flush=True)

hf_hub_download("UdaraChamidu/Garbage-Classification-with-12-classes", "garbage_classification.zip", repo_type="dataset", local_dir=f"{D}/garbage12")
zipfile.ZipFile(f"{D}/garbage12/garbage_classification.zip").extractall(f"{D}/garbage12")
print("garbage12 done", flush=True)

os.makedirs(O, exist_ok=True)
for f in ["oidv7-class-descriptions.csv", "oidv7-test-annotations-human-imagelabels.csv"]:
    subprocess.check_call(["curl", "-sS", "-L", "-o", f"{O}/{f}", f"https://storage.googleapis.com/openimages/v7/{f}"])
print("oi csv done", flush=True)

random.seed(0)
class_ids = pd.read_csv(f"{O}/oidv7-class-descriptions.csv", header=None, names=["id", "name"]).set_index("name")["id"].to_dict()
labels = pd.read_csv(f"{O}/oidv7-test-annotations-human-imagelabels.csv")
labels = labels[labels.Confidence == 1]
labels_by_image = labels.groupby("ImageID")["LabelName"].apply(set)


def ids(names):
    return {class_ids[n] for n in names if n in class_ids}


hazard = {"Battery", "Light bulb", "Incandescent light bulb", "Fluorescent lamp", "Compact fluorescent lamp", "Mobile phone", "Laptop", "Motherboard", "Battery charger", "Remote control", "Computer keyboard", "Printer", "Headphones", "Calculator", "Television", "Camera"}
background_ok = {"Table", "Countertop", "Floor", "Wall", "Desk", "Human hand", "Human face", "Person", "Tree", "Building", "Sky", "Grass", "Road", "Plant", "Furniture", "Kitchen", "Room", "Street", "Footwear", "Clothing", "Dog", "Cat", "Car", "Window", "Door", "Chair", "Couch", "Carpet"}
background_bad = {"Bottle", "Can", "Tin can", "Box", "Cup", "Plastic bag", "Packaged goods", "Drink", "Food", "Container", "Glass", "Waste container", "Jar", "Mug", "Coffee cup", "Wine glass", "Beer", "Packaging and labeling", "Paper", "Cardboard", "Mobile phone", "Laptop", "Computer", "Television", "Battery", "Light bulb", "Tableware", "Bowl", "Plate", "Wine", "Soft drink", "Water bottle", "Cocktail", "Juice", "Milk", "Fast food", "Snack", "Candy"}
hazard_ids, ok_ids, bad_ids = ids(hazard), ids(background_ok), ids(background_bad)

hazard_images = {}
background_images = []
for image_id, found in labels_by_image.items():
    hits = found & hazard_ids
    if hits:
        hazard_images[image_id] = hits
    elif found & ok_ids and not found & bad_ids:
        background_images.append(image_id)
print("hazard", len(hazard_images), "bg candidates", len(background_images))
print(Counter(name for hits in hazard_images.values() for name in hits))
random.shuffle(background_images)
background_images = background_images[:1800]


def download(job):
    image_id, sub = job
    path = f"{O}/img/{sub}/{image_id}.jpg"
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        r = requests.get(f"https://open-images-dataset.s3.amazonaws.com/test/{image_id}.jpg", timeout=30)
        if r.status_code == 200:
            open(path, "wb").write(r.content)
    except Exception:
        pass


jobs = [(i, "hazard") for i in hazard_images] + [(i, "background") for i in background_images]
with ThreadPoolExecutor(16) as ex:
    list(ex.map(download, jobs))
print("done")
