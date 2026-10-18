import re
import urllib.request

req = urllib.request.Request(
    "https://www.carteret.net/publicworks/",
    headers={"User-Agent": "Mozilla/5.0"},
)
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
for m in re.findall(r'href=["\']([^"\']+)["\']', html):
    if any(k in m.lower() for k in ["map", "district", "sanitation", "recycl", "calendar"]):
        print(m)
