"""Placeholder pixel-art sprites for Lunatic Town.

Writes PNG files into assets/sprites/ with the exact names and sizes the game loads.
The team can replace any PNG with final art of the SAME size; the game picks it up.
Pure Python (no Pillow). Run:  python tools/make_sprites.py
"""
import os
import random
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites')

# Palette
T = (0, 0, 0, 0)
K = (40, 42, 54, 255)          # outline
ML = (205, 209, 219, 255)      # metal light
M = (152, 157, 170, 255)       # metal
MD = (100, 104, 118, 255)      # metal dark
WH = (228, 231, 238, 255)      # hull white
CE = (60, 62, 72, 255)         # ceramic tiles
CE2 = (78, 80, 92, 255)
PB = (38, 66, 148, 255)        # panel blue
PL = (96, 132, 216, 255)       # panel grid line
PH = (150, 178, 238, 255)      # panel highlight
OR = (255, 150, 60, 255)
YE = (255, 214, 90, 255)
CY = (110, 220, 255, 255)
IC = (190, 232, 255, 255)
GR = (92, 200, 110, 255)
GD = (48, 138, 70, 255)
PK = (240, 110, 200, 255)
BR = (150, 110, 70, 255)
BD = (100, 72, 44, 255)
PU = (190, 140, 255, 255)
PUD = (120, 86, 190, 255)
RD = (255, 90, 90, 255)
LED = (110, 255, 140, 255)
GLASS = (34, 36, 52, 255)
VIS = (222, 170, 60, 255)      # gold visor
VIH = (255, 230, 150, 255)
REG = (154, 157, 166, 255)     # regolith
REGL = (196, 199, 207, 255)
REGD = (120, 123, 132, 255)
ROCK = (93, 96, 106, 255)
ROCKD = (75, 77, 86, 255)
ROCKL = (112, 115, 125, 255)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[T] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def box(self, x, y, w, h, fill, outline=K):
        self.rect(x, y, w, h, outline)
        self.rect(x + 1, y + 1, w - 2, h - 2, fill)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, c)
            if x0 == x1 and y0 == y1:
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def disc(self, cx, cy, r, c):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6:
                    self.set(x, y, c)

    def ascii(self, rows, palette, ox=0, oy=0):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    self.set(ox + x, oy + y, palette[ch])

    def blit(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                if other.px[y][x][3]:
                    self.set(ox + x, oy + y, other.px[y][x])

    def scaled(self, k):
        out = Canvas(self.w * k, self.h * k)
        for y in range(out.h):
            for x in range(out.w):
                out.px[y][x] = self.px[y // k][x // k]
        return out

    def save(self, name):
        raw = b''.join(b'\x00' + b''.join(bytes(p) for p in row) for row in self.px)

        def chunk(tag, data):
            return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', self.w, self.h, 8, 6, 0, 0, 0))
        png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(png)
        print(f'{name:24s} {self.w}x{self.h}')


# ---------- Terrain (16x16 art, saved at 32x32 = one tile) ----------

def ground(top):
    rnd = random.Random(7 if top else 11)
    c = Canvas(16, 16)
    c.rect(0, 0, 16, 16, REG if top else ROCK)
    for _ in range(14):
        c.set(rnd.randrange(16), rnd.randrange(16), REGD if top else ROCKD)
    for _ in range(6):
        c.set(rnd.randrange(16), rnd.randrange(16), REGL if top else ROCKL)
    if top:
        c.rect(0, 0, 16, 2, REGL)
        c.set(3, 2, REGL)
        c.set(11, 2, REGL)
        for (x, y, col) in ((9, 7, REGD), (10, 7, REGD), (8, 8, REGD), (11, 8, REGL), (9, 9, REGL), (10, 9, REGL)):
            c.set(x, y, col)
    return c.scaled(2)


# ---------- Sun (32x32) ----------

def sun():
    c = Canvas(32, 32)
    rnd = random.Random(3)
    for _ in range(40):
        x, y = rnd.randrange(32), rnd.randrange(32)
        d = ((x - 16) ** 2 + (y - 16) ** 2) ** 0.5
        if 12.5 < d < 15.5:
            c.set(x, y, (255, 230, 150, 110))
    c.disc(16, 16, 12, (255, 214, 120, 255))
    c.disc(16, 16, 10, (255, 244, 194, 255))
    c.disc(14, 14, 5, (255, 253, 235, 255))
    return c


# ---------- Astronaut (16x24 frames: idle, walk1, walk2, jump, work1, work2) ----------

ASTRO_PAL = {'K': K, 'W': WH, 'G': (176, 180, 192, 255), 'D': (70, 72, 84, 255), 'B': M,
             'V': VIS, 'v': VIH, 'O': OR, 'Y': YE}
HEAD = [
    '......KKKKK.....',
    '.....KWWWWWK....',
    '....KWWWWWWWK...',
    '...KKWWWVVVVK...',
    '..KBKWWVVvVVK...',
    '..KBKWWVVVVVK...',
    '..KBKWWWVVVWK...',
    '..KBKKWWWWWKK...',
    '..KBBKKKKKKK....',
]
TORSO = [
    '..KBKWWWWWWK....',
    '..KBKWWOOWWWK...',
    '..KBKWWWWWGWK...',
    '..KBKWWWWWGWK...',
    '..KKKWGWWWGWK...',
    '....KWGWWKWWK...',
    '....KWWWWKGK....',
    '....KWWWWWK.....',
    '....KGGGGGK.....',
]
TORSO_WORK1 = [
    '..KBKWWWWWWK....',
    '..KBKWWOOWWWK...',
    '..KBKWWWWWWWKKK.',
    '..KBKWWWWWGGGDK.',
    '..KKKWGWWWKKKKK.',
    '....KWGWWWWK....',
    '....KWWWWWK.....',
    '....KWWWWWK.....',
    '....KGGGGGK.....',
]
TORSO_WORK2 = [
    '..KBKWWWWWWK..Y.',
    '..KBKWWOOWWWKKY.',
    '..KBKWWWWWWWGDK.',
    '..KBKWWWWWWGK...',
    '..KKKWGWWWKK....',
    '....KWGWWWWK....',
    '....KWWWWWK.....',
    '....KWWWWWK.....',
    '....KGGGGGK.....',
]
LEGS_STAND = [
    '....KWWKWWK.....',
    '....KWWKWWK.....',
    '....KWWKWWK.....',
    '....KGWKGWK.....',
    '...KDDDKDDDK....',
    '...KKKKKKKKK....',
]
LEGS_STRIDE = [
    '....KWWKWWK.....',
    '...KWWK.KWWK....',
    '..KWWK...KWWK...',
    '..KGWK...KGWK...',
    '.KDDDK...KDDDK..',
    '.KKKKK...KKKKK..',
]
LEGS_PASS = [
    '....KWWKWWK.....',
    '....KWWWWWK.....',
    '....KWWWWK......',
    '....KGWWGK......',
    '...KDDDDDDK.....',
    '...KKKKKKKK.....',
]
LEGS_JUMP = [
    '....KWWKWWK.....',
    '...KWWK.KWWK....',
    '...KGGK.KGGK....',
    '..KDDDK.KDDDK...',
    '..KKKKK.KKKKK...',
    '................',
]


def astronaut():
    frames = [
        (TORSO, LEGS_STAND, 0),
        (TORSO, LEGS_STRIDE, 0),
        (TORSO, LEGS_PASS, 1),
        (TORSO, LEGS_JUMP, 0),
        (TORSO_WORK1, LEGS_STAND, 0),
        (TORSO_WORK2, LEGS_STAND, 0),
    ]
    sheet = Canvas(16 * len(frames), 24)
    for i, (torso, legs, bob) in enumerate(frames):
        f = Canvas(16, 24)
        rows = HEAD + torso + legs
        f.ascii(rows[: 24 - bob], ASTRO_PAL, 0, bob)
        sheet.blit(f, i * 16, 0)
    return sheet


# ---------- Stations (48x32) ----------

def solar_panels():
    c = Canvas(48, 32)
    c.rect(23, 10, 2, 16, M)
    c.box(17, 23, 14, 9, MD)
    c.set(28, 26, LED)
    c.set(26, 26, LED)
    for x0 in (1, 26):
        c.box(x0, 2, 21, 11, PB)
        for gx in range(x0 + 5, x0 + 20, 5):
            c.line(gx, 3, gx, 11, PL)
        c.line(x0 + 1, 7, x0 + 19, 7, PL)
        c.line(x0 + 1, 3, x0 + 19, 3, PH)
    c.rect(20, 12, 8, 2, MD)
    return c


def oxygenator():
    c = Canvas(48, 32)
    c.box(4, 11, 28, 21, M)
    c.rect(5, 12, 26, 2, ML)
    c.box(11, 18, 12, 8, OR)
    c.rect(14, 20, 6, 4, YE)
    # regolith hopper
    c.line(12, 4, 24, 4, K)
    c.line(12, 4, 15, 11, K)
    c.line(24, 4, 21, 11, K)
    c.rect(14, 5, 9, 2, BR)
    c.rect(15, 7, 7, 3, MD)
    # O2 tank
    c.box(35, 9, 10, 23, WH)
    c.rect(36, 9, 8, 1, K)
    c.rect(36, 18, 8, 2, CY)
    c.rect(32, 15, 3, 2, MD)
    return c


def ice_extractor():
    c = Canvas(48, 32)
    for x in (6, 18):
        c.line(x, 2, x, 31, MD)
    c.line(6, 2, 18, 2, K)
    for y in (8, 16, 24):
        c.line(6, y, 18, y + 6, M)
        c.line(18, y, 6, y + 6, M)
    c.rect(11, 4, 3, 26, K)
    c.rect(12, 5, 1, 24, ML)
    c.box(21, 14, 14, 18, M)
    c.rect(22, 15, 12, 2, ML)
    c.set(32, 19, LED)
    c.box(37, 8, 9, 24, WH)
    c.rect(38, 18, 7, 13, IC)
    c.rect(38, 17, 7, 1, CY)
    c.rect(34, 20, 3, 2, MD)
    return c


def waste_processor():
    c = Canvas(48, 32)
    c.box(3, 12, 30, 20, M)
    c.rect(4, 13, 28, 2, ML)
    c.rect(4, 24, 28, 3, BR)
    c.rect(8, 6, 2, 6, MD)
    c.rect(8, 6, 18, 2, MD)
    c.rect(24, 6, 2, 6, MD)
    c.box(10, 16, 8, 6, GLASS)
    c.set(28, 17, LED)
    c.disc(40, 24, 7, K)
    c.disc(40, 24, 6, BD)
    c.disc(38, 22, 2, BR)
    c.rect(32, 22, 2, 3, MD)
    return c


def hydroponics():
    c = Canvas(48, 32)
    c.box(1, 6, 46, 26, WH)
    c.rect(2, 7, 44, 2, ML)
    c.box(5, 11, 38, 15, GLASS)
    c.rect(6, 12, 36, 1, PK)
    for x in range(8, 42, 5):
        c.set(x, 17, GD)
        c.rect(x - 1, 18, 3, 3, GR)
        c.set(x, 21, GD)
    c.rect(6, 22, 36, 2, BR)
    c.rect(6, 28, 36, 2, CE2)
    return c


def cricket_farm():
    c = Canvas(48, 32)
    c.box(3, 10, 42, 22, ML)
    c.rect(4, 27, 40, 3, YE)
    c.box(7, 13, 26, 12, GLASS)
    for x in range(8, 32, 3):
        c.line(x, 14, x, 23, (60, 62, 78, 255))
    for (x, y) in ((11, 20), (18, 17), (24, 21), (28, 16)):
        c.rect(x, y, 3, 2, BR)
        c.set(x + 3, y - 1, BD)
    c.box(36, 4, 7, 9, M)
    c.rect(37, 5, 5, 2, GD)
    return c


def lab():
    c = Canvas(48, 32)
    c.disc(22, 12, 7, K)
    c.disc(22, 12, 6, PU)
    c.set(20, 8, (240, 225, 255, 255))
    c.box(1, 12, 46, 20, WH)
    c.rect(2, 13, 44, 2, ML)
    for x in (6, 14, 30):
        c.box(x, 18, 6, 5, GLASS)
        c.set(x + 2, 20, PU)
    c.rect(2, 27, 44, 2, PUD)
    c.rect(41, 2, 1, 10, MD)
    c.line(38, 3, 44, 1, M)
    c.line(38, 3, 41, 6, M)
    return c


# ---------- Ships ----------

def ship():
    c = Canvas(96, 48)
    c.line(26, 33, 12, 46, MD)
    c.line(27, 33, 13, 46, M)
    c.line(70, 33, 84, 46, MD)
    c.line(69, 33, 83, 46, M)
    c.rect(8, 46, 9, 2, K)
    c.rect(80, 46, 9, 2, K)
    c.box(41, 34, 14, 9, MD)
    c.rect(43, 42, 10, 2, K)
    c.box(18, 6, 60, 30, WH)
    c.rect(19, 7, 58, 2, ML)
    for x in range(19, 74, 4):          # ceramic tiles band
        c.rect(x, 27, 3, 7, CE)
        c.rect(x + 3, 27, 1, 7, CE2)
    c.box(56, 12, 12, 8, GLASS)
    c.set(58, 14, CY)
    c.rect(24, 13, 14, 2, OR)
    c.rect(30, 0, 1, 6, MD)             # comms antenna
    c.line(27, 1, 33, 1, M)
    return c


def base():
    c = Canvas(96, 48)
    c.box(8, 14, 80, 34, WH)
    c.rect(9, 15, 78, 2, ML)
    for x in range(9, 84, 4):           # ceramic shielding on top
        c.rect(x, 17, 3, 5, CE)
        c.rect(x + 3, 17, 1, 5, CE2)
    c.box(42, 30, 12, 18, MD)
    c.rect(44, 32, 8, 7, GLASS)
    c.set(47, 34, CY)
    for x in (16, 28, 64, 76):
        c.box(x, 27, 7, 6, GLASS)
        c.set(x + 2, 29, YE)
    c.set(12, 25, LED)
    c.set(84, 25, RD)
    return c


def supply_ship():
    c = Canvas(32, 32)
    c.line(9, 20, 2, 30, MD)
    c.line(22, 20, 29, 30, MD)
    c.rect(0, 30, 5, 2, K)
    c.rect(27, 30, 5, 2, K)
    c.box(13, 21, 6, 6, MD)
    c.box(7, 3, 18, 19, WH)
    c.rect(8, 4, 16, 1, ML)
    for x in range(8, 24, 3):
        c.rect(x, 16, 2, 4, CE)
    c.rect(10, 8, 12, 4, YE)
    c.rect(11, 9, 10, 2, BR)
    return c


def shelter():
    """Rows 0-7: regolith berm and hatch above ground. Rows 8-23: the dug pit in cross-section."""
    c = Canvas(48, 24)
    for x in range(48):
        h = max(0, 6 - abs(x - 24) // 4)
        c.rect(x, 8 - h, 1, h, REG)
        if h:
            c.set(x, 8 - h, REGL)
    c.box(16, 3, 16, 5, M)
    for x in range(17, 31, 3):
        c.rect(x, 6, 2, 1, YE)
        c.rect(x + 2, 6, 1, 1, K)
    c.rect(0, 8, 48, 16, ROCK)
    c.box(14, 8, 20, 16, (16, 16, 24, 255))
    for y in range(10, 23, 3):
        c.rect(17, y, 6, 1, M)
    c.rect(17, 9, 1, 14, MD)
    c.rect(22, 9, 1, 14, MD)
    c.set(30, 12, YE)
    return c


def main():
    os.makedirs(OUT, exist_ok=True)
    ground(True).save('ground_top.png')
    ground(False).save('ground_rock.png')
    sun().save('sun.png')
    astronaut().save('astronaut.png')
    solar_panels().save('solar_panels.png')
    oxygenator().save('oxygenator.png')
    ice_extractor().save('ice_extractor.png')
    waste_processor().save('waste_processor.png')
    hydroponics().save('hydroponics.png')
    cricket_farm().save('cricket_farm.png')
    lab().save('lab.png')
    ship().save('ship.png')
    base().save('base.png')
    supply_ship().save('supply_ship.png')
    shelter().save('shelter.png')


if __name__ == '__main__':
    main()
