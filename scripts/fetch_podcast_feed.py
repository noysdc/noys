#!/usr/bin/env python3
"""
NOYS - خواندن فید RSS پادکست و ساختن _data/podcasts_feed.json
هر اپیزود: title, date, iso, number, duration, desc, img, audio, link
فقط کتابخانه‌های استاندارد پایتون؛ نیازی به نصب چیزی نیست.
"""
import json
import re
import sys
import html
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

FEED_URL = "https://api.rabt.host/podcasts/f341ce22-a0e2-40fe-9ae1-d53b166c753b/rss"
OUT = "_data/podcasts_feed.json"
NS = {"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"}
TZ = ZoneInfo("Asia/Tehran")

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; NOYS-feed-bot)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def text(el):
    return (el.text or "").strip() if el is not None else ""


def clean_title(s):
    # حذف کاراکترهای نامرئی (فاصله‌ی صفر‌عرض و BOM) که گاهی اول عنوان می‌چسبن
    return re.sub(r"[\u200b\ufeff]", "", s or "").strip()


def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def main():
    root = ET.fromstring(fetch(FEED_URL))
    ch = root.find("channel")
    if ch is None:
        sys.exit("فید معتبر نیست (channel پیدا نشد)")

    ch_img = ""
    el = ch.find("itunes:image", NS)
    if el is not None:
        ch_img = el.get("href", "")
    if not ch_img:
        ch_img = text(ch.find("image/url"))

    episodes = []
    for it in ch.findall("item"):
        title = clean_title(text(it.find("title")))
        if not title:
            continue
        pub = text(it.find("pubDate"))
        try:
            dt = parsedate_to_datetime(pub).astimezone(TZ)
            date, iso = dt.strftime("%Y/%m/%d"), dt.isoformat()
        except Exception:
            date, iso = "", ""
        enc = it.find("enclosure")
        audio = enc.get("url", "") if enc is not None else ""
        img_el = it.find("itunes:image", NS)
        img = (img_el.get("href", "") if img_el is not None else "") or ch_img
        link = text(it.find("link"))
        raw_desc = text(it.find("description"))

        desc = strip_tags(raw_desc)
        if len(desc) > 220:
            desc = desc[:217].rstrip() + "…"

        episodes.append({
            "title": title,
            "date": date,
            "iso": iso,
            "number": text(it.find("itunes:episode", NS)),
            "duration": text(it.find("itunes:duration", NS)),
            "desc": desc,
            "img": img,
            "audio": audio,
            "link": link,
        })

    if not episodes:
        sys.exit("هیچ اپیزودی در فید پیدا نشد؛ فایل قبلی دست‌نخورده ماند")

    episodes.sort(key=lambda e: e["iso"], reverse=True)
    new = json.dumps(episodes, ensure_ascii=False, indent=2) + "\n"

    try:
        old = open(OUT, encoding="utf-8").read()
    except FileNotFoundError:
        old = ""
    if new != old:
        with open(OUT, "w", encoding="utf-8") as f:
            f.write(new)
        print("به‌روز شد:", len(episodes), "اپیزود")
    else:
        print("تغییری نبود")


if __name__ == "__main__":
    main()
