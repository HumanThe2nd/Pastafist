import requests
import json

# Example: Kingston
LAT = 44.2334
LON = -76.4930
RADIUS = 5000  # meters

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

query = f"""
[out:json][timeout:25];
(
  node["shop"~"supermarket|grocery|convenience"](around:{RADIUS},{LAT},{LON});
  way["shop"~"supermarket|grocery|convenience"](around:{RADIUS},{LAT},{LON});
  relation["shop"~"supermarket|grocery|convenience"](around:{RADIUS},{LAT},{LON});

  node["amenity"="marketplace"](around:{RADIUS},{LAT},{LON});
);
out center tags;
"""


response = requests.post(OVERPASS_URL, data=query)
response.raise_for_status()

data = response.json()

stores = []

for el in data["elements"]:
    tags = el.get("tags", {})
    lat = el.get("lat") or el.get("center", {}).get("lat")
    lon = el.get("lon") or el.get("center", {}).get("lon")

    if not lat or not lon:
        continue

    stores.append({
        "name": tags.get("name", "Unknown Store"),
        "lat": lat,
        "lng": lon,
        "brand": tags.get("brand"),
        "operator": tags.get("operator"),
        "source": "OpenStreetMap"
    })

with open(f"data/stores.json", "w", encoding="utf-8") as f:
    json.dump(stores, f, indent=2)

print(f"Saved {len(stores)} stores")
