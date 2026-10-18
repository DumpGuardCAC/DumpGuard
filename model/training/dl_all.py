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
