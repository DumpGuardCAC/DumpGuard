# Step 1: download every source dataset (TrashNet, TACO, GIZ e-waste, Garbage12, Open Images labels), then fetch the Open Images hazard and background photos.
import os, subprocess, sys, zipfile
from huggingface_hub import snapshot_download, hf_hub_download
D = "data"
os.makedirs(D, exist_ok=True)
hf_hub_download("garythung/trashnet", "dataset-resized.zip", repo_type="dataset", local_dir=f"{D}/trashnet")
zipfile.ZipFile(f"{D}/trashnet/dataset-resized.zip").extractall(f"{D}/trashnet"); print("trashnet done", flush=True)
snapshot_download("RandyHuynh5815/TACO-Waste-Recognition", repo_type="dataset", local_dir=f"{D}/taco", max_workers=8); print("taco done", flush=True)
snapshot_download("GIZ/e-waste-dataset-COCO-labels", repo_type="dataset", local_dir=f"{D}/giz_ewaste", max_workers=8); print("giz done", flush=True)
hf_hub_download("UdaraChamidu/Garbage-Classification-with-12-classes", "garbage_classification.zip", repo_type="dataset", local_dir=f"{D}/garbage12")
zipfile.ZipFile(f"{D}/garbage12/garbage_classification.zip").extractall(f"{D}/garbage12"); print("garbage12 done", flush=True)
os.makedirs(f"{D}/openimages", exist_ok=True)
for f in ["oidv7-class-descriptions.csv", "oidv7-test-annotations-human-imagelabels.csv"]:
    subprocess.check_call(["curl", "-sS", "-L", "-o", f"{D}/openimages/{f}", f"https://storage.googleapis.com/openimages/v7/{f}"])
print("oi csv done", flush=True)

# Open Images hazard and background photos
import pandas as pd, random, os, requests
from concurrent.futures import ThreadPoolExecutor
random.seed(0)
O="data/openimages"
cd=pd.read_csv(f"{O}/oidv7-class-descriptions.csv",header=None,names=["id","name"]).set_index("name")["id"].to_dict()
lab=pd.read_csv(f"{O}/oidv7-test-annotations-human-imagelabels.csv")
lab=lab[lab.Confidence==1]
g=lab.groupby("ImageID")["LabelName"].apply(set)
def ids(names): return {cd[n] for n in names if n in cd}
haz={"Battery","Light bulb","Incandescent light bulb","Fluorescent lamp","Compact fluorescent lamp","Mobile phone","Laptop","Motherboard","Battery charger","Remote control","Computer keyboard","Printer","Headphones","Calculator","Television","Camera"}
bg_pos={"Table","Countertop","Floor","Wall","Desk","Human hand","Human face","Person","Tree","Building","Sky","Grass","Road","Plant","Furniture","Kitchen","Room","Street","Footwear","Clothing","Dog","Cat","Car","Window","Door","Chair","Couch","Carpet"}
bg_neg={"Bottle","Can","Tin can","Box","Cup","Plastic bag","Packaged goods","Drink","Food","Container","Glass","Waste container","Jar","Mug","Coffee cup","Wine glass","Beer","Packaging and labeling","Paper","Cardboard","Mobile phone","Laptop","Computer","Television","Battery","Light bulb","Tableware","Bowl","Plate","Wine","Soft drink","Water bottle","Cocktail","Juice","Milk","Fast food","Snack","Candy"}
H,P,N=ids(haz),ids(bg_pos),ids(bg_neg)
hazimg={};bgimg=[]
for iid,s in g.items():
    hs=s&H
    if hs: hazimg[iid]=hs
    elif s&P and not (s&N): bgimg.append(iid)
print("hazard",len(hazimg),"bg candidates",len(bgimg))
from collections import Counter
print(Counter(cd_n for s in hazimg.values() for cd_n in s))
random.shuffle(bgimg); bgimg=bgimg[:1800]
def get(job):
    iid,sub=job
    p=f"{O}/img/{sub}/{iid}.jpg"
    if os.path.exists(p): return
    os.makedirs(os.path.dirname(p),exist_ok=True)
    try:
        r=requests.get(f"https://open-images-dataset.s3.amazonaws.com/test/{iid}.jpg",timeout=30)
        if r.status_code==200: open(p,"wb").write(r.content)
    except Exception as e: pass
jobs=[(i,"hazard") for i in hazimg]+[(i,"background") for i in bgimg]
with ThreadPoolExecutor(16) as ex: list(ex.map(get,jobs))
print("done")
