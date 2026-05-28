"""
viewer.py – Interaktiver Star-Wars-Karten-Viewer mit tkinter.

Verwendung:
  python viewer.py image.png

Steuerung:
  - Mausrad        → Zoom
  - Linke Maustaste + Ziehen → Pan
  - Linksklick auf Pin → Planeteninfo
  - Suchfeld oben  → Planet suchen & anspringen
  - ESC / Q        → Beenden
"""

import sys
import math
import tkinter as tk
from tkinter import ttk
from pathlib import Path

try:
    from PIL import Image, ImageTk
except ImportError:
    print("Bitte zuerst: pip install pillow --break-system-packages")
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).parent))
try:
    from planets import PLANETS, search_planets, get_planet, REGIONS
except ImportError:
    print("planets.py nicht gefunden. Bitte im selben Ordner ablegen.")
    sys.exit(1)


# ── Farben & Konstanten ─────────────────────────────────────────────────
BG          = "#080c12"
TOPBAR_BG   = "#0d1420"
TEXT        = "#e8edf5"
MUTED       = "#6b7a96"
ACCENT      = "#4fa3d4"
GOLD        = "#c9922a"
PANEL_BG    = "#0d1a2e"
PANEL_BORDER= "#1e2e45"

PIN_NORMAL  = "#aabbcc"
PIN_HOVER   = "#4fa3d4"
PIN_ACTIVE  = "#c9922a"
PIN_R       = 4

REGION_COLORS = {
    "Deep Core":        "#c94f4f",
    "Core Worlds":      "#4fa3d4",
    "Colonies":         "#7a9fd4",
    "Inner Rim":        "#4fd49a",
    "Expansion Region": "#4fd4c9",
    "Mid Rim":          "#c9a24f",
    "Outer Rim":        "#a87a3a",
    "Hutt Space":       "#c94fa3",
    "Wild Space":       "#7a7a7a",
    "Unknown Regions":  "#555577",
}


