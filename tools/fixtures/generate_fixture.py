#!/usr/bin/env python3
"""Gera a fixture offline "Demo District" (tools/fixtures/demo-district.geojson).

Distrito urbano procedural determinístico inspirado em Komaki (Aichi, Japão):
malha viária em grade, ~70 edifícios com alturas variadas e três ou mais
categorias, rio, lago, áreas de uso do solo e limite administrativo.
Sem dependências externas — somente stdlib.
"""

import json
import random

RNG = random.Random(20260716)

# Centro aproximado de Komaki, Aichi.
LON0, LAT0 = 136.9080, 35.2880
M_PER_DEG_LAT = 111_320.0
M_PER_DEG_LON = 90_860.0  # cos(35.29°) * 111320

BLOCK_M = 120.0
N_BLOCKS = 5
DLAT = BLOCK_M / M_PER_DEG_LAT
DLON = BLOCK_M / M_PER_DEG_LON


def lon(i: float) -> float:
    return round(LON0 + i * DLON, 7)


def lat(j: float) -> float:
    return round(LAT0 + j * DLAT, 7)


features = []


def feature(geometry, props):
    features.append({"type": "Feature", "properties": props, "geometry": geometry})


def rect(i0, j0, i1, j1):
    return {
        "type": "Polygon",
        "coordinates": [[
            [lon(i0), lat(j0)], [lon(i1), lat(j0)], [lon(i1), lat(j1)],
            [lon(i0), lat(j1)], [lon(i0), lat(j0)],
        ]],
    }


def line(points):
    return {"type": "LineString", "coordinates": [[lon(i), lat(j)] for i, j in points]}


# ---------------------------------------------------------------- boundary
feature(rect(-0.35, -0.35, N_BLOCKS + 0.35, N_BLOCKS + 0.35), {
    "sos:kind": "boundary",
    "name": "Demo District",
})

# ---------------------------------------------------------------- roads
for k in range(N_BLOCKS + 1):
    cls = "primary" if k == 2 else "residential"
    feature(line([(k, -0.3), (k, N_BLOCKS + 0.3)]), {
        "id": f"road-ns-{k}",
        "highway": cls,
        "name": f"North Avenue {k + 1}" if cls == "primary" else f"NS Street {k + 1}",
        "lanes": "4" if cls == "primary" else "2",
    })
    feature(line([(-0.3, k), (N_BLOCKS + 0.3, k)]), {
        "id": f"road-ew-{k}",
        "highway": "secondary" if k == 2 else "residential",
        "name": f"Central Boulevard" if k == 2 else f"EW Street {k + 1}",
        "lanes": "4" if k == 2 else "2",
    })

# Ponte sobre o rio na avenida central (leste).
feature(line([(N_BLOCKS + 0.3, 2), (N_BLOCKS + 0.85, 2)]), {
    "id": "road-bridge-east",
    "highway": "secondary",
    "name": "River Bridge",
    "bridge": "yes",
    "lanes": "2",
})

# Ferrovia ao sul.
feature(line([(-0.3, -0.22), (N_BLOCKS + 0.85, -0.22)]), {
    "id": "rail-south",
    "railway": "rail",
    "name": "Demo Line",
})

# ---------------------------------------------------------------- water
# Rio na borda leste (polígono) + linha de waterway.
feature(rect(N_BLOCKS + 0.45, -0.35, N_BLOCKS + 0.70, N_BLOCKS + 0.35), {
    "id": "river-east",
    "natural": "water",
    "water": "river",
    "name": "Demo River",
})
feature(line([(N_BLOCKS + 0.575, -0.35), (N_BLOCKS + 0.575, N_BLOCKS + 0.35)]), {
    "id": "waterway-east",
    "waterway": "river",
    "name": "Demo River",
})
# Lago no parque (noroeste).
feature(rect(0.25, 4.25, 0.75, 4.72), {
    "id": "pond-park",
    "natural": "water",
    "water": "pond",
    "name": "Park Pond",
})

# ---------------------------------------------------------------- land use
feature(rect(0, 4, 1, 5), {"id": "lu-park", "leisure": "park", "name": "North Park"})
feature(rect(1.02, 4.02, 3, 5), {"id": "lu-res-n", "landuse": "residential"})
feature(rect(0, 0, 2, 2), {"id": "lu-ind", "landuse": "industrial"})
feature(rect(2.02, 0, 5, 2), {"id": "lu-com", "landuse": "commercial"})
feature(rect(0, 2.02, 5, 3.98), {"id": "lu-res-c", "landuse": "residential"})

