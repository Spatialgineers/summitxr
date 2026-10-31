#!/usr/bin/env python3
"""Etch masks for the Highbot torso pattern.

Each SGX Tile Lab tile (public/pilot/tex/<file>.png, 160 px, its own colors)
becomes a one-channel motif mask (public/pilot/tex/etch/<id>.png, 512 px,
white with the motif in alpha). The bot paints the motif in its own colors, so
the tile's background and colors never reach the avatar.

  background = the most common color of the tile
  motif      = pixels far enough from it (threshold per tile)
  edges      = upscaled with a wrap-around blur, so the shader can cut at 0.5
               and get clean, vector-like edges at any size

Usage: python3 scripts/pilot-etch-masks.py [--sheet out.png]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

SRC = 'public/pilot/tex'
OUT = 'public/pilot/tex/etch'
SIZE = 512

# id: (source tile, threshold on the normalized distance to the background, speck filter)
TILES = {
    'engranajes': ('engranajes-sgx', 0.35, 3),
    'engranaje-g': ('engranaje-g', 0.35, 3),
    'engranajes-entrelazados': ('engranajes-entrelazados', 0.5, 3),
    'rayos': ('rayos-sgx', 0.35, 3),
    'panel-hud': ('panel-hud', 0.45, 0),
    'holodeck': ('reticula-holodeck', 0.3, 0),
    'red-de-energia': ('red-de-energia-sgx', 0.2, 0),
    'lineas-de-energia': ('lineas-de-energia', 0.42, 0),
    'circuito': ('circuito-futurista', 0.35, 0),
    # the Tile Lab hex has faint lines and bright nodes (bubbles when cut): drawn clean instead
    'escudo-hex': ('@hex', 0, 0),
    'zigzag': ('zigzag-sgx', 0.4, 3),
}


def background(rgb: np.ndarray) -> np.ndarray:
    q = (rgb // 24).astype(np.int32)
    key = q[..., 0] * 4096 + q[..., 1] * 64 + q[..., 2]
    vals, counts = np.unique(key, return_counts=True)
    return rgb[key == vals[np.argmax(counts)]].mean(axis=0)


def hex_mask(cols: int = 5, rows: int = 6) -> Image.Image:
    """Pointy-top hex lattice, seamless on a square (5 columns x 6 rows, ~4% squash),
    thin edges with a dot on every vertex, like the energy shield tile."""
    s3 = np.sqrt(3)
    R = 1.0
    w, h = s3 * R * cols, 1.5 * R * rows
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
    px, py = (x + 0.5) / SIZE * w, (y + 0.5) / SIZE * h
    best = np.full(px.shape, np.inf)
    ri = R * s3 / 2
    vert = np.full(px.shape, np.inf)
    j0 = np.floor(py / (1.5 * R)).astype(int)
    for dj in (-1, 0, 1, 2):
        j = j0 + dj
        off = (j % 2) * (s3 * R / 2)
        i = np.round((px - off) / (s3 * R))
        for di in (-1, 0, 1):
            cx, cy = (i + di) * s3 * R + off, j * 1.5 * R
            qx, qy = np.abs(px - cx), np.abs(py - cy)
            hexd = np.maximum(qx, qx * 0.5 + qy * s3 / 2)  # = ri on the edge
            best = np.minimum(best, hexd)
            # the six vertices: (0, ±R) and (±ri, ±R/2)
            for vx, vy in ((0, R), (ri, R / 2)):
                vert = np.minimum(vert, np.hypot(qx - vx, qy - vy))
    edge = np.abs(ri - best)
    px_per = SIZE / w
    line = np.clip((0.055 - edge) * px_per + 0.5, 0, 1)
    dot = np.clip((0.15 - vert) * px_per + 0.5, 0, 1)
    out = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
    out.putalpha(Image.fromarray((np.maximum(line, dot) * 255).astype(np.uint8)))
    return out


def mask_of(file: str, threshold: float, speck: int) -> Image.Image:
    if file == '@hex':
        return hex_mask()
    rgb = np.asarray(Image.open(os.path.join(SRC, file + '.png')).convert('RGB')).astype(np.float32)
    d = np.linalg.norm(rgb - background(rgb), axis=-1)
    d /= max(np.percentile(d, 99), 1e-3)
    m = Image.fromarray(((d > threshold) * 255).astype(np.uint8))
    if speck:
        # drop specks of the brushed backgrounds, keep the motif's shape
        m = m.filter(ImageFilter.MinFilter(speck)).filter(ImageFilter.MaxFilter(speck))
    n = m.size[0]
    # 3x3 so blur and resize wrap around the tile edges, then keep the middle
    big = Image.new('L', (n * 3, n * 3))
    for i in range(3):
        for j in range(3):
            big.paste(m, (i * n, j * n))
    big = big.resize((SIZE * 3, SIZE * 3), Image.LANCZOS).filter(ImageFilter.GaussianBlur(SIZE / n * 0.9))
    alpha = big.crop((SIZE, SIZE, SIZE * 2, SIZE * 2))
    out = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    made = []
    for tid, (file, threshold, speck) in TILES.items():
        img = mask_of(file, threshold, speck)
        img.save(os.path.join(OUT, tid + '.png'), optimize=True)
        made.append((tid, img))
        print(f'{tid:26s} {os.path.getsize(os.path.join(OUT, tid + ".png")) // 1024} KB')
    if '--sheet' in sys.argv:
        # how each mask reads: motif cut at 0.5, two tiles across, on a dark body
        cell = 256
        sheet = Image.new('RGB', (cell * len(made), cell + 24), (20, 22, 26))
        for k, (tid, img) in enumerate(made):
            a = np.asarray(img.split()[3].resize((cell // 2, cell // 2), Image.LANCZOS)) > 127
            tile = np.tile(a, (2, 2))
            px = np.where(tile[..., None], np.array([253, 204, 13]), np.array([60, 64, 70])).astype(np.uint8)
            sheet.paste(Image.fromarray(px), (k * cell, 24))
        sheet.save(sys.argv[sys.argv.index('--sheet') + 1])


if __name__ == '__main__':
    main()
