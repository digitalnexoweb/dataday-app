#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_reel.py
=================================================================
Genera un REEL VERTICAL ANIMADO (1080x1920, 30fps, ~25s) que funciona
como demo de producto de la app "DATA DAY" (SaaS de gestion de cuotas).

Pipeline:
  - Pillow (PIL) reconstruye fielmente las 4 pantallas de la app a partir
    de los design tokens reales del CSS (colores, tipografias, layout) y
    las compone dentro de un marco de telefono animado.
  - Cada pantalla se renderiza UNA sola vez como imagen "alta"; despues,
    por cada frame, se recorta el viewport (scroll real) y se aplica un
    zoom sutil estilo Ken Burns.
  - Toques: onda (ripple) naranja + punto tipo "dedo".
  - Transiciones entre pantallas: slide horizontal disparado por un toque
    en la barra de navegacion inferior.
  - Easing suave (ease-out / ease-in-out), nunca lineal.
  - Se codifica con libx264, yuv420p, +faststart y se le agrega una pista
    de audio silenciosa (anullsrc / AAC) para compatibilidad con Instagram.

Salida: ./reel_dataday_code.mp4

NOTA SOBRE LOS ASSETS:
  Las capturas originales del chat no estan disponibles como archivos en
  disco, asi que las pantallas se reconstruyen por codigo respetando el
  diseno exacto (mismos colores/estilo) y usando los NOMBRES GENERICOS de
  socios pedidos (Juan Perez, Maria Gonzalez, etc.) en lugar de los que
  aparecen en las capturas.