# ---------------------------------------------------------------- buildings
MARGIN = 0.10  # afastamento da rua, em frações de quadra
building_seq = 0


def add_building(i0, j0, i1, j1, props):
    global building_seq
    building_seq += 1
    props = {"id": f"bldg-{building_seq:03d}", **props}
    feature(rect(i0, j0, i1, j1), props)


def subdivide(bi, bj, count):
    """Divide a quadra (bi..bi+1, bj..bj+1) em `count` lotes horizontais."""
    usable = 1.0 - 2 * MARGIN
    lots = []
    width = usable / count
    for k in range(count):
        x0 = bi + MARGIN + k * width + 0.02
        x1 = bi + MARGIN + (k + 1) * width - 0.02
        depth = RNG.uniform(0.45, usable)
        y0 = bj + MARGIN
        y1 = y0 + depth
        lots.append((x0, y0, x1, y1))
    return lots


for bi in range(N_BLOCKS):
    for bj in range(N_BLOCKS):
        in_park = bi == 0 and bj == 4
        if in_park:
            continue  # o parque tem apenas um pavilhão, adicionado depois

        industrial = bi < 2 and bj < 2
        commercial = bi >= 2 and bj < 2
        count = 2 if industrial else RNG.choice([2, 3, 3])
        for (x0, y0, x1, y1) in subdivide(bi, bj, count):
            if industrial:
                levels = RNG.choice([1, 1, 2])
                add_building(x0, y0, x1, y1, {
                    "building": RNG.choice(["industrial", "warehouse"]),
                    "building:levels": str(levels),
                })
            elif commercial:
                if RNG.random() < 0.35:
                    add_building(x0, y0, x1, y1, {
                        "building": "commercial",
                        "height": str(RNG.choice([18, 24, 30, 36])),
                        "building:levels": str(RNG.choice([5, 6, 8, 10])),
                        "name": f"Office Tower {building_seq + 1}",
                    })
                else:
                    add_building(x0, y0, x1, y1, {
                        "building": "retail",
                        "building:levels": str(RNG.choice([2, 3, 4])),
                    })
            else:
                roll = RNG.random()
                if roll < 0.70:
                    add_building(x0, y0, x1, y1, {
                        "building": RNG.choice(["house", "residential", "apartments"]),
                        "building:levels": str(RNG.choice([1, 2, 2, 3, 5])),
                        "roof:levels": "1" if RNG.random() < 0.3 else "0",
                        "roof:shape": RNG.choice(["flat", "gabled"]),
                    })
                elif roll < 0.85:
                    # Sem altura: exercita o fallback de altura padrão.
                    add_building(x0, y0, x1, y1, {"building": "yes"})
                else:
                    add_building(x0, y0, x1, y1, {
                        "building": "apartments",
                        "height": str(RNG.choice([15, 21, 27])),
                    })

# Equipamentos públicos com posições fixas.
add_building(3.15, 3.15, 3.85, 3.80, {
    "building": "hospital", "amenity": "hospital", "name": "Demo General Hospital",
    "height": "22", "building:levels": "6",
})
add_building(1.15, 3.15, 1.80, 3.80, {
    "building": "school", "amenity": "school", "name": "Demo Elementary School",
    "building:levels": "3",
})
add_building(4.15, 3.20, 4.80, 3.78, {
    "building": "school", "amenity": "university", "name": "Demo Technical College",
    "building:levels": "4",
})
add_building(2.20, 2.20, 2.80, 2.80, {
    "building": "public", "amenity": "townhall", "name": "Demo City Hall",
    "height": "16",
})
add_building(0.30, 4.78, 0.70, 4.95, {
    "building": "public", "name": "Park Pavilion",
})

collection = {"type": "FeatureCollection", "features": features}

out = __file__.replace("generate_fixture.py", "demo-district.geojson")
with open(out, "w") as fh:
    json.dump(collection, fh, indent=1)

buildings = sum(1 for f in features if "building" in f["properties"])
roads = sum(1 for f in features if "highway" in f["properties"] or "railway" in f["properties"])
water = sum(1 for f in features if f["properties"].get("natural") == "water"
            or "waterway" in f["properties"])
print(f"features={len(features)} buildings={buildings} roads={roads} water={water}")
