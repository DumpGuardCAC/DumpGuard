"""Rebuild every generated data file in the right order, then validate. Run: python build_all.py"""
import subprocess, sys
from pathlib import Path

D = Path(__file__).parent
STEPS = [
    "build_edison_garbage.py", "build_edison_recycling.py", "build_asburypark_schedule.py", "build_longbranch.py",
    "build_newbrunswick.py", "build_woodbridge.py", "build_woodbridge_zones.py", "build_middlesex_hhw.py",
    "build_facility_geo.py", "build_items_db.py", "validate_items_db.py",
]
for s in STEPS:
    print("==", s)
    subprocess.run([sys.executable, str(D / s)], cwd=D, check=True)
print("== apply_spanish.py")
subprocess.run([sys.executable, "-I", str(D / "apply_spanish.py")], cwd=D, check=True)
