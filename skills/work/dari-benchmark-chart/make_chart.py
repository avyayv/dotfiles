#!/usr/bin/env python3
"""Render a Dari-style benchmark scatter (accuracy vs. cost, pareto frontier) to PNG.

Usage: python3 make_chart.py spec.json
Spec format: see example.json next to this script. Requires Google Chrome for PNG export.
"""
import base64, json, math, subprocess, sys, tempfile, os

import os as _os
CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    _os.path.expanduser("~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
]

DARK = dict(bg="#09100f", ink="#eef4ed", muted="#9caca5", faint="#718079", name="#cfd9d3",
            line="rgba(38,54,49,0.6)", dot="#6f817a", muted_dot="#34443e", acc="#8ee6bd", accb="#b7f4d6",
            dash="rgba(142,230,189,0.28)", rlabel="rgba(142,230,189,0.6)",
            glow="rgba(142,230,189,0.4)")
LIGHT = dict(bg="#f6faf7", ink="#10231b", muted="#55665e", faint="#7d8d85", name="#2c3f36",
             line="rgba(23,64,47,0.12)", dot="#93a49b", muted_dot="#62756c", acc="#12805c", accb="#0a5c41",
             dash="rgba(18,128,92,0.3)", rlabel="rgba(18,128,92,0.6)",
             glow="rgba(18,128,92,0.25)")

W, H, T, B, L, R = 1840, 1104, 240, 960, 160, 1770


def nice_step(span, target=5):
    for s in (1, 2, 2.5, 4, 5, 10, 20, 25, 50, 100):
        if span / s <= target:
            return s
    return 100


