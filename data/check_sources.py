"""Freshness check for the data. Report only: it never edits towns.json or items_db.json.

  python check_sources.py            fetch every source URL, compare with data/source_hashes.json, list problems
  python check_sources.py --update   same, then save the new hashes as the baseline (do this after a human re-check)
  python check_sources.py --offline  skip the network; only check dates and staleness

Flags:
  CHANGED      page text differs from the baseline, so a human should re-read it and update the rule
  UNREACHABLE  could not fetch (blocked sites like monmouthcountynj.gov stay here; they were read by other means)
  STALE        a verified row is older than STALE_DAYS
  EXPIRING     a dated event list (e.g. Middlesex HHW days) has no future dates left
Exit code 1 when anything is CHANGED, STALE or EXPIRING, so it can run in CI or a scheduled job.
"""
import hashlib, json, re, sys, urllib.request
from datetime import date, timedelta
from pathlib import Path

D = Path(__file__).parent
STALE_DAYS = 180
HASHES = D / "source_hashes.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def urls_and_dates():
    towns = json.loads((D / "towns.json").read_text(encoding="utf8"))
    items = json.loads((D / "items_db.json").read_text(encoding="utf8"))
    found = {}  # url -> oldest last_verified among rows that cite it
    def see(url, verified):
        if not url or not url.startswith("http"):
            return
        old = found.get(url)
        if old is None or (verified and verified < old):
            found[url] = verified or old
    for f in towns["facilities"]:
        see(f.get("source_url"), f.get("last_verified"))
    for s in towns["schedules"]:
        see(s.get("source_url"), s.get("last_verified"))
    for z in towns["zip_codes"]:
        see(z.get("source_url"), None)
    for it in items["items"]:
        for r in it["county_rules"].values():
            see(r.get("source"), r.get("last_verified"))
    return towns, found


def page_text(raw: bytes, ctype: str) -> bytes:
    if "html" in ctype:
        t = raw.decode("utf8", "ignore")
        t = re.sub(r"(?is)<(script|style|noscript|svg|head).*?</\1>", " ", t)
        t = re.sub(r"(?s)<[^>]+>", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t.encode()
    return raw


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=25) as r:
        body = r.read(15_000_000)
        return hashlib.sha256(page_text(body, r.headers.get("content-type", "").lower())).hexdigest()


def main():
    offline = "--offline" in sys.argv
    update = "--update" in sys.argv
    today = date.today()
    towns, urls = urls_and_dates()
    base = json.loads(HASHES.read_text(encoding="utf8")) if HASHES.exists() else {}
    new, problems = {}, []

    for fac in towns["facilities"]:
        ds = [e["date"] for e in fac.get("hours_struct", []) if "date" in e]
        if ds and max(ds) < today.isoformat():
            problems.append(("EXPIRING", fac["key"], f"last event day {max(ds)} has passed; add next year's dates in build_facility_geo.py"))
        elif ds and max(ds) < (today + timedelta(days=45)).isoformat():
            problems.append(("EXPIRING", fac["key"], f"only dates through {max(ds)} left"))

    for url, verified in sorted(urls.items()):
        if verified and (today - date.fromisoformat(verified)).days > STALE_DAYS:
            problems.append(("STALE", url, f"last verified {verified}"))
        if offline:
            continue
        try:
            h = fetch(url)
        except Exception as e:  # noqa: BLE001 - any failure is reported, not raised
            problems.append(("UNREACHABLE", url, str(e)[:80]))
            if url in base:
                new[url] = base[url]
            continue
        new[url] = h
        if url in base and base[url] != h:
            problems.append(("CHANGED", url, "page text differs from the baseline"))
        elif url not in base:
            print("baseline-new", url)

    for kind, what, why in problems:
        print(f"{kind:12} {what}  -- {why}")
    if update and not offline:
        HASHES.write_text(json.dumps(dict(sorted(new.items())), indent=2) + "\n", encoding="utf8")
        print(f"saved {len(new)} hashes to {HASHES.name}")
    print(f"{len(urls)} source URLs, {sum(1 for p in problems if p[0] in ('CHANGED','STALE','EXPIRING'))} need attention")
    sys.exit(1 if any(p[0] in ("CHANGED", "STALE", "EXPIRING") for p in problems) else 0)


if __name__ == "__main__":
    main()