class ViewerApp:
    def __init__(self, root: tk.Tk, image_path: str):
        self.root = root
        self.root.title("Star Wars Galaxy Map")
        self.root.configure(bg=BG)

        self.pil_img         = Image.open(image_path)
        self.img_w, self.img_h = self.pil_img.size

        # Zoom/Pan
        self.scale  = 1.0
        self.off_x  = 0.0
        self.off_y  = 0.0

        # Interaktion
        self._pan_start = None
        self._moved     = False
        self._hover_pin = None
        self._active    = None   # aktuell ausgewählter Planet-dict

        self._build_ui()
        self._fit_to_window()
        self._redraw()

    # ── UI ──────────────────────────────────────────────────────────────
    def _build_ui(self):
        # ── Topbar ──
        topbar = tk.Frame(self.root, bg=TOPBAR_BG, height=52)
        topbar.pack(fill="x")
        topbar.pack_propagate(False)

        tk.Label(topbar, text="✦  STAR WARS GALAXY MAP",
                 bg=TOPBAR_BG, fg=TEXT,
                 font=("Segoe UI", 12, "bold")).pack(side="left", padx=16, pady=14)

        # Zoom-Buttons rechts
        btn_frame = tk.Frame(topbar, bg=TOPBAR_BG)
        btn_frame.pack(side="right", padx=12, pady=10)
        for label, cmd in [("−", self._zoom_out), ("Reset", self._reset),
                            ("+", self._zoom_in)]:
            tk.Button(btn_frame, text=label, command=cmd,
                      bg="#1a2740", fg=TEXT, relief="flat",
                      font=("Segoe UI", 10), padx=10, pady=2,
                      activebackground="#2a3d5a",
                      activeforeground=TEXT).pack(side="left", padx=2)

        # Suchfeld
        search_frame = tk.Frame(topbar, bg=TOPBAR_BG)
        search_frame.pack(side="right", padx=8, pady=10)

        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", self._on_search_change)
        search_entry = tk.Entry(search_frame, textvariable=self.search_var,
                                bg="#141f33", fg=TEXT, insertbackground=TEXT,
                                relief="flat", font=("Segoe UI", 10),
                                width=22)
        search_entry.pack(side="left", ipady=4, padx=(0, 2))
        search_entry.insert(0, "Planet suchen…")
        search_entry.bind("<FocusIn>",  lambda e: self._search_focus_in(search_entry))
        search_entry.bind("<FocusOut>", lambda e: self._search_focus_out(search_entry))
        search_entry.bind("<Return>",   self._on_search_enter)
        search_entry.bind("<Down>",     self._search_down)
        self.search_entry = search_entry

        # Dropdown-Listbox (als Toplevel-Popup)
        self._search_popup  = None
        self._search_results= []

        # ── Hauptbereich: Canvas + Panel ──
        main = tk.Frame(self.root, bg=BG)
        main.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(main, bg=BG,
                                highlightthickness=0, cursor="crosshair")
        self.canvas.pack(side="left", fill="both", expand=True)

        # Seitliches Infopanel
        self.panel = tk.Frame(main, bg=PANEL_BG, width=260)
        self.panel.pack(side="right", fill="y")
        self.panel.pack_propagate(False)
        self._build_info_panel()

        # Canvas-Bindings
        self.canvas.bind("<ButtonPress-1>",   self._on_press)
        self.canvas.bind("<B1-Motion>",       self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)
        self.canvas.bind("<MouseWheel>",      self._on_wheel)
        self.canvas.bind("<Button-4>",        self._on_wheel)
        self.canvas.bind("<Button-5>",        self._on_wheel)
        self.canvas.bind("<Motion>",          self._on_motion)
        self.canvas.bind("<Configure>",       lambda e: (self._fit_to_window(), self._redraw()))
        self.root.bind("<Escape>", lambda e: self.root.quit())
        self.root.bind("<q>",      lambda e: self.root.quit())

        # Status
        self.statusbar = tk.Label(self.root,
                                  text="Mausrad = Zoom  |  Ziehen = Pan  |  Klick auf Pin = Info",
                                  bg="#060a10", fg=MUTED,
                                  font=("Segoe UI", 8), anchor="w", padx=10)
        self.statusbar.pack(fill="x")

    def _build_info_panel(self):
        p = self.panel
        pad = {"padx": 16, "pady": 0}

        tk.Label(p, text="", bg=PANEL_BG).pack(pady=8)

        self.lbl_grid = tk.Label(p, text="",
                                 bg=PANEL_BG, fg=GOLD,
                                 font=("Segoe UI", 8, "bold"))
        self.lbl_grid.pack(anchor="w", **pad)

        self.lbl_name = tk.Label(p, text="Kein Planet ausgewählt",
                                 bg=PANEL_BG, fg=TEXT,
                                 font=("Segoe UI", 15, "bold"),
                                 wraplength=228, justify="left")
        self.lbl_name.pack(anchor="w", **pad, pady=(2, 4))

        self.lbl_region_badge = tk.Label(p, text="",
                                         bg=PANEL_BG, fg=ACCENT,
                                         font=("Segoe UI", 8),
                                         relief="flat", padx=8, pady=2)
        self.lbl_region_badge.pack(anchor="w", padx=16, pady=(0, 6))

        sep = tk.Frame(p, bg=PANEL_BORDER, height=1)
        sep.pack(fill="x", padx=12, pady=4)

        self.lbl_terrain_icon = tk.Label(p, text="",
                                          bg=PANEL_BG, fg=MUTED,
                                          font=("Segoe UI", 9))
        self.lbl_terrain_icon.pack(anchor="w", **pad, pady=(4, 8))

        self.lbl_desc = tk.Label(p, text="",
                                  bg=PANEL_BG, fg="#c8d8e8",
                                  font=("Segoe UI", 9),
                                  wraplength=228, justify="left")
        self.lbl_desc.pack(anchor="w", **pad)

        sep2 = tk.Frame(p, bg=PANEL_BORDER, height=1)
        sep2.pack(fill="x", padx=12, pady=12)

        # Planetenliste (Scrollbar)
        tk.Label(p, text="ALLE PLANETEN",
                 bg=PANEL_BG, fg=MUTED,
                 font=("Segoe UI", 7, "bold")).pack(anchor="w", padx=16)

        list_frame = tk.Frame(p, bg=PANEL_BG)
        list_frame.pack(fill="both", expand=True, padx=8, pady=4)

        scrollbar = tk.Scrollbar(list_frame, orient="vertical",
                                  bg=PANEL_BG, troughcolor=BG)
        self.planet_list = tk.Listbox(
            list_frame,
            bg="#0a1220", fg=TEXT,
            selectbackground="#1a3a5a",
            selectforeground=ACCENT,
            font=("Segoe UI", 9),
            relief="flat", bd=0,
            highlightthickness=0,
            yscrollcommand=scrollbar.set,
            activestyle="none",
        )
        scrollbar.config(command=self.planet_list.yview)
        scrollbar.pack(side="right", fill="y")
        self.planet_list.pack(side="left", fill="both", expand=True)

        for p_data in sorted(PLANETS, key=lambda x: x["name"]):
            self.planet_list.insert("end", f"  {p_data['name']}")

        self.planet_list.bind("<<ListboxSelect>>", self._on_list_select)

    # ── Koordinaten ─────────────────────────────────────────────────────
    def _canvas_to_norm(self, cx, cy):
        return ((cx - self.off_x) / (self.img_w * self.scale),
                (cy - self.off_y) / (self.img_h * self.scale))

    def _norm_to_canvas(self, nx, ny):
        return (nx * self.img_w * self.scale + self.off_x,
                ny * self.img_h * self.scale + self.off_y)

    def _fit_to_window(self):
        self.root.update_idletasks()
        cw = self.canvas.winfo_width()  or 900
        ch = self.canvas.winfo_height() or 700
        s  = min(cw / self.img_w, ch / self.img_h)
        self.scale = s
        self.off_x = (cw - self.img_w * s) / 2
        self.off_y = (ch - self.img_h * s) / 2

    # ── Zoom / Pan ──────────────────────────────────────────────────────
    def _on_wheel(self, event):
        factor = 1.15 if (event.num == 4 or event.delta > 0) else 1/1.15
        cx, cy = event.x, event.y
        self.off_x = cx - (cx - self.off_x) * factor
        self.off_y = cy - (cy - self.off_y) * factor
        self.scale = max(0.15, min(20.0, self.scale * factor))
        self._redraw()

    def _zoom_in(self):
        cw = self.canvas.winfo_width()  / 2
        ch = self.canvas.winfo_height() / 2
        self.off_x = cw - (cw - self.off_x) * 1.25
        self.off_y = ch - (ch - self.off_y) * 1.25
        self.scale = min(20.0, self.scale * 1.25)
        self._redraw()

    def _zoom_out(self):
        cw = self.canvas.winfo_width()  / 2
        ch = self.canvas.winfo_height() / 2
        self.off_x = cw - (cw - self.off_x) * 0.8
        self.off_y = ch - (ch - self.off_y) * 0.8
        self.scale = max(0.15, self.scale * 0.8)
        self._redraw()

    def _reset(self):
        self._fit_to_window()
        self._redraw()

    def _on_press(self, event):
        self._pan_start = (event.x, event.y, self.off_x, self.off_y)
        self._moved = False

    def _on_drag(self, event):
        if not self._pan_start: return
        dx = abs(event.x - self._pan_start[0])
        dy = abs(event.y - self._pan_start[1])
        if dx > 3 or dy > 3:
            self._moved = True
            sx, sy, ox, oy = self._pan_start
            self.off_x = ox + (event.x - sx)
            self.off_y = oy + (event.y - sy)
            self._redraw()

    def _on_release(self, event):
        if not self._moved:
            self._on_click(event)
        self._pan_start = None
        self._moved     = False

    # ── Hover & Klick ───────────────────────────────────────────────────
    def _hit_planet(self, cx, cy, tol_px=10) -> dict | None:
        best, best_d = None, tol_px
        for p in PLANETS:
            px, py = self._norm_to_canvas(p["x"], p["y"])
            d = math.hypot(cx - px, cy - py)
            if d < best_d:
                best_d, best = d, p
        return best

    def _on_motion(self, event):
        hit = self._hit_planet(event.x, event.y)
        if hit != self._hover_pin:
            self._hover_pin = hit
            if hit:
                self.canvas.config(cursor="hand2")
                self.statusbar.config(text=f"  {hit['name']}  –  {hit['grid']}  |  {hit['region']}")
            else:
                self.canvas.config(cursor="crosshair")
                self.statusbar.config(
                    text="Mausrad = Zoom  |  Ziehen = Pan  |  Klick auf Pin = Info")
            self._redraw()

    def _on_click(self, event):
        hit = self._hit_planet(event.x, event.y)
        if hit:
            self._select_planet(hit)

    def _select_planet(self, planet: dict):
        self._active = planet
        color = REGION_COLORS.get(planet["region"], ACCENT)

        self.lbl_grid.config(text=f"GRID  {planet['grid']}")
        self.lbl_name.config(text=planet["name"])
        self.lbl_region_badge.config(text=f"  {planet['region']}  ",
                                      fg=color, bg=PANEL_BG,
                                      relief="solid", bd=1,
                                      highlightbackground=color)
        self.lbl_terrain_icon.config(text=f"⬡  {planet['terrain']}")
        self.lbl_desc.config(text=planet["desc"])

        # Listbox synchronisieren
        names = sorted(p["name"] for p in PLANETS)
        if planet["name"] in names:
            idx = names.index(planet["name"])
            self.planet_list.selection_clear(0, "end")
            self.planet_list.selection_set(idx)
            self.planet_list.see(idx)

        self._redraw()

    def _on_list_select(self, event):
        sel = self.planet_list.curselection()
        if not sel: return
        name = self.planet_list.get(sel[0]).strip()
        p    = get_planet(name)
        if p:
            self._fly_to(p)
            self._select_planet(p)

    # ── Fly-To ──────────────────────────────────────────────────────────
    def _fly_to(self, planet: dict):
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        target_scale = max(self.scale, 3.5)
        self.scale   = target_scale
        self.off_x   = cw/2 - planet["x"] * self.img_w * target_scale
        self.off_y   = ch/2 - planet["y"] * self.img_h * target_scale
        self._redraw()

    # ── Suche ───────────────────────────────────────────────────────────
    def _search_focus_in(self, entry):
        if entry.get() == "Planet suchen…":
            entry.delete(0, "end")
            entry.config(fg=TEXT)

    def _search_focus_out(self, entry):
        if not entry.get():
            entry.insert(0, "Planet suchen…")
            entry.config(fg=MUTED)
        self._close_search_popup()

    def _on_search_change(self, *_):
        q = self.search_var.get().strip()
        if q in ("", "Planet suchen…"):
            self._close_search_popup()
            return
        hits = search_planets(q)[:8]
        if not hits:
            self._close_search_popup()
            return
        self._show_search_popup(hits)

    def _on_search_enter(self, event=None):
        q = self.search_var.get().strip()
        hits = search_planets(q)
        if hits:
            self._fly_to(hits[0])
            self._select_planet(hits[0])
            self.search_var.set(hits[0]["name"])
        self._close_search_popup()

    def _search_down(self, event=None):
        if self._search_popup:
            self._search_popup.focus_set()

    def _show_search_popup(self, hits):
        self._close_search_popup()
        popup = tk.Toplevel(self.root)
        popup.overrideredirect(True)
        popup.config(bg=PANEL_BG)

        # Position unter dem Suchfeld
        x = self.search_entry.winfo_rootx()
        y = self.search_entry.winfo_rooty() + self.search_entry.winfo_height() + 2
        popup.geometry(f"+{x}+{y}")

        lb = tk.Listbox(popup,
                        bg="#0a1220", fg=TEXT,
                        selectbackground="#1a3a5a",
                        selectforeground=ACCENT,
                        font=("Segoe UI", 9),
                        relief="flat", bd=0,
                        highlightthickness=1,
                        highlightcolor=PANEL_BORDER,
                        width=30, height=min(len(hits), 8))
        lb.pack()

        self._search_results = hits
        for h in hits:
            lb.insert("end", f"  {h['name']}  ({h['region']})")

        def on_select(e):
            sel = lb.curselection()
            if sel:
                p = hits[sel[0]]
                self._fly_to(p)
                self._select_planet(p)
                self.search_var.set(p["name"])
                self._close_search_popup()

        lb.bind("<<ListboxSelect>>", on_select)
        lb.bind("<Return>", on_select)
        lb.bind("<Escape>", lambda e: self._close_search_popup())

        self._search_popup = popup

    def _close_search_popup(self):
        if self._search_popup:
            self._search_popup.destroy()
            self._search_popup = None

    # ── Zeichnen ────────────────────────────────────────────────────────
    def _redraw(self):
        self.canvas.delete("all")

        # Kartenbild
        disp_w = max(1, int(self.img_w * self.scale))
        disp_h = max(1, int(self.img_h * self.scale))
        resized      = self.pil_img.resize((disp_w, disp_h), Image.LANCZOS)
        self._tk_img = ImageTk.PhotoImage(resized)
        self.canvas.create_image(self.off_x, self.off_y,
                                  anchor="nw", image=self._tk_img)

        # Pins
        for p in PLANETS:
            cx, cy = self._norm_to_canvas(p["x"], p["y"])
            is_active = self._active and self._active["name"] == p["name"]
            is_hover  = self._hover_pin and self._hover_pin["name"] == p["name"]

            r     = PIN_R
            color = REGION_COLORS.get(p["region"], PIN_NORMAL)

            if is_active:
                r, color = PIN_R + 3, PIN_ACTIVE
                # Leuchtring
                self.canvas.create_oval(cx-r-3, cy-r-3, cx+r+3, cy+r+3,
                                         outline=PIN_ACTIVE, width=1,
                                         dash=(3, 3))
            elif is_hover:
                r, color = PIN_R + 2, PIN_HOVER

            self.canvas.create_oval(cx-r, cy-r, cx+r, cy+r,
                                     fill=color, outline="white", width=1)

            # Label: Immer zeichnen, damit die Karte ohne PNG funktioniert.
            # Die Schriftgröße wird an den Zoom angepasst, um die Lesbarkeit zu gewährleisten.
            fs = max(6, min(11, int(8 * self.scale)))
            self.canvas.create_text(
                cx + r + 3, cy,
                text=p["name"], anchor="w",
                fill=TEXT if (is_active or is_hover) else "#aabbcc",
                font=("Segoe UI", fs),
            )

    # ── Legende ─────────────────────────────────────────────────────────
    def _draw_legend(self):
        x, y = 14, self.canvas.winfo_height() - 14
        for region, color in reversed(list(REGION_COLORS.items())):
            self.canvas.create_oval(x, y-6, x+10, y+4,
                                     fill=color, outline="")
            self.canvas.create_text(x+14, y-1, text=region,
                                     anchor="w", fill=MUTED,
                                     font=("Segoe UI", 7))
            y -= 14


# ── Main ───────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        image_path = Path(__file__).parent / "image.png"
        if not image_path.exists():
            print("Verwendung: python viewer.py image.png")
            sys.exit(1)
    else:
        image_path = Path(sys.argv[1])

    if not image_path.exists():
        print(f"Datei nicht gefunden: {image_path}")
        sys.exit(1)

    root = tk.Tk()
    root.geometry("1400x860")
    ViewerApp(root, str(image_path))
    root.mainloop()


if __name__ == "__main__":
    main()
