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