def main(spec_path):
    spec = json.load(open(spec_path))
    C = LIGHT if spec.get("theme") == "light" else DARK
    pts = spec["points"]

    accs = [p["accuracy"] for p in pts]
    costs = [p["cost"] for p in pts]
    ylo = spec.get("y_min", math.floor(min(accs) - 0.11 * (max(accs) - min(accs) + 1)))
    yhi = spec.get("y_max", math.ceil(max(accs) + 0.10 * (max(accs) - min(accs) + 1)))
    xmax = spec.get("x_max", nice_step(max(costs) * 1.35, 1) if max(costs) > 100 else max(costs) * 1.4)
    ystep = spec.get("y_step", nice_step(yhi - ylo))
    xstep = spec.get("x_step", nice_step(xmax))

    def X(c): return L + c / xmax * (R - L)
    def Y(a): return B - (a - ylo) / (yhi - ylo) * (B - T)

    e = [f'<rect width="{W}" height="{H}" fill="{C["bg"]}"/>']
    e.append(f'<text class="mono" x="130" y="66" font-size="22" font-weight="500" fill="{C["acc"]}" letter-spacing="3.1">{spec.get("eyebrow", "BENCHMARK")}</text>')
    e.append(f'<text class="display" x="126" y="134" font-size="52" font-weight="500" fill="{C["ink"]}" letter-spacing="-2.3">{spec["title"]}</text>')
    e.append(f'<text class="display" x="128" y="182" font-size="26" fill="{C["muted"]}">{spec["subtitle"]}</text>')

    brand_logo = spec.get("brand_logo")
    if brand_logo and os.path.exists(brand_logo):
        logo_data = base64.b64encode(open(brand_logo, "rb").read()).decode("ascii")
        e.append(f'<image href="data:image/svg+xml;base64,{logo_data}" x="1580" y="62" width="42" height="42"/>')
        e.append(f'<text class="mono" x="1638" y="90" font-size="22" fill="{C["muted"]}" letter-spacing="1.2">dari.dev</text>')

    gy = math.ceil(ylo / ystep) * ystep
    while gy < yhi:
        e.append(f'<line x1="{L}" y1="{Y(gy):.1f}" x2="{R}" y2="{Y(gy):.1f}" stroke="{C["line"]}" stroke-width="1.5"/>')
        e.append(f'<text class="mono" x="122" y="{Y(gy) + 7:.1f}" font-size="20" fill="{C["faint"]}" text-anchor="end">{gy:g}%</text>')
        gy += ystep
    gx = 0
    while gx <= xmax:
        e.append(f'<text class="mono" x="{X(gx):.1f}" y="1006" font-size="20" fill="{C["faint"]}" text-anchor="middle">${gx:g}</text>')
        gx += xstep
    e.append(f'<text class="mono" x="{(L + R) // 2}" y="1066" font-size="19" fill="{C["faint"]}" text-anchor="middle" letter-spacing="5.5">{spec.get("x_title", "TOTAL COST — FULL SUITE")}</text>')
    e.append(f'<text class="mono" x="46" y="600" font-size="19" fill="{C["faint"]}" text-anchor="middle" letter-spacing="5.5" transform="rotate(-90 46 600)">{spec.get("y_title", "ACCURACY")}</text>')

    # pareto frontier: cheapest-first; keep points that raise the best accuracy so far
    if spec.get("frontier", True):
        frontier = []
        best = -1.0
        for p in sorted(pts, key=lambda p: p["cost"]):
            if p["accuracy"] > best:
                frontier.append(p)
                best = p["accuracy"]
        if len(frontier) >= 2:
            coords = [(X(p["cost"]), Y(p["accuracy"])) for p in frontier]
            e.append('<polyline points="' + " ".join(f"{x:.1f},{y:.1f}" for x, y in coords)
                     + f'" fill="none" stroke="{C["dash"]}" stroke-width="2.5"/>')
            # label along the longest segment
            segs = list(zip(coords, coords[1:]))
            seg_i = spec.get("frontier_label_seg")
            if seg_i is not None and 0 <= seg_i < len(segs):
                (x1, y1), (x2, y2) = segs[seg_i]
            else:
                (x1, y1), (x2, y2) = max(segs, key=lambda s: math.dist(*s))
            ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2 - 16
            e.append(f'<text class="mono" x="{mx:.0f}" y="{my:.0f}" font-size="17" fill="{C["rlabel"]}" letter-spacing="2" text-anchor="middle" transform="rotate({ang:.1f} {mx:.0f} {my:.0f})">PARETO FRONTIER</text>')

    effort_style = spec.get("effort_style", "value")
    for p in pts:
        # Optional display-only offsets keep dense benchmark points/labels legible
        # without changing the underlying coordinates used for the frontier.
        x = X(p["cost"]) + p.get("plot_dx", 0)
        y = Y(p["accuracy"]) + p.get("plot_dy", 0)
        val = p.get("label") or f'{p["accuracy"]:.1f}% at ${round(p["cost"]):g}'
        effort = p.get("effort")
        name_suffix, effort_line = "", None
        if effort:
            if effort_style == "value":
                val = f"{val} · {effort}"
            elif effort_style == "paren":
                name_suffix = f' <tspan fill="{C["faint"]}" font-size="20" font-weight="400">({effort})</tspan>'
            elif effort_style == "line":
                effort_line = effort.upper() + ("" if "thinking" in effort.lower() else " THINKING")
        right = p.get("side", "right") == "right"
        ax, anchor = (1, "start") if right else (-1, "end")
        label_dx = p.get("label_dx", 35 if not p.get("highlight") else 38)
        label_dy = p.get("label_dy", 0)
        if p.get("leader_line") and p.get("show_label", True):
            label_x = x + label_dx * ax
            label_mid_y = y + label_dy + 10
            target_x = label_x - 13 * ax
            target_y = label_mid_y
            distance = math.hypot(target_x - x, target_y - y)
            if distance:
                start_x = x + (target_x - x) / distance * 14
                start_y = y + (target_y - y) / distance * 14
                e.append(
                    f'<line x1="{start_x:.1f}" y1="{start_y:.1f}" '
                    f'x2="{target_x:.1f}" y2="{target_y:.1f}" '
                    f'stroke="{C["faint"]}" stroke-opacity="0.55" stroke-width="1.5"/>'
                )
        if p.get("highlight"):
            e.append(f'<g style="filter: drop-shadow(0 0 20px {C["glow"]})">'
                     f'<circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="none" stroke="{C["acc"]}" stroke-width="3"/>'
                     f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{C["acc"]}"/></g>')
            e.append(f'<text class="display" x="{x + label_dx * ax:.1f}" y="{y - 19 + label_dy:.1f}" font-size="27" font-weight="600" fill="{C["accb"]}" text-anchor="{anchor}">{p["name"]}{name_suffix}</text>')
            e.append(f'<text class="mono" x="{x + (label_dx + 1) * ax:.1f}" y="{y + 19 + label_dy:.1f}" font-size="23" fill="{C["acc"]}" text-anchor="{anchor}">{val}</text>')
            if effort_line:
                e.append(f'<text class="mono" x="{x + (label_dx + 1) * ax:.1f}" y="{y + 53 + label_dy:.1f}" font-size="16" fill="{C["faint"]}" letter-spacing="2" text-anchor="{anchor}">{effort_line}</text>')
        else:
            dot_color = C["dot"] if p.get("show_label", True) else C["muted_dot"]
            e.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="10" fill="{dot_color}" stroke="{C["bg"]}" stroke-width="4"/>')
            if not p.get("show_label", True):
                continue
            e.append(f'<text class="display" x="{x + label_dx * ax:.1f}" y="{y - 8 + label_dy:.1f}" font-size="24" font-weight="600" fill="{C["name"]}" text-anchor="{anchor}">{p["name"]}{name_suffix}</text>')
            e.append(f'<text class="mono" x="{x + (label_dx + 1) * ax:.1f}" y="{y + 28 + label_dy:.1f}" font-size="22" fill="{C["muted"]}" text-anchor="{anchor}">{val}</text>')
            if effort_line:
                e.append(f'<text class="mono" x="{x + (label_dx + 1) * ax:.1f}" y="{y + 62 + label_dy:.1f}" font-size="16" fill="{C["faint"]}" letter-spacing="2" text-anchor="{anchor}">{effort_line}</text>')

    html = ('<!doctype html><html><head><meta charset="utf-8"><style>'
            '@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600&display=swap");'
            f'html,body{{margin:0;padding:0;background:{C["bg"]};}}svg{{display:block;}}'
            '.display{font-family:"Manrope",sans-serif;}.mono{font-family:"DM Mono",monospace;}'
            f'</style></head><body><svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">'
            + "\n".join(e) + "</svg></body></html>")

    out = spec.get("out", "chart.png")
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(html)
        tmp = f.name
    last_err = None
    for chrome in CHROME_CANDIDATES:
        if not os.path.exists(chrome):
            continue
        try:
            subprocess.run([chrome, "--headless", "--disable-gpu", "--hide-scrollbars",
                            "--force-device-scale-factor=1", f"--window-size={W},{H}",
                            "--virtual-time-budget=8000", f"--screenshot={out}", f"file://{tmp}"],
                           check=True, capture_output=True)
            last_err = None
            break
        except subprocess.CalledProcessError as e:
            last_err = e  # e.g. Chrome SIGBUS after an in-place update; try next candidate
    os.unlink(tmp)
    if last_err:
        raise last_err
    print(f"wrote {out}")


if __name__ == "__main__":
    main(sys.argv[1])