"""

import os
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ----------------------------------------------------------------------
# 0. CONFIG GENERAL
# ----------------------------------------------------------------------
W, H = 1080, 1920          # resolucion final del reel
FPS = 30
OUT = "reel_dataday_code.mp4"

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(HERE, "_frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

# ffmpeg viene del backend de imageio (no hay binario de sistema)
import imageio_ffmpeg
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# ----------------------------------------------------------------------
# 1. DESIGN TOKENS (respetan los del brief / CSS de la app)
# ----------------------------------------------------------------------
ACCENT      = (255, 95, 32)      # #FF5F20  naranja de marca
ACCENT_SOFT = (255, 95, 32, 32)  # fondo tenue naranja
BG          = (11, 11, 19)       # #0B0B13  fondo oscuro
ELEV        = (15, 19, 28)       # superficie elevada
SURFACE     = (20, 25, 38)       # #141926  card
SURFACE2    = (26, 32, 50)       # #1A2032  card fuerte / chip
LINE        = (255, 255, 255, 18)
LINE2       = (255, 255, 255, 28)
TEXT        = (245, 247, 250)    # #F5F7FA
DIM         = (150, 162, 182)    # #96A2B6
FAINT       = (91, 100, 120)     # #5B6478
GOOD        = (62, 224, 143)     # verde "al dia"
BAD         = (255, 93, 122)     # rojo "atrasado / deuda"
WARN        = (255, 184, 74)

# ----------------------------------------------------------------------
# 2. TIPOGRAFIAS
# ----------------------------------------------------------------------
Fd = "/usr/share/fonts/truetype/dejavu/"
def font(name, size):
    return ImageFont.truetype(Fd + name, size)

def sans(size):       return font("DejaVuSans.ttf", size)
def sans_b(size):     return font("DejaVuSans-Bold.ttf", size)
def mono(size):       return font("DejaVuSansMono.ttf", size)
def mono_b(size):     return font("DejaVuSansMono-Bold.ttf", size)

# ----------------------------------------------------------------------
# 3. HELPERS DE DIBUJO
# ----------------------------------------------------------------------
def new_img(w, h, color=(0, 0, 0, 0)):
    return Image.new("RGBA", (w, h), color)

def rrect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def text_tracked(draw, xy, txt, fnt, fill, tracking=0, anchor="la"):
    """Dibuja texto con letter-spacing (tracking) manual."""
    x, y = xy
    if tracking == 0:
        draw.text((x, y), txt, font=fnt, fill=fill, anchor=anchor)
        return
    # ancho total para poder centrar si hace falta
    widths = [draw.textlength(c, font=fnt) for c in txt]
    total = sum(widths) + tracking * (len(txt) - 1)
    if anchor.startswith("m"):
        x -= total / 2
    cy = y
    va = anchor[1] if len(anchor) > 1 else "a"
    for c, wc in zip(txt, widths):
        draw.text((x, cy), c, font=fnt, fill=fill, anchor="l" + va)
        x += wc + tracking

def paste_rounded(base, top, xy, radius):
    """Pega `top` sobre `base` con esquinas redondeadas."""
    mask = Image.new("L", top.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, top.size[0], top.size[1]],
                                           radius=radius, fill=255)
    base.paste(top, xy, mask)

def avatar(size, initials, hue):
    """Genera un avatar circular con iniciales sobre un color."""
    im = new_img(size, size)
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, size - 1, size - 1], fill=hue)
    f = sans_b(int(size * 0.42))
    d.text((size / 2, size / 2 - 1), initials, font=f, fill=(255, 255, 255), anchor="mm")
    return im

# ----------------------------------------------------------------------
# 4. EASINGS
# ----------------------------------------------------------------------
def clamp01(t): return max(0.0, min(1.0, t))
def ease_out(t):     t = clamp01(t); return 1 - (1 - t) ** 3
def ease_in_out(t):  t = clamp01(t); return t * t * (3 - 2 * t)
def ease_in(t):      t = clamp01(t); return t * t * t

def lerp(a, b, t): return a + (b - a) * t

# ----------------------------------------------------------------------
# 5. DATOS GENERICOS (nombres pedidos en el brief)
# ----------------------------------------------------------------------
SOCIOS = [
    # nombre, rol, estado, deuda, extra, vence, iniciales, color avatar
    ("Juan Perez",      "jugador",  "Al dia",    None,    None,        None,         "JP", (90, 110, 160)),
    ("Maria Gonzalez",  "jugadora", "Atrasado",  "$ 4.950", None,      "18/6/2026",  "MG", (150, 90, 130)),
    ("Carlos Rodriguez","jugador",  "Atrasado",  "$ 5.250", "$ 250 a favor", "18/6/2026", "CR", (120, 100, 70)),
    ("Lucia Fernandez", "jugadora", "Al dia",    None,    None,        None,         "LF", (80, 130, 120)),
    ("Diego Martinez",  "jugador",  "Atrasado",  "$ 6.100", None,      "20/6/2026",  "DM", (100, 90, 150)),
    ("Sofia Ramirez",   "jugadora", "Al dia",    None,    None,        None,         "SR", (140, 110, 90)),
]

HIST_ROWS = [
    ("Carlos Rodriguez", "Marzo",  "2026", "$ 1.000", "Efectivo",     "25/5/2026"),
    ("Maria Gonzalez",   "Agosto", "2026", "$ 1.500", "Efectivo",     "24/5/2026"),
    ("Maria Gonzalez",   "Julio",  "2026", "$ 1.500", "Efectivo",     "24/5/2026"),
    ("Juan Perez",       "Junio",  "2026", "$ 1.500", "Efectivo",     "24/5/2026"),
    ("Diego Martinez",   "Mayo",   "2026", "$ 6.000", "Efectivo",     "23/5/2026"),
    ("Carlos Rodriguez", "Mayo",   "2026", "$ 1.500", "Mercado Pago", "23/5/2026"),
    ("Lucia Fernandez",  "Abril",  "2026", "$ 5.000", "Transferencia","21/5/2026"),
]

CLUB = "Club Rio"

# ======================================================================
# 6. RENDER DE PANTALLAS (cada una devuelve una imagen RGBA "alta")
# ======================================================================
SCREEN_W = 600            # ancho del area de pantalla del telefono
NAV_H = 92                # alto de la barra de navegacion inferior

NAV_ITEMS = [("INICIO", "grid"), ("SOCIOS", "user"), ("PAGOS", "card"),
             ("HISTORIAL", "list"), ("CONFIG", "cog"), ("SALIR", "exit")]


def draw_nav_icon(d, cx, cy, kind, color):
    """Iconos minimalistas para la barra de navegacion."""
    s = 11
    if kind == "grid":
        for dx in (-s, 2):
            for dy in (-s, 2):
                rrect(d, [cx + dx, cy + dy, cx + dx + 8, cy + dy + 8], 2, outline=color, width=2)
    elif kind == "user":
        d.ellipse([cx - 6, cy - s, cx + 6, cy - s + 12], outline=color, width=2)
        d.arc([cx - 9, cy - 1, cx + 9, cy + 18], 200, 340, fill=color, width=2)
    elif kind == "card":
        rrect(d, [cx - 11, cy - 8, cx + 11, cy + 8], 3, outline=color, width=2)
        d.line([cx - 11, cy - 2, cx + 11, cy - 2], fill=color, width=2)
    elif kind == "list":
        for dy in (-7, 0, 7):
            d.line([cx - 9, cy + dy, cx + 9, cy + dy], fill=color, width=2)
    elif kind == "cog":
        d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=color, width=2)
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=color)
    elif kind == "exit":
        rrect(d, [cx - 10, cy - 9, cx + 3, cy + 9], 3, outline=color, width=2)
        d.line([cx - 2, cy, cx + 11, cy], fill=color, width=2)
        d.line([cx + 6, cy - 5, cx + 11, cy], fill=color, width=2)
        d.line([cx + 6, cy + 5, cx + 11, cy], fill=color, width=2)


def draw_bottom_nav(img, active_idx):
    """Barra inferior fija (se dibuja sobre el viewport, no scrollea)."""
    d = ImageDraw.Draw(img)
    y0 = img.height - NAV_H
    d.rectangle([0, y0, img.width, img.height], fill=ELEV)
    d.line([0, y0, img.width, y0], fill=(255, 255, 255, 20), width=1)
    n = len(NAV_ITEMS)
    cw = img.width / n
    for i, (label, kind) in enumerate(NAV_ITEMS):
        cx = cw * (i + 0.5)
        col = ACCENT if i == active_idx else FAINT
        draw_nav_icon(d, cx, y0 + 34, kind, col)
        text_tracked(d, (cx, y0 + 64), label, sans(13), col, tracking=0.5, anchor="ma")


def draw_app_header(img, y):
    """Encabezado comun: eyebrow naranja + chip institucion + boton."""
    d = ImageDraw.Draw(img)
    pad = 26
    # botones a la derecha: theme + chip + "Nuevo socio"
    # chip institucion
    chip_x, chip_y, chip_w, chip_h = pad + 56, y, 200, 56
    rrect(d, [pad, y, pad + 46, y + chip_h], 12, fill=SURFACE2, outline=LINE2, width=1)
    # icono sol (theme)
    cx, cy = pad + 23, y + chip_h / 2
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=DIM, width=2)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        d.line([cx + 10 * math.cos(rad), cy + 10 * math.sin(rad),
                cx + 13 * math.cos(rad), cy + 13 * math.sin(rad)], fill=DIM, width=2)
    rrect(d, [chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], 12,
          fill=SURFACE2, outline=LINE2, width=1)
    av = avatar(34, "C", ACCENT)
    img.paste(av, (chip_x + 11, chip_y + 11), av)
    text_tracked(d, (chip_x + 56, chip_y + 12), "INSTITUCION", sans(12), DIM, tracking=1)
    d.text((chip_x + 56, chip_y + 28), CLUB, font=sans_b(18), fill=TEXT)
    # boton "Nuevo socio"
    bx = chip_x + chip_w + 14
    rrect(d, [bx, y, bx + 150, y + chip_h], 12, fill=SURFACE, outline=LINE2, width=1)
    d.text((bx + 75, y + chip_h / 2), "Nuevo socio", font=sans(18), fill=TEXT, anchor="mm")
    return y + chip_h


def screen_base(height):
    img = new_img(SCREEN_W, height, BG)
    return img


def title_block(img, y, eyebrow, title, subtitle):
    d = ImageDraw.Draw(img)
    text_tracked(d, (26, y), eyebrow, sans_b(15), ACCENT, tracking=2)
    d.text((26, y + 24), title, font=sans_b(34), fill=TEXT)
    d.text((26, y + 70), subtitle, font=sans(18), fill=DIM)
    return y + 104


# ---------- 6.1 DASHBOARD ----------
def render_dashboard():
    H_ = 1500
    img = screen_base(H_)
    d = ImageDraw.Draw(img)
    y = 30
    y = title_block(img, y, "GESTION DE CUOTAS", "Dashboard general",
                    f"{CLUB} lista para cobrar y hacer seguimiento.")
    y = draw_app_header(img, y + 6) + 18
    # boton naranja "Registrar pago"
    rrect(d, [26, y, SCREEN_W - 26, y + 66], 14, fill=ACCENT)
    d.text((SCREEN_W / 2, y + 33), "Registrar pago", font=sans_b(22), fill=(255, 255, 255), anchor="mm")
    y += 66 + 28

    def stat_card(y, label, value, sub, sub_color, highlight=False, big=True):
        h = 132 if big else 110
        if highlight:
            rrect(d, [26, y, SCREEN_W - 26, y + h], 16, fill=(26, 18, 14), outline=ACCENT, width=2)
        else:
            rrect(d, [26, y, SCREEN_W - 26, y + h], 16, fill=SURFACE, outline=LINE, width=1)
        text_tracked(d, (50, y + 22), label, sans_b(14), DIM, tracking=1.5)
        if big:
            d.text((50, y + 44), "$", font=sans(30), fill=TEXT)
            d.text((78, y + 40), value, font=mono_b(46), fill=TEXT)
            vw = d.textlength(value, font=mono_b(46))
            d.text((92 + vw, y + 64), sub, font=sans(15), fill=sub_color)
        else:
            d.text((50, y + 42), value, font=mono_b(40), fill=TEXT)
            vw = d.textlength(value, font=mono_b(40))
            d.text((64 + vw, y + 56), sub, font=sans(15), fill=sub_color)
        return y + h + 16

    y = stat_card(y, "INGRESO DEL MES", "1.500", "-80% respecto a Mayo", ACCENT, highlight=True)
    y = stat_card(y, "INGRESO MES ANTERIOR", "7.500", "Mayo", DIM)
    y = stat_card(y, "SOCIOS ACTIVOS", "1", "Al dia y operativos", GOOD, big=False)
    y = stat_card(y, "SOCIOS CON DEUDA", "10", "Seguimiento prioritario", BAD, big=False)
    y = stat_card(y, "SOCIOS ATRASADOS", "10", "Requieren seguimiento", BAD, big=False)
    return img


# ---------- 6.2 SOCIOS ----------
def render_socios():
    H_ = 1620
    img = screen_base(H_)
    d = ImageDraw.Draw(img)
    y = 30
    y = title_block(img, y, "GESTION DE CUOTAS", "Socios y alumnos",
                    f"{CLUB} lista para cobrar y hacer seguimiento.")
    y = draw_app_header(img, y + 6) + 18
    d.text((26, y), "Socios", font=sans_b(28), fill=TEXT)
    d.text((26, y + 38), CLUB, font=sans(17), fill=DIM)
    y += 72
    rrect(d, [26, y, SCREEN_W - 26, y + 58], 14, fill=ACCENT)
    d.text((SCREEN_W / 2, y + 29), "Nuevo socio", font=sans_b(21), fill=(255, 255, 255), anchor="mm")
    y += 58 + 14
    # buscador
    rrect(d, [26, y, SCREEN_W - 26, y + 52], 12, fill=ELEV, outline=LINE2, width=1)
    d.text((46, y + 26), "Nombre, categoria, telefono o email...", font=sans(17), fill=FAINT, anchor="lm")
    y += 52 + 12
    rrect(d, [26, y, SCREEN_W - 26, y + 52], 12, fill=ELEV, outline=LINE2, width=1)
    d.text((46, y + 26), "Todos", font=sans(17), fill=TEXT, anchor="lm")
    d.text((SCREEN_W - 46, y + 26), "v", font=sans(16), fill=DIM, anchor="rm")
    y += 52 + 18

    # tarjetas de socio en 2 columnas
    col_w = (SCREEN_W - 26 * 2 - 16) / 2
    cards = SOCIOS
    cx0 = [26, 26 + col_w + 16]
    row_y = y
    for i, soc in enumerate(cards):
        col = i % 2
        if col == 0 and i > 0:
            row_y += 188
        name, role, estado, deuda, extra, vence, ini, hue = soc
        x = cx0[col]
        ch = 176
        rrect(d, [x, row_y, x + col_w, row_y + ch], 14, fill=SURFACE, outline=LINE, width=1)
        av = avatar(40, ini, hue)
        img.paste(av, (int(x + 16), int(row_y + 16)), av)
        d.text((x + 66, row_y + 18), name.split()[0], font=sans_b(17), fill=TEXT)
        d.text((x + 66, row_y + 40), name.split()[1] if len(name.split()) > 1 else "", font=sans_b(17), fill=TEXT)
        d.text((x + 16, row_y + 62), role, font=sans(14), fill=DIM)
        # badge estado
        bcol = GOOD if estado == "Al dia" else BAD
        bw = d.textlength(estado, font=sans_b(13)) + 22
        rrect(d, [x + 16, row_y + 86, x + 16 + bw, row_y + 110], 8,
              fill=(bcol[0], bcol[1], bcol[2], 32))
        d.text((x + 16 + bw / 2, row_y + 98), estado, font=sans_b(13), fill=bcol, anchor="mm")
        if extra:
            ew = d.textlength(extra, font=sans_b(12)) + 18
            rrect(d, [x + 22 + bw, row_y + 86, x + 22 + bw + ew, row_y + 110], 8,
                  fill=(GOOD[0], GOOD[1], GOOD[2], 32))
            d.text((x + 22 + bw + ew / 2, row_y + 98), extra, font=sans_b(12), fill=GOOD, anchor="mm")
        if deuda:
            d.text((x + 16, row_y + 120), "DEUDA", font=sans_b(11), fill=FAINT)
            d.text((x + 16, row_y + 134), deuda, font=mono_b(20), fill=BAD)
            # boton pagar
            rrect(d, [x + col_w - 92, row_y + 122, x + col_w - 12, row_y + 160], 10, fill=ACCENT)
            d.text((x + col_w - 52, row_y + 141), "Pagar", font=sans_b(15), fill=(255, 255, 255), anchor="mm")
        else:
            d.text((x + 16, row_y + 128), "Sin deuda", font=sans(15), fill=GOOD)
    return img


# ---------- 6.3 REGISTRAR PAGO ----------
def render_pagos():
    H_ = 1400
    img = screen_base(H_)
    d = ImageDraw.Draw(img)
    y = 30
    y = title_block(img, y, "GESTION DE CUOTAS", "Registrar pago",
                    f"{CLUB} lista para cobrar y hacer seguimiento.")
    y = draw_app_header(img, y + 6) + 18
    # card formulario
    card_top = y
    rrect(d, [26, y, SCREEN_W - 26, H_ - 40], 16, fill=SURFACE, outline=LINE, width=1)
    y += 28
    d.text((50, y), "Registrar pago", font=sans_b(24), fill=TEXT)
    y += 36
    d.text((50, y), "El sistema distribuye el monto entre los", font=sans(16), fill=DIM)
    d.text((50, y + 22), "meses pendientes y los siguientes.", font=sans(16), fill=DIM)
    y += 64

    def field(y, label, value, value_color, dropdown=False):
        text_tracked(d, (50, y), label, sans_b(14), DIM, tracking=0.5)
        y += 24
        rrect(d, [50, y, SCREEN_W - 50, y + 54], 12, fill=BG, outline=LINE2, width=1)
        d.text((70, y + 27), value, font=sans(17), fill=value_color, anchor="lm")
        if dropdown:
            d.text((SCREEN_W - 70, y + 27), "v", font=sans(15), fill=DIM, anchor="rm")
        return y + 54 + 22

    y = field(y, "Socio / alumno", "Maria Gonzalez", TEXT, dropdown=True)
    y = field(y, "Monto recibido", "3000", TEXT)
    y = field(y, "Forma de pago", "Efectivo", TEXT, dropdown=True)
    y = field(y, "Fecha de pago", "13/06/2026", TEXT)
    text_tracked(d, (50, y), "OBSERVACIONES", sans_b(14), DIM, tracking=0.5)
    y += 24
    rrect(d, [50, y, SCREEN_W - 50, y + 90], 12, fill=BG, outline=LINE2, width=1)
    d.text((70, y + 24), "Notas sobre el pago...", font=sans(17), fill=FAINT)
    y += 90 + 22
    rrect(d, [50, y, SCREEN_W - 50, y + 58], 12, fill=ACCENT)
    d.text((SCREEN_W / 2, y + 29), "Confirmar pago", font=sans_b(20), fill=(255, 255, 255), anchor="mm")
    return img


# ---------- 6.4 HISTORIAL (desktop / web) ----------
def render_historial():
    """Vista desktop -> imagen ancha estilo navegador."""
    DW, DH = 1500, 940
    img = new_img(DW, DH, BG)
    d = ImageDraw.Draw(img)
    # sidebar
    SB = 300
    d.rectangle([0, 0, SB, DH], fill=ELEV)
    d.line([SB, 0, SB, DH], fill=(255, 255, 255, 20), width=1)
    # logo
    rrect(d, [28, 30, 64, 66], 10, fill=ACCENT)
    d.text((46, 48), "D", font=sans_b(26), fill=(255, 255, 255), anchor="mm")
    d.text((78, 34), "DATA DAY", font=sans_b(22), fill=TEXT)
    text_tracked(d, (79, 60), "GESTION DE CUOTAS", sans(12), DIM, tracking=1)
    nav = [("Dashboard", False), ("Socios / Alumnos", False), ("Registrar pagos", False),
           ("Historial", True), ("Configuracion", False)]
    ny = 120
    for label, active in nav:
        if active:
            rrect(d, [16, ny - 6, SB - 16, ny + 34], 10, fill=(255, 95, 32, 22))
            d.line([16, ny - 6, 16, ny + 34], fill=ACCENT, width=3)
        d.text((40, ny + 14), label, font=sans_b(17) if active else sans(17),
               fill=ACCENT if active else DIM, anchor="lm")
        ny += 52
    # footer usuario
    d.line([16, DH - 96, SB - 16, DH - 96], fill=(255, 255, 255, 14), width=1)
    av = avatar(34, "CR", (90, 100, 130))
    img.paste(av, (24, DH - 78), av)
    d.text((68, DH - 74), "admin@clubrio.com", font=sans(15), fill=TEXT)
    d.text((68, DH - 54), "Club activo", font=sans(13), fill=GOOD)
    d.text((24, DH - 28), "Cerrar sesion", font=sans(15), fill=DIM)

    # main
    mx = SB + 40
    text_tracked(d, (mx, 34), "GESTION DE CUOTAS", sans_b(14), ACCENT, tracking=2)
    d.text((mx, 54), "Historial de pagos", font=sans_b(34), fill=TEXT)
    d.text((mx, 100), f"{CLUB} lista para cobrar y hacer seguimiento.", font=sans(17), fill=DIM)
    # botones derecha
    rrect(d, [DW - 220, 36, DW - 60, 78], 10, fill=ACCENT)
    d.text((DW - 140, 57), "Registrar pago", font=sans_b(16), fill=(255, 255, 255), anchor="mm")
    rrect(d, [DW - 360, 36, DW - 235, 78], 10, fill=SURFACE, outline=LINE2, width=1)
    d.text((DW - 297, 57), "Nuevo socio", font=sans(16), fill=TEXT, anchor="mm")

    # card historial
    cy = 150
    rrect(d, [mx, cy, DW - 40, DH - 40], 16, fill=SURFACE, outline=LINE, width=1)
    d.text((mx + 30, cy + 26), "Historial completo", font=sans_b(22), fill=TEXT)
    d.text((mx + 30, cy + 60), "Pagos con filtros por socio, mes, forma de pago y fecha.",
           font=sans(15), fill=DIM)
    # filtros (columna derecha)
    fx = mx + 360
    fw = DW - 40 - 30 - fx
    filtros = ["Todos los socios", "Todos los meses", "Todas las formas"]
    fy = cy + 24
    for fl in filtros:
        rrect(d, [fx, fy, fx + fw, fy + 40], 8, fill=BG, outline=LINE2, width=1)
        d.text((fx + 16, fy + 20), fl, font=sans(15), fill=TEXT, anchor="lm")
        fy += 50
    # boton exportar + chip + total
    rrect(d, [DW - 40 - 30 - 150, fy + 6, DW - 70, fy + 46], 8, fill=SURFACE2, outline=LINE2, width=1)
    d.text((DW - 70 - 75, fy + 26), "Exportar Excel", font=sans(15), fill=TEXT, anchor="mm")
    chipx = mx + 30
    rrect(d, [chipx, fy + 6, chipx + 170, fy + 46], 8, fill=SURFACE2)
    d.text((chipx + 85, fy + 26), "11 pagos filtrados", font=mono(15), fill=DIM, anchor="mm")
    # total filtrado
    text_tracked(d, (DW - 70, fy + 70), "TOTAL FILTRADO", sans_b(13), DIM, tracking=1, anchor="ra")
    d.text((DW - 70, fy + 88), "$ 24.800", font=mono_b(34), fill=TEXT, anchor="ra")

    # tabla
    ty = fy + 150
    cols = [("SOCIO", mx + 30), ("MES", mx + 330), ("ANO", mx + 470),
            ("MONTO", mx + 590), ("FORMA DE PAGO", mx + 760), ("FECHA", mx + 980)]
    for label, x in cols:
        text_tracked(d, (x, ty), label, sans_b(13), DIM, tracking=1)
    ty += 30
    d.line([mx + 30, ty, DW - 70, ty], fill=(255, 255, 255, 16), width=1)
    ty += 10
    for row in HIST_ROWS:
        for (val, (_, x)) in zip(row, cols):
            fnt = sans_b(16) if x == mx + 30 else sans(16)
            colr = TEXT if x == mx + 30 else DIM
            if x == mx + 590:  # monto
                fnt, colr = mono_b(16), TEXT
            d.text((x, ty + 18), val, font=fnt, fill=colr, anchor="lm")
        ty += 48
        d.line([mx + 30, ty - 6, DW - 70, ty - 6], fill=(255, 255, 255, 10), width=1)
    return img, (DW - 70, fy + 88)  # devuelve tambien el punto del total para el zoom


# ======================================================================
# 7. MARCO DE TELEFONO
# ======================================================================
PAD = 22                                  # grosor del bezel
PHONE_W = SCREEN_W + PAD * 2
VH = 1180                                  # alto del viewport visible
PHONE_H = VH + PAD * 2
PHONE_X = (W - PHONE_W) // 2               # centrado horizontal
PHONE_REST_Y = (H - PHONE_H) // 2 + 40     # posicion de reposo vertical


def build_phone_shell():
    """Bezel del telefono (sin pantalla): se compone una sola vez."""
    shell = new_img(PHONE_W, PHONE_H)
    d = ImageDraw.Draw(shell)
    # cuerpo
    rrect(d, [0, 0, PHONE_W, PHONE_H], 56, fill=(8, 9, 14, 255), outline=(40, 44, 58, 255), width=2)
    # ranura interior (sombra)
    rrect(d, [PAD - 4, PAD - 4, PHONE_W - PAD + 4, PHONE_H - PAD + 4], 40, outline=(0, 0, 0, 255), width=3)
    return shell


def compose_phone(inner, lift=0.0):
    """
    inner: imagen RGBA de tamano (SCREEN_W, VH) = el viewport ya renderizado.
    lift : 0 = reposo; 1 = totalmente fuera de cuadro por abajo.
    Devuelve un frame 1080x1920 con el telefono compuesto sobre el fondo.
    """
    frame = Image.new("RGB", (W, H), BG)
    # fondo: leve glow naranja arriba
    frame.paste(bg_glow, (0, 0), bg_glow)
    y = int(PHONE_REST_Y + lift * (H - PHONE_REST_Y + 60))
    # pantalla redondeada dentro del bezel
    paste_rounded(frame, inner.convert("RGB"), (PHONE_X + PAD, y + PAD), 38)
    frame.paste(PHONE_SHELL, (PHONE_X, y), PHONE_SHELL)
    # notch + home indicator
    d = ImageDraw.Draw(frame)
    nx = W // 2
    rrect(d, [nx - 60, y + PAD + 6, nx + 60, y + PAD + 24], 9, fill=(8, 9, 14))
    d.ellipse([nx + 38, y + PAD + 11, nx + 48, y + PAD + 21], fill=(24, 26, 36))
    rrect(d, [nx - 50, y + PHONE_H - PAD - 14, nx + 50, y + PHONE_H - PAD - 8], 3, fill=(120, 126, 140))
    return frame, y


def make_bg_glow():
    g = new_img(W, H)
    d = ImageDraw.Draw(g)
    d.ellipse([W // 2 - 460, -360, W // 2 + 460, 360], fill=(255, 95, 32, 26))
    return g.filter(ImageFilter.GaussianBlur(160))


# ======================================================================
# 8. OVERLAYS: subtitulos, toques, dedo
# ======================================================================
def draw_subtitle(frame, text_parts, alpha):
    """text_parts: lista de (texto, color). Banda inferior con fade."""
    if alpha <= 0:
        return
    band = new_img(W, 150)
    d = ImageDraw.Draw(band)
    # medir ancho total
    f = sans_b(40)
    widths = [d.textlength(t, font=f) for t, _ in text_parts]
    total = sum(widths)
    x = (W - total) / 2
    yb = 60
    for (t, c), wt in zip(text_parts, widths):
        d.text((x, yb), t, font=f, fill=c + (255,), anchor="lm")
        x += wt
    band = band.filter(ImageFilter.GaussianBlur(0))
    a = int(255 * alpha)
    band.putalpha(band.split()[3].point(lambda p: int(p * alpha)))
    frame.paste(band, (0, H - 250), band)


def draw_touch(frame, x, y, t):
    """Onda naranja expandiendose + punto tipo dedo. t en [0,1]."""
    if t < 0 or t > 1:
        return
    ov = new_img(W, H)
    d = ImageDraw.Draw(ov)
    r = int(lerp(8, 90, ease_out(t)))
    a = int(180 * (1 - t))
    d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 95, 32, a), width=4)
    # dedo (punto solido que aparece y se va)
    fa = int(220 * (1 - abs(t - 0.3) / 0.7)) if t < 1 else 0
    fa = max(0, fa)
    d.ellipse([x - 22, y - 22, x + 22, y + 22], fill=(255, 95, 32, int(fa * 0.5)))
    d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(255, 255, 255, fa))
    frame.alpha_composite(ov) if frame.mode == "RGBA" else frame.paste(ov, (0, 0), ov)


# ======================================================================
# 9. PRE-RENDER DE TODO LO ESTATICO
# ======================================================================
print("Renderizando pantallas...")
PHONE_SHELL = build_phone_shell()
bg_glow = make_bg_glow()
SCR_DASH = render_dashboard()
SCR_SOC = render_socios()
SCR_PAY = render_pagos()
SCR_HIST, HIST_TOTAL_PT = render_historial()


def viewport_of(screen, scroll, zoom=1.0, active_nav=0):
    """
    Recorta el viewport (SCREEN_W x VH) de una pantalla 'alta' aplicando
    scroll vertical y un zoom Ken Burns. Dibuja la barra de nav fija encima.
    """
    max_scroll = max(0, screen.height - VH)
    scroll = max(0, min(max_scroll, scroll))
    # zoom: recortamos una ventana mas chica y la agrandamos
    crop_w = SCREEN_W / zoom
    crop_h = VH / zoom
    cx = SCREEN_W / 2
    left = cx - crop_w / 2
    top = scroll + (VH - crop_h) / 2
    crop = screen.crop((int(left), int(top), int(left + crop_w), int(top + crop_h)))
    crop = crop.resize((SCREEN_W, VH), Image.LANCZOS)
    draw_bottom_nav(crop, active_nav)
    return crop


# ======================================================================
# 10. TIMELINE DE ESCENAS
# ======================================================================
def sec(s): return int(s * FPS)

# limites de cada escena (en frames)
S1 = sec(3.0)     # intro            0      -> 90
S2 = sec(7.5)     # dashboard        90     -> 225
S3 = sec(13.0)    # socios           225    -> 390
S4 = sec(18.0)    # pagos            390    -> 540
S5 = sec(22.0)    # historial web    540    -> 660
S6 = sec(25.5)    # cierre           660    -> 765
TOTAL = S6


def render_frame(i):
    # ---------- ESCENA 1: INTRO ----------
    if i < S1:
        t = i / S1
        frame = Image.new("RGB", (W, H), BG).convert("RGBA")
        frame.alpha_composite(bg_glow)
        # el telefono sube desde abajo en la 2da mitad
        rise = ease_out(clamp01((t - 0.35) / 0.65))
        lift = 1.0 - rise
        inner = viewport_of(SCR_DASH, 0, zoom=1.0, active_nav=0)
        f2, _ = compose_phone(inner, lift=lift)
        f2 = f2.convert("RGBA")
        # wordmark central que sube y se desvanece
        wm_a = ease_in_out(clamp01(t / 0.4)) * (1 - clamp01((t - 0.75) / 0.25))
        ov = new_img(W, H)
        d = ImageDraw.Draw(ov)
        wy = int(lerp(H * 0.42, H * 0.16, rise))
        a = int(255 * wm_a)
        text_tracked(d, (W / 2, wy), "DATA DAY", sans_b(96), TEXT, tracking=6, anchor="ma")
        text_tracked(d, (W / 2, wy + 120), "GESTION DE CUOTAS PARA TU CLUB",
                     sans(30), ACCENT, tracking=3, anchor="ma")
        ov.putalpha(ov.split()[3].point(lambda p: int(p * wm_a)))
        f2.alpha_composite(ov)
        return f2.convert("RGB")

    # ---------- ESCENA 2: DASHBOARD ----------
    if i < S2:
        t = (i - S1) / (S2 - S1)
        zoom = lerp(1.0, 1.045, ease_in_out(t))
        scroll = ease_in_out(clamp01((t - 0.25) / 0.7)) * 300
        inner = viewport_of(SCR_DASH, int(scroll), zoom=zoom, active_nav=0)
        frame, py = compose_phone(inner, 0)
        frame = frame.convert("RGBA")
        # toque inicial sobre "Registrar pago"
        if 0.05 < t < 0.32:
            draw_touch(frame, W / 2, py + PAD + 250, (t - 0.05) / 0.27)
        sub_a = ease_in_out(clamp01(t / 0.2)) * (1 - clamp01((t - 0.82) / 0.18))
        draw_subtitle(frame, [("Tu cobranza del mes, ", TEXT), ("en tiempo real", ACCENT)], sub_a)
        return frame.convert("RGB")

    # ---------- ESCENA 3: SOCIOS (slide-in) ----------
    if i < S3:
        t = (i - S2) / (S3 - S2)
        slide = ease_out(clamp01(t / 0.18))     # 0->1 entra
        zoom = lerp(1.0, 1.04, ease_in_out(t))
        scroll = ease_in_out(clamp01((t - 0.3) / 0.65)) * 360
        inner_new = viewport_of(SCR_SOC, int(scroll), zoom=zoom, active_nav=1)
        if slide < 1.0:
            inner_old = viewport_of(SCR_DASH, 300, 1.045, active_nav=0)
            combo = new_img(SCREEN_W, VH, BG)
            off = int(lerp(0, -SCREEN_W, slide))
            combo.paste(inner_old, (off, 0))
            combo.paste(inner_new, (off + SCREEN_W, 0))
            inner = combo
        else:
            inner = inner_new
        frame, py = compose_phone(inner, 0)
        frame = frame.convert("RGBA")
        # toque en nav "SOCIOS" al inicio
        if t < 0.16:
            nav_x = PHONE_X + PAD + SCREEN_W * (1.5 / 6)
            draw_touch(frame, nav_x, py + PAD + VH - NAV_H + 34, t / 0.16)
        # toque en "Pagar" mas tarde
        if 0.6 < t < 0.85:
            draw_touch(frame, PHONE_X + PAD + SCREEN_W - 80, py + PAD + 760, (t - 0.6) / 0.25)
        sub_a = ease_in_out(clamp01((t - 0.15) / 0.2)) * (1 - clamp01((t - 0.85) / 0.15))
        draw_subtitle(frame, [("Quien debe y quien esta ", TEXT), ("al dia", ACCENT)], sub_a)
        return frame.convert("RGB")

    # ---------- ESCENA 4: REGISTRAR PAGO (slide-in) ----------
    if i < S4:
        t = (i - S3) / (S4 - S3)
        slide = ease_out(clamp01(t / 0.18))
        zoom = lerp(1.0, 1.06, ease_in_out(t))   # zoom a los campos
        scroll = ease_in_out(clamp01((t - 0.2) / 0.7)) * 150
        inner_new = viewport_of(SCR_PAY, int(scroll), zoom=zoom, active_nav=2)
        if slide < 1.0:
            inner_old = viewport_of(SCR_SOC, 360, 1.04, active_nav=1)
            combo = new_img(SCREEN_W, VH, BG)
            off = int(lerp(0, -SCREEN_W, slide))
            combo.paste(inner_old, (off, 0))
            combo.paste(inner_new, (off + SCREEN_W, 0))
            inner = combo
        else:
            inner = inner_new
        frame, py = compose_phone(inner, 0)
        frame = frame.convert("RGBA")
        if t < 0.16:
            nav_x = PHONE_X + PAD + SCREEN_W * (2.5 / 6)
            draw_touch(frame, nav_x, py + PAD + VH - NAV_H + 34, t / 0.16)
        sub_a = ease_in_out(clamp01((t - 0.15) / 0.2)) * (1 - clamp01((t - 0.85) / 0.15))
        draw_subtitle(frame, [("Registra el pago y se ", TEXT), ("reparte solo", ACCENT)], sub_a)
        return frame.convert("RGB")

    # ---------- ESCENA 5: HISTORIAL WEB ----------
    if i < S5:
        t = (i - S4) / (S5 - S4)
        frame = Image.new("RGB", (W, H), BG).convert("RGBA")
        frame.alpha_composite(bg_glow)
        # ventana de navegador con la captura desktp, escalada y con zoom lento
        DW, DH = SCR_HIST.size
        base_scale = (W - 80) / DW
        zoom = lerp(1.0, 1.22, ease_in_out(t))
        scale = base_scale * zoom
        bw, bh = int(DW * scale), int(DH * scale)
        big = SCR_HIST.resize((bw, bh), Image.LANCZOS)
        # punto de interes: total filtrado (esquina der) -> encuadre hacia la derecha
        tx, ty = HIST_TOTAL_PT
        focus_x = lerp(0.5, 0.72, ease_in_out(t)) * bw
        focus_y = lerp(0.5, 0.5, t) * bh
        px = int(W / 2 - focus_x)
        py = int(H / 2 - focus_y)
        # barra de navegador
        chrome = new_img(bw, 46, (24, 27, 36, 255))
        cd = ImageDraw.Draw(chrome)
        for k, c in enumerate([(255, 95, 90), (255, 189, 70), (50, 200, 110)]):
            cd.ellipse([20 + k * 26, 16, 34 + k * 26, 30], fill=c)
        cd.rounded_rectangle([90, 12, bw - 30, 34], 8, fill=(15, 18, 26, 255))
        cd.text((110, 23), "app.dataday.com/historial", font=sans(15), fill=DIM, anchor="lm")
        # marco redondeado del navegador
        win = new_img(bw, bh + 46)
        win.paste(chrome, (0, 0))
        win.paste(big, (0, 46))
        mask = Image.new("L", win.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, bw, bh + 46], 18, fill=255)
        frame.paste(win, (px, py - 23), mask)
        frame = frame.convert("RGBA")
        # etiqueta "Tambien desde la web"
        lab_a = ease_in_out(clamp01(t / 0.2)) * (1 - clamp01((t - 0.85) / 0.15))
        ov = new_img(W, H)
        d = ImageDraw.Draw(ov)
        lw = d.textlength("TAMBIEN DESDE LA WEB", font=sans_b(26)) + 60
        rrect(d, [(W - lw) / 2, 150, (W + lw) / 2, 206], 28, fill=(255, 95, 32, 230))
        text_tracked(d, (W / 2, 178), "TAMBIEN DESDE LA WEB", sans_b(26), (255, 255, 255),
                     tracking=2, anchor="mm")
        ov.putalpha(ov.split()[3].point(lambda p: int(p * lab_a)))
        frame.alpha_composite(ov)
        sub_a = ease_in_out(clamp01((t - 0.1) / 0.2)) * (1 - clamp01((t - 0.85) / 0.15))
        draw_subtitle(frame, [("Historial completo y ", TEXT), ("exporta a Excel", ACCENT)], sub_a)
        return frame.convert("RGB")

    # ---------- ESCENA 6: CIERRE ----------
    t = (i - S5) / (S6 - S5)
    frame = Image.new("RGB", (W, H), BG).convert("RGBA")
    frame.alpha_composite(bg_glow)
    ov = new_img(W, H)
    d = ImageDraw.Draw(ov)
    a = ease_out(clamp01(t / 0.35))
    cy = H * 0.34
    text_tracked(d, (W / 2, cy), "DATA DAY", sans_b(100), TEXT, tracking=6, anchor="ma")
    for k, line in enumerate(["Menos morosidad.", "Mas control.", "Mas tiempo para tu club."]):
        col = ACCENT if k == 2 else TEXT
        d.text((W / 2, cy + 150 + k * 56), line, font=sans_b(42), fill=col, anchor="ma")
    # CTA naranja
    cta_t = ease_out(clamp01((t - 0.3) / 0.5))
    bw2 = 560
    by = int(cy + 400)
    rrect(d, [(W - bw2) / 2, by, (W + bw2) / 2, by + 96], 22, fill=ACCENT)
    d.text((W / 2, by + 48), "Escribinos por DM", font=sans_b(40), fill=(255, 255, 255), anchor="mm")
    d.text((W / 2, by + 150), "probalo gratis", font=sans(30), fill=DIM, anchor="mm")
    ov.putalpha(ov.split()[3].point(lambda p: int(p * a)))
    frame.alpha_composite(ov)
    # fade-in negro al principio de la escena
    if t < 0.15:
        fade = new_img(W, H, (11, 11, 19, int(255 * (1 - t / 0.15))))
        frame.alpha_composite(fade)
    return frame.convert("RGB")


# ======================================================================
# 11. RENDER + ENCODE
# ======================================================================
def main():
    silent = os.path.join(HERE, "_silent.mp4")
    raw = os.path.join(HERE, "_raw.mp4")

    print(f"Generando {TOTAL} frames ({TOTAL/FPS:.1f}s)...")
    writer = __import__("imageio").get_writer(
        raw, fps=FPS, codec="libx264", quality=8,
        macro_block_size=8, ffmpeg_log_level="error",
        output_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )
    for i in range(TOTAL):
        fr = render_frame(i)
        writer.append_data(np.asarray(fr))
        if i % 30 == 0:
            print(f"  frame {i}/{TOTAL}")
    writer.close()

    # agregar pista de audio silenciosa (Instagram a veces rechaza sin audio)
    print("Agregando audio silencioso y finalizando...")
    cmd = [
        FFMPEG, "-y",
        "-i", raw,
        "-f", "lavfi", "-i", f"anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        os.path.join(HERE, OUT),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    # copia a la raiz del proyecto
    final = os.path.join(HERE, OUT)
    print("OK ->", final)


if __name__ == "__main__":
    main()
