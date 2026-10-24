import os, sys, json, subprocess, shutil
os.environ["KERAS_BACKEND"] = "tensorflow"
import numpy as np, keras, tensorflow as tf

W, OUTDIR = sys.argv[1], sys.argv[2]
IMG = int(os.environ.get("DG_IMG", 224))
base = keras.applications.MobileNetV3Large(input_shape=(IMG, IMG, 3), include_top=False, weights=None,
                                           include_preprocessing=True, pooling="avg")
x = keras.layers.Dropout(0.3)(base.output)
out = keras.layers.Dense(7, activation="softmax", name="probs")(x)
model = keras.Model(base.input, out)
model.load_weights(W)
sm = OUTDIR + "_savedmodel"
shutil.rmtree(sm, ignore_errors=True)
model.export(sm)
shutil.rmtree(OUTDIR, ignore_errors=True)
exe = os.path.join(os.path.dirname(sys.executable), "tensorflowjs_converter.exe")
subprocess.check_call([exe, "--input_format=tf_saved_model", "--output_format=tfjs_graph_model",
                       "--quantize_float16=*", sm, OUTDIR])
print("tfjs size MB:", sum(os.path.getsize(os.path.join(OUTDIR, f)) for f in os.listdir(OUTDIR)) / 1e6)
