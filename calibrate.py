"""
calibrate.py - Faster planet calibration workflow for the galaxy map.

Usage:
  python calibrate.py image.png

Highlights:
  - Pick a planet from the pending list, then place it with one click
  - Optional brightness-based auto snap around the click position
  - One-click full auto run: PNG -> refine
  - Batch auto-placement from the PNG for seeded planets
  - Undo, keyboard nudging, and quick manual-name mode
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import time
import tkinter as tk
from collections import defaultdict
from copy import deepcopy
from itertools import combinations
from pathlib import Path
from tkinter import messagebox, simpledialog
from typing import Any

try:
    from PIL import Image, ImageFilter, ImageOps, ImageTk
except ImportError:
    print("Bitte zuerst: pip install pillow --break-system-packages")
    sys.exit(1)

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

sys.path.insert(0, str(Path(__file__).parent))
try:
    from planets import PLANETS
except ImportError:
    PLANETS = []


PIN_R = 5
BG_COLOR = "#080c12"
PANEL_BG = "#0d1420"
PANEL_BG_ALT = "#101a29"
TEXT_COLOR = "#e8edf5"
MUTED_COLOR = "#6b7a96"
ACCENT = "#4fa3d4"
ACCENT_ALT = "#7dc8ff"
PIN_KNOWN = "#c9922a"
PIN_BG = "#334455"
PIN_ACTIVE = "#88ff88"
PIN_GRID = "#ff6f91"
PIN_GRID_OUTLINE = "#ffd1db"
SNAP_RING = "#ffd166"
ACTIVE_RING = "#fff0a6"
GRID_LETTERS = "ABCDEFGHIJKLMNOPQRSTUV"
GRID_ROWS = 22
GRID_COLS = len(GRID_LETTERS)
GRID_REVIEW_RING = "#5ed7d3"
MAX_ZOOM_SCALE = 2.0
PENDING_FOCUS_ZOOM = 6.0
SNAP_LEARNING_MAX_SAMPLES = 600
SNAP_LEARNING_MIN_SAMPLES = 2
VECTOR_CURVE = "#6fe8f5"
VECTOR_CURVE_ACTIVE = "#ffd166"
VECTOR_HANDLE = "#8fb8ff"
VECTOR_HANDLE_ACTIVE = "#fff4a3"
VECTOR_NODE = "#f3fbff"
VECTOR_NODE_ACTIVE = "#ffcf70"
VECTOR_DIM = "#58636f"
VECTOR_LAYER_DIM = "#7b828d"
GRID_GUIDE = "#4fd7c8"
GRID_GUIDE_ACTIVE = "#ffd166"
GRID_SPACING_STEP = 0.25
GRID_SPACING_BASE_WINDOW = 320.0
FILL_SWATCHES = [
    ("Keine", ""),
    ("Weiss 100", "#ffffff"),
    ("Weiss 85", "#d9d9d9"),
    ("Grau 70", "#b3b3b3"),
    ("Grau 55", "#8c8c8c"),
    ("Grau 40", "#666666"),
]
ROUTE_PLANET_ALIASES = {
    "abregado": "Abregado-rae",
    "columex": "Columnex",
    "allanteen six": "Allanteen",
    "algara ii": "Algara",
    "andosha ii": "Andosha",
    "bestine iv": "Bestine",
    "jiroch-reslia": "Jiroch",
    "mytus vii": "Mytus",
    "thaere privo": "Thaere",
}
SIDEBAR_MIN_WIDTH = 340
SIDEBAR_DEFAULT_WIDTH = 390
SIDEBAR_HANDLE_WIDTH = 18
SIDEBAR_MIN_CANVAS_WIDTH = 520
SIDEBAR_MAX_WIDTH = 760
INTERACTIVE_SETTLE_MS = 120
INTERACTIVE_VECTOR_SAMPLE_STEPS = 6
EDITOR_VECTOR_SAMPLE_STEPS = 14
IDLE_VECTOR_SAMPLE_STEPS = 18
INTERACTIVE_SELECTION_SAMPLE_STEPS = 14
IDLE_SELECTION_SAMPLE_STEPS = 24
INTERACTIVE_PYRAMID_DOWNGRADE = 2
EDITOR_PYRAMID_DOWNGRADE = 1
HYPER_NETWORK_SAMPLE_STEPS = 24
HYPER_NETWORK_INTERSECTION_TOLERANCE_PX = 2.5
HYPER_NETWORK_NODE_MERGE_TOLERANCE_PX = 8.0
HYPER_NETWORK_PLANET_TOLERANCE_PX = 24.0


class CalibrateApp:
    def __init__(self, root: tk.Tk, image_path: str):
        self.root = root
        self.root.title("Star Wars Map Calibrator")
        self.root.configure(bg=BG_COLOR)
        self.image_path = Path(image_path).resolve()

        self.pil_img = Image.open(self.image_path).convert("RGB")
        self.luma_img = self.pil_img.convert("L")
        self.img_w, self.img_h = self.pil_img.size
        self._build_image_pyramid()

        self.scale = 1.0
        self.off_x = 0.0
        self.off_y = 0.0
        self._pan_start = None
        self._moved = False
        self._drag_item: tuple[str, str | int] | None = None
        self._interactive_render = False
        self._settle_after_id: str | None = None

        self.known_by_name = {p["name"].lower(): p for p in PLANETS}
        self.known_names = sorted({p["name"] for p in PLANETS}, key=str.lower)

        self.calibrated_path = Path(__file__).parent / "calibrated_planets.json"
        self.grid_markers_path = Path(__file__).parent / "grid_markers.json"
        self.vector_paths_path = Path(__file__).parent / "rim_curves.json"
        self.hyperspace_routes_path = Path(__file__).parent / "hyperspace_routes.json"
        self.grid_guides_path = Path(__file__).parent / "grid_guides.json"
        self.snap_learning_path = Path(__file__).parent / "snap_learning.json"
        self.calibrated: dict[str, dict] = {}
        self.grid_markers: dict[str, dict] = {}
        self.vector_paths: list[dict[str, Any]] = []
        self.hyperspace_routes: list[dict[str, Any]] = []
        self.hyperspace_network: dict[str, Any] = {}
        self.grid_guides: list[dict[str, Any]] = []
        self.history: list[tuple[str, str, str, dict | None]] = []
        self.vector_history: list[dict[str, Any]] = []
        self.active_name: str | None = None
        self.active_vector_path_id: str | None = None
        self.active_vector_layer_id: str | None = None
        self.active_vector_point_index: int | None = None
        self.active_vector_handle: tuple[int, str] | None = None
        self.active_grid_guide_id: str | None = None
        self.last_snap: tuple[float, float] | None = None
        self.snap_learning_samples: list[dict] = []
        self.snap_feedback_pending: dict[str, dict] = {}
        self.pointer_norm: tuple[float, float] | None = None
        self.remaining_txt_path = Path(__file__).parent / "remaining_planets.txt"
        self.remaining_json_path = Path(__file__).parent / "remaining_planets.json"
        self.focused_grid: str | None = None
        self.vector_drag_state: dict[str, Any] | None = None
        self._drag_item_previous: dict | None = None
        self._mode_locked_widgets: list[tk.Widget] = []
        self._vector_tool_buttons: dict[str, tk.Button] = {}
        self._hyper_action_buttons: dict[str, tk.Button] = {}
        self._fill_swatch_buttons: dict[str, tk.Button] = {}
        self._vector_id_counter = 1
        self._grid_guide_id_counter = 1
        self._layer_list_ids: list[str] = []
        self._syncing_layer_controls = False
        self._syncing_grid_controls = False
        self._layer_opacity_drag_active = False
        self._grid_spacing_drag_axis: str | None = None
        self._initial_view_ready = False
        self.sidebar_width = SIDEBAR_DEFAULT_WIDTH
        self._sidebar_resize_state: dict[str, Any] | None = None
        self._sidebar_wrap_widgets: list[tk.Widget] = []
        self._redraw_after_id: str | None = None

        self.auto_snap = tk.BooleanVar(value=True)
        self.filter_var = tk.StringVar()
        self.grid_var = tk.StringVar(value="")
        self.tool_mode = tk.StringVar(value="calibrate")
        self.hyper_action_var = tk.StringVar(value="select")
        self.current_var = tk.StringVar(value="Kein Planet aktiv")
        self.counter_var = tk.StringVar(value="")
        self.coord_var = tk.StringVar(value="x=--  y=--")
        self.vector_info_var = tk.StringVar(value="Kurvenmodus aus")
        self.layer_var = tk.StringVar(value="Keine Rim-Ebene aktiv")
        self.layer_opacity_var = tk.IntVar(value=100)
        self.layer_fill_var = tk.StringVar(value="")
        self.grid_guide_var = tk.StringVar(value="Kein Linien-Grid aktiv")
        self.grid_spacing_x_var = tk.DoubleVar(value=80.0)
        self.grid_spacing_y_var = tk.DoubleVar(value=80.0)
        self.status_var = tk.StringVar(
            value="Planet links waehlen oder PNG-Auto nutzen, dann auf die Karte klicken."
        )
        self.hyper_selected_planet: dict[str, Any] | None = None
        self.active_hyper_segment: dict[str, Any] | None = None
        self.hyper_box_selection: dict[str, Any] | None = None

        self._load_existing()
        self._build_ui()
        self._bind_shortcuts()
        self._fit_to_window()
        self._refresh_pending_list()
        self._redraw()
        self.root.after(0, self._ensure_initial_view_loaded)

    def _build_ui(self):
        top = tk.Frame(self.root, bg=PANEL_BG, height=48)
        top.pack(fill="x")
        top.pack_propagate(False)

        tk.Label(
            top,
            text="STAR WARS MAP CALIBRATOR",
            bg=PANEL_BG,
            fg=TEXT_COLOR,
            font=("Segoe UI", 11, "bold"),
        ).pack(side="left", padx=14)

        self.auto_snap_toggle = tk.Checkbutton(
            top,
            text="Auto-Snap",
            variable=self.auto_snap,
            bg=PANEL_BG,
            fg=TEXT_COLOR,
            selectcolor=PANEL_BG,
            activebackground=PANEL_BG,
            activeforeground=TEXT_COLOR,
            highlightthickness=0,
            font=("Segoe UI", 9),
        )
        self.auto_snap_toggle.pack(side="right", padx=(0, 8))

        tk.Button(
            top,
            text="Speichern (S)",
            command=self._save,
            bg="#1a2740",
            fg=TEXT_COLOR,
            relief="flat",
            padx=10,
        ).pack(side="right", padx=8, pady=8)

        main = tk.Frame(self.root, bg=BG_COLOR)
        main.pack(fill="both", expand=True)

        sidebar = tk.Frame(main, bg=PANEL_BG_ALT, width=self.sidebar_width)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        sidebar.bind("<Configure>", self._on_sidebar_configure)
        self.sidebar = sidebar

        current_label = tk.Label(
            sidebar,
            textvariable=self.current_var,
            bg=PANEL_BG_ALT,
            fg=PIN_ACTIVE,
            font=("Segoe UI", 12, "bold"),
            wraplength=268,
            justify="left",
            anchor="w",
        )
        current_label.pack(fill="x", padx=14, pady=(14, 4))
        self._track_sidebar_wrap(current_label)

        tk.Label(
            sidebar,
            textvariable=self.counter_var,
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 9),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 10))

        tk.Frame(sidebar, bg="#1f2b3c", height=1).pack(fill="x", padx=12, pady=(0, 12))

        vector_row = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        vector_row.pack(fill="x", padx=14, pady=(0, 10))

        for mode, label, color in (
            ("calibrate", "Kalibrieren", "#22344d"),
            ("bezier", "Bezier (B)", "#27463f"),
            ("subdivide", "Subdiv (X)", "#4d3a24"),
            ("hyper", "Hyperroute", "#412b50"),
        ):
            button = tk.Button(
                vector_row,
                text=label,
                command=lambda target=mode: self._set_tool_mode(target),
                bg=color,
                fg=TEXT_COLOR,
                relief="flat",
                padx=8,
            )
            button.pack(
                side="left",
                fill="x",
                expand=True,
                padx=(0, 6) if mode != "hyper" else 0,
            )
            self._vector_tool_buttons[mode] = button

        vector_info_label = tk.Label(
            sidebar,
            textvariable=self.vector_info_var,
            bg=PANEL_BG_ALT,
            fg=ACCENT_ALT,
            font=("Segoe UI", 8),
            wraplength=268,
            justify="left",
            anchor="w",
        )
        vector_info_label.pack(fill="x", padx=14, pady=(0, 10))
        self._track_sidebar_wrap(vector_info_label)

        tk.Label(
            sidebar,
            text="HYPERRAUM-AKTION",
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 7, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 4))

        hyper_action_row = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        hyper_action_row.pack(fill="x", padx=14, pady=(0, 10))

        for action, label, color in (
            ("select", "Auswahl", "#2b3948"),
            ("extend", "Erweitern", "#264436"),
            ("delete", "Loeschen", "#4a2a2a"),
        ):
            button = tk.Button(
                hyper_action_row,
                text=label,
                command=lambda target=action: self._set_hyper_action(target),
                bg=color,
                fg=TEXT_COLOR,
                relief="flat",
                padx=8,
            )
            button.pack(
                side="left",
                fill="x",
                expand=True,
                padx=(0, 6) if action != "delete" else 0,
            )
            self._hyper_action_buttons[action] = button

        tk.Label(
            sidebar,
            text="RIM-LAYER",
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 7, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 4))

        layer_label = tk.Label(
            sidebar,
            textvariable=self.layer_var,
            bg=PANEL_BG_ALT,
            fg=ACCENT_ALT,
            font=("Segoe UI", 8),
            justify="left",
            anchor="w",
        )
        layer_label.pack(fill="x", padx=14, pady=(0, 6))
        self._track_sidebar_wrap(layer_label)

        layer_actions = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        layer_actions.pack(fill="x", padx=14, pady=(0, 6))

        tk.Button(
            layer_actions,
            text="Neue Ebene",
            command=self._create_empty_vector_layer,
            bg="#1b3b35",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        ).pack(side="left", fill="x", expand=True)

        tk.Button(
            layer_actions,
            text="Umbenennen",
            command=self._rename_active_vector_layer,
            bg="#28374f",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        ).pack(side="left", fill="x", expand=True, padx=(6, 0))

        layer_list_frame = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        layer_list_frame.pack(fill="x", padx=14, pady=(0, 10))

        layer_scroll = tk.Scrollbar(layer_list_frame, orient="vertical")
        self.layer_list = tk.Listbox(
            layer_list_frame,
            bg="#08101a",
            fg=TEXT_COLOR,
            selectbackground="#214a52",
            selectforeground=TEXT_COLOR,
            relief="flat",
            highlightthickness=0,
            font=("Segoe UI", 8),
            height=5,
            yscrollcommand=layer_scroll.set,
            activestyle="none",
        )
        layer_scroll.config(command=self.layer_list.yview)
        layer_scroll.pack(side="right", fill="y")
        self.layer_list.pack(side="left", fill="x", expand=True)
        self.layer_list.bind("<<ListboxSelect>>", self._on_layer_select)
        self.layer_list.bind("<Double-Button-1>", lambda _e: self._rename_active_vector_layer())

        tk.Label(
            sidebar,
            text="LAYER-TRANSPARENZ",
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 7, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 4))

        self.layer_opacity_scale = tk.Scale(
            sidebar,
            from_=0,
            to=100,
            orient="horizontal",
            variable=self.layer_opacity_var,
            command=self._on_layer_opacity_change,
            bg=PANEL_BG_ALT,
            fg=TEXT_COLOR,
            troughcolor="#0e1825",
            highlightthickness=0,
            activebackground=PANEL_BG_ALT,
            length=250,
        )
        self.layer_opacity_scale.pack(fill="x", padx=14, pady=(0, 10))
        self.layer_opacity_scale.bind("<ButtonRelease-1>", self._finish_layer_opacity_drag)

        tk.Label(
            sidebar,
            text="FUELL-EIMER",
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 7, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 4))

        fill_frame = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        fill_frame.pack(fill="x", padx=14, pady=(0, 10))

        for index, (label, tone) in enumerate(FILL_SWATCHES):
            button = tk.Button(
                fill_frame,
                text="Aus" if not tone else "",
                command=lambda value=tone: self._apply_fill_swatch(value),
                bg="#10151d" if not tone else tone,
                fg=TEXT_COLOR if not tone else "#111111",
                relief="flat",
                width=5 if not tone else 3,
                padx=4,
            )
            row = 0 if index < 3 else 1
            col = index if index < 3 else index - 3
            button.grid(row=row, column=col, padx=3, pady=3, sticky="ew")
            self._fill_swatch_buttons[tone] = button
        for col in range(3):
            fill_frame.grid_columnconfigure(col, weight=1)

        filter_entry = tk.Entry(
            sidebar,
            textvariable=self.filter_var,
            bg="#121c2a",
            fg=TEXT_COLOR,
            insertbackground=TEXT_COLOR,
            relief="flat",
            font=("Segoe UI", 10),
        )
        filter_entry.pack(fill="x", padx=14, pady=(0, 8), ipady=4)
        filter_entry.bind("<Return>", lambda _e: self._activate_first_visible())
        self._register_mode_locked_widget(filter_entry)

        action_row = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        action_row.pack(fill="x", padx=14, pady=(0, 8))

        manual_button = tk.Button(
            action_row,
            text="Manueller Name (A)",
            command=self._activate_manual_name,
            bg="#162336",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        )
        manual_button.pack(side="left", fill="x", expand=True)
        self._register_mode_locked_widget(manual_button)

        clear_button = tk.Button(
            action_row,
            text="Aktiv loeschen (C)",
            command=self._clear_active_name,
            bg="#2a1010",
            fg="#ffaaaa",
            relief="flat",
            padx=8,
        )
        clear_button.pack(side="left", fill="x", expand=True, padx=(6, 0))
        self._register_mode_locked_widget(clear_button)

        batch_row = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        batch_row.pack(fill="x", padx=14, pady=(0, 8))

        auto_button = tk.Button(
            batch_row,
            text="Auto komplett (E)",
            command=self._run_full_auto,
            bg="#31557b",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        )
        auto_button.pack(side="left", fill="x", expand=True)
        self._register_mode_locked_widget(auto_button)

        fill_button = tk.Button(
            batch_row,
            text="PNG -> offene (F)",
            command=self._auto_fill_pending_from_image,
            bg="#1c334d",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        )
        fill_button.pack(side="left", fill="x", expand=True, padx=(6, 0))
        self._register_mode_locked_widget(fill_button)

        refine_button = tk.Button(
            batch_row,
            text="Pins nachziehen (R)",
            command=self._refine_existing_from_image,
            bg="#203247",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        )
        refine_button.pack(side="left", fill="x", expand=True, padx=(6, 0))
        self._register_mode_locked_widget(refine_button)

        grid_row = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        grid_row.pack(fill="x", padx=14, pady=(0, 10))

        self.grid_entry = tk.Entry(
            grid_row,
            textvariable=self.grid_var,
            bg="#10251f",
            fg="#d7fff2",
            insertbackground=TEXT_COLOR,
            relief="flat",
            font=("Consolas", 10),
            width=8,
        )
        self.grid_entry.pack(side="left", fill="x", expand=True, ipady=4)
        self.grid_entry.bind("<Return>", lambda _e: self._focus_current_grid())
        self._register_mode_locked_widget(self.grid_entry)

        focus_button = tk.Button(
            grid_row,
            text="Fokus (H)",
            command=self._focus_current_grid,
            bg="#1c4a45",
            fg=TEXT_COLOR,
            relief="flat",
            padx=8,
        )
        focus_button.pack(side="left", padx=(6, 0))
        self._register_mode_locked_widget(focus_button)

        tk.Label(
            sidebar,
            text="OFFENE PLANETEN",
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 7, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 4))

        list_frame = tk.Frame(sidebar, bg=PANEL_BG_ALT)
        list_frame.pack(fill="both", expand=True, padx=14, pady=(0, 8))

        scrollbar = tk.Scrollbar(list_frame, orient="vertical")
        self.pending_list = tk.Listbox(
            list_frame,
            bg="#0b1220",
            fg=TEXT_COLOR,
            selectbackground="#1a3a5a",
            selectforeground=TEXT_COLOR,
            relief="flat",
            highlightthickness=0,
            font=("Segoe UI", 9),
            yscrollcommand=scrollbar.set,
            activestyle="none",
        )
        scrollbar.config(command=self.pending_list.yview)
        scrollbar.pack(side="right", fill="y")
        self._register_mode_locked_widget(scrollbar)
        self.pending_list.pack(side="left", fill="both", expand=True)
        self.pending_list.bind("<<ListboxSelect>>", self._on_pending_select)
        self.filter_var.trace_add("write", lambda *_: self._refresh_pending_list())
        self._register_mode_locked_widget(self.pending_list)

        tk.Label(
            sidebar,
            textvariable=self.coord_var,
            bg=PANEL_BG_ALT,
            fg=ACCENT_ALT,
            font=("Consolas", 9),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 6))

        shortcuts_label = tk.Label(
            sidebar,
            text=(
                "Shortcuts: E = Auto komplett, H = Grid fokussieren, "
                "F = PNG fuer offene, "
                "R = gesetzte Pins nachziehen, "
                "N/P naechster Planet, Pfeile = fein verschieben, "
                "Shift+Pfeile = grob, Z = Undo\n"
                "Routen: B = Rim-Tool, X = Subdivide, T = Hyperroute, Enter = offenen Pfad abschliessen, Entf = Auswahl loeschen"
            ),
            bg=PANEL_BG_ALT,
            fg=MUTED_COLOR,
            font=("Segoe UI", 8),
            wraplength=268,
            justify="left",
            anchor="w",
        )
        shortcuts_label.pack(fill="x", padx=14, pady=(0, 12))
        self._track_sidebar_wrap(shortcuts_label)

        resize_handle = tk.Frame(
            main,
            bg="#162235",
            width=SIDEBAR_HANDLE_WIDTH,
            cursor="sb_h_double_arrow",
        )
        resize_handle.pack(side="left", fill="y")
        resize_handle.pack_propagate(False)
        self.sidebar_resize_handle = resize_handle
        resize_grip = tk.Label(
            resize_handle,
            text="|||",
            bg="#162235",
            fg="#4a5f7d",
            font=("Consolas", 8),
        )
        resize_grip.place(relx=0.5, rely=0.5, anchor="center")
        for widget in (resize_handle, resize_grip):
            widget.bind("<ButtonPress-1>", self._start_sidebar_resize)
            widget.bind("<B1-Motion>", self._on_sidebar_resize_drag)
            widget.bind("<ButtonRelease-1>", self._finish_sidebar_resize)
            widget.bind("<Double-Button-1>", self._reset_sidebar_width)

        self.canvas = tk.Canvas(
            main,
            bg=BG_COLOR,
            cursor="crosshair",
            highlightthickness=0,
        )
        self.canvas.pack(side="left", fill="both", expand=True)

        self.canvas.bind("<ButtonPress-1>", self._on_left_press)
        self.canvas.bind("<B1-Motion>", self._on_pan_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)
        self.canvas.bind("<ButtonPress-2>", self._on_mid_press)
        self.canvas.bind("<B2-Motion>", self._on_mid_drag)
        self.canvas.bind("<ButtonPress-3>", self._on_right_click)
        self.canvas.bind("<MouseWheel>", self._on_wheel)
        self.canvas.bind("<Button-4>", self._on_wheel)
        self.canvas.bind("<Button-5>", self._on_wheel)
        self.canvas.bind("<Motion>", self._on_motion)
        self.canvas.bind("<Configure>", lambda _e: self._redraw())

        status = tk.Label(
            self.root,
            textvariable=self.status_var,
            bg="#060a10",
            fg=MUTED_COLOR,
            anchor="w",
            padx=10,
            font=("Segoe UI", 8),
        )
        status.pack(fill="x")
        self._register_mode_locked_widget(self.auto_snap_toggle)
        self._update_tool_mode_ui()
        self._sync_sidebar_layout()

    def _register_mode_locked_widget(self, widget: tk.Widget):
        self._mode_locked_widgets.append(widget)

    def _track_sidebar_wrap(self, widget: tk.Widget):
        self._sidebar_wrap_widgets.append(widget)

    def _sidebar_max_width(self) -> int:
        available = max(
            self.root.winfo_width(),
            self.root.winfo_reqwidth(),
            SIDEBAR_DEFAULT_WIDTH + SIDEBAR_MIN_CANVAS_WIDTH + SIDEBAR_HANDLE_WIDTH,
        )
        max_width = min(SIDEBAR_MAX_WIDTH, available - SIDEBAR_MIN_CANVAS_WIDTH - SIDEBAR_HANDLE_WIDTH)
        return max(SIDEBAR_MIN_WIDTH, max_width)

    def _apply_sidebar_width(self, width: int):
        clamped = int(max(SIDEBAR_MIN_WIDTH, min(self._sidebar_max_width(), int(width))))
        self.sidebar_width = clamped
        if hasattr(self, "sidebar"):
            self.sidebar.configure(width=clamped)
        self._sync_sidebar_layout()

    def _sync_sidebar_layout(self):
        if not hasattr(self, "sidebar"):
            return
        width = self.sidebar.winfo_width() or self.sidebar_width
        wraplength = max(190, width - 32)
        for widget in self._sidebar_wrap_widgets:
            try:
                widget.configure(wraplength=wraplength)
            except tk.TclError:
                continue
        if hasattr(self, "layer_opacity_scale"):
            self.layer_opacity_scale.configure(length=max(220, width - 40))

    def _on_sidebar_configure(self, _event=None):
        self._sync_sidebar_layout()

    def _start_sidebar_resize(self, event):
        self._sidebar_resize_state = {
            "origin_root_x": event.x_root,
            "origin_width": self.sidebar.winfo_width() or self.sidebar_width,
        }
        self.root.configure(cursor="sb_h_double_arrow")
        self._set_interactive_render(True)

    def _on_sidebar_resize_drag(self, event):
        if self._sidebar_resize_state is None:
            return
        delta = event.x_root - int(self._sidebar_resize_state["origin_root_x"])
        self._apply_sidebar_width(int(self._sidebar_resize_state["origin_width"]) + delta)
        self._set_interactive_render(True)
        self._redraw()

    def _finish_sidebar_resize(self, _event=None):
        if self._sidebar_resize_state is None:
            return
        self._sidebar_resize_state = None
        self.root.configure(cursor="")
        self._redraw()

    def _reset_sidebar_width(self, _event=None):
        self._sidebar_resize_state = None
        self.root.configure(cursor="")
        self._apply_sidebar_width(SIDEBAR_DEFAULT_WIDTH)
        self._set_interactive_render(True)
        self._redraw()

    def _editor_mode_active(self) -> bool:
        return self.tool_mode.get() in {"bezier", "subdivide", "hyper"}

    def _path_tool_active(self) -> bool:
        return self.tool_mode.get() in {"bezier", "subdivide", "hyper"}

    def _vector_mode_active(self) -> bool:
        return self.tool_mode.get() in {"bezier", "subdivide"}

    def _hyperspace_tool_active(self) -> bool:
        return self.tool_mode.get() == "hyper"

    def _grid_tool_active(self) -> bool:
        return self.tool_mode.get() == "grid"

    def _require_calibration_mode(self, message: str | None = None) -> bool:
        if not self._editor_mode_active():
            return True
        if message is None:
            message = (
                "Ein Bearbeitungstool ist aktiv. Zum Kalibrieren bitte zuerst zurueck auf "
                '"Kalibrieren" wechseln.'
            )
        self.status_var.set(message)
        return False

    def _editable_vector_paths(self) -> list[dict[str, Any]]:
        if not self._path_tool_active():
            return self.vector_paths
        paths = self._vector_layer_paths()
        if paths:
            return paths
        active = self._active_vector_path()
        return [active] if active is not None else []

    def _next_grid_guide_id(self) -> str:
        guide_id = f"grid-guide-{self._grid_guide_id_counter:03d}"
        self._grid_guide_id_counter += 1
        return guide_id

    def _find_grid_guide(self, guide_id: str | None) -> dict[str, Any] | None:
        if guide_id is None:
            return None
        for guide in self.grid_guides:
            if str(guide.get("id")) == str(guide_id):
                return guide
        return None

    def _active_grid_guide(self) -> dict[str, Any] | None:
        guide = self._find_grid_guide(self.active_grid_guide_id)
        if guide is None:
            self.active_grid_guide_id = None
        return guide

    def _find_vector_path(self, path_id: str | None) -> dict[str, Any] | None:
        if path_id is None:
            return None
        for path in self.vector_paths:
            if str(path.get("id")) == str(path_id):
                return path
        return None

    def _vector_layer_id(self, path: dict[str, Any]) -> str:
        layer_id = str(path.get("layer_id") or path.get("id") or "")
        path["layer_id"] = layer_id
        return layer_id

    def _vector_layer_paths(self, layer_id: str | None = None) -> list[dict[str, Any]]:
        target_layer_id = layer_id if layer_id is not None else self.active_vector_layer_id
        if target_layer_id is None and self.active_vector_path_id is not None:
            active = self._find_vector_path(self.active_vector_path_id)
            if active is not None:
                target_layer_id = self._vector_layer_id(active)
                self.active_vector_layer_id = target_layer_id
        if target_layer_id is None:
            return []
        paths = [
            path
            for path in self.vector_paths
            if self._vector_layer_id(path) == str(target_layer_id)
        ]
        if not paths and layer_id is None:
            self.active_vector_layer_id = None
        return paths

    def _vector_layer_entries(self) -> list[dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = {}
        order: list[str] = []
        for path in self.vector_paths:
            layer_id = self._vector_layer_id(path)
            if layer_id not in grouped:
                grouped[layer_id] = []
                order.append(layer_id)
            grouped[layer_id].append(path)
        return [
            {
                "layer_id": layer_id,
                "paths": grouped[layer_id],
                "representative": grouped[layer_id][-1],
            }
            for layer_id in order
        ]

    def _sync_vector_layer_metadata(
        self,
        layer_id: str,
        *,
        name: str | None = None,
        opacity_pct: int | None = None,
        fill_tone: str | None = None,
    ):
        for path in self._vector_layer_paths(layer_id):
            if name is not None:
                path["name"] = name
            if opacity_pct is not None:
                path["opacity_pct"] = opacity_pct
            if fill_tone is not None:
                path["fill_tone"] = fill_tone
            self._ensure_vector_path_style(path)

    def _format_grid_spacing(self, value: float) -> str:
        rounded = round(float(value), 2)
        if abs(rounded - round(rounded)) < 1e-6:
            return str(int(round(rounded)))
        if abs(rounded * 2 - round(rounded * 2)) < 1e-6:
            return f"{rounded:.1f}"
        return f"{rounded:.2f}"

    def _grid_spacing_slider_bounds(self, spacing: float, axis: str) -> tuple[float, float]:
        limit = float(self.img_w if axis == "x" else self.img_h)
        span = max(
            GRID_SPACING_BASE_WINDOW * 2.0,
            abs(float(spacing)) * 1.5 + GRID_SPACING_BASE_WINDOW,
        )
        span = min(limit * 2.0, span)
        half_span = span / 2.0
        lower = max(-limit, float(spacing) - half_span)
        upper = min(limit, float(spacing) + half_span)
        if upper - lower < GRID_SPACING_STEP * 2.0:
            lower = max(-limit, float(spacing) - GRID_SPACING_BASE_WINDOW)
            upper = min(limit, float(spacing) + GRID_SPACING_BASE_WINDOW)
        return lower, upper

    def _update_grid_spacing_scale_ranges(self, guide: dict[str, Any] | None):
        if not hasattr(self, "grid_spacing_x_scale"):
            return
        if guide is None or guide.get("kind") != "line-grid":
            self.grid_spacing_x_scale.configure(
                from_=-GRID_SPACING_BASE_WINDOW,
                to=GRID_SPACING_BASE_WINDOW,
            )
            self.grid_spacing_y_scale.configure(
                from_=-GRID_SPACING_BASE_WINDOW,
                to=GRID_SPACING_BASE_WINDOW,
            )
            return
        spacing_x = float(guide.get("spacing_x_px", 80.0))
        spacing_y = float(guide.get("spacing_y_px", 80.0))
        x_from, x_to = self._grid_spacing_slider_bounds(spacing_x, "x")
        y_from, y_to = self._grid_spacing_slider_bounds(spacing_y, "y")
        self.grid_spacing_x_scale.configure(from_=x_from, to=x_to)
        self.grid_spacing_y_scale.configure(from_=y_from, to=y_to)

    def _sync_grid_controls(self):
        if not hasattr(self, "grid_spacing_x_scale"):
            return
        self._syncing_grid_controls = True
        try:
            guide = self._active_grid_guide()
            if guide is None or guide.get("kind") != "line-grid":
                self._update_grid_spacing_scale_ranges(None)
                self.grid_guide_var.set("Kein Linien-Grid aktiv")
                self.grid_spacing_x_var.set(80.0)
                self.grid_spacing_y_var.set(80.0)
                self.grid_spacing_x_scale.configure(state="disabled")
                self.grid_spacing_y_scale.configure(state="disabled")
                return
            self._update_grid_spacing_scale_ranges(guide)
            spacing_x = float(guide.get("spacing_x_px", 80.0))
            spacing_y = float(guide.get("spacing_y_px", 80.0))
            self.grid_spacing_x_var.set(spacing_x)
            self.grid_spacing_y_var.set(spacing_y)
            self.grid_guide_var.set(
                f'X-Kopien: {int(guide.get("copies_x", 0))} | Y-Kopien: {int(guide.get("copies_y", 0))} | '
                f'X: {self._format_grid_spacing(spacing_x)}px | Y: {self._format_grid_spacing(spacing_y)}px'
            )
            self.grid_spacing_x_scale.configure(state="normal")
            self.grid_spacing_y_scale.configure(state="normal")
        finally:
            self._syncing_grid_controls = False

    def _vector_layer_summary(self) -> str:
        layer_paths = self._vector_layer_paths()
        if not layer_paths:
            return "Keine Rim-Ebene aktiv"
        active = layer_paths[-1]
        state = "neu" if any(path.get("draft") for path in layer_paths) else "fertig"
        return (
            f'Aktive Ebene: {active.get("name", "Rim")} ({state}) | '
            f'{int(active.get("opacity_pct", 100))}% | {len(layer_paths)} Kurven'
        )

    def _ensure_vector_path_style(self, path: dict[str, Any]):
        path["layer_id"] = str(path.get("layer_id") or path.get("id") or "")
        path["opacity_pct"] = max(0, min(100, int(path.get("opacity_pct", 100))))
        fill_tone = str(path.get("fill_tone", ""))
        valid_tones = {tone for _, tone in FILL_SWATCHES}
        path["fill_tone"] = fill_tone if fill_tone in valid_tones else ""
        if path.get("path_kind"):
            path["path_kind"] = str(path.get("path_kind"))
        if path.get("route_id"):
            path["route_id"] = str(path.get("route_id"))

    def _is_hyperspace_route_path(self, path: dict[str, Any]) -> bool:
        return (
            str(path.get("path_kind", "")).strip() == "hyperspace-route"
            or bool(str(path.get("route_id", "")).strip())
        )

    def _gray_hex(self, intensity: float) -> str:
        value = max(0, min(255, int(round(float(intensity)))))
        return f"#{value:02x}{value:02x}{value:02x}"

    def _tone_intensity(self, tone: str) -> int:
        if not tone:
            return 0
        tone = tone.lstrip("#")
        if len(tone) != 6:
            return 255
        try:
            return int(tone[0:2], 16)
        except ValueError:
            return 255

    def _fill_tone_label(self, tone: str) -> str:
        for label, value in FILL_SWATCHES:
            if value == tone:
                return label
        return tone or "Keine"

    def _alpha_index_label(self, index: int) -> str:
        if index < 0:
            return "?"
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        label = ""
        value = int(index)
        while True:
            label = alphabet[value % 26] + label
            value = value // 26 - 1
            if value < 0:
                break
        return label

    def _grid_line_label(self, axis: str, index: int) -> str:
        if axis == "vertical":
            if 0 <= index < len(GRID_LETTERS):
                return GRID_LETTERS[index]
            return self._alpha_index_label(index)
        return str(index + 1)

    def _layer_gray_from_path(self, path: dict[str, Any], dim_factor: float = 1.0) -> str:
        self._ensure_vector_path_style(path)
        base = 255 * (float(path.get("opacity_pct", 100)) / 100.0) * dim_factor
        return self._gray_hex(base)

    def _layer_fill_from_path(self, path: dict[str, Any], dim_factor: float = 1.0) -> str:
        self._ensure_vector_path_style(path)
        tone = str(path.get("fill_tone", ""))
        if not tone:
            return ""
        intensity = self._tone_intensity(tone)
        opacity = float(path.get("opacity_pct", 100)) / 100.0
        return self._gray_hex(intensity * opacity * dim_factor)

    def _set_vector_info(self, extra: str | None = None):
        active = self._active_vector_path()
        if active is None:
            base = f"{len(self.vector_paths)} Pfade gespeichert."
        else:
            self._ensure_vector_path_style(active)
            layer_paths = self._vector_layer_paths(self._vector_layer_id(active))
            state = "geschlossen" if active.get("closed") else "offen"
            if active.get("draft"):
                state = "im Aufbau"
            fill_label = "ohne Fuellung"
            if active.get("fill_tone"):
                fill_label = f'Fuellung {self._fill_tone_label(str(active.get("fill_tone")))}'
            base = (
                f'{active.get("name", "Pfad")} aktiv, {len(layer_paths)} Kurven in Ebene, '
                f'aktive Kontur {state}, {len(active.get("points", []))} Punkte, '
                f'{int(active.get("opacity_pct", 100))}% | {fill_label}.'
            )
        if self._vector_mode_active():
            hint = " Ziehen setzt Handles, Enter schliesst offene Linien ab, X unterteilt Segmente, Entf loescht Punkte."
        elif self._hyperspace_tool_active():
            action_labels = {
                "select": "Auswahl",
                "extend": "Erweitern",
                "delete": "Loeschen",
            }
            selection = ""
            if self.hyper_selected_planet is not None:
                selection = f' Startplanet: {self.hyper_selected_planet.get("name", "?")}.'
            elif self.active_hyper_segment is not None:
                selection = f' Segment {int(self.active_hyper_segment.get("segment_index", 0)) + 1} markiert.'
            hint = (
                f' Hyperraum-Aktion: {action_labels.get(self.hyper_action_var.get(), "Auswahl")}.'
                " Planet klicken zum Waehlen, Segment klicken zum Markieren."
                " Im Loeschmodus kannst du auch einen Bereich aufziehen."
                f"{selection}"
            )
        elif self._grid_tool_active():
            hint = " H-Start/H-Ende und V-Start/V-Ende setzen. Shift rastet H auf gleiche Y und V auf gleiche X ein."
        else:
            hint = ""
        self.vector_info_var.set((extra or base) + hint)
        self.layer_var.set(self._vector_layer_summary())
        self._sync_layer_controls()
        self._sync_grid_controls()
        self._refresh_layer_list()

    def _update_tool_mode_ui(self):
        editor_mode = self._editor_mode_active()
        for widget in self._mode_locked_widgets:
            try:
                widget.configure(state="disabled" if editor_mode else "normal")
            except tk.TclError:
                continue
        for mode, button in self._vector_tool_buttons.items():
            selected = self.tool_mode.get() == mode
            if selected:
                button.configure(
                    relief="sunken",
                    bg=(
                        "#4f677d"
                        if mode == "calibrate"
                        else "#41695d"
                        if mode == "bezier"
                        else "#78603a"
                        if mode == "subdivide"
                        else "#6f4a8a"
                        if mode == "hyper"
                        else "#3c6470"
                    ),
                )
            else:
                button.configure(
                    relief="flat",
                    bg=(
                        "#22344d"
                        if mode == "calibrate"
                        else "#27463f"
                        if mode == "bezier"
                        else "#4d3a24"
                        if mode == "subdivide"
                        else "#412b50"
                        if mode == "hyper"
                        else "#23444d"
                    ),
                )
        hyper_active = self._hyperspace_tool_active()
        for action, button in self._hyper_action_buttons.items():
            selected = hyper_active and self.hyper_action_var.get() == action
            button.configure(
                state="normal" if hyper_active else "disabled",
                relief="sunken" if selected else "flat",
                bg=(
                    "#496177"
                    if action == "select" and selected
                    else "#3d6b55"
                    if action == "extend" and selected
                    else "#7b4545"
                    if action == "delete" and selected
                    else "#2b3948"
                    if action == "select"
                    else "#264436"
                    if action == "extend"
                    else "#4a2a2a"
                ),
            )
        self._set_vector_info()

    def _set_hyper_action(self, action: str):
        if action not in {"select", "extend", "delete"}:
            return
        self.hyper_action_var.set(action)
        if action == "delete" and self.active_hyper_segment is not None:
            self._delete_selected_hyper_segment()
            return
        if action == "extend":
            self.active_hyper_segment = None
            self.hyper_box_selection = None
        else:
            self.hyper_selected_planet = None
            if action != "delete":
                self.hyper_box_selection = None
        status_map = {
            "select": "Hyperraum-Auswahl aktiv. Segment oder Planet anklicken.",
            "extend": "Hyperraum-Erweitern aktiv. Startplanet anklicken und dann beliebig viele Zielplaneten nacheinander anklicken.",
            "delete": "Hyperraum-Loeschen aktiv. Segment anklicken oder Bereich aufziehen und danach Entf druecken.",
        }
        self.status_var.set(status_map[action])
        self._update_tool_mode_ui()
        self._redraw()

    def _refresh_layer_list(self):
        if not hasattr(self, "layer_list"):
            return
        ordered = list(reversed(self._vector_layer_entries()))
        active_layer_id = self.active_vector_layer_id
        self._layer_list_ids = [str(entry["layer_id"]) for entry in ordered]
        self.layer_list.delete(0, "end")
        for entry in ordered:
            path = entry["representative"]
            self._ensure_vector_path_style(path)
            layer_paths = entry["paths"]
            prefix = ">" if str(entry["layer_id"]) == active_layer_id else " "
            status = "neu" if any(item.get("draft") for item in layer_paths) else "fertig"
            point_count = sum(len(item.get("points", [])) for item in layer_paths)
            self.layer_list.insert(
                "end",
                f'{prefix} {path.get("name", "Rim")} [{status}] {int(path.get("opacity_pct", 100))}% '
                f'({len(layer_paths)} Kurven / {point_count} Punkte)',
            )
        if active_layer_id in self._layer_list_ids:
            index = self._layer_list_ids.index(active_layer_id)
            self.layer_list.selection_clear(0, "end")
            self.layer_list.selection_set(index)
            self.layer_list.see(index)
        else:
            self.layer_list.selection_clear(0, "end")

    def _sync_layer_controls(self):
        if not hasattr(self, "layer_opacity_scale"):
            return
        self._syncing_layer_controls = True
        try:
            layer_paths = self._vector_layer_paths()
            if not layer_paths:
                self.layer_opacity_var.set(100)
                self.layer_fill_var.set("")
                self.layer_opacity_scale.configure(state="disabled")
            else:
                active = layer_paths[-1]
                self._ensure_vector_path_style(active)
                self.layer_opacity_var.set(int(active.get("opacity_pct", 100)))
                self.layer_fill_var.set(str(active.get("fill_tone", "")))
                self.layer_opacity_scale.configure(state="normal")
        finally:
            self._syncing_layer_controls = False
        self._refresh_fill_swatch_ui()

    def _refresh_fill_swatch_ui(self):
        selected = self.layer_fill_var.get()
        active = self._vector_layer_paths()
        for tone, button in self._fill_swatch_buttons.items():
            is_selected = tone == selected
            button.configure(
                relief="sunken" if is_selected else "flat",
                bd=2 if is_selected else 1,
                highlightbackground=TEXT_COLOR if is_selected else PANEL_BG_ALT,
                state="normal" if active else "disabled",
            )

    def _on_layer_opacity_change(self, value: str):
        if self._syncing_layer_controls:
            return
        layer_paths = self._vector_layer_paths()
        if not layer_paths:
            return
        try:
            opacity = max(0, min(100, int(float(value))))
        except ValueError:
            return
        path = layer_paths[-1]
        self._ensure_vector_path_style(path)
        if int(path.get("opacity_pct", 100)) == opacity:
            return
        if not self._layer_opacity_drag_active:
            self._push_vector_history()
            self._layer_opacity_drag_active = True
        self._sync_vector_layer_metadata(self._vector_layer_id(path), opacity_pct=opacity)
        self.layer_opacity_var.set(opacity)
        self._set_vector_info(f'{path.get("name", "Rim")} Transparenz: {opacity}%.')
        self._set_interactive_render(True)
        self._redraw()

    def _finish_layer_opacity_drag(self, _event=None):
        self._layer_opacity_drag_active = False

    def _apply_fill_swatch(self, tone: str):
        layer_paths = self._vector_layer_paths()
        if not layer_paths:
            self.status_var.set("Keine aktive Rim-Ebene fuer den Fuell-Eimer.")
            return
        path = layer_paths[-1]
        self._ensure_vector_path_style(path)
        tone = str(tone or "")
        if str(path.get("fill_tone", "")) == tone:
            return
        self._push_vector_history()
        self._sync_vector_layer_metadata(self._vector_layer_id(path), fill_tone=tone)
        self.layer_fill_var.set(tone)
        if tone and any(not item.get("closed") for item in layer_paths):
            self.status_var.set(
                "Fuellung fuer die Ebene gesetzt. Sichtbar wird sie bei jeder geschlossenen Kontur."
            )
        elif tone:
            self.status_var.set(f'{path.get("name", "Rim")} mit Fuellung versehen.')
        else:
            self.status_var.set(f'Fuellung von {path.get("name", "Rim")} entfernt.')
        self._set_vector_info()
        self._redraw()

    def _on_grid_spacing_change(self, axis: str, value: str):
        if self._syncing_grid_controls:
            return
        guide = self._active_grid_guide()
        if guide is None or guide.get("kind") != "line-grid":
            return
        try:
            spacing = round(float(value), 2)
        except ValueError:
            return
        key = "spacing_x_px" if axis == "x" else "spacing_y_px"
        if abs(float(guide.get(key, 0.0)) - spacing) < 1e-6:
            return
        if self._grid_spacing_drag_axis != axis:
            self._push_vector_history()
            self._grid_spacing_drag_axis = axis
        guide[key] = float(spacing)
        self.grid_guide_var.set(
            f'X-Kopien: {int(guide.get("copies_x", 0))} | Y-Kopien: {int(guide.get("copies_y", 0))} | '
            f'X: {self._format_grid_spacing(float(guide.get("spacing_x_px", 0.0)))}px | '
            f'Y: {self._format_grid_spacing(float(guide.get("spacing_y_px", 0.0)))}px'
        )
        self.status_var.set(
            f'Grid-Abstand {axis.upper()} auf {self._format_grid_spacing(spacing)}px gesetzt.'
        )
        self._set_interactive_render(True)
        self._redraw()

    def _finish_grid_spacing_drag(self, axis: str):
        if self._grid_spacing_drag_axis == axis:
            self._grid_spacing_drag_axis = None
        guide = self._active_grid_guide()
        if guide is not None and guide.get("kind") == "line-grid":
            self._sync_grid_controls()

    def _create_empty_vector_layer(self):
        layer_count = len(self._vector_layer_entries()) + 1
        path_id = self._next_vector_path_id()
        path = {
            "id": path_id,
            "layer_id": path_id,
            "name": f"Rim {layer_count}",
            "closed": False,
            "draft": True,
            "opacity_pct": 100,
            "fill_tone": "",
            "points": [],
        }
        self._push_vector_history()
        self.vector_paths.append(path)
        self._set_active_vector_selection(path["id"], None, None)
        self._set_tool_mode("bezier")
        self.status_var.set(
            f'{path["name"]} angelegt. Diese Ebene ist jetzt exklusiv aktiv; erster Klick setzt den Startpunkt.'
        )

    def _rename_active_vector_layer(self):
        layer_paths = self._vector_layer_paths()
        if not layer_paths:
            self.status_var.set("Keine aktive Rim-Ebene zum Umbenennen.")
            return
        path = layer_paths[-1]
        new_name = simpledialog.askstring(
            "Rim-Layer",
            "Name der aktiven Ebene:",
            initialvalue=str(path.get("name", "Rim")),
            parent=self.root,
        )
        if not new_name:
            return
        new_name = new_name.strip()
        if not new_name:
            return
        self._push_vector_history()
        self._sync_vector_layer_metadata(self._vector_layer_id(path), name=new_name)
        self._set_vector_info(f'Rim-Ebene heisst jetzt "{new_name}".')
        self._redraw()

    def _on_layer_select(self, _event=None):
        if not hasattr(self, "layer_list"):
            return
        selection = self.layer_list.curselection()
        if not selection:
            return
        index = int(selection[0])
        if not (0 <= index < len(self._layer_list_ids)):
            return
        layer_id = self._layer_list_ids[index]
        layer_paths = self._vector_layer_paths(layer_id)
        if not layer_paths:
            return
        self._set_active_vector_selection(str(layer_paths[-1].get("id")), None, None)
        if self._editor_mode_active():
            self.status_var.set(
                "Rim-Ebene gewechselt. Nur die aktive Ebene ist jetzt bearbeitbar, alle anderen bleiben grau."
            )
        self._redraw()

    def _set_tool_mode(self, mode: str):
        if mode not in {"calibrate", "bezier", "subdivide", "hyper"}:
            return
        self.tool_mode.set(mode)
        self.vector_drag_state = None
        self._drag_item = None
        self._drag_item_previous = None
        self.hyper_selected_planet = None
        self.active_hyper_segment = None
        self.hyper_box_selection = None
        if mode == "calibrate":
            self.canvas.config(cursor="crosshair")
            self.status_var.set(
                "Kalibrieren aktiv. Planet auswaehlen und per Klick setzen oder Pins verschieben."
            )
        elif mode == "bezier":
            if self.active_vector_path_id is None and self.vector_paths:
                self.active_vector_path_id = str(self.vector_paths[-1].get("id"))
                self.active_vector_layer_id = self._vector_layer_id(self.vector_paths[-1])
            self.canvas.config(cursor="crosshair")
            self.status_var.set(
                "Bezier-Rim aktiv. Hintergrund ist gesperrt; Klicks setzen Punkte, Klick auf den ersten Punkt schliesst die Kurve."
            )
        elif mode == "subdivide":
            if self.active_vector_path_id is None and self.vector_paths:
                self.active_vector_path_id = str(self.vector_paths[-1].get("id"))
                self.active_vector_layer_id = self._vector_layer_id(self.vector_paths[-1])
            self.canvas.config(cursor="tcross")
            self.status_var.set(
                "Subdivide aktiv. Hintergrund ist gesperrt; Klick auf eine Kurvenkante fuegt einen neuen Punkt ein."
            )
        elif mode == "hyper":
            if self.active_vector_path_id is None and self.vector_paths:
                self.active_vector_path_id = str(self.vector_paths[-1].get("id"))
                self.active_vector_layer_id = self._vector_layer_id(self.vector_paths[-1])
            self.hyper_action_var.set("select")
            self.canvas.config(cursor="crosshair")
            self.status_var.set(
                "Hyperraum-Tool aktiv. Segment markieren oder Planet anklicken; Aktion rechts darunter waehlen."
            )
        self._update_tool_mode_ui()
        self._redraw()

    def _finalize_active_path_from_shortcut(self):
        if self.tool_mode.get() not in {"bezier", "subdivide"}:
            return
        if self._finalize_active_vector_path():
            self._redraw()

    def _handle_delete_shortcut(self):
        if self._hyperspace_tool_active():
            if self.active_hyper_segment is not None:
                self._delete_selected_hyper_segment()
            elif self.hyper_box_selection is not None and self.hyper_box_selection.get("segments"):
                self._delete_hyper_segments(self.hyper_box_selection.get("segments", []))
            else:
                self.status_var.set("Kein Hyperraum-Segment oder Loeschbereich markiert.")
                self._set_vector_info()
                self._redraw()
            return
        if self._vector_mode_active():
            self._delete_active_vector_selection()
            return
        if self._grid_tool_active():
            self._delete_active_grid_guide()
            return
        self._delete_active()

    def _handle_escape(self):
        if self._editor_mode_active():
            self.vector_drag_state = None
            self._drag_item = None
            self.active_vector_handle = None
            self.active_vector_point_index = None
            self.active_grid_guide_id = None
            self.hyper_selected_planet = None
            self.active_hyper_segment = None
            self.hyper_box_selection = None
            self.status_var.set("Bearbeitungsauswahl aufgehoben.")
            self._sync_grid_controls()
            self._redraw()
            return
        self.root.quit()

    def _bind_shortcuts(self):
        self.root.bind("<s>", lambda _e: self._save())
        self.root.bind("<S>", lambda _e: self._save())
        self.root.bind("<a>", lambda _e: self._activate_manual_name())
        self.root.bind("<A>", lambda _e: self._activate_manual_name())
        self.root.bind("<c>", lambda _e: self._clear_active_name())
        self.root.bind("<C>", lambda _e: self._clear_active_name())
        self.root.bind("<e>", lambda _e: self._run_full_auto())
        self.root.bind("<E>", lambda _e: self._run_full_auto())
        self.root.bind("<f>", lambda _e: self._auto_fill_pending_from_image())
        self.root.bind("<F>", lambda _e: self._auto_fill_pending_from_image())
        self.root.bind("<h>", lambda _e: self._focus_current_grid())
        self.root.bind("<H>", lambda _e: self._focus_current_grid())
        self.root.bind("<r>", lambda _e: self._refine_existing_from_image())
        self.root.bind("<R>", lambda _e: self._refine_existing_from_image())
        self.root.bind("<n>", lambda _e: self._select_relative_pending(1))
        self.root.bind("<N>", lambda _e: self._select_relative_pending(1))
        self.root.bind("<p>", lambda _e: self._select_relative_pending(-1))
        self.root.bind("<P>", lambda _e: self._select_relative_pending(-1))
        self.root.bind("<z>", lambda _e: self._undo())
        self.root.bind("<Z>", lambda _e: self._undo())
        self.root.bind("<Left>", lambda _e: self._nudge_active(-1, 0))
        self.root.bind("<Right>", lambda _e: self._nudge_active(1, 0))
        self.root.bind("<Up>", lambda _e: self._nudge_active(0, -1))
        self.root.bind("<Down>", lambda _e: self._nudge_active(0, 1))
        self.root.bind("<Shift-Left>", lambda _e: self._nudge_active(-5, 0))
        self.root.bind("<Shift-Right>", lambda _e: self._nudge_active(5, 0))
        self.root.bind("<Shift-Up>", lambda _e: self._nudge_active(0, -5))
        self.root.bind("<Shift-Down>", lambda _e: self._nudge_active(0, 5))
        self.root.bind("<Delete>", lambda _e: self._handle_delete_shortcut())
        self.root.bind("<BackSpace>", lambda _e: self._handle_delete_shortcut())
        self.root.bind("<b>", lambda _e: self._set_tool_mode("bezier"))
        self.root.bind("<B>", lambda _e: self._set_tool_mode("bezier"))
        self.root.bind("<x>", lambda _e: self._set_tool_mode("subdivide"))
        self.root.bind("<X>", lambda _e: self._set_tool_mode("subdivide"))
        self.root.bind("<t>", lambda _e: self._set_tool_mode("hyper"))
        self.root.bind("<T>", lambda _e: self._set_tool_mode("hyper"))
        self.root.bind("<v>", lambda _e: self._set_tool_mode("calibrate"))
        self.root.bind("<V>", lambda _e: self._set_tool_mode("calibrate"))
        self.root.bind("<Return>", lambda _e: self._finalize_active_path_from_shortcut())
        self.root.bind("<Escape>", lambda _e: self._handle_escape())
        self.root.bind("<q>", lambda _e: self.root.quit())
        self.root.bind("<Q>", lambda _e: self.root.quit())

    def _canvas_to_norm(self, cx: float, cy: float) -> tuple[float, float]:
        nx = (cx - self.off_x) / (self.img_w * self.scale)
        ny = (cy - self.off_y) / (self.img_h * self.scale)
        return nx, ny

    def _norm_to_canvas(self, nx: float, ny: float) -> tuple[float, float]:
        return (
            nx * self.img_w * self.scale + self.off_x,
            ny * self.img_h * self.scale + self.off_y,
        )

    def _norm_to_img_px(self, nx: float, ny: float) -> tuple[float, float]:
        return nx * self.img_w, ny * self.img_h

    def _normalize_grid_label(self, value: str | None) -> str:
        if not value:
            return ""
        text = str(value).strip().upper().replace("_", "-").replace(" ", "")
        match = re.fullmatch(r"([A-V])\-?([1-9]|1[0-9]|2[0-2])", text)
        if not match:
            return ""
        return f"{match.group(1)}-{match.group(2)}"

    def _parse_grid_label(self, value: str | None) -> tuple[int, int] | None:
        label = self._normalize_grid_label(value)
        if not label:
            return None
        letter, number = label.split("-", 1)
        return GRID_LETTERS.index(letter), int(number) - 1

    def _guess_grid_for_point(self, nx: float, ny: float) -> str:
        col = min(GRID_COLS - 1, max(0, int(nx * GRID_COLS)))
        row = min(GRID_ROWS - 1, max(0, int(ny * GRID_ROWS)))
        return f"{GRID_LETTERS[col]}-{row + 1}"

    def _grid_neighbor_labels(self, grid: str, radius: int = 1) -> list[str]:
        parsed = self._parse_grid_label(grid)
        if parsed is None:
            return []
        col, row = parsed
        labels: list[str] = []
        for row_idx in range(max(0, row - radius), min(GRID_ROWS, row + radius + 1)):
            for col_idx in range(max(0, col - radius), min(GRID_COLS, col + radius + 1)):
                labels.append(f"{GRID_LETTERS[col_idx]}-{row_idx + 1}")
        return labels

    def _grid_center_norm(self, grid: str) -> tuple[float, float] | None:
        parsed = self._parse_grid_label(grid)
        if parsed is None:
            return None
        col, row = parsed
        return ((col + 0.5) / GRID_COLS, (row + 0.5) / GRID_ROWS)

    def _grid_planets(self, grid: str) -> list[dict]:
        label = self._normalize_grid_label(grid)
        if not label:
            return []
        items: list[dict] = []
        for planet in PLANETS:
            if self._normalize_grid_label(planet.get("grid")) != label:
                continue
            items.append(
                {
                    "name": planet["name"],
                    "grid": label,
                    "region": planet.get("region", "?"),
                    "x": planet["x"],
                    "y": planet["y"],
                    "source": "known",
                }
            )
        for name, data in self.calibrated.items():
            if self._normalize_grid_label(data.get("grid")) != label:
                continue
            items.append(
                {
                    "name": name,
                    "grid": label,
                    "region": data.get("region", "?"),
                    "x": data["x"],
                    "y": data["y"],
                    "source": "calibrated",
                }
            )
        items.sort(key=lambda item: item["name"].lower())
        return items

    def _grid_context_planets(self, grid: str, radius: int = 1) -> list[dict]:
        labels = set(self._grid_neighbor_labels(grid, radius=radius))
        items: list[dict] = []
        seen: set[str] = set()
        for planet in PLANETS:
            label = self._normalize_grid_label(planet.get("grid"))
            if label not in labels:
                continue
            key = self._normalize_name_key(planet["name"])
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "name": planet["name"],
                    "grid": label,
                    "region": planet.get("region", "?"),
                    "x": planet["x"],
                    "y": planet["y"],
                }
            )
        return items

    def _grid_bounds_px(self, grid: str) -> tuple[int, int, int, int] | None:
        parsed = self._parse_grid_label(grid)
        if parsed is None:
            return None
        col, row = parsed
        cell_w = self.img_w / GRID_COLS
        cell_h = self.img_h / GRID_ROWS
        left = col * cell_w
        top = row * cell_h
        right = (col + 1) * cell_w
        bottom = (row + 1) * cell_h

        points = self._grid_planets(grid)
        if points:
            min_x = min(item["x"] * self.img_w for item in points)
            max_x = max(item["x"] * self.img_w for item in points)
            min_y = min(item["y"] * self.img_h for item in points)
            max_y = max(item["y"] * self.img_h for item in points)
            margin_x = max(cell_w * 0.35, 90.0)
            margin_y = max(cell_h * 0.35, 90.0)
            left = min(left, min_x - margin_x)
            top = min(top, min_y - margin_y)
            right = max(right, max_x + margin_x)
            bottom = max(bottom, max_y + margin_y)

        pad_x = cell_w * 0.14
        pad_y = cell_h * 0.14
        return (
            max(0, int(round(left - pad_x))),
            max(0, int(round(top - pad_y))),
            min(self.img_w, int(round(right + pad_x))),
            min(self.img_h, int(round(bottom + pad_y))),
        )

    def _round_norm(self, value: float) -> float:
        return round(min(1.0, max(0.0, float(value))), 4)

    def _vector_xy(self, nx: float, ny: float) -> dict[str, float]:
        return {"x": self._round_norm(nx), "y": self._round_norm(ny)}

    def _new_vector_point(self, nx: float, ny: float) -> dict[str, Any]:
        anchor = self._vector_xy(nx, ny)
        return {
            "anchor": dict(anchor),
            "in": dict(anchor),
            "out": dict(anchor),
            "mode": "corner",
        }

    def _new_planet_vector_point(self, planet: dict[str, Any]) -> dict[str, Any]:
        point = self._new_vector_point(float(planet["x"]), float(planet["y"]))
        point["planet_name"] = str(planet["name"])
        return point

    def _normalize_route_label_anchor(self, point: Any) -> dict[str, float] | None:
        if not isinstance(point, dict):
            return None
        x = point.get("x")
        y = point.get("y")
        if x is None or y is None:
            return None
        return self._vector_xy(float(x), float(y))

    def _vector_point_xy(
        self,
        point: dict[str, Any],
        key: str = "anchor",
    ) -> tuple[float, float]:
        ref = point.get(key, point.get("anchor", {}))
        return float(ref.get("x", 0.0)), float(ref.get("y", 0.0))

    def _active_vector_path(self) -> dict[str, Any] | None:
        path = self._find_vector_path(self.active_vector_path_id)
        if path is not None:
            self.active_vector_layer_id = self._vector_layer_id(path)
            return path
        layer_paths = self._vector_layer_paths()
        if layer_paths:
            path = layer_paths[-1]
            self.active_vector_path_id = str(path.get("id"))
            self.active_vector_layer_id = self._vector_layer_id(path)
            return path
        self.active_vector_path_id = None
        self.active_vector_layer_id = None
        return None

    def _vector_segment_count(self, path: dict[str, Any]) -> int:
        count = len(path.get("points", []))
        if count < 2:
            return 0
        return count if path.get("closed") else count - 1

    def _next_vector_path_id(self) -> str:
        path_id = f"rim-{self._vector_id_counter:03d}"
        self._vector_id_counter += 1
        return path_id

    def _all_planet_candidates(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen: set[str] = set()
        for name, data in self.calibrated.items():
            key = self._normalize_name_key(name)
            seen.add(key)
            items.append(
                {
                    "name": name,
                    "x": float(data["x"]),
                    "y": float(data["y"]),
                    "source": "calibrated",
                }
            )
        for planet in PLANETS:
            key = self._normalize_name_key(planet["name"])
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "name": planet["name"],
                    "x": float(planet["x"]),
                    "y": float(planet["y"]),
                    "source": "known",
                }
            )
        return items

    def _route_planet(self, name: str) -> dict[str, Any] | None:
        target_keys = {self._normalize_name_key(name)}
        alias = ROUTE_PLANET_ALIASES.get(self._normalize_name_key(name))
        if alias:
            target_keys.add(self._normalize_name_key(alias))
        for candidate in self._all_planet_candidates():
            if self._normalize_name_key(str(candidate["name"])) in target_keys:
                return candidate
        return None

    def _vector_points_from_anchors(
        self,
        anchors: list[dict[str, float]],
        tension: float = 0.78,
    ) -> list[dict[str, Any]]:
        normalized = [
            self._vector_xy(float(point["x"]), float(point["y"]))
            for point in anchors
            if isinstance(point, dict) and "x" in point and "y" in point
        ]
        if len(normalized) < 2:
            return []
        points: list[dict[str, Any]] = []
        for index, anchor in enumerate(normalized):
            mode = "smooth" if 0 < index < len(normalized) - 1 else "corner"
            points.append(
                {
                    "anchor": dict(anchor),
                    "in": dict(anchor),
                    "out": dict(anchor),
                    "mode": mode,
                }
            )
        handle_scale = max(0.0, min(1.4, float(tension or 0.78))) / 6.0
        for index in range(len(normalized) - 1):
            p0 = normalized[index - 1] if index > 0 else normalized[index]
            p1 = normalized[index]
            p2 = normalized[index + 1]
            p3 = normalized[index + 2] if index + 2 < len(normalized) else normalized[index + 1]
            points[index]["out"] = self._vector_xy(
                p1["x"] + (p2["x"] - p0["x"]) * handle_scale,
                p1["y"] + (p2["y"] - p0["y"]) * handle_scale,
            )
            points[index + 1]["in"] = self._vector_xy(
                p2["x"] - (p3["x"] - p1["x"]) * handle_scale,
                p2["y"] - (p3["y"] - p1["y"]) * handle_scale,
            )
        return points

    def _copy_path_metadata(self, target: dict[str, Any], template: dict[str, Any] | None):
        if template is None:
            return
        path_kind = str(template.get("path_kind", "")).strip()
        route_id = str(template.get("route_id") or template.get("id") or "").strip()
        if path_kind:
            target["path_kind"] = path_kind
        if path_kind == "hyperspace-route" and route_id:
            target["route_id"] = route_id
        for key in (
            "stroke_tone",
            "label_anchor",
            "label_rotation_deg",
            "label_font_scale",
            "source_url",
            "route_planets",
        ):
            if key not in template:
                continue
            target[key] = deepcopy(template[key])

    def _build_hyperspace_route_vector_path(
        self,
        route: dict[str, Any],
        index: int,
    ) -> dict[str, Any] | None:
        fallback_id = str(route.get("id") or f"hyperspace-route-{index + 1}")
        explicit_path = route.get("vector_path")
        if isinstance(explicit_path, dict):
            normalized = self._normalize_loaded_vector_paths(
                [
                    {
                        **explicit_path,
                        "id": explicit_path.get("id") or fallback_id,
                        "layer_id": explicit_path.get("layer_id") or route.get("layer_id") or fallback_id,
                        "name": explicit_path.get("name") or route.get("name") or fallback_id,
                        "opacity_pct": explicit_path.get("opacity_pct", route.get("opacity_pct", 96)),
                        "path_kind": "hyperspace-route",
                        "route_id": route.get("id") or fallback_id,
                        "stroke_tone": route.get("stroke_tone", explicit_path.get("stroke_tone", "#ffffff")),
                        "label_anchor": route.get("label_anchor", explicit_path.get("label_anchor")),
                        "label_rotation_deg": route.get(
                            "label_rotation_deg",
                            explicit_path.get("label_rotation_deg", 0),
                        ),
                        "label_font_scale": route.get(
                            "label_font_scale",
                            explicit_path.get("label_font_scale", 1),
                        ),
                        "source_url": route.get("source_url", explicit_path.get("source_url", "")),
                        "route_planets": route.get("planets", explicit_path.get("route_planets", [])),
                    }
                ]
            )
            if normalized:
                normalized[0]["id"] = fallback_id
                normalized[0]["layer_id"] = str(
                    route.get("layer_id") or normalized[0].get("layer_id") or fallback_id
                )
                normalized[0]["name"] = str(route.get("name") or normalized[0].get("name") or fallback_id)
                normalized[0]["route_id"] = str(route.get("id") or fallback_id)
                return normalized[0]

        route_planets: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw_name in route.get("planets", []):
            if raw_name is None:
                continue
            planet = self._route_planet(str(raw_name))
            if planet is None:
                continue
            key = self._normalize_name_key(str(planet["name"]))
            if key in seen:
                continue
            seen.add(key)
            route_planets.append(planet)
        if len(route_planets) < 2:
            return None
        points = self._vector_points_from_anchors(
            [{"x": float(planet["x"]), "y": float(planet["y"])} for planet in route_planets],
            float(route.get("tension", 0.78)),
        )
        if len(points) < 2:
            return None
        path = {
            "id": fallback_id,
            "layer_id": str(route.get("layer_id") or route.get("id") or fallback_id),
            "name": str(route.get("name") or fallback_id),
            "closed": False,
            "draft": False,
            "opacity_pct": int(route.get("opacity_pct", 96)),
            "fill_tone": "",
            "path_kind": "hyperspace-route",
            "route_id": str(route.get("id") or fallback_id),
            "stroke_tone": str(route.get("stroke_tone") or "#ffffff"),
            "label_anchor": self._normalize_route_label_anchor(route.get("label_anchor")),
            "label_rotation_deg": float(route.get("label_rotation_deg", 0)),
            "label_font_scale": float(route.get("label_font_scale", 1)),
            "source_url": str(route.get("source_url") or ""),
            "route_planets": [str(planet["name"]) for planet in route_planets],
            "points": points,
        }
        self._ensure_vector_path_style(path)
        return path

    def _network_slug(self, value: str) -> str:
        cleaned = re.sub(r"[^a-z0-9]+", "-", self._normalize_name_key(value))
        return cleaned.strip("-") or "node"

    def _route_network_norm_distance(self, pixels: float) -> float:
        base = max(1.0, float(max(self.img_w, self.img_h)))
        return float(pixels) / base

    def _cubic_bezier_point(
        self,
        p0: dict[str, float],
        p1: dict[str, float],
        p2: dict[str, float],
        p3: dict[str, float],
        t: float,
    ) -> dict[str, float]:
        mt = 1.0 - float(t)
        x = (
            mt**3 * float(p0["x"])
            + 3.0 * mt**2 * float(t) * float(p1["x"])
            + 3.0 * mt * float(t) ** 2 * float(p2["x"])
            + float(t) ** 3 * float(p3["x"])
        )
        y = (
            mt**3 * float(p0["y"])
            + 3.0 * mt**2 * float(t) * float(p1["y"])
            + 3.0 * mt * float(t) ** 2 * float(p2["y"])
            + float(t) ** 3 * float(p3["y"])
        )
        return {
            "x": min(1.0, max(0.0, x)),
            "y": min(1.0, max(0.0, y)),
        }

    def _sample_vector_path_geometry(
        self,
        path: dict[str, Any],
        subdivisions: int = HYPER_NETWORK_SAMPLE_STEPS,
    ) -> dict[str, Any]:
        points = path.get("points", [])
        if len(points) < 2:
            return {
                "samples": [],
                "anchor_distances": {},
                "bounds": None,
                "length": 0.0,
            }

        samples: list[dict[str, float | int]] = []
        anchor_distances: dict[int, float] = {}
        cumulative = 0.0
        steps = max(1, int(subdivisions))
        segment_count = len(points) if path.get("closed") else len(points) - 1

        for index in range(segment_count):
            current = points[index]
            nxt = points[(index + 1) % len(points)]
            anchor = self._normalize_route_label_anchor(current.get("anchor"))
            out_point = self._normalize_route_label_anchor(current.get("out"))
            in_point = self._normalize_route_label_anchor(nxt.get("in"))
            next_anchor = self._normalize_route_label_anchor(nxt.get("anchor"))
            if not anchor or not next_anchor:
                continue
            out_point = out_point or anchor
            in_point = in_point or next_anchor

            if not samples:
                samples.append(
                    {
                        "x": float(anchor["x"]),
                        "y": float(anchor["y"]),
                        "distance": cumulative,
                        "segment_index": index,
                        "t": 0.0,
                    }
                )
            else:
                previous = samples[-1]
                if (
                    abs(float(previous["x"]) - float(anchor["x"])) > 1e-9
                    or abs(float(previous["y"]) - float(anchor["y"])) > 1e-9
                ):
                    cumulative += math.hypot(
                        float(anchor["x"]) - float(previous["x"]),
                        float(anchor["y"]) - float(previous["y"]),
                    )
                    samples.append(
                        {
                            "x": float(anchor["x"]),
                            "y": float(anchor["y"]),
                            "distance": cumulative,
                            "segment_index": index,
                            "t": 0.0,
                        }
                    )
            anchor_distances[index] = cumulative
            previous = samples[-1]

            for step in range(1, steps + 1):
                t = step / steps
                sample = self._cubic_bezier_point(anchor, out_point, in_point, next_anchor, t)
                cumulative += math.hypot(
                    float(sample["x"]) - float(previous["x"]),
                    float(sample["y"]) - float(previous["y"]),
                )
                sample_record = {
                    "x": float(sample["x"]),
                    "y": float(sample["y"]),
                    "distance": cumulative,
                    "segment_index": index,
                    "t": float(t),
                }
                samples.append(sample_record)
                previous = sample_record
            anchor_distances[(index + 1) % len(points)] = cumulative

        if not samples:
            return {
                "samples": [],
                "anchor_distances": {},
                "bounds": None,
                "length": 0.0,
            }

        bounds = {
            "left": min(float(sample["x"]) for sample in samples),
            "top": min(float(sample["y"]) for sample in samples),
            "right": max(float(sample["x"]) for sample in samples),
            "bottom": max(float(sample["y"]) for sample in samples),
        }
        return {
            "samples": samples,
            "anchor_distances": anchor_distances,
            "bounds": bounds,
            "length": float(samples[-1]["distance"]),
        }

    def _estimate_distance_on_sampled_path(
        self,
        samples: list[dict[str, float | int]],
        x: float,
        y: float,
    ) -> float:
        if len(samples) < 2:
            return 0.0
        best_distance_sq = float("inf")
        best_distance = 0.0
        for index in range(1, len(samples)):
            start = samples[index - 1]
            end = samples[index]
            dx = float(end["x"]) - float(start["x"])
            dy = float(end["y"]) - float(start["y"])
            length_sq = dx * dx + dy * dy
            t = 0.0
            if length_sq > 1e-12:
                t = ((float(x) - float(start["x"])) * dx + (float(y) - float(start["y"])) * dy) / length_sq
                t = max(0.0, min(1.0, t))
            px = float(start["x"]) + dx * t
            py = float(start["y"]) + dy * t
            distance_sq = (float(x) - px) ** 2 + (float(y) - py) ** 2
            if distance_sq >= best_distance_sq:
                continue
            best_distance_sq = distance_sq
            best_distance = float(start["distance"]) + (
                float(end["distance"]) - float(start["distance"])
            ) * t
        return best_distance

    def _segment_intersection_info(
        self,
        a_start: dict[str, float | int],
        a_end: dict[str, float | int],
        b_start: dict[str, float | int],
        b_end: dict[str, float | int],
        tolerance: float = 1e-9,
    ) -> dict[str, float | str] | None:
        ax0, ay0 = float(a_start["x"]), float(a_start["y"])
        ax1, ay1 = float(a_end["x"]), float(a_end["y"])
        bx0, by0 = float(b_start["x"]), float(b_start["y"])
        bx1, by1 = float(b_end["x"]), float(b_end["y"])
        r = (ax1 - ax0, ay1 - ay0)
        s = (bx1 - bx0, by1 - by0)

        def cross(u: tuple[float, float], v: tuple[float, float]) -> float:
            return u[0] * v[1] - u[1] * v[0]

        def dot(u: tuple[float, float], v: tuple[float, float]) -> float:
            return u[0] * v[0] + u[1] * v[1]

        def point_on_segment(
            origin: tuple[float, float],
            delta: tuple[float, float],
            t_value: float,
        ) -> tuple[float, float]:
            return (origin[0] + delta[0] * t_value, origin[1] + delta[1] * t_value)

        eps = max(1e-9, float(tolerance))
        qp = (bx0 - ax0, by0 - ay0)
        denom = cross(r, s)
        r_len_sq = dot(r, r)
        s_len_sq = dot(s, s)

        if r_len_sq <= eps and s_len_sq <= eps:
            if math.hypot(ax0 - bx0, ay0 - by0) <= eps:
                return {
                    "x": (ax0 + bx0) / 2.0,
                    "y": (ay0 + by0) / 2.0,
                    "a_t": 0.0,
                    "b_t": 0.0,
                    "kind": "segment-touch",
                }
            return None

        if r_len_sq <= eps:
            u = 0.0 if s_len_sq <= eps else dot((ax0 - bx0, ay0 - by0), s) / s_len_sq
            u = max(0.0, min(1.0, u))
            px, py = point_on_segment((bx0, by0), s, u)
            if math.hypot(ax0 - px, ay0 - py) <= eps:
                return {
                    "x": (ax0 + px) / 2.0,
                    "y": (ay0 + py) / 2.0,
                    "a_t": 0.0,
                    "b_t": u,
                    "kind": "segment-touch",
                }
            return None

        if s_len_sq <= eps:
            t_value = dot((bx0 - ax0, by0 - ay0), r) / r_len_sq
            t_value = max(0.0, min(1.0, t_value))
            px, py = point_on_segment((ax0, ay0), r, t_value)
            if math.hypot(bx0 - px, by0 - py) <= eps:
                return {
                    "x": (bx0 + px) / 2.0,
                    "y": (by0 + py) / 2.0,
                    "a_t": t_value,
                    "b_t": 0.0,
                    "kind": "segment-touch",
                }
            return None

        if abs(denom) <= eps:
            if abs(cross(qp, r)) > eps:
                return None
            if abs(r[0]) >= abs(r[1]):
                if abs(r[0]) <= eps:
                    return None
                t0 = (bx0 - ax0) / r[0]
                t1 = (bx1 - ax0) / r[0]
            else:
                if abs(r[1]) <= eps:
                    return None
                t0 = (by0 - ay0) / r[1]
                t1 = (by1 - ay0) / r[1]
            overlap_start = max(0.0, min(t0, t1))
            overlap_end = min(1.0, max(t0, t1))
            if overlap_end < -eps or overlap_start > 1.0 + eps:
                return None
            a_t = max(0.0, min(1.0, (overlap_start + overlap_end) / 2.0))
            px, py = point_on_segment((ax0, ay0), r, a_t)
            b_t = 0.0 if s_len_sq <= eps else dot((px - bx0, py - by0), s) / s_len_sq
            b_t = max(0.0, min(1.0, b_t))
            return {
                "x": px,
                "y": py,
                "a_t": a_t,
                "b_t": b_t,
                "kind": "segment-overlap" if overlap_end - overlap_start > eps else "segment-touch",
            }

        t_value = cross(qp, s) / denom
        u = cross(qp, r) / denom
        if not (-eps <= t_value <= 1.0 + eps and -eps <= u <= 1.0 + eps):
            return None
        a_t = max(0.0, min(1.0, t_value))
        b_t = max(0.0, min(1.0, u))
        ax, ay = point_on_segment((ax0, ay0), r, a_t)
        bx, by = point_on_segment((bx0, by0), s, b_t)
        return {
            "x": (ax + bx) / 2.0,
            "y": (ay + by) / 2.0,
            "a_t": a_t,
            "b_t": b_t,
            "kind": "segment-crossing",
        }

    def _build_hyperspace_route_network(
        self,
        routes_payload: list[dict[str, Any]],
        selected_paths: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        network: dict[str, Any] = {
            "version": 1,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "sample_steps": HYPER_NETWORK_SAMPLE_STEPS,
            "summary": {
                "routes": 0,
                "nodes": 0,
                "edges": 0,
                "transfer_nodes": 0,
                "route_connections": 0,
            },
            "nodes": [],
            "edges": [],
            "route_connections": [],
            "route_summaries": [],
        }

        route_entries: list[dict[str, Any]] = []
        for route in routes_payload:
            route_id = str(route.get("id") or "").strip()
            if not route_id:
                continue
            path = selected_paths.get(route_id)
            if path is None:
                continue
            route_entries.append(
                {
                    "route_id": route_id,
                    "layer_id": str(route.get("layer_id") or path.get("layer_id") or route_id),
                    "name": str(route.get("name") or path.get("name") or route_id),
                    "path": path,
                    "geometry": self._sample_vector_path_geometry(path),
                    "route_planets": [
                        str(name)
                        for name in route.get("planets", path.get("route_planets", []))
                        if str(name).strip()
                    ],
                }
            )
        if not route_entries:
            return network

        nodes_by_id: dict[str, dict[str, Any]] = {}
        for route_entry in route_entries:
            geometry = route_entry["geometry"]
            anchor_distances = geometry.get("anchor_distances", {})
            samples = geometry.get("samples", [])
            seen_planets: set[str] = set()

            for point_index, point in enumerate(route_entry["path"].get("points", [])):
                planet_name = str(point.get("planet_name") or "").strip()
                if not planet_name:
                    continue
                name_key = self._normalize_name_key(planet_name)
                if name_key in seen_planets:
                    continue
                seen_planets.add(name_key)
                canonical = self._route_planet(planet_name)
                anchor_x, anchor_y = self._vector_point_xy(point)
                planet_x = float(canonical["x"]) if canonical is not None else float(anchor_x)
                planet_y = float(canonical["y"]) if canonical is not None else float(anchor_y)
                display_name = str(canonical["name"]) if canonical is not None else planet_name
                distance = anchor_distances.get(point_index)
                if distance is None:
                    distance = self._estimate_distance_on_sampled_path(samples, anchor_x, anchor_y)
                node_id = f"planet:{self._network_slug(display_name)}"
                node = nodes_by_id.setdefault(
                    node_id,
                    {
                        "id": node_id,
                        "kind": "planet",
                        "transfer_kind": "route-planet",
                        "name": display_name,
                        "x": round(planet_x, 6),
                        "y": round(planet_y, 6),
                        "_route_ids": set(),
                        "_layer_ids": set(),
                        "memberships": [],
                    },
                )
                node["_route_ids"].add(route_entry["route_id"])
                node["_layer_ids"].add(route_entry["layer_id"])
                node["memberships"].append(
                    {
                        "route_id": route_entry["route_id"],
                        "layer_id": route_entry["layer_id"],
                        "path_id": str(route_entry["path"].get("id") or route_entry["route_id"]),
                        "distance": round(float(distance), 6),
                        "point_index": point_index,
                        "source": "vector-point",
                    }
                )

            for planet_name in route_entry["route_planets"]:
                name_key = self._normalize_name_key(planet_name)
                if name_key in seen_planets:
                    continue
                canonical = self._route_planet(planet_name)
                if canonical is None:
                    continue
                seen_planets.add(name_key)
                planet_x = float(canonical["x"])
                planet_y = float(canonical["y"])
                node_id = f"planet:{self._network_slug(str(canonical['name']))}"
                node = nodes_by_id.setdefault(
                    node_id,
                    {
                        "id": node_id,
                        "kind": "planet",
                        "transfer_kind": "route-planet",
                        "name": str(canonical["name"]),
                        "x": round(planet_x, 6),
                        "y": round(planet_y, 6),
                        "_route_ids": set(),
                        "_layer_ids": set(),
                        "memberships": [],
                    },
                )
                node["_route_ids"].add(route_entry["route_id"])
                node["_layer_ids"].add(route_entry["layer_id"])
                node["memberships"].append(
                    {
                        "route_id": route_entry["route_id"],
                        "layer_id": route_entry["layer_id"],
                        "path_id": str(route_entry["path"].get("id") or route_entry["route_id"]),
                        "distance": round(
                            self._estimate_distance_on_sampled_path(samples, planet_x, planet_y),
                            6,
                        ),
                        "point_index": None,
                        "source": "route-planet-list",
                    }
                )

        planet_nodes = [
            {
                "x": float(node["x"]),
                "y": float(node["y"]),
            }
            for node in nodes_by_id.values()
            if str(node.get("kind")) == "planet"
        ]
        planet_skip_tolerance = self._route_network_norm_distance(HYPER_NETWORK_PLANET_TOLERANCE_PX)
        intersection_tolerance = self._route_network_norm_distance(HYPER_NETWORK_INTERSECTION_TOLERANCE_PX)
        merge_tolerance = self._route_network_norm_distance(HYPER_NETWORK_NODE_MERGE_TOLERANCE_PX)
        raw_intersections: list[dict[str, Any]] = []

        for left, right in combinations(route_entries, 2):
            left_bounds = left["geometry"].get("bounds")
            right_bounds = right["geometry"].get("bounds")
            if left_bounds and right_bounds:
                if (
                    left_bounds["right"] < right_bounds["left"] - intersection_tolerance
                    or right_bounds["right"] < left_bounds["left"] - intersection_tolerance
                    or left_bounds["bottom"] < right_bounds["top"] - intersection_tolerance
                    or right_bounds["bottom"] < left_bounds["top"] - intersection_tolerance
                ):
                    continue
            left_samples = left["geometry"].get("samples", [])
            right_samples = right["geometry"].get("samples", [])
            if len(left_samples) < 2 or len(right_samples) < 2:
                continue

            for left_index in range(1, len(left_samples)):
                a_start = left_samples[left_index - 1]
                a_end = left_samples[left_index]
                a_left = min(float(a_start["x"]), float(a_end["x"]))
                a_right = max(float(a_start["x"]), float(a_end["x"]))
                a_top = min(float(a_start["y"]), float(a_end["y"]))
                a_bottom = max(float(a_start["y"]), float(a_end["y"]))

                for right_index in range(1, len(right_samples)):
                    b_start = right_samples[right_index - 1]
                    b_end = right_samples[right_index]
                    b_left = min(float(b_start["x"]), float(b_end["x"]))
                    b_right = max(float(b_start["x"]), float(b_end["x"]))
                    b_top = min(float(b_start["y"]), float(b_end["y"]))
                    b_bottom = max(float(b_start["y"]), float(b_end["y"]))
                    if (
                        a_right < b_left - intersection_tolerance
                        or b_right < a_left - intersection_tolerance
                        or a_bottom < b_top - intersection_tolerance
                        or b_bottom < a_top - intersection_tolerance
                    ):
                        continue
                    hit = self._segment_intersection_info(
                        a_start,
                        a_end,
                        b_start,
                        b_end,
                        tolerance=intersection_tolerance,
                    )
                    if hit is None:
                        continue
                    hit_x = float(hit["x"])
                    hit_y = float(hit["y"])
                    if any(
                        math.hypot(hit_x - float(node["x"]), hit_y - float(node["y"])) <= planet_skip_tolerance
                        for node in planet_nodes
                    ):
                        continue
                    raw_intersections.append(
                        {
                            "kind": (
                                "shared-corridor"
                                if str(hit["kind"]) == "segment-overlap"
                                else "geometric-intersection"
                            ),
                            "x": hit_x,
                            "y": hit_y,
                            "memberships": [
                                {
                                    "route_id": left["route_id"],
                                    "layer_id": left["layer_id"],
                                    "path_id": str(left["path"].get("id") or left["route_id"]),
                                    "distance": round(
                                        float(a_start["distance"])
                                        + (float(a_end["distance"]) - float(a_start["distance"]))
                                        * float(hit["a_t"]),
                                        6,
                                    ),
                                },
                                {
                                    "route_id": right["route_id"],
                                    "layer_id": right["layer_id"],
                                    "path_id": str(right["path"].get("id") or right["route_id"]),
                                    "distance": round(
                                        float(b_start["distance"])
                                        + (float(b_end["distance"]) - float(b_start["distance"]))
                                        * float(hit["b_t"]),
                                        6,
                                    ),
                                },
                            ],
                        }
                    )

        def merge_intersection_into_cluster(cluster: dict[str, Any], raw: dict[str, Any]):
            count = int(cluster["count"])
            cluster["x"] = (float(cluster["x"]) * count + float(raw["x"])) / (count + 1)
            cluster["y"] = (float(cluster["y"]) * count + float(raw["y"])) / (count + 1)
            cluster["count"] = count + 1
            cluster["kinds"].add(str(raw["kind"]))
            for membership in raw["memberships"]:
                cluster["route_ids"].add(str(membership["route_id"]))
                cluster["layer_ids"].add(str(membership["layer_id"]))
                cluster["memberships_by_route"][str(membership["route_id"])].append(membership)

        clusters: list[dict[str, Any]] = []
        raw_by_route_pair: dict[tuple[str, ...], list[dict[str, Any]]] = defaultdict(list)
        for raw in raw_intersections:
            pair_key = tuple(
                sorted(str(membership.get("route_id") or "") for membership in raw["memberships"])
            )
            raw_by_route_pair[pair_key].append(raw)

        for _pair_key, pair_items in raw_by_route_pair.items():
            if len(pair_items) > 8:
                corridor_cluster = {
                    "x": float(pair_items[0]["x"]),
                    "y": float(pair_items[0]["y"]),
                    "count": 0,
                    "kinds": {"shared-corridor"},
                    "route_ids": set(),
                    "layer_ids": set(),
                    "memberships_by_route": defaultdict(list),
                }
                for raw in pair_items:
                    merge_intersection_into_cluster(corridor_cluster, raw)
                corridor_cluster["kinds"].add("shared-corridor")
                clusters.append(corridor_cluster)
                continue

            for raw in pair_items:
                cluster = next(
                    (
                        candidate
                        for candidate in clusters
                        if math.hypot(
                            float(raw["x"]) - float(candidate["x"]),
                            float(raw["y"]) - float(candidate["y"]),
                        )
                        <= merge_tolerance
                    ),
                    None,
                )
                if cluster is None:
                    cluster = {
                        "x": float(raw["x"]),
                        "y": float(raw["y"]),
                        "count": 0,
                        "kinds": set(),
                        "route_ids": set(),
                        "layer_ids": set(),
                        "memberships_by_route": defaultdict(list),
                    }
                    clusters.append(cluster)
                merge_intersection_into_cluster(cluster, raw)

        for cluster in clusters:
            route_ids = sorted(str(route_id) for route_id in cluster["route_ids"])
            if len(route_ids) < 2:
                continue
            memberships: list[dict[str, Any]] = []
            for route_id in route_ids:
                values = cluster["memberships_by_route"][route_id]
                if not values:
                    continue
                base = dict(values[0])
                base["distance"] = round(
                    sum(float(item["distance"]) for item in values) / len(values),
                    6,
                )
                memberships.append(base)
            if len(memberships) < 2:
                continue
            transfer_kind = (
                "shared-corridor"
                if "shared-corridor" in cluster["kinds"]
                else "geometric-intersection"
            )
            route_slug = "-".join(self._network_slug(route_id) for route_id in route_ids[:4]) or "intersection"
            node_id = (
                f"intersection:{route_slug}:{int(round(float(cluster['x']) * 10000))}:"
                f"{int(round(float(cluster['y']) * 10000))}"
            )
            suffix = 2
            while node_id in nodes_by_id:
                node_id = (
                    f"intersection:{route_slug}:{int(round(float(cluster['x']) * 10000))}:"
                    f"{int(round(float(cluster['y']) * 10000))}:{suffix}"
                )
                suffix += 1
            nodes_by_id[node_id] = {
                "id": node_id,
                "kind": "intersection",
                "transfer_kind": transfer_kind,
                "name": "",
                "x": round(float(cluster["x"]), 6),
                "y": round(float(cluster["y"]), 6),
                "_route_ids": set(route_ids),
                "_layer_ids": set(str(layer_id) for layer_id in cluster["layer_ids"]),
                "memberships": memberships,
            }

        nodes: list[dict[str, Any]] = []
        node_lookup: dict[str, dict[str, Any]] = {}
        for node in sorted(
            nodes_by_id.values(),
            key=lambda item: (
                0 if str(item.get("kind")) == "planet" else 1,
                str(item.get("name") or ""),
                str(item.get("id") or ""),
            ),
        ):
            route_ids = sorted(str(value) for value in node.get("_route_ids", set()))
            layer_ids = sorted(str(value) for value in node.get("_layer_ids", set()))
            memberships = sorted(
                [
                    {
                        **membership,
                        "distance": round(float(membership["distance"]), 6),
                    }
                    for membership in node.get("memberships", [])
                ],
                key=lambda item: (
                    str(item.get("route_id") or ""),
                    float(item.get("distance", 0.0)),
                ),
            )
            transfer_kind = str(node.get("transfer_kind") or "")
            if str(node.get("kind")) == "planet":
                transfer_kind = "shared-planet" if len(route_ids) > 1 else "route-planet"
            finalized = {
                "id": str(node["id"]),
                "kind": str(node["kind"]),
                "transfer_kind": transfer_kind,
                "x": round(float(node["x"]), 6),
                "y": round(float(node["y"]), 6),
                "route_ids": route_ids,
                "layer_ids": layer_ids,
                "memberships": memberships,
            }
            if str(node.get("name") or "").strip():
                finalized["name"] = str(node["name"])
            nodes.append(finalized)
            node_lookup[finalized["id"]] = finalized

        route_nodes: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for node in nodes:
            for membership in node.get("memberships", []):
                route_nodes[str(membership["route_id"])].append(
                    {
                        "node_id": str(node["id"]),
                        "distance": float(membership["distance"]),
                    }
                )

        edges: list[dict[str, Any]] = []
        route_summaries_by_id: dict[str, dict[str, Any]] = {}
        for route_entry in route_entries:
            route_id = str(route_entry["route_id"])
            occurrences = route_nodes.get(route_id, [])
            deduped: dict[str, dict[str, Any]] = {}
            for occurrence in occurrences:
                current = deduped.get(str(occurrence["node_id"]))
                if current is None or float(occurrence["distance"]) < float(current["distance"]):
                    deduped[str(occurrence["node_id"])] = occurrence
            ordered = sorted(
                deduped.values(),
                key=lambda item: (float(item["distance"]), str(item["node_id"])),
            )
            route_node_ids = [str(item["node_id"]) for item in ordered]
            edge_counter = 1
            for index in range(1, len(ordered)):
                previous = ordered[index - 1]
                current = ordered[index]
                length = float(current["distance"]) - float(previous["distance"])
                if length <= 1e-9:
                    continue
                edges.append(
                    {
                        "id": f"edge:{self._network_slug(route_id)}:{edge_counter}",
                        "route_id": route_id,
                        "layer_id": str(route_entry["layer_id"]),
                        "from_node_id": str(previous["node_id"]),
                        "to_node_id": str(current["node_id"]),
                        "length": round(length, 6),
                    }
                )
                edge_counter += 1
            route_summaries_by_id[route_id] = {
                "route_id": route_id,
                "layer_id": str(route_entry["layer_id"]),
                "name": str(route_entry["name"]),
                "route_length": round(float(route_entry["geometry"].get("length", 0.0)), 6),
                "node_ids": route_node_ids,
                "transfer_node_ids": [
                    node_id
                    for node_id in route_node_ids
                    if len(node_lookup.get(node_id, {}).get("route_ids", [])) > 1
                ],
                "connected_route_ids": [],
                "transfer_count": 0,
            }

        route_connections: list[dict[str, Any]] = []
        connections_by_route: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for node in nodes:
            route_ids = list(node.get("route_ids", []))
            if len(route_ids) < 2:
                continue
            memberships = {
                str(item["route_id"]): item for item in node.get("memberships", [])
            }
            for left_id, right_id in combinations(route_ids, 2):
                left_membership = memberships.get(str(left_id))
                right_membership = memberships.get(str(right_id))
                if left_membership is None or right_membership is None:
                    continue
                connection = {
                    "id": (
                        f"connection:{self._network_slug(str(left_id))}:"
                        f"{self._network_slug(str(right_id))}:{self._network_slug(str(node['id']))}"
                    ),
                    "kind": str(node["transfer_kind"]),
                    "node_id": str(node["id"]),
                    "route_ids": [str(left_id), str(right_id)],
                    "layer_ids": [
                        str(left_membership.get("layer_id") or ""),
                        str(right_membership.get("layer_id") or ""),
                    ],
                    "x": round(float(node["x"]), 6),
                    "y": round(float(node["y"]), 6),
                }
                if str(node.get("name") or "").strip():
                    connection["planet_name"] = str(node["name"])
                route_connections.append(connection)
                for source_id, target_id, target_membership in (
                    (left_id, right_id, right_membership),
                    (right_id, left_id, left_membership),
                ):
                    connections_by_route[str(source_id)].append(
                        {
                            "route_id": str(target_id),
                            "layer_id": str(target_membership.get("layer_id") or ""),
                            "via_node_id": str(node["id"]),
                            "via_kind": str(node["transfer_kind"]),
                            "x": round(float(node["x"]), 6),
                            "y": round(float(node["y"]), 6),
                            **(
                                {"planet_name": str(node["name"])}
                                if str(node.get("name") or "").strip()
                                else {}
                            ),
                        }
                    )

        for route_id, summary in route_summaries_by_id.items():
            summary["connected_route_ids"] = sorted(
                {str(item["route_id"]) for item in connections_by_route.get(route_id, [])}
            )
            summary["transfer_count"] = len(summary["transfer_node_ids"])

        for route in routes_payload:
            route_id = str(route.get("id") or "").strip()
            route["connections"] = sorted(
                connections_by_route.get(route_id, []),
                key=lambda item: (
                    str(item.get("route_id") or ""),
                    str(item.get("via_kind") or ""),
                    str(item.get("via_node_id") or ""),
                ),
            )
            if route_id in route_summaries_by_id:
                route["network_summary"] = deepcopy(route_summaries_by_id[route_id])

        route_summaries = [
            deepcopy(route_summaries_by_id[str(route.get("id"))])
            for route in routes_payload
            if str(route.get("id") or "").strip() in route_summaries_by_id
        ]
        route_connections.sort(
            key=lambda item: (
                str(item.get("kind") or ""),
                str(item.get("route_ids", ["", ""])[0]),
                str(item.get("route_ids", ["", ""])[1]),
                str(item.get("node_id") or ""),
            )
        )

        network["nodes"] = nodes
        network["edges"] = edges
        network["route_connections"] = route_connections
        network["route_summaries"] = route_summaries
        network["summary"] = {
            "routes": len(route_summaries),
            "nodes": len(nodes),
            "edges": len(edges),
            "transfer_nodes": len([node for node in nodes if len(node.get("route_ids", [])) > 1]),
            "route_connections": len(route_connections),
        }
        return network

    def _find_nearest_planet(
        self,
        nx: float,
        ny: float,
        tol_px: float = 14.0,
    ) -> dict[str, Any] | None:
        visible_bounds = self._visible_norm_bounds(margin_px=32.0)
        best: dict[str, Any] | None = None
        best_dist = float(tol_px)
        px, py = self._norm_to_canvas(nx, ny)
        for planet in self._all_planet_candidates():
            if not self._norm_point_visible(float(planet["x"]), float(planet["y"]), visible_bounds):
                continue
            cx, cy = self._norm_to_canvas(float(planet["x"]), float(planet["y"]))
            dist = math.hypot(cx - px, cy - py)
            if dist > best_dist:
                continue
            best = planet
            best_dist = dist
        return best

    def _point_matches_planet(
        self,
        point: dict[str, Any],
        planet: dict[str, Any],
        tol_px: float = 10.0,
    ) -> bool:
        point_name_key = self._normalize_name_key(str(point.get("planet_name", "")))
        planet_name_key = self._normalize_name_key(str(planet["name"]))
        if point_name_key:
            return point_name_key == planet_name_key
        ax, ay = self._vector_point_xy(point, "anchor")
        point_cx, point_cy = self._norm_to_canvas(ax, ay)
        planet_cx, planet_cy = self._norm_to_canvas(float(planet["x"]), float(planet["y"]))
        return math.hypot(point_cx - planet_cx, point_cy - planet_cy) <= tol_px

    def _find_path_point_for_planet(
        self,
        planet: dict[str, Any],
        endpoints_only: bool = False,
        path_id: str | None = None,
    ) -> dict[str, Any] | None:
        if path_id is not None:
            path = self._find_vector_path(path_id)
            paths = [path] if path is not None else []
        else:
            paths = self._editable_vector_paths()
        for path in paths:
            points = path.get("points", [])
            if not points:
                continue
            candidate_indexes = [0, len(points) - 1] if endpoints_only and len(points) > 1 else range(len(points))
            for point_index in candidate_indexes:
                if not (0 <= point_index < len(points)):
                    continue
                if self._point_matches_planet(points[point_index], planet):
                    return {
                        "path": path,
                        "point_index": point_index,
                        "is_endpoint": point_index in {0, len(points) - 1},
                    }
        return None

    def _planet_labels_match(self, a: dict[str, Any], b: dict[str, Any]) -> bool:
        return self._normalize_name_key(str(a["name"])) == self._normalize_name_key(str(b["name"]))

    def _points_equivalent(
        self,
        point_a: dict[str, Any],
        point_b: dict[str, Any],
        tol: float = 0.0008,
    ) -> bool:
        ax, ay = self._vector_point_xy(point_a, "anchor")
        bx, by = self._vector_point_xy(point_b, "anchor")
        return math.hypot(ax - bx, ay - by) <= tol

    def _hyper_selection_rect(
        self,
        start: tuple[float, float],
        end: tuple[float, float],
    ) -> tuple[float, float, float, float]:
        left = max(0.0, min(float(start[0]), float(end[0])))
        top = max(0.0, min(float(start[1]), float(end[1])))
        right = min(1.0, max(float(start[0]), float(end[0])))
        bottom = min(1.0, max(float(start[1]), float(end[1])))
        return left, top, right, bottom

    def _point_in_hyper_rect(
        self,
        nx: float,
        ny: float,
        rect: tuple[float, float, float, float],
    ) -> bool:
        left, top, right, bottom = rect
        return left <= nx <= right and top <= ny <= bottom

    def _segment_intersects_hyper_rect(
        self,
        sampled: list[tuple[float, float]],
        rect: tuple[float, float, float, float],
    ) -> bool:
        if any(self._point_in_hyper_rect(sx, sy, rect) for sx, sy in sampled):
            return True
        left, top, right, bottom = rect
        seg_left = min(point[0] for point in sampled)
        seg_top = min(point[1] for point in sampled)
        seg_right = max(point[0] for point in sampled)
        seg_bottom = max(point[1] for point in sampled)
        return not (seg_right < left or seg_left > right or seg_bottom < top or seg_top > bottom)

    def _hyper_segments_in_rect(
        self,
        rect: tuple[float, float, float, float],
    ) -> list[dict[str, Any]]:
        matches: list[dict[str, Any]] = []
        for path in self._editable_vector_paths():
            if path.get("closed"):
                continue
            for segment_index, p0, p1, p2, p3 in self._iter_vector_segments(path):
                sampled = self._sample_vector_segment(p0, p1, p2, p3, steps=18)
                if self._segment_intersects_hyper_rect(sampled, rect):
                    matches.append(
                        {
                            "path_id": str(path.get("id")),
                            "segment_index": int(segment_index),
                        }
                    )
        return matches

    def _path_pieces_after_segment_removals(
        self,
        points: list[dict[str, Any]],
        segment_indexes: set[int],
    ) -> list[list[dict[str, Any]]]:
        if len(points) < 2:
            return []
        pieces: list[list[dict[str, Any]]] = []
        current: list[dict[str, Any]] = []
        for segment_index in range(len(points) - 1):
            if segment_index in segment_indexes:
                if len(current) >= 2:
                    pieces.append(current)
                current = []
                continue
            if not current:
                current = [deepcopy(points[segment_index])]
            current.append(deepcopy(points[segment_index + 1]))
        if len(current) >= 2:
            pieces.append(current)
        return pieces

    def _delete_hyper_segments(self, segments: list[dict[str, Any]]):
        grouped: dict[str, set[int]] = defaultdict(set)
        for segment in segments:
            path_id = str(segment.get("path_id") or "").strip()
            try:
                segment_index = int(segment.get("segment_index"))
            except (TypeError, ValueError):
                continue
            if path_id:
                grouped[path_id].add(segment_index)
        if not grouped:
            self.status_var.set("Kein Hyperraum-Bereich markiert.")
            self._redraw()
            return

        active_path_id = self.active_vector_path_id
        fallback_active: dict[str, Any] | None = None
        removed_count = sum(len(indexes) for indexes in grouped.values())
        self._push_vector_history()
        new_paths: list[dict[str, Any]] = []
        for path in self.vector_paths:
            path_id = str(path.get("id"))
            if path_id not in grouped:
                new_paths.append(path)
                if active_path_id == path_id:
                    fallback_active = path
                continue
            if path.get("closed"):
                new_paths.append(path)
                continue
            pieces = self._path_pieces_after_segment_removals(
                deepcopy(path.get("points", [])),
                grouped[path_id],
            )
            replacements = [self._build_path_from_points(piece, template=path) for piece in pieces if len(piece) >= 2]
            if replacements:
                fallback_active = replacements[-1]
                new_paths.extend(replacements)
            elif fallback_active is None and new_paths:
                fallback_active = new_paths[-1]
        self.vector_paths = new_paths
        if fallback_active is not None:
            self.active_vector_path_id = str(fallback_active.get("id"))
            self.active_vector_layer_id = self._vector_layer_id(fallback_active)
        else:
            self.active_vector_path_id = None
            self.active_vector_layer_id = None
        self.active_vector_point_index = None
        self.active_vector_handle = None
        self.active_hyper_segment = None
        self.hyper_selected_planet = None
        self.hyper_box_selection = None
        self.status_var.set(f"{removed_count} Hyperraum-Segmente im markierten Bereich entfernt.")
        self._set_vector_info()
        self._redraw()

    def _build_path_from_points(
        self,
        points: list[dict[str, Any]],
        template: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        layer_paths = self._vector_layer_paths()
        layer_source = template or (layer_paths[-1] if layer_paths else self._active_vector_path())
        path_id = self._next_vector_path_id()
        path = {
            "id": path_id,
            "layer_id": self._vector_layer_id(layer_source) if layer_source is not None else path_id,
            "name": layer_source.get("name", f"Hyperroute {len(self._vector_layer_entries()) + 1}")
            if layer_source is not None
            else f"Hyperroute {len(self._vector_layer_entries()) + 1}",
            "closed": False,
            "draft": False,
            "opacity_pct": int(layer_source.get("opacity_pct", 100)) if layer_source is not None else 100,
            "fill_tone": str(layer_source.get("fill_tone", "")) if layer_source is not None else "",
            "points": deepcopy(points),
        }
        self._copy_path_metadata(path, layer_source)
        return path

    def _replace_vector_path_with_paths(
        self,
        path: dict[str, Any],
        replacements: list[dict[str, Any]],
    ):
        try:
            index = next(
                idx for idx, candidate in enumerate(self.vector_paths) if candidate.get("id") == path.get("id")
            )
        except StopIteration:
            return
        self.vector_paths[index : index + 1] = replacements
        if replacements:
            last = replacements[-1]
            self.active_vector_path_id = str(last.get("id"))
            self.active_vector_layer_id = self._vector_layer_id(last)
        else:
            self.active_vector_path_id = (
                str(self.vector_paths[-1].get("id")) if self.vector_paths else None
            )
            fallback = self._find_vector_path(self.active_vector_path_id)
            self.active_vector_layer_id = self._vector_layer_id(fallback) if fallback is not None else None
        self.active_vector_point_index = None
        self.active_vector_handle = None

    def _replace_two_vector_paths_with_path(
        self,
        first_path: dict[str, Any],
        second_path: dict[str, Any],
        replacement: dict[str, Any],
    ):
        keep: list[dict[str, Any]] = []
        inserted = False
        for path in self.vector_paths:
            if path.get("id") in {first_path.get("id"), second_path.get("id")}:
                if not inserted:
                    keep.append(replacement)
                    inserted = True
                continue
            keep.append(path)
        self.vector_paths = keep
        self.active_vector_path_id = str(replacement.get("id"))
        self.active_vector_layer_id = self._vector_layer_id(replacement)
        self.active_vector_point_index = None
        self.active_vector_handle = None

    def _delete_selected_hyper_segment(self):
        segment = self.active_hyper_segment
        if segment is None:
            self.status_var.set("Kein Hyperraum-Segment markiert.")
            return
        path = self._find_vector_path(str(segment.get("path_id")))
        if path is None:
            self.active_hyper_segment = None
            self.status_var.set("Das markierte Segment existiert nicht mehr.")
            self._redraw()
            return
        if path.get("closed"):
            self.status_var.set("Geschlossene Konturen koennen im Hyperraum-Tool nicht segmentweise getrennt werden.")
            return
        points = path.get("points", [])
        segment_index = int(segment.get("segment_index", -1))
        if not (0 <= segment_index < len(points) - 1):
            self.status_var.set("Das markierte Segment ist ungueltig.")
            return
        self._push_vector_history()
        left_points = deepcopy(points[: segment_index + 1])
        right_points = deepcopy(points[segment_index + 1 :])
        replacements: list[dict[str, Any]] = []
        if len(left_points) >= 2:
            replacements.append(self._build_path_from_points(left_points, template=path))
        if len(right_points) >= 2:
            replacements.append(self._build_path_from_points(right_points, template=path))
        self._replace_vector_path_with_paths(path, replacements)
        self.active_hyper_segment = None
        self.hyper_selected_planet = None
        self.hyper_action_var.set("select")
        self.status_var.set(
            f'Segment aus {path.get("name", "Pfad")} entfernt. {len(replacements)} Teilkurven verbleiben.'
        )
        self._update_tool_mode_ui()
        self._redraw()

    def _extend_or_connect_hyperspace(
        self,
        start_planet: dict[str, Any],
        end_planet: dict[str, Any],
    ) -> dict[str, Any] | None:
        if self._planet_labels_match(start_planet, end_planet):
            self.status_var.set("Start- und Zielplanet sind identisch.")
            return None
        preferred_path_id = str(start_planet.get("path_id") or "").strip() or None
        start_match = self._find_path_point_for_planet(
            start_planet,
            endpoints_only=True,
            path_id=preferred_path_id,
        )
        end_match = self._find_path_point_for_planet(
            end_planet,
            endpoints_only=True,
            path_id=preferred_path_id,
        )
        if start_match is not None and not bool(start_match["is_endpoint"]):
            self.status_var.set("Startplanet liegt mitten in einer Linie. Bitte ein Linienende waehlen.")
            return None
        if end_match is not None and not bool(end_match["is_endpoint"]):
            self.status_var.set("Zielplanet liegt mitten in einer Linie. Bitte ein Linienende waehlen.")
            return None

        start_point = self._new_planet_vector_point(start_planet)
        end_point = self._new_planet_vector_point(end_planet)

        if start_match is None:
            self._push_vector_history()
            new_path = self._build_path_from_points([start_point, end_point])
            self.vector_paths.append(new_path)
            self.active_vector_path_id = str(new_path.get("id"))
            self.active_vector_layer_id = self._vector_layer_id(new_path)
            self.status_var.set(
                f'Neue Hyperraum-Verbindung erstellt: {start_planet["name"]} -> {end_planet["name"]}.'
            )
            return {
                "path_id": str(new_path.get("id")),
                "planet": dict(end_planet),
            }

        path = start_match["path"]
        if end_match is not None and str(end_match["path"].get("id")) == str(path.get("id")):
            self.status_var.set("Beide Planeten liegen bereits auf derselben Hyperraum-Linie.")
            return None

        self._push_vector_history()
        points = deepcopy(path.get("points", []))
        if int(start_match["point_index"]) == 0:
            points.insert(0, end_point)
        else:
            points.append(end_point)
        replacement = self._build_path_from_points(points, template=path)
        self._replace_vector_path_with_paths(path, [replacement])
        self.status_var.set(
            f'{path.get("name", "Pfad")} bis {end_planet["name"]} erweitert.'
        )
        return {
            "path_id": str(replacement.get("id")),
            "planet": dict(end_planet),
        }

    def _set_active_hyper_segment(self, segment_hit: dict[str, Any]):
        self._set_active_vector_selection(str(segment_hit["path_id"]))
        self.active_hyper_segment = {
            "path_id": str(segment_hit["path_id"]),
            "segment_index": int(segment_hit["segment_index"]),
        }
        self.hyper_selected_planet = None
        self.hyper_box_selection = None
        self._set_vector_info()

    def _set_active_hyper_planet(self, planet: dict[str, Any], path_id: str | None = None):
        self.hyper_selected_planet = {
            "name": str(planet["name"]),
            "x": float(planet["x"]),
            "y": float(planet["y"]),
            "source": str(planet.get("source", "")),
        }
        self.active_hyper_segment = None
        self.hyper_box_selection = None
        match = self._find_path_point_for_planet(
            self.hyper_selected_planet,
            endpoints_only=True,
            path_id=path_id,
        )
        if match is not None:
            self.active_vector_path_id = str(match["path"].get("id"))
            self.active_vector_layer_id = self._vector_layer_id(match["path"])
            self.hyper_selected_planet["path_id"] = str(match["path"].get("id"))
            self.hyper_selected_planet["point_index"] = int(match["point_index"])
        else:
            self.hyper_selected_planet["path_id"] = None
            self.hyper_selected_planet["point_index"] = None
        self.active_vector_point_index = None
        self.active_vector_handle = None
        self._set_vector_info()

    def _create_vector_path(self, nx: float, ny: float) -> dict[str, Any]:
        layer_paths = self._vector_layer_paths()
        layer_source = layer_paths[-1] if layer_paths else None
        path_id = self._next_vector_path_id()
        path = {
            "id": path_id,
            "layer_id": self._vector_layer_id(layer_source) if layer_source is not None else path_id,
            "name": layer_source.get("name", f"Rim {len(self._vector_layer_entries()) + 1}") if layer_source is not None else f"Rim {len(self._vector_layer_entries()) + 1}",
            "closed": False,
            "draft": True,
            "opacity_pct": int(layer_source.get("opacity_pct", 100)) if layer_source is not None else 100,
            "fill_tone": str(layer_source.get("fill_tone", "")) if layer_source is not None else "",
            "points": [self._new_vector_point(nx, ny)],
        }
        self._copy_path_metadata(path, layer_source)
        self.vector_paths.append(path)
        self.active_vector_path_id = path["id"]
        self.active_vector_layer_id = self._vector_layer_id(path)
        self.active_vector_point_index = 0
        self.active_vector_handle = None
        self._set_vector_info(
            f'{path["name"]}: neue Kontur gestartet. Weitere Punkte setzen, auf Punkt 1 klicken zum Schliessen oder Enter fuer offene Linie.'
        )
        return path

    def _push_vector_history(self):
        self.vector_history.append(
            {
                "paths": deepcopy(self.vector_paths),
                "grid_guides": deepcopy(self.grid_guides),
                "active_path_id": self.active_vector_path_id,
                "active_layer_id": self.active_vector_layer_id,
                "active_point_index": self.active_vector_point_index,
                "active_handle": deepcopy(self.active_vector_handle),
                "active_grid_guide_id": self.active_grid_guide_id,
            }
        )
        self.vector_history = self.vector_history[-80:]

    def _restore_vector_snapshot(self, snapshot: dict[str, Any]):
        self.vector_paths = deepcopy(snapshot.get("paths", []))
        self.grid_guides = deepcopy(snapshot.get("grid_guides", []))
        self.active_vector_path_id = snapshot.get("active_path_id")
        self.active_vector_layer_id = snapshot.get("active_layer_id")
        self.active_vector_point_index = snapshot.get("active_point_index")
        self.active_vector_handle = snapshot.get("active_handle")
        self.active_grid_guide_id = snapshot.get("active_grid_guide_id")
        self.hyper_selected_planet = None
        self.active_hyper_segment = None
        self._set_vector_info("Editor-Aktion rueckgaengig gemacht.")

    def _finalize_active_vector_path(self) -> bool:
        path = self._active_vector_path()
        if path is None or not path.get("draft"):
            return False
        if len(path.get("points", [])) < 2:
            self.status_var.set("Fuer einen Pfad werden mindestens zwei Punkte benoetigt.")
            return False
        self._push_vector_history()
        path["draft"] = False
        self.active_vector_point_index = len(path["points"]) - 1
        self.active_vector_handle = None
        self.status_var.set(
            f'{path.get("name", "Pfad")} abgeschlossen. Punkte und Handles koennen jetzt angepasst werden.'
        )
        self._set_vector_info()
        return True

    def _close_active_vector_path(self) -> bool:
        path = self._active_vector_path()
        if path is None or len(path.get("points", [])) < 3:
            self.status_var.set("Zum Schliessen braucht die Kurve mindestens drei Punkte.")
            return False
        self._push_vector_history()
        path["draft"] = False
        path["closed"] = True
        self.active_vector_point_index = 0
        self.active_vector_handle = None
        self.status_var.set(
            f'{path.get("name", "Pfad")} geschlossen. Jetzt koennen Anker und Handles angepasst werden.'
        )
        self._set_vector_info()
        return True

    def _vector_lerp(
        self,
        a: tuple[float, float],
        b: tuple[float, float],
        t: float,
    ) -> tuple[float, float]:
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

    def _vector_cubic_point(
        self,
        p0: tuple[float, float],
        p1: tuple[float, float],
        p2: tuple[float, float],
        p3: tuple[float, float],
        t: float,
    ) -> tuple[float, float]:
        mt = 1.0 - t
        x = (
            (mt ** 3) * p0[0]
            + 3.0 * (mt ** 2) * t * p1[0]
            + 3.0 * mt * (t ** 2) * p2[0]
            + (t ** 3) * p3[0]
        )
        y = (
            (mt ** 3) * p0[1]
            + 3.0 * (mt ** 2) * t * p1[1]
            + 3.0 * mt * (t ** 2) * p2[1]
            + (t ** 3) * p3[1]
        )
        return x, y

    def _iter_vector_segments(self, path: dict[str, Any]):
        points = path.get("points", [])
        if len(points) < 2:
            return
        segment_count = self._vector_segment_count(path)
        for index in range(segment_count):
            start = points[index]
            end = points[(index + 1) % len(points)]
            yield (
                index,
                self._vector_point_xy(start, "anchor"),
                self._vector_point_xy(start, "out"),
                self._vector_point_xy(end, "in"),
                self._vector_point_xy(end, "anchor"),
            )

    def _sample_vector_segment(
        self,
        p0: tuple[float, float],
        p1: tuple[float, float],
        p2: tuple[float, float],
        p3: tuple[float, float],
        steps: int = 24,
    ) -> list[tuple[float, float]]:
        return [
            self._vector_cubic_point(p0, p1, p2, p3, step / steps)
            for step in range(steps + 1)
        ]

    def _hit_vector_control(self, nx: float, ny: float, tol_px: float = 12) -> dict[str, Any] | None:
        cx, cy = self._norm_to_canvas(nx, ny)
        ordered_paths = self._editable_vector_paths()

        best_hit = None
        best_dist = float(tol_px)
        for path in ordered_paths:
            points = path.get("points", [])
            for index, point in enumerate(points):
                for handle_key in ("in", "out"):
                    hx, hy = self._vector_point_xy(point, handle_key)
                    ax, ay = self._vector_point_xy(point, "anchor")
                    if math.hypot(hx - ax, hy - ay) * self.scale * min(self.img_w, self.img_h) < 6:
                        continue
                    handle_cx, handle_cy = self._norm_to_canvas(hx, hy)
                    dist = math.hypot(handle_cx - cx, handle_cy - cy)
                    if dist < best_dist:
                        best_dist = dist
                        best_hit = {
                            "kind": "handle",
                            "path_id": path.get("id"),
                            "point_index": index,
                            "handle": handle_key,
                        }
                ax, ay = self._vector_point_xy(point, "anchor")
                anchor_cx, anchor_cy = self._norm_to_canvas(ax, ay)
                dist = math.hypot(anchor_cx - cx, anchor_cy - cy)
                if dist < best_dist:
                    best_dist = dist
                    best_hit = {
                        "kind": "anchor",
                        "path_id": path.get("id"),
                        "point_index": index,
                    }
        return best_hit

    def _distance_point_to_canvas_segment(
        self,
        px: float,
        py: float,
        ax: float,
        ay: float,
        bx: float,
        by: float,
    ) -> tuple[float, float]:
        dx = bx - ax
        dy = by - ay
        length_sq = dx * dx + dy * dy
        if length_sq <= 1e-9:
            return math.hypot(px - ax, py - ay), 0.0
        t = ((px - ax) * dx + (py - ay) * dy) / length_sq
        t = max(0.0, min(1.0, t))
        closest_x = ax + dx * t
        closest_y = ay + dy * t
        return math.hypot(px - closest_x, py - closest_y), t

    def _hit_vector_segment(self, nx: float, ny: float, tol_px: float = 10) -> dict[str, Any] | None:
        cx, cy = self._norm_to_canvas(nx, ny)
        best = None
        best_dist = float(tol_px)
        for path in self._editable_vector_paths():
            if self._vector_segment_count(path) <= 0 or path.get("draft"):
                continue
            for segment_index, p0, p1, p2, p3 in self._iter_vector_segments(path):
                sampled = self._sample_vector_segment(p0, p1, p2, p3, steps=28)
                for sample_index in range(len(sampled) - 1):
                    ax, ay = self._norm_to_canvas(*sampled[sample_index])
                    bx, by = self._norm_to_canvas(*sampled[sample_index + 1])
                    dist, inner_t = self._distance_point_to_canvas_segment(cx, cy, ax, ay, bx, by)
                    if dist >= best_dist:
                        continue
                    t0 = sample_index / (len(sampled) - 1)
                    t1 = (sample_index + 1) / (len(sampled) - 1)
                    best_dist = dist
                    best = {
                        "path_id": path.get("id"),
                        "segment_index": segment_index,
                        "t": max(0.05, min(0.95, t0 + (t1 - t0) * inner_t)),
                    }
        return best

    def _insert_vector_point_on_segment(
        self,
        path: dict[str, Any],
        segment_index: int,
        t: float,
    ) -> int | None:
        points = path.get("points", [])
        if len(points) < 2:
            return None
        start_index = segment_index
        end_index = (segment_index + 1) % len(points)
        start = points[start_index]
        end = points[end_index]
        p0 = self._vector_point_xy(start, "anchor")
        p1 = self._vector_point_xy(start, "out")
        p2 = self._vector_point_xy(end, "in")
        p3 = self._vector_point_xy(end, "anchor")
        q0 = self._vector_lerp(p0, p1, t)
        q1 = self._vector_lerp(p1, p2, t)
        q2 = self._vector_lerp(p2, p3, t)
        r0 = self._vector_lerp(q0, q1, t)
        r1 = self._vector_lerp(q1, q2, t)
        s = self._vector_lerp(r0, r1, t)

        start["out"] = self._vector_xy(*q0)
        end["in"] = self._vector_xy(*q2)
        new_point = {
            "anchor": self._vector_xy(*s),
            "in": self._vector_xy(*r0),
            "out": self._vector_xy(*r1),
            "mode": "smooth",
        }
        insert_at = segment_index + 1
        points.insert(insert_at, new_point)
        self.active_vector_path_id = path.get("id")
        self.active_vector_point_index = insert_at
        self.active_vector_handle = None
        self._set_vector_info(f'Punkt in {path.get("name", "Pfad")} unterteilt und hinzugefuegt.')
        return insert_at

    def _move_vector_anchor(self, path: dict[str, Any], point_index: int, nx: float, ny: float):
        point = path["points"][point_index]
        old_ax, old_ay = self._vector_point_xy(point, "anchor")
        dx = nx - old_ax
        dy = ny - old_ay
        point["anchor"] = self._vector_xy(nx, ny)
        in_x, in_y = self._vector_point_xy(point, "in")
        out_x, out_y = self._vector_point_xy(point, "out")
        point["in"] = self._vector_xy(in_x + dx, in_y + dy)
        point["out"] = self._vector_xy(out_x + dx, out_y + dy)

    def _move_vector_handle(
        self,
        path: dict[str, Any],
        point_index: int,
        handle_key: str,
        nx: float,
        ny: float,
    ):
        point = path["points"][point_index]
        point[handle_key] = self._vector_xy(nx, ny)
        opposite_key = "out" if handle_key == "in" else "in"
        anchor_x, anchor_y = self._vector_point_xy(point, "anchor")
        if point.get("mode") == "smooth":
            point[opposite_key] = self._vector_xy(
                anchor_x - (nx - anchor_x),
                anchor_y - (ny - anchor_y),
            )

    def _delete_active_vector_selection(self):
        path = self._active_vector_path()
        if path is None:
            self.status_var.set("Keine aktive Rim-Ebene zum Loeschen.")
            return
        if self.active_vector_handle is not None:
            point_index, handle_key = self.active_vector_handle
            if 0 <= point_index < len(path.get("points", [])):
                self._push_vector_history()
                point = path["points"][point_index]
                anchor_x, anchor_y = self._vector_point_xy(point, "anchor")
                point[handle_key] = self._vector_xy(anchor_x, anchor_y)
                self.active_vector_handle = None
                self.status_var.set("Handle entfernt.")
                self._set_vector_info()
                self._redraw()
            return
        if self.active_vector_point_index is None:
            if not path.get("points"):
                self._push_vector_history()
                deleted_name = path.get("name", "Rim")
                self._delete_vector_path(str(path.get("id")))
                self.status_var.set(f'Leere Ebene "{deleted_name}" entfernt.')
                self._redraw()
                return
            self.status_var.set("Kein Vektorpunkt ausgewaehlt. Waehle einen Fixpunkt oder ein Subdivide.")
            return
        self._push_vector_history()
        self._delete_vector_point(path, int(self.active_vector_point_index))
        self._redraw()

    def _delete_vector_point(self, path: dict[str, Any], point_index: int):
        points = path.get("points", [])
        if not (0 <= point_index < len(points)):
            return
        del points[point_index]
        if not points:
            deleted_name = path.get("name", "Rim")
            self._delete_vector_path(str(path.get("id")))
            self.status_var.set(f"{deleted_name} hatte keinen Punkt mehr und wurde entfernt.")
            return
        if path.get("closed") and len(points) < 3:
            path["closed"] = False
        self.active_vector_point_index = min(point_index, len(points) - 1)
        self.active_vector_handle = None
        self.status_var.set(
            f'Punkt aus {path.get("name", "Rim")} entfernt. {len(points)} Punkte verbleiben.'
        )
        self._set_vector_info()

    def _delete_vector_path(self, path_id: str):
        deleted = self._find_vector_path(path_id)
        deleted_layer_id = self._vector_layer_id(deleted) if deleted is not None else None
        self.vector_paths = [path for path in self.vector_paths if path.get("id") != path_id]
        if self.active_vector_path_id == path_id:
            remaining_layer_paths = self._vector_layer_paths(deleted_layer_id)
            if remaining_layer_paths:
                self.active_vector_path_id = str(remaining_layer_paths[-1].get("id"))
                self.active_vector_layer_id = deleted_layer_id
            else:
                self.active_vector_path_id = (
                    str(self.vector_paths[-1].get("id")) if self.vector_paths else None
                )
                fallback = self._find_vector_path(self.active_vector_path_id)
                self.active_vector_layer_id = (
                    self._vector_layer_id(fallback) if fallback is not None else None
                )
            self.active_vector_point_index = None
            self.active_vector_handle = None
        elif deleted_layer_id is not None and deleted_layer_id == self.active_vector_layer_id:
            remaining_layer_paths = self._vector_layer_paths(deleted_layer_id)
            if not remaining_layer_paths:
                fallback = self._find_vector_path(self.active_vector_path_id)
                self.active_vector_layer_id = self._vector_layer_id(fallback) if fallback is not None else None
        self._set_vector_info("Kurve geloescht.")

    def _event_shift_pressed(self, event) -> bool:
        return bool(getattr(event, "state", 0) & 0x0001)

    def _grid_draft_endpoint(
        self,
        raw_px: tuple[float, float] | None = None,
        shift_lock: bool | None = None,
    ) -> tuple[tuple[float, float], tuple[float, float]] | None:
        draft = self.vector_drag_state
        if draft is None or draft.get("kind") != "grid-line-draft":
            return None
        if raw_px is None:
            if self.pointer_norm is None or not (
                0.0 <= self.pointer_norm[0] <= 1.0 and 0.0 <= self.pointer_norm[1] <= 1.0
            ):
                return None
            raw = self._norm_to_img_px(*self.pointer_norm)
        else:
            raw = (float(raw_px[0]), float(raw_px[1]))
        snapped = raw
        lock_enabled = bool(draft.get("shift_lock")) if shift_lock is None else bool(shift_lock)
        if draft.get("step") == "horizontal_end" and draft.get("horizontal_start_px") is not None:
            _start_x, start_y = tuple(draft["horizontal_start_px"])
            if lock_enabled:
                snapped = (raw[0], start_y)
        elif draft.get("step") == "vertical_end" and draft.get("vertical_start_px") is not None:
            start_x, _start_y = tuple(draft["vertical_start_px"])
            if lock_enabled:
                snapped = (start_x, raw[1])
        return raw, snapped

    def _legacy_grid_quadrilateral_preview_points(self) -> list[tuple[float, float]]:
        if self.vector_drag_state is None or self.vector_drag_state.get("kind") != "grid-quad-draft":
            return []
        corners = [tuple(point) for point in self.vector_drag_state.get("corners_px", [])]
        if self.pointer_norm and 0.0 <= self.pointer_norm[0] <= 1.0 and 0.0 <= self.pointer_norm[1] <= 1.0:
            corners.append(self._norm_to_img_px(*self.pointer_norm))
        return corners

    def _legacy_grid_guide_point(self, guide: dict[str, Any], u: float, v: float) -> tuple[float, float]:
        corners = guide.get("corners_px", [])
        if len(corners) < 4:
            return 0.0, 0.0
        tl = tuple(corners[0])
        tr = tuple(corners[1])
        br = tuple(corners[2])
        bl = tuple(corners[3])
        x = (
            tl[0]
            + u * (tr[0] - tl[0])
            + v * (bl[0] - tl[0])
            + u * v * (br[0] - bl[0] - tr[0] + tl[0])
        )
        y = (
            tl[1]
            + u * (tr[1] - tl[1])
            + v * (bl[1] - tl[1])
            + u * v * (br[1] - bl[1] - tr[1] + tl[1])
        )
        return x, y

    def _legacy_grid_guide_extents(self, guide: dict[str, Any]) -> tuple[int, int, int, int]:
        return (
            -int(guide.get("left", 0)),
            int(guide.get("right", 0)) + 1,
            -int(guide.get("up", 0)),
            int(guide.get("down", 0)) + 1,
        )

    def _line_grid_segment_with_offset(
        self,
        line: dict[str, tuple[float, float]],
        dx: float = 0.0,
        dy: float = 0.0,
    ) -> tuple[tuple[float, float], tuple[float, float]]:
        start = tuple(line.get("start_px", (0.0, 0.0)))
        end = tuple(line.get("end_px", (0.0, 0.0)))
        return (start[0] + dx, start[1] + dy), (end[0] + dx, end[1] + dy)

    def _iter_grid_guide_segments(self, guide: dict[str, Any]):
        kind = str(guide.get("kind", "legacy-quad"))
        if kind == "line-grid":
            vertical = guide.get("vertical_line", {})
            horizontal = guide.get("horizontal_line", {})
            spacing_x = float(guide.get("spacing_x_px", 80.0))
            spacing_y = float(guide.get("spacing_y_px", 80.0))
            for index in range(int(guide.get("copies_x", 0)) + 1):
                yield "vertical", index, self._line_grid_segment_with_offset(
                    vertical,
                    dx=index * spacing_x,
                )
            for index in range(int(guide.get("copies_y", 0)) + 1):
                yield "horizontal", index, self._line_grid_segment_with_offset(
                    horizontal,
                    dy=index * spacing_y,
                )
            return
        u0, u1, v0, v1 = self._legacy_grid_guide_extents(guide)
        cols = u1 - u0
        rows = v1 - v0
        for col in range(cols + 1):
            u = u0 + col
            yield "legacy-vertical", col, (
                self._legacy_grid_guide_point(guide, u, v0),
                self._legacy_grid_guide_point(guide, u, v1),
            )
        for row in range(rows + 1):
            v = v0 + row
            yield "legacy-horizontal", row, (
                self._legacy_grid_guide_point(guide, u0, v),
                self._legacy_grid_guide_point(guide, u1, v),
            )

    def _prompt_line_grid_counts(self) -> tuple[int, int] | None:
        raw = simpledialog.askstring(
            "Linien-Kopien",
            "Wie oft sollen senkrechte Linien in X und waagerechte Linien in Y kopiert werden?\nBeispiel: 8,6",
            parent=self.root,
        )
        if raw is None:
            return None
        parts = [piece.strip() for piece in re.split(r"[;, ]+", raw) if piece.strip()]
        if len(parts) != 2:
            messagebox.showerror(
                "Linien-Kopien",
                "Bitte genau zwei Ganzzahlen eingeben: X-Kopien, Y-Kopien.",
                parent=self.root,
            )
            return None
        try:
            copies_x, copies_y = [max(0, int(value)) for value in parts]
        except ValueError:
            messagebox.showerror(
                "Linien-Kopien",
                "Die Werte muessen Ganzzahlen sein.",
                parent=self.root,
            )
            return None
        return copies_x, copies_y

    def _suggest_line_grid_spacing(
        self,
        horizontal_line: dict[str, tuple[float, float]],
        vertical_line: dict[str, tuple[float, float]],
    ) -> tuple[float, float]:
        hx0, hy0 = tuple(horizontal_line["start_px"])
        vx0, vy0 = tuple(vertical_line["start_px"])
        spacing_x = abs(vx0 - hx0)
        spacing_y = abs(vy0 - hy0)
        if spacing_x < 12:
            spacing_x = 80.0
        if spacing_y < 12:
            spacing_y = 80.0
        return spacing_x, spacing_y

    def _create_grid_guide(
        self,
        horizontal_line: dict[str, tuple[float, float]],
        vertical_line: dict[str, tuple[float, float]],
        copies_x: int,
        copies_y: int,
    ):
        spacing_x, spacing_y = self._suggest_line_grid_spacing(horizontal_line, vertical_line)
        guide = {
            "id": self._next_grid_guide_id(),
            "kind": "line-grid",
            "horizontal_line": {
                "start_px": (
                    round(float(horizontal_line["start_px"][0]), 2),
                    round(float(horizontal_line["start_px"][1]), 2),
                ),
                "end_px": (
                    round(float(horizontal_line["end_px"][0]), 2),
                    round(float(horizontal_line["end_px"][1]), 2),
                ),
            },
            "vertical_line": {
                "start_px": (
                    round(float(vertical_line["start_px"][0]), 2),
                    round(float(vertical_line["start_px"][1]), 2),
                ),
                "end_px": (
                    round(float(vertical_line["end_px"][0]), 2),
                    round(float(vertical_line["end_px"][1]), 2),
                ),
            },
            "copies_x": int(copies_x),
            "copies_y": int(copies_y),
            "spacing_x_px": round(float(spacing_x), 2),
            "spacing_y_px": round(float(spacing_y), 2),
        }
        self.grid_guides.append(guide)
        self.active_grid_guide_id = guide["id"]
        self.status_var.set(
            f'Linien-Grid erzeugt: {copies_x + 1} senkrechte und {copies_y + 1} waagerechte Linien. Abstand jetzt per Regler feinjustieren.'
        )
        return guide

    def _guide_bounds_px(self, guide: dict[str, Any]) -> tuple[float, float, float, float]:
        segments = list(self._iter_grid_guide_segments(guide))
        if not segments:
            return 0.0, 0.0, 0.0, 0.0
        xs: list[float] = []
        ys: list[float] = []
        for _, _, (start, end) in segments:
            xs.extend((float(start[0]), float(end[0])))
            ys.extend((float(start[1]), float(end[1])))
        return min(xs), min(ys), max(xs), max(ys)

    def _hit_grid_guide(self, nx: float, ny: float, tol_px: float = 12) -> str | None:
        px, py = self._norm_to_img_px(nx, ny)
        tol = tol_px / max(self.scale, 1e-6)
        best_id = None
        best_dist = float(tol)
        for guide in self.grid_guides:
            for _axis, _index, (start, end) in self._iter_grid_guide_segments(guide):
                dist, _ = self._distance_point_to_canvas_segment(
                    px,
                    py,
                    float(start[0]),
                    float(start[1]),
                    float(end[0]),
                    float(end[1]),
                )
                if dist < best_dist:
                    best_dist = dist
                    best_id = str(guide.get("id"))
        return best_id

    def _delete_active_grid_guide(self):
        if self.active_grid_guide_id is None:
            self.status_var.set("Kein Grid-Guide aktiv.")
            return
        self._push_vector_history()
        self.grid_guides = [
            guide for guide in self.grid_guides if str(guide.get("id")) != self.active_grid_guide_id
        ]
        self.active_grid_guide_id = None
        self.status_var.set("Aktiver Grid-Guide geloescht.")
        self._sync_grid_controls()
        self._redraw()

    def _normalize_loaded_vector_paths(self, payload: Any) -> list[dict[str, Any]]:
        source = payload.get("paths", []) if isinstance(payload, dict) else payload
        if not isinstance(source, list):
            return []
        cleaned: list[dict[str, Any]] = []
        for raw_path in source:
            if not isinstance(raw_path, dict):
                continue
            raw_points = raw_path.get("points", [])
            if not isinstance(raw_points, list):
                continue
            points: list[dict[str, Any]] = []
            for raw_point in raw_points:
                if not isinstance(raw_point, dict):
                    continue
                anchor = raw_point.get("anchor", raw_point)
                if not isinstance(anchor, dict):
                    continue
                ax = anchor.get("x")
                ay = anchor.get("y")
                if ax is None or ay is None:
                    continue
                point = self._new_vector_point(float(ax), float(ay))
                for key in ("in", "out"):
                    handle = raw_point.get(key)
                    if isinstance(handle, dict) and "x" in handle and "y" in handle:
                        point[key] = self._vector_xy(float(handle["x"]), float(handle["y"]))
                point["mode"] = "smooth" if raw_point.get("mode") == "smooth" else "corner"
                if raw_point.get("planet_name"):
                    point["planet_name"] = str(raw_point.get("planet_name"))
                points.append(point)
            if raw_points and not points:
                continue
            path_id = str(raw_path.get("id") or self._next_vector_path_id())
            path = {
                "id": path_id,
                "layer_id": str(raw_path.get("layer_id") or path_id),
                "name": str(raw_path.get("name") or f"Rim {len(cleaned) + 1}"),
                "closed": bool(raw_path.get("closed")),
                "draft": bool(raw_path.get("draft")),
                "opacity_pct": int(raw_path.get("opacity_pct", 100)),
                "fill_tone": str(raw_path.get("fill_tone", "")),
                "path_kind": str(raw_path.get("path_kind") or ""),
                "route_id": str(raw_path.get("route_id") or ""),
                "stroke_tone": str(raw_path.get("stroke_tone") or ""),
                "label_anchor": self._normalize_route_label_anchor(raw_path.get("label_anchor")),
                "label_rotation_deg": float(raw_path.get("label_rotation_deg", 0)),
                "label_font_scale": float(raw_path.get("label_font_scale", 1)),
                "source_url": str(raw_path.get("source_url") or ""),
                "route_planets": [
                    str(name) for name in raw_path.get("route_planets", []) if str(name).strip()
                ]
                if isinstance(raw_path.get("route_planets"), list)
                else [],
                "points": points,
            }
            if path["path_kind"] == "hyperspace-route" and not path["route_id"]:
                path["route_id"] = path_id
            self._ensure_vector_path_style(path)
            cleaned.append(path)
        return cleaned

    def _normalize_loaded_grid_guides(self, payload: Any) -> list[dict[str, Any]]:
        source = payload.get("guides", []) if isinstance(payload, dict) else payload
        if not isinstance(source, list):
            return []
        cleaned: list[dict[str, Any]] = []
        for raw in source:
            if not isinstance(raw, dict):
                continue
            try:
                if "horizontal_line" in raw and "vertical_line" in raw:
                    horizontal = raw.get("horizontal_line", {})
                    vertical = raw.get("vertical_line", {})
                    if not isinstance(horizontal, dict) or not isinstance(vertical, dict):
                        continue
                    h_start = tuple(float(value) for value in horizontal.get("start_px", (0.0, 0.0))[:2])
                    h_end = tuple(float(value) for value in horizontal.get("end_px", (0.0, 0.0))[:2])
                    v_start = tuple(float(value) for value in vertical.get("start_px", (0.0, 0.0))[:2])
                    v_end = tuple(float(value) for value in vertical.get("end_px", (0.0, 0.0))[:2])
                    cleaned.append(
                        {
                            "id": str(raw.get("id") or self._next_grid_guide_id()),
                            "kind": "line-grid",
                            "horizontal_line": {
                                "start_px": h_start,
                                "end_px": h_end,
                            },
                            "vertical_line": {
                                "start_px": v_start,
                                "end_px": v_end,
                            },
                            "copies_x": max(0, int(raw.get("copies_x", 0))),
                            "copies_y": max(0, int(raw.get("copies_y", 0))),
                            "spacing_x_px": float(raw.get("spacing_x_px", 80.0)),
                            "spacing_y_px": float(raw.get("spacing_y_px", 80.0)),
                        }
                    )
                    continue
                corners_payload = raw.get("corners_px", raw.get("corners", []))
                corners: list[tuple[float, float]] = []
                if isinstance(corners_payload, list):
                    for point in corners_payload[:4]:
                        if isinstance(point, dict):
                            px = point.get("x_px", point.get("x"))
                            py = point.get("y_px", point.get("y"))
                            if px is None or py is None:
                                continue
                            corners.append((float(px), float(py)))
                        elif isinstance(point, (list, tuple)) and len(point) >= 2:
                            corners.append((float(point[0]), float(point[1])))
                if len(corners) < 4 and {"left_px", "top_px", "cell_px"} <= set(raw):
                    left_px = float(raw.get("left_px", 0.0))
                    top_px = float(raw.get("top_px", 0.0))
                    cell_px = float(raw.get("cell_px", 0.0))
                    corners = [
                        (left_px, top_px),
                        (left_px + cell_px, top_px),
                        (left_px + cell_px, top_px + cell_px),
                        (left_px, top_px + cell_px),
                    ]
                if len(corners) < 4:
                    continue
                cleaned.append(
                    {
                        "id": str(raw.get("id") or self._next_grid_guide_id()),
                        "kind": "legacy-quad",
                        "corners_px": [
                            (round(float(point[0]), 2), round(float(point[1]), 2))
                            for point in corners[:4]
                        ],
                        "down": max(0, int(raw.get("down", 0))),
                        "up": max(0, int(raw.get("up", 0))),
                        "right": max(0, int(raw.get("right", 0))),
                        "left": max(0, int(raw.get("left", 0))),
                    }
                )
            except (TypeError, ValueError):
                continue
        return cleaned

    def _fit_to_window(self):
        self.root.update_idletasks()
        cw = self.canvas.winfo_width() or 900
        ch = self.canvas.winfo_height() or 700
        s = min(cw / self.img_w, ch / self.img_h)
        self.scale = s
        self.off_x = (cw - self.img_w * s) / 2
        self.off_y = (ch - self.img_h * s) / 2

    def _ensure_initial_view_loaded(self):
        if self._initial_view_ready:
            return
        self.root.update_idletasks()
        cw = self.canvas.winfo_width() or 0
        ch = self.canvas.winfo_height() or 0
        if cw <= 1 or ch <= 1:
            self.root.after(16, self._ensure_initial_view_loaded)
            return
        self._initial_view_ready = True
        self._fit_to_window()
        self._refresh_pending_list()
        self.status_var.set(
            "Daten geladen: "
            f"{len(self.calibrated)} Planeten, {len(self.grid_markers)} Grid-Marker, "
            f"{len(self.vector_paths)} Kurven, {len(self.grid_guides)} Grid-Guides."
        )
        self._redraw()

    def _max_zoom_scale(self) -> float:
        return MAX_ZOOM_SCALE

    def _selection_boost(self) -> float:
        return max(2.0, min(7.0, 1.6 / max(self.scale, 0.2)))

    def _visible_image_bounds_px(self) -> tuple[int, int, int, int] | None:
        if self.scale <= 0:
            return None
        cw = self.canvas.winfo_width() or 1
        ch = self.canvas.winfo_height() or 1
        view_left = max(0.0, (0 - self.off_x) / self.scale)
        view_top = max(0.0, (0 - self.off_y) / self.scale)
        view_right = min(self.img_w, (cw - self.off_x) / self.scale)
        view_bottom = min(self.img_h, (ch - self.off_y) / self.scale)
        if view_right <= view_left or view_bottom <= view_top:
            return None
        return (
            max(0, int(math.floor(view_left))),
            max(0, int(math.floor(view_top))),
            min(self.img_w, int(math.ceil(view_right))),
            min(self.img_h, int(math.ceil(view_bottom))),
        )

    def _visible_norm_bounds(self, margin_px: float = 36.0) -> tuple[float, float, float, float] | None:
        if self.scale <= 0:
            return None
        cw = self.canvas.winfo_width() or 1
        ch = self.canvas.winfo_height() or 1
        margin_norm_x = margin_px / max(self.img_w * self.scale, 1)
        margin_norm_y = margin_px / max(self.img_h * self.scale, 1)
        left = (0 - self.off_x) / (self.img_w * self.scale) - margin_norm_x
        top = (0 - self.off_y) / (self.img_h * self.scale) - margin_norm_y
        right = (cw - self.off_x) / (self.img_w * self.scale) + margin_norm_x
        bottom = (ch - self.off_y) / (self.img_h * self.scale) + margin_norm_y
        return left, top, right, bottom

    def _norm_point_visible(
        self,
        nx: float,
        ny: float,
        bounds: tuple[float, float, float, float] | None,
    ) -> bool:
        if bounds is None:
            return True
        left, top, right, bottom = bounds
        return left <= nx <= right and top <= ny <= bottom

    def _build_image_pyramid(self):
        gray_base = ImageOps.grayscale(self.pil_img).convert("RGB")
        self.image_pyramid: list[tuple[int, Image.Image]] = [(1, self.pil_img)]
        self.gray_image_pyramid: list[tuple[int, Image.Image]] = [(1, gray_base)]
        factor = 1
        current = self.pil_img
        current_gray = gray_base
        while current.width > 900 and current.height > 900:
            factor *= 2
            current = current.resize(
                (max(1, current.width // 2), max(1, current.height // 2)),
                Image.Resampling.BOX,
            )
            current_gray = current_gray.resize(
                (max(1, current_gray.width // 2), max(1, current_gray.height // 2)),
                Image.Resampling.BOX,
            )
            self.image_pyramid.append((factor, current))
            self.gray_image_pyramid.append((factor, current_gray))

    def _set_interactive_render(self, enabled: bool):
        self._interactive_render = enabled
        if self._settle_after_id is not None:
            self.root.after_cancel(self._settle_after_id)
            self._settle_after_id = None
        if enabled:
            self._settle_after_id = self.root.after(INTERACTIVE_SETTLE_MS, self._settle_render_quality)

    def _settle_render_quality(self):
        self._settle_after_id = None
        if self._interactive_render:
            self._interactive_render = False
            self._redraw()

    def _select_pyramid_level(self, dimmed: bool = False) -> tuple[int, Image.Image]:
        source_pyramid = self.gray_image_pyramid if dimmed else self.image_pyramid
        best = source_pyramid[0]
        best_error = float("inf")
        for factor, image in source_pyramid:
            error = abs(math.log(max(self.scale * factor, 1e-6)))
            if error < best_error:
                best_error = error
                best = (factor, image)
        degrade_levels = 0
        if self._interactive_render:
            degrade_levels = INTERACTIVE_PYRAMID_DOWNGRADE
        elif self._editor_mode_active():
            degrade_levels = EDITOR_PYRAMID_DOWNGRADE
        if degrade_levels > 0 and len(source_pyramid) > 1:
            for index, candidate in enumerate(source_pyramid):
                if candidate[0] == best[0]:
                    best = source_pyramid[min(index + degrade_levels, len(source_pyramid) - 1)]
                    break
        return best

    def _draw_visible_image(self, cw: int, ch: int, dimmed: bool = False):
        bounds = self._visible_image_bounds_px()
        if bounds is None:
            return
        view_left, view_top, view_right, view_bottom = bounds

        factor, source = self._select_pyramid_level(dimmed=dimmed)
        pad = max(2, int(math.ceil(12 / max(self.scale * factor, 1e-4))))
        src_left = max(0, int(math.floor(view_left / factor)) - pad)
        src_top = max(0, int(math.floor(view_top / factor)) - pad)
        src_right = min(source.width, int(math.ceil(view_right / factor)) + pad)
        src_bottom = min(source.height, int(math.ceil(view_bottom / factor)) + pad)

        if src_right <= src_left or src_bottom <= src_top:
            return

        crop = source.crop((src_left, src_top, src_right, src_bottom))
        orig_left = src_left * factor
        orig_top = src_top * factor
        orig_right = min(self.img_w, src_right * factor)
        orig_bottom = min(self.img_h, src_bottom * factor)

        dest_x = orig_left * self.scale + self.off_x
        dest_y = orig_top * self.scale + self.off_y
        dest_w = max(1, int(round((orig_right - orig_left) * self.scale)))
        dest_h = max(1, int(round((orig_bottom - orig_top) * self.scale)))

        resample = (
            Image.Resampling.NEAREST
            if self._interactive_render or self.scale >= 1.0
            else Image.Resampling.BILINEAR
        )
        if crop.width != dest_w or crop.height != dest_h:
            crop = crop.resize((dest_w, dest_h), resample)
        self._tk_img = ImageTk.PhotoImage(crop)
        self.canvas.create_image(dest_x, dest_y, anchor="nw", image=self._tk_img)

    def _focus_on_name(self, name: str):
        data = self.calibrated.get(name)
        if data is None:
            data = self.known_by_name.get(name.lower())
        if not data:
            return

        self.root.update_idletasks()
        cw = self.canvas.winfo_width() or 900
        ch = self.canvas.winfo_height() or 700
        fit_scale = min(cw / self.img_w, ch / self.img_h)
        target_scale = min(self._max_zoom_scale(), max(fit_scale * PENDING_FOCUS_ZOOM, 0.6))

        self.scale = target_scale
        self.off_x = cw / 2 - data["x"] * self.img_w * target_scale
        self.off_y = ch / 2 - data["y"] * self.img_h * target_scale
        self._set_interactive_render(True)
        self._redraw()

    def _focus_on_coords(self, nx: float, ny: float, zoom_multiplier: float = 4.0):
        self.root.update_idletasks()
        cw = self.canvas.winfo_width() or 900
        ch = self.canvas.winfo_height() or 700
        fit_scale = min(cw / self.img_w, ch / self.img_h)
        target_scale = min(self._max_zoom_scale(), max(fit_scale * zoom_multiplier, 0.6))
        self.scale = target_scale
        self.off_x = cw / 2 - nx * self.img_w * target_scale
        self.off_y = ch / 2 - ny * self.img_h * target_scale
        self._set_interactive_render(True)
        self._redraw()

    def _focus_on_grid(self, grid: str):
        bounds = self._grid_bounds_px(grid)
        if bounds is None:
            self.status_var.set("Bitte ein gueltiges Grid wie L-9 eingeben.")
            return
        left, top, right, bottom = bounds
        self.root.update_idletasks()
        cw = self.canvas.winfo_width() or 900
        ch = self.canvas.winfo_height() or 700
        width = max(1, right - left)
        height = max(1, bottom - top)
        target_scale = min(cw / width, ch / height) * 0.88
        target_scale = min(self._max_zoom_scale(), max(target_scale, 0.6))
        center_x = (left + right) / 2.0
        center_y = (top + bottom) / 2.0
        self.scale = target_scale
        self.off_x = cw / 2 - center_x * target_scale
        self.off_y = ch / 2 - center_y * target_scale
        self.focused_grid = self._normalize_grid_label(grid)
        self._set_interactive_render(True)
        self._redraw()

    def _current_target_grid(self) -> str | None:
        label = self._normalize_grid_label(self.grid_var.get())
        if label:
            return label
        if self.active_name:
            label = self._normalize_grid_label(self._meta_for_name(self.active_name).get("grid"))
            if label:
                self.grid_var.set(label)
                return label
        if self.pointer_norm and 0.0 <= self.pointer_norm[0] <= 1.0 and 0.0 <= self.pointer_norm[1] <= 1.0:
            label = self._guess_grid_for_point(*self.pointer_norm)
            self.grid_var.set(label)
            return label
        return None

    def _current_viewport_grid(self) -> str | None:
        self.root.update_idletasks()
        cw = self.canvas.winfo_width() or 0
        ch = self.canvas.winfo_height() or 0
        if cw <= 0 or ch <= 0:
            return None
        center_nx, center_ny = self._canvas_to_norm(cw / 2.0, ch / 2.0)
        if not (0.0 <= center_nx <= 1.0 and 0.0 <= center_ny <= 1.0):
            return None
        return self._guess_grid_for_point(center_nx, center_ny)

    def _focus_current_grid(self):
        if not self._require_calibration_mode():
            return
        grid = self._current_target_grid()
        if not grid:
            self.status_var.set("Kein gueltiges Grid gesetzt. Beispiel: L-9")
            return
        self.grid_var.set(grid)
        self._focus_on_grid(grid)
        self.status_var.set(f"Grid {grid} fokussiert.")

    def _set_active_vector_selection(
        self,
        path_id: str | None,
        point_index: int | None = None,
        handle: tuple[int, str] | None = None,
    ):
        self.active_vector_path_id = path_id
        path = self._find_vector_path(path_id)
        if path is not None:
            self.active_vector_layer_id = self._vector_layer_id(path)
        self.active_vector_point_index = point_index
        self.active_vector_handle = handle
        self.active_grid_guide_id = None
        self.active_hyper_segment = None
        self._set_vector_info()

    def _on_vector_left_press(self, event):
        nx, ny = self._canvas_to_norm(event.x, event.y)
        if not (0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0):
            self.vector_drag_state = None
            return

        control_hit = self._hit_vector_control(nx, ny)
        if self.tool_mode.get() == "subdivide":
            segment_hit = self._hit_vector_segment(nx, ny)
            if segment_hit is None:
                self.vector_drag_state = None
                self.status_var.set("Subdivide: auf eine vorhandene Kurvenkante klicken.")
                return
            path = next(
                (item for item in self.vector_paths if item.get("id") == segment_hit["path_id"]),
                None,
            )
            if path is None:
                return
            self._push_vector_history()
            point_index = self._insert_vector_point_on_segment(
                path,
                int(segment_hit["segment_index"]),
                float(segment_hit["t"]),
            )
            if point_index is None:
                return
            self.vector_drag_state = {
                "kind": "anchor",
                "path_id": path.get("id"),
                "point_index": point_index,
                "history_pushed": True,
            }
            self.canvas.config(cursor="fleur")
            self._redraw()
            return

        path = self._active_vector_path()
        if path is not None and path.get("draft"):
            if not path.get("points"):
                self._push_vector_history()
                path["points"].append(self._new_vector_point(nx, ny))
                self.active_vector_point_index = 0
                self.active_vector_handle = None
                self.vector_drag_state = {
                    "kind": "new-point",
                    "path_id": path.get("id"),
                    "point_index": 0,
                    "history_pushed": True,
                }
                self.canvas.config(cursor="crosshair")
                self.status_var.set(
                    f'{path.get("name", "Pfad")}: Startpunkt gesetzt. Ziehen formt die Handles.'
                )
                self._set_vector_info()
                self._redraw()
                return
            if (
                control_hit is not None
                and control_hit.get("kind") == "anchor"
                and control_hit.get("path_id") == path.get("id")
                and control_hit.get("point_index") == 0
                and len(path.get("points", [])) >= 3
            ):
                self._close_active_vector_path()
                self.vector_drag_state = None
                self._redraw()
                return
            self._push_vector_history()
            point = self._new_vector_point(nx, ny)
            path["points"].append(point)
            point_index = len(path["points"]) - 1
            self.active_vector_point_index = point_index
            self.active_vector_handle = None
            self.vector_drag_state = {
                "kind": "new-point",
                "path_id": path.get("id"),
                "point_index": point_index,
                "history_pushed": True,
            }
            self.canvas.config(cursor="crosshair")
            self.status_var.set(
                f'{path.get("name", "Pfad")}: Punkt {point_index + 1} gesetzt. Ziehen formt die Handles.'
            )
            self._set_vector_info()
            self._redraw()
            return

        if control_hit is not None:
            self._set_active_vector_selection(
                str(control_hit["path_id"]),
                int(control_hit["point_index"]),
                None
                if control_hit["kind"] == "anchor"
                else (int(control_hit["point_index"]), str(control_hit["handle"])),
            )
            self.vector_drag_state = {
                "kind": control_hit["kind"],
                "path_id": control_hit["path_id"],
                "point_index": control_hit["point_index"],
                "handle": control_hit.get("handle"),
                "history_pushed": False,
            }
            self.canvas.config(cursor="fleur")
            self.status_var.set(
                "Kurvenpunkt wird bearbeitet."
                if control_hit["kind"] == "anchor"
                else "Handle wird bearbeitet."
            )
            self._redraw()
            return

        segment_hit = self._hit_vector_segment(nx, ny)
        if segment_hit is not None:
            self._set_active_vector_selection(str(segment_hit["path_id"]))
            self.vector_drag_state = None
            self.status_var.set("Kurve ausgewaehlt. Bezier zum Formen oder X zum Unterteilen.")
            self._redraw()
            return

        self._push_vector_history()
        path = self._create_vector_path(nx, ny)
        self.vector_drag_state = {
            "kind": "new-point",
            "path_id": path.get("id"),
            "point_index": 0,
            "history_pushed": True,
        }
        self.canvas.config(cursor="crosshair")
        self._redraw()

    def _on_hyperspace_left_press(self, event):
        nx, ny = self._canvas_to_norm(event.x, event.y)
        if not (0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0):
            self.vector_drag_state = None
            return
        planet_hit = self._find_nearest_planet(nx, ny)
        segment_hit = self._hit_vector_segment(nx, ny)
        action = self.hyper_action_var.get()

        if action == "delete":
            if segment_hit is None:
                self.active_hyper_segment = None
                self.hyper_selected_planet = None
                self.hyper_box_selection = None
                self.vector_drag_state = {
                    "kind": "hyper-delete-box",
                    "start_norm": (nx, ny),
                    "current_norm": (nx, ny),
                }
                self.status_var.set("Loeschbereich aufziehen und dann mit Entf die Segmente darin entfernen.")
                self._set_interactive_render(True)
                self._redraw()
                return
            self.vector_drag_state = None
            self._set_active_hyper_segment(segment_hit)
            self._delete_selected_hyper_segment()
            return

        self.vector_drag_state = None
        if action == "extend":
            if planet_hit is None:
                self.status_var.set("Zum Erweitern zuerst einen Planeten anklicken.")
                return
            if self.hyper_selected_planet is None:
                self._set_active_hyper_planet(planet_hit)
                self.status_var.set(
                    f'Startplanet {planet_hit["name"]} gewaehlt. Jetzt Zielplanet anklicken.'
                )
                self._redraw()
                return
            if self._planet_labels_match(self.hyper_selected_planet, planet_hit):
                self._set_active_hyper_planet(planet_hit)
                self.status_var.set(
                    f'Startplanet auf {planet_hit["name"]} gesetzt. Jetzt Zielplanet anklicken.'
                )
                self._redraw()
                return
            start_planet = dict(self.hyper_selected_planet)
            extension = self._extend_or_connect_hyperspace(start_planet, planet_hit)
            if extension is not None:
                self._set_active_hyper_planet(
                    extension["planet"],
                    path_id=str(extension.get("path_id") or ""),
                )
                self.status_var.set(
                    f'{planet_hit["name"]} angehaengt. Naechsten Planeten anklicken, um weiter zu bauen.'
                )
                self._update_tool_mode_ui()
            self._redraw()
            return

        if planet_hit is not None:
            self._set_active_hyper_planet(planet_hit)
            self.status_var.set(
                f'Planet {planet_hit["name"]} gewaehlt. Mit "Erweitern" zweiten Planeten verbinden.'
            )
            self._redraw()
            return
        if segment_hit is not None:
            self._set_active_hyper_segment(segment_hit)
            self.status_var.set(
                "Hyperraum-Segment markiert. Mit 'Loeschen' kannst du die Verbindung trennen."
            )
            self._redraw()
            return
        self.hyper_selected_planet = None
        self.active_hyper_segment = None
        self.hyper_box_selection = None
        self.status_var.set("Kein Planet oder Segment getroffen.")
        self._redraw()

    def _on_hyperspace_drag(self, event):
        if self.vector_drag_state is None or self.vector_drag_state.get("kind") != "hyper-delete-box":
            return
        nx, ny = self._canvas_to_norm(event.x, event.y)
        nx = min(1.0, max(0.0, nx))
        ny = min(1.0, max(0.0, ny))
        self.vector_drag_state["current_norm"] = (nx, ny)
        self._set_interactive_render(True)
        self._redraw()

    def _on_hyperspace_release(self, event):
        if self.vector_drag_state is None or self.vector_drag_state.get("kind") != "hyper-delete-box":
            return
        nx, ny = self._canvas_to_norm(event.x, event.y)
        nx = min(1.0, max(0.0, nx))
        ny = min(1.0, max(0.0, ny))
        start_norm = tuple(self.vector_drag_state.get("start_norm", (nx, ny)))
        rect = self._hyper_selection_rect(start_norm, (nx, ny))
        self.vector_drag_state = None
        width_px = abs(self._norm_to_canvas(rect[2], rect[3])[0] - self._norm_to_canvas(rect[0], rect[1])[0])
        height_px = abs(self._norm_to_canvas(rect[2], rect[3])[1] - self._norm_to_canvas(rect[0], rect[1])[1])
        if width_px < 6 and height_px < 6:
            self.hyper_box_selection = None
            self.status_var.set("Kein Loeschbereich aufgezogen.")
            self._redraw()
            return
        segments = self._hyper_segments_in_rect(rect)
        self.active_hyper_segment = None
        self.hyper_selected_planet = None
        self.hyper_box_selection = {
            "rect": rect,
            "segments": segments,
        }
        if segments:
            path_count = len({str(segment["path_id"]) for segment in segments})
            self.status_var.set(
                f"Loeschbereich markiert: {len(segments)} Segmente in {path_count} Pfaden. Entf entfernt alles darin."
            )
        else:
            self.status_var.set("Loeschbereich markiert, aber keine Segmente darin gefunden.")
        self._redraw()

    def _on_grid_left_press(self, event):
        nx, ny = self._canvas_to_norm(event.x, event.y)
        if not (0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0):
            self.vector_drag_state = None
            return
        is_drafting = self.vector_drag_state is not None and self.vector_drag_state.get("kind") == "grid-line-draft"
        guide_hit = None if is_drafting else self._hit_grid_guide(nx, ny)
        if guide_hit is not None:
            self.active_grid_guide_id = guide_hit
            self.active_vector_point_index = None
            self.active_vector_handle = None
            self.status_var.set("Linien-Grid ausgewaehlt. Entf entfernt es, die Regler passen den Abstand an.")
            self._sync_grid_controls()
            self._redraw()
            return
        current_x, current_y = self._norm_to_img_px(nx, ny)
        if self.vector_drag_state is None or self.vector_drag_state.get("kind") != "grid-line-draft":
            self.active_grid_guide_id = None
            self.active_vector_point_index = None
            self.active_vector_handle = None
            self.vector_drag_state = {
                "kind": "grid-line-draft",
                "step": "horizontal_end",
                "horizontal_start_px": (current_x, current_y),
                "shift_lock": False,
            }
            self._sync_grid_controls()
            self.status_var.set("Grid-Tool: H-Start gesetzt. Jetzt H-Ende setzen, Shift rastet auf gleiche Y.")
            self._redraw()
            return
        shift_pressed = self._event_shift_pressed(event)
        self.vector_drag_state["shift_lock"] = shift_pressed
        draft = self.vector_drag_state
        preview = self._grid_draft_endpoint((current_x, current_y), shift_pressed)
        snapped_point = preview[1] if preview is not None else (current_x, current_y)
        step = str(draft.get("step"))
        if step == "horizontal_end":
            start = tuple(draft["horizontal_start_px"])
            if math.hypot(snapped_point[0] - start[0], snapped_point[1] - start[1]) < 8:
                self.status_var.set("Horizontale Gerade ist zu kurz. Bitte H-Ende weiter weg setzen.")
                return
            draft["horizontal_line"] = {"start_px": start, "end_px": snapped_point}
            draft["step"] = "vertical_start"
            self.status_var.set("Waagerechte Gerade gesetzt. Jetzt V-Start setzen.")
            self._redraw()
            return
        if step == "vertical_start":
            draft["vertical_start_px"] = (current_x, current_y)
            draft["step"] = "vertical_end"
            draft["shift_lock"] = False
            self.status_var.set("V-Start gesetzt. Jetzt V-Ende setzen, Shift rastet auf gleiche X.")
            self._redraw()
            return
        if step == "vertical_end":
            start = tuple(draft["vertical_start_px"])
            if math.hypot(snapped_point[0] - start[0], snapped_point[1] - start[1]) < 8:
                self.status_var.set("Senkrechte Gerade ist zu kurz. Bitte V-Ende weiter weg setzen.")
                return
            draft["vertical_line"] = {"start_px": start, "end_px": snapped_point}
            counts = self._prompt_line_grid_counts()
            if counts is None:
                self.vector_drag_state = None
                self.status_var.set("Grid-Tool abgebrochen.")
                self._redraw()
                return
            self._push_vector_history()
            self.vector_drag_state = None
            self._create_grid_guide(
                draft["horizontal_line"],
                draft["vertical_line"],
                counts[0],
                counts[1],
            )
            self._sync_grid_controls()
            self._redraw()
            return
        self._redraw()

    def _on_grid_drag(self, event):
        if self.vector_drag_state is None or self.vector_drag_state.get("kind") != "grid-line-draft":
            return
        self.vector_drag_state["shift_lock"] = self._event_shift_pressed(event)
        self._set_interactive_render(True)
        self._redraw()

    def _on_grid_release(self, event):
        del event
        return

    def _on_vector_drag(self, event):
        if self.vector_drag_state is None:
            return
        path = next(
            (item for item in self.vector_paths if item.get("id") == self.vector_drag_state.get("path_id")),
            None,
        )
        if path is None:
            return
        nx, ny = self._canvas_to_norm(event.x, event.y)
        nx = min(1.0, max(0.0, nx))
        ny = min(1.0, max(0.0, ny))
        point_index = int(self.vector_drag_state["point_index"])
        self._moved = True
        if (
            self.vector_drag_state["kind"] in {"anchor", "handle"}
            and not self.vector_drag_state.get("history_pushed")
        ):
            self._push_vector_history()
            self.vector_drag_state["history_pushed"] = True

        if self.vector_drag_state["kind"] in {"anchor", "new-point"}:
            if self.vector_drag_state["kind"] == "new-point":
                point = path["points"][point_index]
                ax, ay = self._vector_point_xy(point, "anchor")
                dx = nx - ax
                dy = ny - ay
                point["out"] = self._vector_xy(ax + dx, ay + dy)
                point["in"] = self._vector_xy(ax - dx, ay - dy)
                point["mode"] = "smooth" if math.hypot(dx, dy) > 0.001 else "corner"
            else:
                self._move_vector_anchor(path, point_index, nx, ny)
            self._set_active_vector_selection(str(path.get("id")), point_index)
        else:
            handle_key = str(self.vector_drag_state.get("handle"))
            self._move_vector_handle(path, point_index, handle_key, nx, ny)
            self._set_active_vector_selection(str(path.get("id")), point_index, (point_index, handle_key))

        self.last_snap = (nx, ny)
        self._set_interactive_render(True)
        self._redraw()

    def _on_vector_release(self, event):
        del event
        if self.vector_drag_state is None:
            return
        path = self._active_vector_path()
        if path is not None:
            self.status_var.set(
                f'{path.get("name", "Pfad")} aktualisiert. '
                + (
                    "Punkte weiter setzen oder ersten Punkt anklicken zum Schliessen."
                    if path.get("draft")
                    else "Kurve ist aktiv und kann weiter angepasst werden."
                )
            )
        self.vector_drag_state = None
        self.canvas.config(cursor="tcross" if self.tool_mode.get() == "subdivide" else "crosshair")
        self._set_vector_info()

    def _on_wheel(self, event):
        factor = 1.15 if (event.num == 4 or event.delta > 0) else 1 / 1.15
        cx, cy = event.x, event.y
        new_scale = max(0.1, min(self._max_zoom_scale(), self.scale * factor))
        if abs(new_scale - self.scale) < 1e-6:
            return
        factor = new_scale / self.scale
        self.off_x = cx - (cx - self.off_x) * factor
        self.off_y = cy - (cy - self.off_y) * factor
        self.scale = new_scale
        self._set_interactive_render(True)
        self._redraw()

    def _on_left_press(self, event):
        if self._vector_mode_active():
            self._on_vector_left_press(event)
            self._pan_start = None
            self._moved = False
            return
        if self._hyperspace_tool_active():
            self._on_hyperspace_left_press(event)
            self._pan_start = None
            self._moved = False
            return
        if self._grid_tool_active():
            self._on_grid_left_press(event)
            self._pan_start = None
            self._moved = False
            return
        nx, ny = self._canvas_to_norm(event.x, event.y)
        hit = self._hit_item(nx, ny)
        if hit is not None:
            if hit[0] == "calibrated":
                self._set_active_name(str(hit[1]), source="existing", preserve_status=True)
            self._drag_item = hit
            self._drag_item_previous = dict(self._marker_store(hit[0])[str(hit[1])])
            self.canvas.config(cursor="fleur")
        else:
            self._drag_item = None
            self._drag_item_previous = None
            self.canvas.config(cursor="crosshair")
        self._pan_start = (event.x, event.y, self.off_x, self.off_y)
        self._moved = False

    def _on_mid_press(self, event):
        self._pan_start = (event.x, event.y, self.off_x, self.off_y)
        self._moved = True

    def _on_mid_drag(self, event):
        if not self._pan_start:
            return
        sx, sy, ox, oy = self._pan_start
        self.off_x = ox + (event.x - sx)
        self.off_y = oy + (event.y - sy)
        self._set_interactive_render(True)
        self._redraw()

    def _on_pan_drag(self, event):
        if self._vector_mode_active():
            self._on_vector_drag(event)
            return
        if self._hyperspace_tool_active():
            self._on_hyperspace_drag(event)
            return
        if self._grid_tool_active():
            self._on_grid_drag(event)
            return
        if not self._pan_start:
            return
        if self._drag_item is not None:
            dx = abs(event.x - self._pan_start[0])
            dy = abs(event.y - self._pan_start[1])
            if dx > 2 or dy > 2:
                self._moved = True
                nx, ny = self._canvas_to_norm(event.x, event.y)
                nx = min(1.0, max(0.0, nx))
                ny = min(1.0, max(0.0, ny))
                self._move_item(self._drag_item, nx, ny)
                self.last_snap = (nx, ny)
                self._set_interactive_render(True)
                self._redraw()
            return
        dx = abs(event.x - self._pan_start[0])
        dy = abs(event.y - self._pan_start[1])
        if dx > 4 or dy > 4:
            self._moved = True
            sx, sy, ox, oy = self._pan_start
            self.off_x = ox + (event.x - sx)
            self.off_y = oy + (event.y - sy)
            self._set_interactive_render(True)
            self._redraw()

    def _on_release(self, event):
        if self._vector_mode_active():
            self._on_vector_release(event)
            self._pan_start = None
            self._moved = False
            return
        if self._hyperspace_tool_active():
            self._on_hyperspace_release(event)
            self._pan_start = None
            self._moved = False
            return
        if self._grid_tool_active():
            self._on_grid_release(event)
            self._pan_start = None
            self._moved = False
            return
        if self._drag_item is not None:
            item = self._drag_item
            if not self._moved:
                self._rename_item(item)
            else:
                if self._drag_item_previous is not None:
                    current = self._marker_store(item[0]).get(str(item[1]))
                    if current != self._drag_item_previous:
                        self.history.append(( "set", str(item[0]), str(item[1]), self._drag_item_previous))
                learning_note = ""
                if item[0] == "calibrated":
                    name = str(item[1])
                    data = self.calibrated.get(name)
                    if data:
                        feedback = self._record_learning_feedback(
                            name,
                            data["x"],
                            data["y"],
                            source="drag",
                        )
                        if feedback is not None:
                            learning_note = (
                                f" Lernsignal gespeichert ({len(self.snap_learning_samples)})."
                            )
                self.status_var.set(f'"{self._item_label(item)}" verschoben.{learning_note}')
            self.canvas.config(cursor="crosshair")
            self._drag_item = None
            self._drag_item_previous = None
        elif not self._moved:
            self._on_left_click(event)
        self._pan_start = None
        self._moved = False

    def _on_motion(self, event):
        nx, ny = self._canvas_to_norm(event.x, event.y)
        self.pointer_norm = (nx, ny)
        if 0 <= nx <= 1 and 0 <= ny <= 1:
            ix, iy = self._norm_to_img_px(nx, ny)
            grid = self._guess_grid_for_point(nx, ny)
            self.coord_var.set(
                f"x={nx:.4f}  y={ny:.4f}  px={int(ix)}  py={int(iy)}  grid={grid}"
            )
        else:
            self.coord_var.set("x=--  y=--")
        if self._grid_tool_active() and self.vector_drag_state is not None and self.vector_drag_state.get("kind") == "grid-line-draft":
            self.vector_drag_state["shift_lock"] = self._event_shift_pressed(event)
            self._set_interactive_render(True)
            self._redraw()

    def _on_left_click(self, event):
        if self._vector_mode_active() or self._hyperspace_tool_active() or self._grid_tool_active():
            return
        nx, ny = self._canvas_to_norm(event.x, event.y)
        if not (0 <= nx <= 1 and 0 <= ny <= 1):
            return

        hit = self._hit_item(nx, ny)
        if hit is not None:
            self._rename_item(hit)
            return

        if not self.active_name:
            self.status_var.set(
                "Erst links einen Planeten waehlen oder A fuer manuellen Namen nutzen."
            )
            return

        raw_nx, raw_ny = nx, ny
        snap_details = None
        if self.auto_snap.get():
            snap_details = self._snap_norm_point_detailed(nx, ny)
            nx = snap_details["x"]
            ny = snap_details["y"]
        self.last_snap = (nx, ny)
        self._place_active(raw_nx, raw_ny, nx, ny, snap_details=snap_details)

    def _on_right_click(self, event):
        if self._vector_mode_active():
            nx, ny = self._canvas_to_norm(event.x, event.y)
            control_hit = self._hit_vector_control(nx, ny)
            if control_hit is not None:
                self._set_active_vector_selection(
                    str(control_hit["path_id"]),
                    int(control_hit["point_index"]),
                    None,
                )
                path = self._active_vector_path()
                if path and messagebox.askyesno(
                    "Kurve loeschen",
                    f'"{path.get("name", "Pfad")}" loeschen?',
                ):
                    self._push_vector_history()
                    self._delete_vector_path(str(path.get("id")))
                    self.status_var.set("Kurve geloescht.")
                    self._redraw()
            return
        if self._hyperspace_tool_active():
            self.status_var.set("Hyperraum-Tool: Segment klicken und dann 'Loeschen' waehlen.")
            return
        if self._grid_tool_active():
            nx, ny = self._canvas_to_norm(event.x, event.y)
            guide_id = self._hit_grid_guide(nx, ny)
            if guide_id is not None and messagebox.askyesno(
                "Grid-Guide loeschen",
                "Diesen Grid-Guide loeschen?",
            ):
                self.active_grid_guide_id = guide_id
                self._delete_active_grid_guide()
            return
        nx, ny = self._canvas_to_norm(event.x, event.y)
        hit = self._hit_item(nx, ny)
        if not hit:
            return
        label = self._item_label(hit)
        if messagebox.askyesno("Loeschen", f'"{label}" loeschen?'):
            self._delete_item(hit)
            self.status_var.set(f'"{label}" geloescht.')

    def _place_active(
        self,
        raw_nx: float,
        raw_ny: float,
        snapped_nx: float,
        snapped_ny: float,
        advance_after_known: bool = True,
        focus_to_result: bool = False,
        snap_details: dict | None = None,
    ):
        name = self.active_name
        if not name:
            return

        target_kind = self._marker_group_for_name(name)
        target_store = self._marker_store(target_kind)
        visible_before = self._filtered_pending_names()
        before_index = visible_before.index(name) if name in visible_before else -1
        was_calibrated = name in target_store
        previous = dict(target_store[name]) if was_calibrated else None
        if target_kind == "grid":
            conflicting = self._find_grid_marker_name(
                name,
                ignore_name=name if was_calibrated else None,
            )
        else:
            conflicting = self._find_existing_name(
                name,
                ignore_name=name if was_calibrated else None,
            )
        if conflicting is not None:
            if target_kind == "grid":
                self.current_var.set(f"Grid-Marker: {conflicting}")
                self._redraw()
            else:
                self.active_name = conflicting
                self._set_active_name(conflicting, source="existing", preserve_status=True)
            self.status_var.set(
                f'"{name}" existiert bereits als "{conflicting}". Kein Duplikat angelegt.'
            )
            return
        meta = self._meta_for_name(name)

        target_store[name] = {
            "x": round(snapped_nx, 4),
            "y": round(snapped_ny, 4),
            "grid": meta["grid"],
            "region": meta["region"],
        }
        self._remember_snap_context(name, target_kind, snap_details)
        self.history.append(("set", target_kind, name, previous))
        self._refresh_pending_list()
        self._redraw()

        if self.auto_snap.get():
            delta_px = math.hypot(
                (snapped_nx - raw_nx) * self.img_w,
                (snapped_ny - raw_ny) * self.img_h,
            )
            snap_note = f" | Snap {delta_px:.1f}px"
        else:
            snap_note = ""

        if target_kind == "grid":
            self.status_var.set(
                f'Grid-Marker "{name}" gesetzt bei x={snapped_nx:.4f} y={snapped_ny:.4f}{snap_note}'
            )
        else:
            self.status_var.set(
                f'"{name}" gesetzt bei x={snapped_nx:.4f} y={snapped_ny:.4f}{snap_note}'
            )

        if target_kind == "grid":
            self.current_var.set(f"Grid-Marker: {name}")
        elif not was_calibrated and name.lower() in self.known_by_name:
            if advance_after_known:
                visible_after = self._filtered_pending_names()
                if visible_after:
                    next_index = before_index
                    if next_index < 0:
                        next_index = 0
                    next_index = min(next_index, len(visible_after) - 1)
                    self._set_active_name(visible_after[next_index], source="pending")
                else:
                    self.current_var.set(f"Fertig: {name}")
            else:
                self._set_active_name(name, source="existing", preserve_status=True)
        else:
            self._set_active_name(name, source="existing", preserve_status=True)

        if focus_to_result:
            self._focus_on_coords(snapped_nx, snapped_ny, zoom_multiplier=5.2)

    def _meta_for_name(self, name: str) -> dict:
        known = self.known_by_name.get(name.lower())
        if known:
            return {
                "grid": known.get("grid", "?"),
                "region": known.get("region", "?"),
            }
        existing = self.calibrated.get(name, {})
        if not existing:
            existing = self.grid_markers.get(name, {})
        return {
            "grid": existing.get("grid", "?"),
            "region": existing.get("region", "?"),
        }

    def _normalize_name_key(self, name: str) -> str:
        return re.sub(r"\s+", " ", name.strip().lower())

    def _looks_like_grid_marker_name(self, name: str) -> bool:
        normalized = self._normalize_name_key(name)
        return normalized.startswith("ecke ") or normalized.startswith("grid ")

    def _marker_group_for_name(self, name: str) -> str:
        return "grid" if self._looks_like_grid_marker_name(name) else "calibrated"

    def _marker_store(self, kind: str) -> dict[str, dict]:
        if kind == "grid":
            return self.grid_markers
        return self.calibrated

    def _find_existing_name(self, name: str, ignore_name: str | None = None) -> str | None:
        target = self._normalize_name_key(name)
        ignore_key = self._normalize_name_key(ignore_name) if ignore_name else None
        for existing in self.calibrated:
            key = self._normalize_name_key(existing)
            if ignore_key is not None and key == ignore_key:
                continue
            if key == target:
                return existing
        return None

    def _find_grid_marker_name(
        self,
        name: str,
        ignore_name: str | None = None,
    ) -> str | None:
        target = self._normalize_name_key(name)
        ignore_key = self._normalize_name_key(ignore_name) if ignore_name else None
        for existing in self.grid_markers:
            key = self._normalize_name_key(existing)
            if ignore_key is not None and key == ignore_key:
                continue
            if key == target:
                return existing
        return None

    def _reference_anchors(self) -> list[dict]:
        anchors: list[dict] = []
        for name, calibrated in self.calibrated.items():
            known = self.known_by_name.get(name.lower())
            if not known:
                continue
            if known.get("grid", "?") == "?":
                continue
            if known.get("region", "?") in {"?", "Unknown"}:
                continue
            anchors.append(
                {
                    "name": name,
                    "ref_x": known["x"] * self.img_w,
                    "ref_y": known["y"] * self.img_h,
                    "real_x": calibrated["x"] * self.img_w,
                    "real_y": calibrated["y"] * self.img_h,
                }
            )
        return anchors

    def _solve_3x3(
        self,
        matrix: list[list[float]],
        vector: list[float],
    ) -> tuple[float, float, float] | None:
        mat = [row[:] for row in matrix]
        rhs = vector[:]

        for col in range(3):
            pivot = max(range(col, 3), key=lambda row: abs(mat[row][col]))
            if abs(mat[pivot][col]) < 1e-9:
                return None
            if pivot != col:
                mat[col], mat[pivot] = mat[pivot], mat[col]
                rhs[col], rhs[pivot] = rhs[pivot], rhs[col]

            scale = mat[col][col]
            for idx in range(col, 3):
                mat[col][idx] /= scale
            rhs[col] /= scale

            for row in range(3):
                if row == col:
                    continue
                factor = mat[row][col]
                if abs(factor) < 1e-12:
                    continue
                for idx in range(col, 3):
                    mat[row][idx] -= factor * mat[col][idx]
                rhs[row] -= factor * rhs[col]

        return rhs[0], rhs[1], rhs[2]

    def _apply_local_anchor_correction(
        self,
        nx: float,
        ny: float,
        anchors: list[dict] | None = None,
    ) -> tuple[float, float]:
        if anchors is None:
            anchors = self._reference_anchors()
        if len(anchors) < 4:
            return nx, ny

        target_x = nx * self.img_w
        target_y = ny * self.img_h
        ranked: list[tuple[float, dict]] = []
        for anchor in anchors:
            dist = math.hypot(anchor["ref_x"] - target_x, anchor["ref_y"] - target_y)
            ranked.append((dist, anchor))
        ranked.sort(key=lambda item: item[0])

        local = [item for item in ranked[:8] if item[0] <= 850]
        if len(local) < 3:
            return nx, ny
        neighbors = local[:4]

        sum_w = 0.0
        sum_dx = 0.0
        sum_dy = 0.0
        delta_samples: list[tuple[float, float, float]] = []
        matrix = [
            [0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0],
        ]
        rhs_dx = [0.0, 0.0, 0.0]
        rhs_dy = [0.0, 0.0, 0.0]
        for dist, anchor in neighbors:
            rel_x = anchor["ref_x"] - target_x
            rel_y = anchor["ref_y"] - target_y
            delta_x = anchor["real_x"] - anchor["ref_x"]
            delta_y = anchor["real_y"] - anchor["ref_y"]
            weight = 1.0 / (max(55.0, dist) ** 1.55)
            sum_w += weight
            sum_dx += delta_x * weight
            sum_dy += delta_y * weight
            delta_samples.append((weight, delta_x, delta_y))
            basis = (rel_x, rel_y, 1.0)
            for row in range(3):
                for col in range(3):
                    matrix[row][col] += weight * basis[row] * basis[col]
                rhs_dx[row] += weight * basis[row] * delta_x
                rhs_dy[row] += weight * basis[row] * delta_y

        if sum_w <= 0:
            return nx, ny

        avg_dx = sum_dx / sum_w
        avg_dy = sum_dy / sum_w
        var_dx = sum(weight * ((delta_x - avg_dx) ** 2) for weight, delta_x, _ in delta_samples) / sum_w
        var_dy = sum(weight * ((delta_y - avg_dy) ** 2) for weight, _, delta_y in delta_samples) / sum_w
        if math.sqrt(var_dx) > 50.0 or math.sqrt(var_dy) > 50.0:
            return nx, ny
        solved_dx = self._solve_3x3(matrix, rhs_dx)
        solved_dy = self._solve_3x3(matrix, rhs_dy)

        if solved_dx is None or solved_dy is None:
            corr_x = avg_dx
            corr_y = avg_dy
        else:
            plane_dx = solved_dx[2]
            plane_dy = solved_dy[2]
            corr_x = plane_dx * 0.35 + avg_dx * 0.65
            corr_y = plane_dy * 0.35 + avg_dy * 0.65

        corr_x = max(-40.0, min(40.0, corr_x))
        corr_y = max(-40.0, min(40.0, corr_y))
        adjusted_x = min(self.img_w, max(0.0, target_x + corr_x))
        adjusted_y = min(self.img_h, max(0.0, target_y + corr_y))
        return adjusted_x / self.img_w, adjusted_y / self.img_h

    def _remaining_names(self) -> list[str]:
        return [name for name in self.known_names if name not in self.calibrated]

    def _export_remaining(self):
        remaining = self._remaining_names()
        self.remaining_txt_path.write_text(
            "\n".join(remaining) + ("\n" if remaining else ""),
            encoding="utf-8",
        )
        payload = {
            "remaining_count": len(remaining),
            "total_known": len(self.known_names),
            "names": remaining,
        }
        self.remaining_json_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _run_full_auto(self):
        if not self._require_calibration_mode():
            return
        before = len(self.calibrated)

        png_before = len(self.calibrated)
        self.status_var.set("Auto komplett: PNG-Suche startet...")
        self.root.update_idletasks()
        self._auto_fill_pending_from_image()
        png_added = len(self.calibrated) - png_before

        refine_before = {
            name: (data["x"], data["y"])
            for name, data in self.calibrated.items()
        }
        self.status_var.set("Auto komplett: Nachziehen startet...")
        self.root.update_idletasks()
        self._refine_existing_from_image()
        refined = sum(
            1
            for name, pos in refine_before.items()
            if name in self.calibrated
            and (self.calibrated[name]["x"], self.calibrated[name]["y"]) != pos
        )

        total_added = len(self.calibrated) - before
        remaining = len(self._remaining_names())
        self.status_var.set(
            f"Auto komplett fertig: PNG +{png_added}, nachgezogen {refined}, "
            f"insgesamt +{total_added}, noch offen {remaining}."
        )

    def _text_box_penalty(
        self,
        px: float,
        py: float,
        text_box: tuple[float, float, float, float] | None,
    ) -> float:
        if text_box is None:
            return 0.0
        left, top, right, bottom = text_box
        expand = 2.0
        if left - expand <= px <= right + expand and top - expand <= py <= bottom + expand:
            return 85.0
        dx = 0.0
        if px < left:
            dx = left - px
        elif px > right:
            dx = px - right
        dy = 0.0
        if py < top:
            dy = top - py
        elif py > bottom:
            dy = py - bottom
        distance = math.hypot(dx, dy)
        if distance < 6.0:
            return (6.0 - distance) * 6.0
        return 0.0

    def _extract_learning_features(
        self,
        abs_x_px: float,
        abs_y_px: float,
        radius_px: int,
        text_box: tuple[float, float, float, float] | None,
        meta: dict | None = None,
    ) -> dict:
        patch_radius = max(4, min(10, int(round(radius_px / 3.0))))
        left = max(0, int(round(abs_x_px)) - patch_radius)
        top = max(0, int(round(abs_y_px)) - patch_radius)
        right = min(self.img_w - 1, int(round(abs_x_px)) + patch_radius)
        bottom = min(self.img_h - 1, int(round(abs_y_px)) + patch_radius)
        crop = self.luma_img.crop((left, top, right + 1, bottom + 1))

        if np is not None:
            arr = np.array(crop, dtype=np.float32)
            values = arr.reshape(-1)
            mean_luma = float(values.mean()) if values.size else 0.0
            std_luma = float(values.std()) if values.size else 0.0
            min_luma = float(values.min()) if values.size else 0.0
            max_luma = float(values.max()) if values.size else 0.0
            bright_ratio = float(np.count_nonzero(values >= 158.0)) / float(values.size or 1)
        else:
            values = [float(value) for value in crop.getdata()]
            mean_luma = sum(values) / len(values) if values else 0.0
            variance = (
                sum((value - mean_luma) ** 2 for value in values) / len(values)
                if values
                else 0.0
            )
            std_luma = math.sqrt(variance)
            min_luma = min(values) if values else 0.0
            max_luma = max(values) if values else 0.0
            bright_ratio = (
                sum(1 for value in values if value >= 158.0) / len(values)
                if values
                else 0.0
            )

        text_dx_px = 0.0
        text_dy_px = 0.0
        has_text_box = 0.0
        if text_box is not None:
            text_dx_px = abs_x_px - ((text_box[0] + text_box[2]) / 2.0)
            text_dy_px = abs_y_px - ((text_box[1] + text_box[3]) / 2.0)
            has_text_box = 1.0

        meta = meta or {}
        return {
            "method": str(meta.get("method", "")),
            "mean_luma": round(mean_luma, 3),
            "std_luma": round(std_luma, 3),
            "min_luma": round(min_luma, 3),
            "max_luma": round(max_luma, 3),
            "bright_ratio": round(bright_ratio, 5),
            "radius_px": float(radius_px),
            "text_dx_px": round(text_dx_px, 3),
            "text_dy_px": round(text_dy_px, 3),
            "has_text_box": has_text_box,
            "area": float(meta.get("area", 0.0)),
            "thickness": float(meta.get("thickness", 0.0)),
            "shift_px": float(meta.get("shift_px", 0.0)),
            "best_val": float(meta.get("best_val", 0.0)),
        }

    def _predict_learning_adjustment(self, features: dict) -> dict:
        if len(self.snap_learning_samples) < SNAP_LEARNING_MIN_SAMPLES:
            return {"dx_px": 0.0, "dy_px": 0.0, "count": 0, "weight": 0.0}

        feature_scales = {
            "mean_luma": 22.0,
            "std_luma": 16.0,
            "min_luma": 28.0,
            "max_luma": 18.0,
            "bright_ratio": 0.18,
            "radius_px": 18.0,
            "text_dx_px": 28.0,
            "text_dy_px": 20.0,
            "has_text_box": 1.0,
            "area": 70.0,
            "thickness": 3.2,
            "shift_px": 18.0,
            "best_val": 24.0,
        }
        feature_weights = {
            "bright_ratio": 1.35,
            "area": 1.3,
            "thickness": 1.4,
            "text_dx_px": 1.2,
            "text_dy_px": 1.0,
            "mean_luma": 0.9,
            "max_luma": 0.8,
            "shift_px": 0.7,
        }

        ranked: list[tuple[float, float, dict]] = []
        for sample in self.snap_learning_samples:
            sample_features = sample.get("features")
            if not isinstance(sample_features, dict):
                continue

            distance = 0.0
            if sample_features.get("method") != features.get("method"):
                distance += 1.25
            for key, scale in feature_scales.items():
                current = float(features.get(key, 0.0))
                learned = float(sample_features.get(key, 0.0))
                weight = feature_weights.get(key, 1.0)
                delta = (current - learned) / scale
                distance += weight * delta * delta
            distance = math.sqrt(distance)
            if distance > 4.4:
                continue
            similarity = 1.0 / (1.0 + distance * distance)
            if sample_features.get("method") == features.get("method"):
                similarity *= 1.2
            ranked.append((similarity, distance, sample))

        if not ranked:
            return {"dx_px": 0.0, "dy_px": 0.0, "count": 0, "weight": 0.0}

        ranked.sort(key=lambda item: item[1])
        top = ranked[:6]
        if len(top) < SNAP_LEARNING_MIN_SAMPLES:
            return {"dx_px": 0.0, "dy_px": 0.0, "count": len(top), "weight": 0.0}

        total_weight = sum(weight for weight, _distance, _sample in top)
        if total_weight <= 0:
            return {"dx_px": 0.0, "dy_px": 0.0, "count": len(top), "weight": 0.0}

        dx_px = sum(
            weight * float(sample["delta_x_px"])
            for weight, _distance, sample in top
        ) / total_weight
        dy_px = sum(
            weight * float(sample["delta_y_px"])
            for weight, _distance, sample in top
        ) / total_weight

        strength = min(1.0, 0.35 + (0.18 * len(top)))
        dx_px *= strength
        dy_px *= strength

        magnitude = math.hypot(dx_px, dy_px)
        max_magnitude = min(10.0, 3.5 + (len(top) * 1.5))
        if magnitude > max_magnitude and magnitude > 0:
            scale = max_magnitude / magnitude
            dx_px *= scale
            dy_px *= scale

        return {
            "dx_px": dx_px,
            "dy_px": dy_px,
            "count": len(top),
            "weight": total_weight,
        }

    def _remember_snap_context(
        self,
        name: str,
        kind: str,
        snap_details: dict | None,
    ):
        if kind != "calibrated" or not snap_details or not snap_details.get("found"):
            return
        features = snap_details.get("learning_features")
        if not isinstance(features, dict):
            return

        name_key = self._normalize_name_key(name)
        self.snap_feedback_pending[name_key] = {
            "id": f"{name_key}-{int(time.time() * 1000)}",
            "name": name,
            "name_key": name_key,
            "suggested_x": round(float(snap_details["x"]), 4),
            "suggested_y": round(float(snap_details["y"]), 4),
            "method": str(snap_details.get("method", "")),
            "features": features,
            "created_at": time.time(),
        }

    def _record_learning_feedback(
        self,
        name: str,
        final_x: float,
        final_y: float,
        source: str,
    ) -> dict | None:
        name_key = self._normalize_name_key(name)
        context = self.snap_feedback_pending.get(name_key)
        if not context:
            return None

        delta_x_px = (float(final_x) - float(context["suggested_x"])) * self.img_w
        delta_y_px = (float(final_y) - float(context["suggested_y"])) * self.img_h
        magnitude = math.hypot(delta_x_px, delta_y_px)
        if magnitude > 90.0:
            return None

        existing_index = next(
            (
                index
                for index, sample in enumerate(self.snap_learning_samples)
                if sample.get("id") == context["id"]
            ),
            None,
        )
        if existing_index is None and magnitude < 0.45:
            return None

        sample = {
            "id": context["id"],
            "name": name,
            "name_key": name_key,
            "method": context["method"],
            "features": context["features"],
            "suggested_x": round(float(context["suggested_x"]), 4),
            "suggested_y": round(float(context["suggested_y"]), 4),
            "final_x": round(float(final_x), 4),
            "final_y": round(float(final_y), 4),
            "delta_x_px": round(delta_x_px, 3),
            "delta_y_px": round(delta_y_px, 3),
            "source": source,
            "updated_at": time.time(),
        }

        if existing_index is None:
            self.snap_learning_samples.append(sample)
        else:
            self.snap_learning_samples[existing_index] = sample

        self.snap_learning_samples.sort(
            key=lambda entry: float(entry.get("updated_at", 0.0)),
            reverse=True,
        )
        self.snap_learning_samples = self.snap_learning_samples[:SNAP_LEARNING_MAX_SAMPLES]
        self._save_snap_learning()
        return sample

    def _save_snap_learning(self):
        payload = {
            "sample_count": len(self.snap_learning_samples),
            "samples": self.snap_learning_samples,
        }
        self.snap_learning_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _detect_point_component_cv(
        self,
        crop: Image.Image,
        x0: int,
        y0: int,
        ix: int,
        iy: int,
        radius: int,
        text_box: tuple[float, float, float, float] | None = None,
    ) -> dict | None:
        if cv2 is None or np is None:
            return None

        gray = np.array(crop, dtype=np.uint8)
        if gray.ndim != 2 or gray.size == 0:
            return None

        crop_h, crop_w = gray.shape
        if crop_h < 3 or crop_w < 3:
            return None

        yy, xx = np.ogrid[:crop_h, :crop_w]
        circle_mask = (((xx + x0 - ix) ** 2 + (yy + y0 - iy) ** 2) <= radius * radius).astype(
            np.uint8
        )
        if not np.any(circle_mask):
            return None

        enhanced = cv2.equalizeHist(gray)
        blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
        small_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        large_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        min_side = min(crop_w, crop_h)
        max_block = min(31, min_side if min_side % 2 == 1 else min_side - 1)
        block_size = max(15, max_block)
        if block_size % 2 == 0:
            block_size -= 1
        block_size = max(3, block_size)

        mask_variants: list[tuple[str, Any]] = []
        circle_values = gray[circle_mask > 0]
        if circle_values.size == 0:
            return None

        _th, bright_otsu = cv2.threshold(
            blurred,
            0,
            255,
            cv2.THRESH_BINARY | cv2.THRESH_OTSU,
        )
        mask_variants.append(("bright_otsu", bright_otsu))

        if block_size >= 3:
            bright_adapt = cv2.adaptiveThreshold(
                blurred,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                block_size,
                3,
            )
            mask_variants.append(("bright_adapt", bright_adapt))

        quantile_floor = float(np.percentile(circle_values, 92))
        quantile_floor = max(118.0, min(205.0, quantile_floor - 6.0))
        _th, bright_quantile = cv2.threshold(
            gray,
            quantile_floor,
            255,
            cv2.THRESH_BINARY,
        )
        mask_variants.append(("bright_quantile", bright_quantile))

        white_tophat = cv2.morphologyEx(blurred, cv2.MORPH_TOPHAT, large_kernel)
        _th, white_tophat_mask = cv2.threshold(
            white_tophat,
            0,
            255,
            cv2.THRESH_BINARY | cv2.THRESH_OTSU,
        )
        mask_variants.append(("white_tophat", white_tophat_mask))

        text_mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
        if text_box is not None:
            box_left = max(0, int(math.floor(text_box[0] - x0 - 2.0)))
            box_top = max(0, int(math.floor(text_box[1] - y0 - 2.0)))
            box_right = min(crop_w - 1, int(math.ceil(text_box[2] - x0 + 2.0)))
            box_bottom = min(crop_h - 1, int(math.ceil(text_box[3] - y0 + 2.0)))
            if box_right >= box_left and box_bottom >= box_top:
                text_mask[box_top : box_bottom + 1, box_left : box_right + 1] = 255

        best_candidate = None
        best_score = float("-inf")

        for _variant_name, variant in mask_variants:
            mask = cv2.bitwise_and(variant, variant, mask=(circle_mask * 255))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, small_kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, small_kernel)
            if cv2.countNonZero(mask) == 0:
                continue

            dist_map = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
                mask,
                connectivity=8,
            )

            for label_idx in range(1, num_labels):
                area = int(stats[label_idx, cv2.CC_STAT_AREA])
                if area < 4 or area > max(220, radius * radius):
                    continue

                left = int(stats[label_idx, cv2.CC_STAT_LEFT])
                top = int(stats[label_idx, cv2.CC_STAT_TOP])
                width = int(stats[label_idx, cv2.CC_STAT_WIDTH])
                height = int(stats[label_idx, cv2.CC_STAT_HEIGHT])
                bbox_area = max(1, width * height)
                fill_ratio = area / bbox_area
                aspect_balance = min(width, height) / max(width, height)

                component_mask = labels == label_idx
                thickness_values = dist_map[component_mask]
                if thickness_values.size == 0:
                    continue
                max_thickness = float(thickness_values.max())
                mean_thickness = float(thickness_values.mean())
                if max_thickness < 1.35:
                    continue
                mean_luma = float(gray[component_mask].mean())
                peak_luma = float(gray[component_mask].max())
                if peak_luma < 128.0 or mean_luma < 95.0:
                    continue

                component_u8 = component_mask.astype(np.uint8) * 255
                contours, _hier = cv2.findContours(
                    component_u8,
                    cv2.RETR_EXTERNAL,
                    cv2.CHAIN_APPROX_SIMPLE,
                )
                if not contours:
                    continue
                contour = max(contours, key=cv2.contourArea)
                perimeter = float(cv2.arcLength(contour, True))
                circularity = 0.0
                if perimeter > 0.0:
                    circularity = max(
                        0.0,
                        min(1.35, (4.0 * math.pi * area) / (perimeter * perimeter)),
                    )

                ys, xs = np.where(component_mask)
                weights = np.square(dist_map[component_mask] + 0.35)
                if float(weights.sum()) <= 0.0:
                    continue
                weighted_x = x0 + float(np.average(xs, weights=weights))
                weighted_y = y0 + float(np.average(ys, weights=weights))
                center_dist = math.hypot(weighted_x - ix, weighted_y - iy)

                peak_local_y, peak_local_x = np.unravel_index(
                    int(np.argmax(dist_map * component_mask)),
                    dist_map.shape,
                )
                peak_radius = max(1, min(4, max(2, radius // 8)))
                peak_left = max(0, peak_local_x - peak_radius)
                peak_top = max(0, peak_local_y - peak_radius)
                peak_right = min(crop_w, peak_local_x + peak_radius + 1)
                peak_bottom = min(crop_h, peak_local_y + peak_radius + 1)
                peak_density = int(
                    np.count_nonzero(component_mask[peak_top:peak_bottom, peak_left:peak_right])
                )

                overlap_ratio = 0.0
                if np.any(text_mask):
                    overlap_ratio = float(
                        np.count_nonzero(np.logical_and(component_mask, text_mask > 0))
                    ) / max(1, area)

                score = (
                    max_thickness * 96.0
                    + mean_thickness * 20.0
                    + max(0.0, mean_luma - 118.0) * 1.8
                    + max(0.0, peak_luma - 132.0) * 0.7
                    + peak_density * 2.6
                    + circularity * 46.0
                    + fill_ratio * 26.0
                    + aspect_balance * 28.0
                    + min(area, 80) * 0.65
                    - max(0.0, area - 120) * 1.0
                    - center_dist * 1.75
                    - overlap_ratio * 155.0
                    - self._text_box_penalty(weighted_x, weighted_y, text_box) * 1.1
                )

                if score > best_score:
                    best_score = score
                    best_candidate = {
                        "found": True,
                        "x": weighted_x / self.img_w,
                        "y": weighted_y / self.img_h,
                        "shift_px": center_dist,
                        "method": "cv2-dot",
                        "thickness": max_thickness,
                        "area": area,
                        "score": score,
                    }

        return best_candidate

    def _snap_norm_point_detailed(
        self,
        nx: float,
        ny: float,
        radius_px: int | None = None,
        text_box: tuple[float, float, float, float] | None = None,
    ) -> dict:
        nx = min(1.0, max(0.0, nx))
        ny = min(1.0, max(0.0, ny))
        ix = int(round(nx * self.img_w))
        iy = int(round(ny * self.img_h))
        if radius_px is None:
            radius = int(max(8, min(80, round(22 / max(self.scale, 0.25)))))
        else:
            radius = int(max(6, min(120, radius_px)))
        x0 = max(0, ix - radius)
        y0 = max(0, iy - radius)
        x1 = min(self.img_w - 1, ix + radius)
        y1 = min(self.img_h - 1, iy + radius)

        crop = self.luma_img.crop((x0, y0, x1 + 1, y1 + 1))
        pix = crop.load()
        crop_w, crop_h = crop.size
        best_val = -1
        best_score = float("-inf")
        best_pos = None

        for cy in range(crop_h):
            for cx in range(crop_w):
                dx = (x0 + cx) - ix
                dy = (y0 + cy) - iy
                if dx * dx + dy * dy > radius * radius:
                    continue
                val = pix[cx, cy]
                dist = math.hypot(dx, dy)
                score = float(val) - (dist * 1.6)
                score -= self._text_box_penalty(x0 + cx, y0 + cy, text_box)
                if score > best_score or (score == best_score and val > best_val):
                    best_score = score
                    best_val = val
                    best_pos = (cx, cy)

        cv_candidate = self._detect_point_component_cv(
            crop,
            x0,
            y0,
            ix,
            iy,
            radius,
            text_box=text_box,
        )
        if cv_candidate is not None:
            cv_candidate["best_val"] = best_val
            abs_x = cv_candidate["x"] * self.img_w
            abs_y = cv_candidate["y"] * self.img_h
            cv_candidate["learning_features"] = self._extract_learning_features(
                abs_x,
                abs_y,
                radius,
                text_box,
                meta=cv_candidate,
            )
            learning_adjust = self._predict_learning_adjustment(
                cv_candidate["learning_features"]
            )
            cv_candidate["learn_dx_px"] = round(float(learning_adjust["dx_px"]), 3)
            cv_candidate["learn_dy_px"] = round(float(learning_adjust["dy_px"]), 3)
            cv_candidate["learn_count"] = int(learning_adjust["count"])
            if learning_adjust["count"] >= SNAP_LEARNING_MIN_SAMPLES:
                abs_x = min(
                    self.img_w - 1,
                    max(0.0, abs_x + float(learning_adjust["dx_px"])),
                )
                abs_y = min(
                    self.img_h - 1,
                    max(0.0, abs_y + float(learning_adjust["dy_px"])),
                )
                cv_candidate["x"] = abs_x / self.img_w
                cv_candidate["y"] = abs_y / self.img_h
                cv_candidate["shift_px"] = math.hypot(abs_x - ix, abs_y - iy)
            return cv_candidate

        if best_pos is None or best_val < 135:
            return {
                "found": False,
                "x": nx,
                "y": ny,
                "best_val": best_val,
                "shift_px": 0.0,
            }

        threshold = max(120, best_val - 18)
        mask = [[False] * crop_w for _ in range(crop_h)]
        local_mass = [[0] * crop_w for _ in range(crop_h)]
        intensity_delta = [[0.0] * crop_w for _ in range(crop_h)]
        integral = [[0] * (crop_w + 1) for _ in range(crop_h + 1)]

        for cy in range(crop_h):
            row_sum = 0
            abs_y = y0 + cy
            dy = abs_y - iy
            for cx in range(crop_w):
                abs_x = x0 + cx
                dx = abs_x - ix
                in_circle = dx * dx + dy * dy <= radius * radius
                val = pix[cx, cy]
                if in_circle and val >= threshold:
                    mask[cy][cx] = True
                    intensity_delta[cy][cx] = float(val - threshold + 1)
                    row_sum += 1
                integral[cy + 1][cx + 1] = integral[cy][cx + 1] + row_sum

        def rect_sum(left: int, top: int, right: int, bottom: int) -> int:
            left = max(0, min(crop_w - 1, left))
            top = max(0, min(crop_h - 1, top))
            right = max(0, min(crop_w - 1, right))
            bottom = max(0, min(crop_h - 1, bottom))
            if right < left or bottom < top:
                return 0
            return (
                integral[bottom + 1][right + 1]
                - integral[top][right + 1]
                - integral[bottom + 1][left]
                + integral[top][left]
            )

        density_radius = max(2, min(5, radius // 6 if radius >= 18 else 3))
        for cy in range(crop_h):
            y_min = cy - density_radius
            y_max = cy + density_radius
            for cx in range(crop_w):
                if not mask[cy][cx]:
                    continue
                local_mass[cy][cx] = rect_sum(
                    cx - density_radius,
                    y_min,
                    cx + density_radius,
                    y_max,
                )

        visited = [[False] * crop_w for _ in range(crop_h)]
        best_component = None
        best_component_score = float("-inf")

        for cy in range(crop_h):
            for cx in range(crop_w):
                if not mask[cy][cx] or visited[cy][cx]:
                    continue

                stack = [(cx, cy)]
                visited[cy][cx] = True
                area = 0
                overlap_pixels = 0
                min_cx = max_cx = cx
                min_cy = max_cy = cy
                peak_mass = 0
                mass_total = 0.0
                weight_sum = 0.0
                sum_x = 0.0
                sum_y = 0.0

                while stack:
                    px, py = stack.pop()
                    area += 1
                    min_cx = min(min_cx, px)
                    max_cx = max(max_cx, px)
                    min_cy = min(min_cy, py)
                    max_cy = max(max_cy, py)

                    abs_x = x0 + px
                    abs_y = y0 + py
                    mass_here = local_mass[py][px]
                    peak_mass = max(peak_mass, mass_here)
                    mass_total += mass_here
                    if self._text_box_penalty(abs_x, abs_y, text_box) >= 85.0:
                        overlap_pixels += 1

                    weight = max(1.0, intensity_delta[py][px]) + (mass_here * 0.55)
                    weight_sum += weight
                    sum_x += abs_x * weight
                    sum_y += abs_y * weight

                    for ny2 in range(max(0, py - 1), min(crop_h - 1, py + 1) + 1):
                        for nx2 in range(max(0, px - 1), min(crop_w - 1, px + 1) + 1):
                            if nx2 == px and ny2 == py:
                                continue
                            if mask[ny2][nx2] and not visited[ny2][nx2]:
                                visited[ny2][nx2] = True
                                stack.append((nx2, ny2))

                if weight_sum <= 0:
                    continue

                centroid_x = sum_x / weight_sum
                centroid_y = sum_y / weight_sum
                comp_w = max_cx - min_cx + 1
                comp_h = max_cy - min_cy + 1
                bbox_area = max(1, comp_w * comp_h)
                fill_ratio = area / bbox_area
                aspect_balance = min(comp_w, comp_h) / max(comp_w, comp_h)
                overlap_ratio = overlap_pixels / max(1, area)
                mean_mass = mass_total / max(1, area)
                center_dist = math.hypot(centroid_x - ix, centroid_y - iy)

                # Favor compact, dense clusters near the estimated point and outside the text box.
                component_score = (
                    peak_mass * 11.5
                    + mean_mass * 2.8
                    + min(area, 60) * 1.5
                    + fill_ratio * 34.0
                    + aspect_balance * 42.0
                    - max(0.0, area - 110) * 1.0
                    - center_dist * 1.6
                    - overlap_ratio * 130.0
                    - self._text_box_penalty(centroid_x, centroid_y, text_box) * 1.15
                )

                if component_score > best_component_score:
                    best_component_score = component_score
                    best_component = {
                        "area": area,
                        "peak_mass": peak_mass,
                        "centroid_x": centroid_x,
                        "centroid_y": centroid_y,
                    }

        if best_component is not None and best_component["peak_mass"] >= 6:
            snapped_x = best_component["centroid_x"]
            snapped_y = best_component["centroid_y"]
        else:
            best_abs_x = x0 + best_pos[0]
            best_abs_y = y0 + best_pos[1]
            cluster_radius = max(5, min(radius, 11))
            sum_w = 0.0
            sum_x = 0.0
            sum_y = 0.0

            for cy in range(crop_h):
                for cx in range(crop_w):
                    dx = (x0 + cx) - ix
                    dy = (y0 + cy) - iy
                    if dx * dx + dy * dy > radius * radius:
                        continue
                    val = pix[cx, cy]
                    if val < threshold:
                        continue
                    best_dx = (x0 + cx) - best_abs_x
                    best_dy = (y0 + cy) - best_abs_y
                    if best_dx * best_dx + best_dy * best_dy > cluster_radius * cluster_radius:
                        continue
                    cluster_dist = math.hypot(best_dx, best_dy)
                    weight = float(val - threshold + 1) * max(
                        0.2,
                        1.0 - (cluster_dist / (cluster_radius + 1)),
                    )
                    sum_w += weight
                    sum_x += (x0 + cx) * weight
                    sum_y += (y0 + cy) * weight

            if sum_w <= 0:
                return {
                    "found": False,
                    "x": nx,
                    "y": ny,
                    "best_val": best_val,
                    "shift_px": 0.0,
                }

            snapped_x = sum_x / sum_w
            snapped_y = sum_y / sum_w

        fallback_meta = {
            "method": "fallback-density",
            "area": 0.0,
            "thickness": 0.0,
            "shift_px": math.hypot(snapped_x - ix, snapped_y - iy),
            "best_val": best_val,
        }
        learning_features = self._extract_learning_features(
            snapped_x,
            snapped_y,
            radius,
            text_box,
            meta=fallback_meta,
        )
        learning_adjust = self._predict_learning_adjustment(learning_features)
        if learning_adjust["count"] >= SNAP_LEARNING_MIN_SAMPLES:
            snapped_x = min(
                self.img_w - 1,
                max(0.0, snapped_x + float(learning_adjust["dx_px"])),
            )
            snapped_y = min(
                self.img_h - 1,
                max(0.0, snapped_y + float(learning_adjust["dy_px"])),
            )
        shift_px = math.hypot(snapped_x - ix, snapped_y - iy)
        return {
            "found": True,
            "x": snapped_x / self.img_w,
            "y": snapped_y / self.img_h,
            "best_val": best_val,
            "shift_px": shift_px,
            "method": "fallback-density",
            "learning_features": learning_features,
            "learn_dx_px": round(float(learning_adjust["dx_px"]), 3),
            "learn_dy_px": round(float(learning_adjust["dy_px"]), 3),
            "learn_count": int(learning_adjust["count"]),
        }

    def _snap_norm_point(self, nx: float, ny: float) -> tuple[float, float]:
        snap = self._snap_norm_point_detailed(nx, ny)
        return snap["x"], snap["y"]

    def _apply_calibration(
        self,
        name: str,
        nx: float,
        ny: float,
        snap_details: dict | None = None,
    ) -> bool:
        conflicting = self._find_existing_name(name)
        if conflicting is not None and conflicting != name:
            return False
        meta = self._meta_for_name(name)
        self.calibrated[name] = {
            "x": round(nx, 4),
            "y": round(ny, 4),
            "grid": meta["grid"],
            "region": meta["region"],
        }
        self._remember_snap_context(name, "calibrated", snap_details)
        return True

    def _auto_fill_pending_from_image(self):
        if not self._require_calibration_mode():
            return
        filled = 0
        skipped = 0
        max_shift = 30.0
        last_name = None
        anchors = self._reference_anchors()

        for planet in PLANETS:
            name = planet["name"]
            if self._find_existing_name(name) is not None:
                continue
            est_x, est_y = self._apply_local_anchor_correction(
                planet["x"],
                planet["y"],
                anchors,
            )
            snap = self._snap_norm_point_detailed(est_x, est_y, radius_px=34)
            if not snap["found"] or snap["shift_px"] > max_shift:
                skipped += 1
                continue
            if not self._apply_calibration(name, snap["x"], snap["y"], snap_details=snap):
                skipped += 1
                continue
            self.last_snap = (snap["x"], snap["y"])
            filled += 1
            last_name = name

        self._refresh_pending_list()
        if self.active_name not in self.calibrated:
            self._activate_first_visible()
        self._redraw()

        if filled:
            suffix = f' Letzter Treffer: "{last_name}".' if last_name else ""
            self.status_var.set(
                f"PNG-Auto hat {filled} offene Planeten gesetzt, {skipped} uebersprungen.{suffix}"
            )
        else:
            self.status_var.set(
                "PNG-Auto hat keine zusaetzlichen offenen Planeten sicher erkannt."
            )

    def _refine_existing_from_image(self):
        if not self._require_calibration_mode():
            return
        updated = 0
        skipped = 0
        max_shift = 26.0
        last_name = None

        for name, data in list(self.calibrated.items()):
            snap = self._snap_norm_point_detailed(data["x"], data["y"], radius_px=24)
            if not snap["found"] or snap["shift_px"] > max_shift:
                skipped += 1
                continue
            new_x = round(snap["x"], 4)
            new_y = round(snap["y"], 4)
            if new_x == data["x"] and new_y == data["y"]:
                continue
            self.calibrated[name]["x"] = new_x
            self.calibrated[name]["y"] = new_y
            self._remember_snap_context(name, "calibrated", snap)
            self.last_snap = (new_x, new_y)
            updated += 1
            last_name = name

        self._refresh_pending_list()
        self._redraw()

        if updated:
            suffix = f' Letzter Treffer: "{last_name}".' if last_name else ""
            self.status_var.set(
                f"{updated} gesetzte Pins wurden aus der PNG nachgezogen, {skipped} uebersprungen.{suffix}"
            )
        else:
            self.status_var.set(
                "Es wurden keine gesetzten Pins weiter verbessert."
            )

    def _hit_pin(self, nx: float, ny: float, tol_px: float = 12) -> str | None:
        tol = tol_px / max(self.scale * min(self.img_w, self.img_h), 1)
        best_name = None
        best_dist = tol
        for name, data in self.calibrated.items():
            dist = math.hypot(data["x"] - nx, data["y"] - ny)
            if dist < best_dist:
                best_dist = dist
                best_name = name
        return best_name

    def _hit_grid_marker(self, nx: float, ny: float, tol_px: float = 12) -> str | None:
        tol = tol_px / max(self.scale * min(self.img_w, self.img_h), 1)
        best_name = None
        best_dist = tol
        for name, data in self.grid_markers.items():
            dist = math.hypot(data["x"] - nx, data["y"] - ny)
            if dist < best_dist:
                best_dist = dist
                best_name = name
        return best_name

    def _hit_item(self, nx: float, ny: float, tol_px: float = 12) -> tuple[str, str | int] | None:
        hit_name = self._hit_pin(nx, ny, tol_px=tol_px)
        hit_grid = self._hit_grid_marker(nx, ny, tol_px=tol_px)

        hits: list[tuple[str, str | int, float]] = []
        if hit_name is not None:
            pin = self.calibrated[hit_name]
            hits.append(
                ("calibrated", hit_name, math.hypot(pin["x"] - nx, pin["y"] - ny))
            )
        if hit_grid is not None:
            marker = self.grid_markers[hit_grid]
            hits.append(
                ("grid", hit_grid, math.hypot(marker["x"] - nx, marker["y"] - ny))
            )

        if not hits:
            return None
        hits.sort(key=lambda item: item[2])
        return hits[0][0], hits[0][1]

    def _item_label(self, item: tuple[str, str | int]) -> str:
        return str(item[1])

    def _move_item(self, item: tuple[str, str | int], nx: float, ny: float):
        kind = str(item[0])
        name = str(item[1])
        store = self._marker_store(kind)
        if name not in store:
            return
        store[name]["x"] = self._round_norm(nx)
        store[name]["y"] = self._round_norm(ny)

    def _rename_item(self, item: tuple[str, str | int]):
        kind = str(item[0])
        name = str(item[1])
        store = self._marker_store(kind)
        if name not in store:
            return
        new_name = simpledialog.askstring(
            "Umbenennen",
            "Neuer Name:",
            initialvalue=name,
            parent=self.root,
        )
        if not new_name:
            return
        new_name = new_name.strip()
        if not new_name or new_name == name:
            return
        if kind == "grid":
            conflict = self._find_grid_marker_name(new_name, ignore_name=name)
        else:
            conflict = self._find_existing_name(new_name, ignore_name=name)
        if conflict is not None:
            self.status_var.set(f'"{new_name}" existiert bereits als "{conflict}".')
            return
        data = dict(store[name])
        self.history.append(("delete", kind, name, data))
        del store[name]
        store[new_name] = data
        self.history.append(("set", kind, new_name, None))
        self._refresh_pending_list()
        if kind == "grid":
            self.current_var.set(f"Grid-Marker: {new_name}")
            self.status_var.set(f'Grid-Marker "{name}" umbenannt zu "{new_name}".')
            self._redraw()
        else:
            self._set_active_name(new_name, source="existing", preserve_status=True)
            self.status_var.set(f'"{name}" umbenannt zu "{new_name}".')

    def _delete_item(self, item: tuple[str, str | int]):
        kind = str(item[0])
        name = str(item[1])
        store = self._marker_store(kind)
        if name not in store:
            return
        old = dict(store[name])
        self.history.append(("delete", kind, name, old))
        del store[name]
        self._refresh_pending_list()
        if kind == "grid":
            self.current_var.set("Kein Grid-Marker aktiv")
            self._redraw()
            return
        if self.active_name == name:
            self.active_name = None
            self.current_var.set("Kein Planet aktiv")
        self._redraw()

    def _sample_vector_outline(self, path: dict[str, Any], steps: int) -> list[tuple[float, float]]:
        outline: list[tuple[float, float]] = []
        if len(path.get("points", [])) < 2:
            return outline
        for _, p0, p1, p2, p3 in self._iter_vector_segments(path):
            sampled = self._sample_vector_segment(p0, p1, p2, p3, steps=steps)
            if outline:
                sampled = sampled[1:]
            outline.extend(sampled)
        return outline

    def _draw_vector_paths(self):
        active_path = self._active_vector_path()
        active_layer_id = self.active_vector_layer_id
        if active_layer_id is None and active_path is not None:
            active_layer_id = self._vector_layer_id(active_path)
        editor_mode = self._editor_mode_active()
        visible_bounds = self._visible_norm_bounds(margin_px=64.0)
        sample_steps = (
            INTERACTIVE_VECTOR_SAMPLE_STEPS
            if self._interactive_render
            else EDITOR_VECTOR_SAMPLE_STEPS if editor_mode else IDLE_VECTOR_SAMPLE_STEPS
        )
        labeled_layers: set[str] = set()
        for path in self.vector_paths:
            points = path.get("points", [])
            if not points:
                continue
            self._ensure_vector_path_style(path)
            layer_id = self._vector_layer_id(path)
            is_active_layer = active_layer_id is not None and layer_id == active_layer_id
            is_active = active_path is not None and path.get("id") == active_path.get("id")
            dim_factor = 1.0 if is_active_layer else 0.5 if editor_mode else 0.82
            stroke = self._layer_gray_from_path(path, dim_factor=dim_factor)
            width = 3 if is_active and self._vector_mode_active() else 2
            if path.get("closed") and path.get("fill_tone"):
                fill_color = self._layer_fill_from_path(
                    path,
                    dim_factor=0.95 if is_active else 0.78 if is_active_layer else 0.45 if editor_mode else 0.7,
                )
                if fill_color:
                    outline = self._sample_vector_outline(path, steps=sample_steps)
                    coords: list[float] = []
                    for sx, sy in outline:
                        cx, cy = self._norm_to_canvas(sx, sy)
                        coords.extend((cx, cy))
                    if len(coords) >= 6:
                        self.canvas.create_polygon(
                            *coords,
                            fill=fill_color,
                            outline="",
                            smooth=False,
                        )
            if len(points) == 1:
                ax, ay = self._vector_point_xy(points[0], "anchor")
                if not self._norm_point_visible(ax, ay, visible_bounds):
                    continue
                cx, cy = self._norm_to_canvas(ax, ay)
                self.canvas.create_oval(
                    cx - 5,
                    cy - 5,
                    cx + 5,
                    cy + 5,
                    fill=self._gray_hex(max(150, self._tone_intensity(stroke))) if is_active else stroke,
                    outline=stroke,
                    width=2,
                )
            else:
                for _, p0, p1, p2, p3 in self._iter_vector_segments(path):
                    sampled = self._sample_vector_segment(p0, p1, p2, p3, steps=sample_steps)
                    coords: list[float] = []
                    for sx, sy in sampled:
                        cx, cy = self._norm_to_canvas(sx, sy)
                        coords.extend((cx, cy))
                    if len(coords) >= 4:
                        self.canvas.create_line(
                            *coords,
                            fill=stroke,
                            width=width,
                            capstyle="round",
                            joinstyle="round",
                            smooth=False,
                        )
            first_ax, first_ay = self._vector_point_xy(points[0], "anchor")
            if not self._norm_point_visible(first_ax, first_ay, visible_bounds):
                continue
            if layer_id not in labeled_layers:
                labeled_layers.add(layer_id)
                label_x, label_y = self._norm_to_canvas(first_ax, first_ay)
                label_fill = stroke if editor_mode or is_active_layer else MUTED_COLOR
                self.canvas.create_text(
                    label_x + 8,
                    label_y - 10,
                    text=path.get("name", "Rim"),
                    anchor="sw",
                    fill=label_fill,
                    font=("Segoe UI", max(8, int(9 * self.scale))),
                )
            if not is_active:
                continue
            for index, point in enumerate(points):
                ax, ay = self._vector_point_xy(point, "anchor")
                if not self._norm_point_visible(ax, ay, visible_bounds):
                    continue
                anchor_cx, anchor_cy = self._norm_to_canvas(ax, ay)
                for handle_key in ("in", "out"):
                    hx, hy = self._vector_point_xy(point, handle_key)
                    handle_cx, handle_cy = self._norm_to_canvas(hx, hy)
                    if math.hypot(handle_cx - anchor_cx, handle_cy - anchor_cy) >= 3:
                        self.canvas.create_line(
                            anchor_cx,
                            anchor_cy,
                            handle_cx,
                            handle_cy,
                            fill=self._gray_hex(max(120, self._tone_intensity(stroke))),
                            dash=(4, 3),
                            width=1,
                        )
                        active_handle = (
                            self.active_vector_handle is not None
                            and self.active_vector_handle == (index, handle_key)
                        )
                        handle_fill = self._gray_hex(255 if active_handle else max(160, self._tone_intensity(stroke)))
                        self.canvas.create_oval(
                            handle_cx - 4,
                            handle_cy - 4,
                            handle_cx + 4,
                            handle_cy + 4,
                            fill=handle_fill,
                            outline=TEXT_COLOR,
                            width=1,
                        )
                radius = 6 if self.active_vector_point_index == index else 5
                fill = self._gray_hex(255 if self.active_vector_point_index == index else max(175, self._tone_intensity(stroke)))
                self.canvas.create_oval(
                    anchor_cx - radius,
                    anchor_cy - radius,
                    anchor_cx + radius,
                    anchor_cy + radius,
                    fill=fill,
                    outline=stroke,
                    width=2,
                )
            if path.get("draft") and len(points) >= 2:
                start_ax, start_ay = self._vector_point_xy(points[0], "anchor")
                start_cx, start_cy = self._norm_to_canvas(start_ax, start_ay)
                self.canvas.create_oval(
                    start_cx - 10,
                    start_cy - 10,
                    start_cx + 10,
                    start_cy + 10,
                    outline=VECTOR_CURVE_ACTIVE,
                    dash=(4, 3),
                    width=1.5,
                )

    def _draw_hyperspace_selection(self):
        visible_bounds = self._visible_norm_bounds(margin_px=64.0)
        highlighted_segments: list[dict[str, Any]] = []
        if self.active_hyper_segment is not None:
            path = self._find_vector_path(str(self.active_hyper_segment.get("path_id")))
            segment_index = int(self.active_hyper_segment.get("segment_index", -1))
            if path is not None:
                for current_index, p0, p1, p2, p3 in self._iter_vector_segments(path):
                    if current_index != segment_index:
                        continue
                    sampled = self._sample_vector_segment(
                        p0,
                        p1,
                        p2,
                        p3,
                        steps=(
                            INTERACTIVE_SELECTION_SAMPLE_STEPS
                            if self._interactive_render
                            else IDLE_SELECTION_SAMPLE_STEPS
                        ),
                    )
                    coords: list[float] = []
                    for sx, sy in sampled:
                        cx, cy = self._norm_to_canvas(sx, sy)
                        coords.extend((cx, cy))
                    if len(coords) >= 4:
                        self.canvas.create_line(
                            *coords,
                            fill=VECTOR_CURVE_ACTIVE,
                            width=5,
                            capstyle="round",
                            joinstyle="round",
                            smooth=False,
                        )
                    break
        if self.hyper_box_selection is not None:
            highlighted_segments = list(self.hyper_box_selection.get("segments", []))
        draft = self.vector_drag_state
        draft_rect = None
        if draft is not None and draft.get("kind") == "hyper-delete-box":
            draft_rect = self._hyper_selection_rect(
                tuple(draft.get("start_norm", (0.0, 0.0))),
                tuple(draft.get("current_norm", draft.get("start_norm", (0.0, 0.0)))),
            )
        selection_rect = (
            tuple(self.hyper_box_selection.get("rect"))
            if self.hyper_box_selection is not None and self.hyper_box_selection.get("rect") is not None
            else draft_rect
        )
        for segment in highlighted_segments:
            path = self._find_vector_path(str(segment.get("path_id")))
            if path is None:
                continue
            for current_index, p0, p1, p2, p3 in self._iter_vector_segments(path):
                if current_index != int(segment.get("segment_index", -1)):
                    continue
                sampled = self._sample_vector_segment(p0, p1, p2, p3, steps=14)
                coords: list[float] = []
                for sx, sy in sampled:
                    cx, cy = self._norm_to_canvas(sx, sy)
                    coords.extend((cx, cy))
                if len(coords) >= 4:
                    self.canvas.create_line(
                        *coords,
                        fill="#ff9f80",
                        width=5,
                        capstyle="round",
                        joinstyle="round",
                        smooth=False,
                    )
                break
        if selection_rect is not None:
            x0, y0 = self._norm_to_canvas(selection_rect[0], selection_rect[1])
            x1, y1 = self._norm_to_canvas(selection_rect[2], selection_rect[3])
            self.canvas.create_rectangle(
                x0,
                y0,
                x1,
                y1,
                outline="#ff9f80",
                width=2,
                dash=(6, 4),
            )
        if self.hyper_selected_planet is not None:
            planet = self.hyper_selected_planet
            if self._norm_point_visible(float(planet["x"]), float(planet["y"]), visible_bounds):
                cx, cy = self._norm_to_canvas(float(planet["x"]), float(planet["y"]))
                radius = max(7, int(9 * self.scale))
                self.canvas.create_oval(
                    cx - radius,
                    cy - radius,
                    cx + radius,
                    cy + radius,
                    outline=VECTOR_CURVE_ACTIVE,
                    width=2,
                )
                self.canvas.create_text(
                    cx + radius + 5,
                    cy - radius - 2,
                    text=str(planet["name"]),
                    anchor="sw",
                    fill=VECTOR_CURVE_ACTIVE,
                    font=("Segoe UI", max(8, int(9 * self.scale))),
                )

    def _draw_grid_guides(self):
        visible_bounds = self._visible_norm_bounds(margin_px=48.0)
        for guide in self.grid_guides:
            left, top, right, bottom = self._guide_bounds_px(guide)
            norm_left = left / self.img_w
            norm_top = top / self.img_h
            norm_right = right / self.img_w
            norm_bottom = bottom / self.img_h
            if visible_bounds is not None:
                bounds_left, bounds_top, bounds_right, bounds_bottom = visible_bounds
                if norm_right < bounds_left or norm_left > bounds_right or norm_bottom < bounds_top or norm_top > bounds_bottom:
                    continue
            stroke = "#c4c4c4" if str(guide.get("id")) == self.active_grid_guide_id else "#8e8e8e"
            if self._editor_mode_active() and not self._grid_tool_active():
                stroke = "#646464"
            line_width = 2 if str(guide.get("id")) == self.active_grid_guide_id else 1
            segment_count_x = 0
            segment_count_y = 0
            vertical_segments: list[tuple[int, tuple[float, float], tuple[float, float]]] = []
            horizontal_segments: list[tuple[int, tuple[float, float], tuple[float, float]]] = []
            for axis, _index, (start, end) in self._iter_grid_guide_segments(guide):
                if axis in {"vertical", "legacy-vertical"}:
                    segment_count_x += 1
                    vertical_segments.append((int(_index), start, end))
                else:
                    segment_count_y += 1
                    horizontal_segments.append((int(_index), start, end))
                x0, y0 = self._norm_to_canvas(start[0] / self.img_w, start[1] / self.img_h)
                x1, y1 = self._norm_to_canvas(end[0] / self.img_w, end[1] / self.img_h)
                self.canvas.create_line(x0, y0, x1, y1, fill=stroke, width=line_width)
            show_axis_labels = (
                not self._interactive_render
                and (str(guide.get("id")) == self.active_grid_guide_id or len(self.grid_guides) == 1)
            )
            if show_axis_labels:
                label_fill = "#d6d6d6" if str(guide.get("id")) == self.active_grid_guide_id else "#a2a2a2"
                if self._editor_mode_active() and not self._grid_tool_active():
                    label_fill = "#767676"
                font_size = max(7, int(8 * self.scale))
                for index, start, end in vertical_segments:
                    top_x, top_y = self._norm_to_canvas(start[0] / self.img_w, min(start[1], end[1]) / self.img_h)
                    bottom_x, bottom_y = self._norm_to_canvas(end[0] / self.img_w, max(start[1], end[1]) / self.img_h)
                    label = self._grid_line_label("vertical", index)
                    self.canvas.create_text(
                        top_x,
                        top_y + 10,
                        text=label,
                        anchor="n",
                        fill=label_fill,
                        font=("Segoe UI", font_size),
                    )
                    self.canvas.create_text(
                        bottom_x,
                        bottom_y - 10,
                        text=label,
                        anchor="s",
                        fill=label_fill,
                        font=("Segoe UI", font_size),
                    )
                for index, start, end in horizontal_segments:
                    left_x, left_y = self._norm_to_canvas(min(start[0], end[0]) / self.img_w, start[1] / self.img_h)
                    right_x, right_y = self._norm_to_canvas(max(start[0], end[0]) / self.img_w, end[1] / self.img_h)
                    label = self._grid_line_label("horizontal", index)
                    self.canvas.create_text(
                        left_x + 10,
                        left_y,
                        text=label,
                        anchor="w",
                        fill=label_fill,
                        font=("Segoe UI", font_size),
                    )
                    self.canvas.create_text(
                        right_x - 10,
                        right_y,
                        text=label,
                        anchor="e",
                        fill=label_fill,
                        font=("Segoe UI", font_size),
                    )
            label_x, label_y = self._norm_to_canvas(norm_left, norm_top)
            self.canvas.create_text(
                label_x + 8,
                label_y - 8,
                text=f'Grid {segment_count_x}x{segment_count_y}',
                anchor="sw",
                fill=stroke,
                font=("Segoe UI", max(8, int(8 * self.scale))),
            )
        draft = self.vector_drag_state
        if draft is not None and draft.get("kind") == "grid-line-draft":
            if draft.get("horizontal_start_px") is not None:
                start_x, start_y = tuple(draft["horizontal_start_px"])
                cx, cy = self._norm_to_canvas(start_x / self.img_w, start_y / self.img_h)
                self.canvas.create_oval(
                    cx - 5,
                    cy - 5,
                    cx + 5,
                    cy + 5,
                    fill="#d0d0d0",
                    outline="#ececec",
                    width=1,
                )
                self.canvas.create_text(
                    cx + 8,
                    cy - 8,
                    text="H1",
                    anchor="sw",
                    fill="#d0d0d0",
                    font=("Segoe UI", 8),
                )
            if draft.get("horizontal_line") is not None:
                start = tuple(draft["horizontal_line"]["start_px"])
                end = tuple(draft["horizontal_line"]["end_px"])
                x0, y0 = self._norm_to_canvas(start[0] / self.img_w, start[1] / self.img_h)
                x1, y1 = self._norm_to_canvas(end[0] / self.img_w, end[1] / self.img_h)
                self.canvas.create_line(x0, y0, x1, y1, fill="#d0d0d0", width=2, dash=(6, 3))
            if draft.get("vertical_start_px") is not None:
                start_x, start_y = tuple(draft["vertical_start_px"])
                cx, cy = self._norm_to_canvas(start_x / self.img_w, start_y / self.img_h)
                self.canvas.create_oval(
                    cx - 5,
                    cy - 5,
                    cx + 5,
                    cy + 5,
                    fill="#d0d0d0",
                    outline="#ececec",
                    width=1,
                )
                self.canvas.create_text(
                    cx + 8,
                    cy - 8,
                    text="V1",
                    anchor="sw",
                    fill="#d0d0d0",
                    font=("Segoe UI", 8),
                )
            preview = self._grid_draft_endpoint()
            if preview is not None:
                raw, snapped = preview
                step = str(draft.get("step"))
                start = None
                label = None
                if step == "horizontal_end" and draft.get("horizontal_start_px") is not None:
                    start = tuple(draft["horizontal_start_px"])
                    label = "H2"
                elif step == "vertical_end" and draft.get("vertical_start_px") is not None:
                    start = tuple(draft["vertical_start_px"])
                    label = "V2"
                if start is not None:
                    x0, y0 = self._norm_to_canvas(start[0] / self.img_w, start[1] / self.img_h)
                    x1, y1 = self._norm_to_canvas(snapped[0] / self.img_w, snapped[1] / self.img_h)
                    self.canvas.create_line(x0, y0, x1, y1, fill="#d0d0d0", width=2, dash=(6, 3))
                    if draft.get("shift_lock"):
                        rx, ry = self._norm_to_canvas(raw[0] / self.img_w, raw[1] / self.img_h)
                        self.canvas.create_line(x1, y1, rx, ry, fill="#bbbbbb", width=1, dash=(2, 2))
                    cx, cy = self._norm_to_canvas(snapped[0] / self.img_w, snapped[1] / self.img_h)
                    self.canvas.create_oval(
                        cx - 5,
                        cy - 5,
                        cx + 5,
                        cy + 5,
                        fill="#d0d0d0",
                        outline="#ececec",
                        width=1,
                    )
                    if label is not None:
                        self.canvas.create_text(
                            cx + 8,
                            cy - 8,
                            text=label,
                            anchor="sw",
                            fill="#d0d0d0",
                            font=("Segoe UI", 8),
                        )

    def _flush_redraw(self):
        self._redraw_after_id = None
        if hasattr(self, "canvas") and self.canvas.winfo_exists():
            self._render_canvas()

    def _redraw(self, immediate: bool = False):
        if immediate:
            if self._redraw_after_id is not None:
                self.root.after_cancel(self._redraw_after_id)
                self._redraw_after_id = None
            self._flush_redraw()
            return
        if self._redraw_after_id is not None:
            return
        self._redraw_after_id = self.root.after_idle(self._flush_redraw)

    def _render_canvas(self):
        self.canvas.delete("all")
        cw = self.canvas.winfo_width() or 1
        ch = self.canvas.winfo_height() or 1
        selection_boost = self._selection_boost()
        vector_mode = self._vector_mode_active()
        editor_mode = self._editor_mode_active()
        visible_bounds = self._visible_norm_bounds(margin_px=64.0)
        show_labels = not (editor_mode or self._interactive_render)

        self._draw_visible_image(cw, ch, dimmed=editor_mode)

        active_grid = self._normalize_grid_label(self.grid_var.get()) or self.focused_grid
        if active_grid:
            bounds = self._grid_bounds_px(active_grid)
            if bounds is not None:
                left, top, right, bottom = bounds
                x0, y0 = self._norm_to_canvas(left / self.img_w, top / self.img_h)
                x1, y1 = self._norm_to_canvas(right / self.img_w, bottom / self.img_h)
                self.canvas.create_rectangle(
                    x0,
                    y0,
                    x1,
                    y1,
                    outline=VECTOR_DIM if editor_mode else GRID_REVIEW_RING,
                    width=2,
                    dash=(6, 4),
                )
                if show_labels:
                    self.canvas.create_text(
                        x0 + 6,
                        y0 + 6,
                        anchor="nw",
                        text=active_grid,
                        fill=VECTOR_DIM if editor_mode else GRID_REVIEW_RING,
                        font=("Consolas", max(8, int(10 * self.scale))),
                    )

        for planet in PLANETS:
            if planet["name"] in self.calibrated:
                continue
            if not self._norm_point_visible(planet["x"], planet["y"], visible_bounds):
                continue
            cx, cy = self._norm_to_canvas(planet["x"], planet["y"])
            is_active_seed = planet["name"] == self.active_name
            r = max(2, PIN_R * self.scale * 0.55)
            if is_active_seed:
                r += selection_boost
            self.canvas.create_oval(
                cx - r,
                cy - r,
                cx + r,
                cy + r,
                fill=VECTOR_DIM if editor_mode else "#8eb8df" if is_active_seed else PIN_BG,
                outline=VECTOR_DIM if editor_mode else ACTIVE_RING if is_active_seed else "#55657a",
                width=2 if is_active_seed else 1,
            )
            if is_active_seed or (show_labels and self.scale > 0.62):
                self.canvas.create_text(
                    cx + r + 4,
                    cy,
                    text=planet["name"],
                    anchor="w",
                    fill=VECTOR_DIM if editor_mode else TEXT_COLOR if is_active_seed else MUTED_COLOR,
                    font=("Segoe UI", max(7, int(8 * self.scale))),
                )

        for name, data in self.calibrated.items():
            if not self._norm_point_visible(float(data["x"]), float(data["y"]), visible_bounds):
                continue
            cx, cy = self._norm_to_canvas(data["x"], data["y"])
            is_active = name == self.active_name
            r = max(3, PIN_R * self.scale * 0.8)
            if is_active:
                r += selection_boost
            fill = VECTOR_DIM if editor_mode else PIN_ACTIVE if is_active else PIN_KNOWN
            outline = VECTOR_DIM if editor_mode else ACTIVE_RING if is_active else "#f4e1a5"
            width = 2 if is_active else 1
            self.canvas.create_oval(
                cx - r,
                cy - r,
                cx + r,
                cy + r,
                fill=fill,
                outline=outline,
                width=width,
            )
            if is_active or (show_labels and self.scale > 0.45):
                self.canvas.create_text(
                    cx + r + 4,
                    cy,
                    text=name,
                    anchor="w",
                    fill=VECTOR_DIM if editor_mode else TEXT_COLOR,
                    font=("Segoe UI", max(7, int(9 * self.scale))),
                )

        for name, data in self.grid_markers.items():
            if not self._norm_point_visible(float(data["x"]), float(data["y"]), visible_bounds):
                continue
            cx, cy = self._norm_to_canvas(data["x"], data["y"])
            r = max(3, PIN_R * self.scale * 0.8)
            self.canvas.create_rectangle(
                cx - r,
                cy - r,
                cx + r,
                cy + r,
                fill=VECTOR_DIM if editor_mode else PIN_GRID,
                outline=VECTOR_DIM if editor_mode else PIN_GRID_OUTLINE,
                width=1,
            )
            if show_labels and self.scale > 0.5:
                self.canvas.create_text(
                    cx + r + 4,
                    cy,
                    text=name,
                    anchor="w",
                    fill=VECTOR_DIM if editor_mode else PIN_GRID_OUTLINE,
                    font=("Segoe UI", max(7, int(8 * self.scale))),
                )

        self._draw_grid_guides()
        self._draw_vector_paths()
        if self._hyperspace_tool_active():
            self._draw_hyperspace_selection()

        if self.last_snap:
            cx, cy = self._norm_to_canvas(*self.last_snap)
            self.canvas.create_oval(
                cx - 8,
                cy - 8,
                cx + 8,
                cy + 8,
                outline=VECTOR_CURVE_ACTIVE if vector_mode else SNAP_RING,
                width=1.5,
            )

        self.canvas.create_text(
            10,
            ch - 10,
            anchor="sw",
            text=(
                f"{len(self.calibrated)} Planeten | "
                f"{len(self.grid_markers)} Grid | "
                f"{len(self.vector_paths)} Kurven | "
                f"{len(self.grid_guides)} Guides | "
                f"{len(self.known_names)} bekannt"
            ),
            fill=ACCENT_ALT if vector_mode else MUTED_COLOR,
            font=("Segoe UI", 9),
        )
        self._update_counter()

    def _filtered_pending_names(self) -> list[str]:
        filter_text = self.filter_var.get().strip().lower()
        pending = [name for name in self.known_names if name not in self.calibrated]
        if filter_text:
            pending = [name for name in pending if filter_text in name.lower()]
        return pending

    def _refresh_pending_list(self):
        names = self._filtered_pending_names()
        current_selection = self.active_name
        self.pending_list.delete(0, "end")
        for name in names:
            self.pending_list.insert("end", name)
        if current_selection in names:
            index = names.index(current_selection)
            self.pending_list.selection_set(index)
            self.pending_list.see(index)
        self._update_counter()
        self._export_remaining()

    def _update_counter(self):
        pending = len([name for name in self.known_names if name not in self.calibrated])
        total = len(self.known_names)
        filtered = len(self._filtered_pending_names())
        self.counter_var.set(
            f"{len(self.calibrated)} gesetzt | {len(self.grid_markers)} Grid | {len(self.vector_paths)} Kurven | {len(self.grid_guides)} Guides | "
            f"{pending} offen | Filter zeigt {filtered}/{total}"
        )

    def _on_pending_select(self, _event=None):
        if self._vector_mode_active():
            return
        sel = self.pending_list.curselection()
        if not sel:
            return
        name = self.pending_list.get(sel[0])
        self._set_active_name(name, source="pending", zoom_to=True)

    def _activate_first_visible(self):
        if not self._require_calibration_mode():
            return
        names = self._filtered_pending_names()
        if names:
            self._set_active_name(names[0], source="pending", zoom_to=True)

    def _set_active_name(
        self,
        name: str | None,
        source: str,
        preserve_status: bool = False,
        zoom_to: bool = False,
    ):
        self.active_name = name
        if not name:
            self.current_var.set("Kein Planet aktiv")
            self.pending_list.selection_clear(0, "end")
            self._redraw()
            return

        label = name
        meta = self._meta_for_name(name)
        if self._normalize_grid_label(meta.get("grid")):
            self.grid_var.set(self._normalize_grid_label(meta.get("grid")))
        if source == "pending":
            label = f"Naechster Planet: {name}"
        elif source == "existing":
            label = f"Aktiver Pin: {name}"
        elif source == "manual":
            label = f"Manueller Name: {name}"
        self.current_var.set(label)

        visible = self._filtered_pending_names()
        self.pending_list.selection_clear(0, "end")
        if name in visible:
            index = visible.index(name)
            self.pending_list.selection_set(index)
            self.pending_list.see(index)

        if not preserve_status:
            if source == "pending":
                self.status_var.set(f'"{name}" aktiv. Klick auf Karte setzt den Pin, Ziehen am Pin verschiebt, Klick auf Pin benennt um.')
            elif source == "manual":
                self.status_var.set(f'"{name}" aktiv. Klick auf Karte setzt den manuellen Pin.')
            else:
                self.status_var.set(f'"{name}" aktiv. Pin ziehen = verschieben, Pin anklicken = umbenennen, Rechtsklick = loeschen.')
        if zoom_to:
            self._focus_on_name(name)
        else:
            self._redraw()

    def _clear_active_name(self, update_status: bool = True):
        if not self._require_calibration_mode():
            return
        self.active_name = None
        self.current_var.set("Kein Planet aktiv")
        self.pending_list.selection_clear(0, "end")
        if update_status:
            self.status_var.set("Aktiver Planet geloescht. Links einen neuen waehlen.")
        self._redraw()

    def _activate_manual_name(self):
        if not self._require_calibration_mode():
            return
        name = simpledialog.askstring(
            "Planet",
            "Planetenname eingeben:",
            parent=self.root,
        )
        if not name:
            return
        name = name.strip()
        if not name:
            return
        self._set_active_name(name, source="manual")

    def _select_relative_pending(self, delta: int):
        if not self._require_calibration_mode():
            return
        names = self._filtered_pending_names()
        if not names:
            self.status_var.set("Keine offenen Planeten im aktuellen Filter.")
            return
        if self.active_name not in names:
            index = 0 if delta >= 0 else len(names) - 1
        else:
            index = names.index(self.active_name)
            index = max(0, min(len(names) - 1, index + delta))
        self._set_active_name(names[index], source="pending", zoom_to=True)

    def _nudge_active(self, dx_px: int, dy_px: int):
        if not self._require_calibration_mode():
            return
        if not self.active_name or self.active_name not in self.calibrated:
            return
        old = dict(self.calibrated[self.active_name])
        step_x = dx_px / self.img_w
        step_y = dy_px / self.img_h
        self.calibrated[self.active_name]["x"] = round(
            min(1.0, max(0.0, old["x"] + step_x)),
            4,
        )
        self.calibrated[self.active_name]["y"] = round(
            min(1.0, max(0.0, old["y"] + step_y)),
            4,
        )
        self.history.append(("set", "calibrated", self.active_name, old))
        self.last_snap = (
            self.calibrated[self.active_name]["x"],
            self.calibrated[self.active_name]["y"],
        )
        feedback = self._record_learning_feedback(
            self.active_name,
            self.calibrated[self.active_name]["x"],
            self.calibrated[self.active_name]["y"],
            source="nudge",
        )
        learning_note = (
            f" Lernsignal gespeichert ({len(self.snap_learning_samples)})."
            if feedback is not None
            else ""
        )
        self.status_var.set(f'"{self.active_name}" fein verschoben.{learning_note}')
        self._redraw()

    def _delete_active(self):
        if not self._require_calibration_mode():
            return
        if not self.active_name or self.active_name not in self.calibrated:
            return
        name = self.active_name
        old = dict(self.calibrated[name])
        self.history.append(("delete", "calibrated", name, old))
        del self.calibrated[name]
        self._refresh_pending_list()
        self.status_var.set(f'"{name}" geloescht.')
        self._set_active_name(name, source="pending" if name in self.known_names else "manual")

    def _undo(self):
        if self._vector_mode_active():
            if not self.vector_history:
                self.status_var.set("Keine Kurvenaktion zum Rueckgaengigmachen.")
                return
            snapshot = self.vector_history.pop()
            self._restore_vector_snapshot(snapshot)
            self._redraw()
            return
        if not self.history:
            self.status_var.set("Nichts zum Rueckgaengigmachen.")
            return
        action, kind, name, previous = self.history.pop()
        store = self._marker_store(kind)
        if action == "set":
            if previous is None:
                store.pop(name, None)
            else:
                store[name] = previous
        elif action == "delete" and previous is not None:
            store[name] = previous

        self._refresh_pending_list()
        if kind == "grid":
            if name in self.grid_markers:
                self.current_var.set(f"Grid-Marker: {name}")
            self.status_var.set(f'Letzte Aktion fuer Grid-Marker "{name}" rueckgaengig gemacht.')
            self._redraw()
            return
        if name in self.calibrated:
            self._set_active_name(name, source="existing", preserve_status=True)
        else:
            self._set_active_name(name, source="pending" if name in self.known_names else "manual", preserve_status=True)
        self.status_var.set(f'Letzte Aktion fuer "{name}" rueckgaengig gemacht.')
        self._redraw()

    def _save(self):
        with open(self.calibrated_path, "w", encoding="utf-8") as handle:
            json.dump(self.calibrated, handle, ensure_ascii=False, indent=2)
        with open(self.grid_markers_path, "w", encoding="utf-8") as handle:
            json.dump(self.grid_markers, handle, ensure_ascii=False, indent=2)
        regular_paths = [path for path in self.vector_paths if not self._is_hyperspace_route_path(path)]
        self.vector_paths_path.write_text(
            json.dumps({"paths": regular_paths}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        saved_route_vectors, route_warnings = self._save_hyperspace_routes()
        self.grid_guides_path.write_text(
            json.dumps({"guides": self.grid_guides}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self._save_snap_learning()
        self._export_py()
        self._export_remaining()
        hyper_summary = self.hyperspace_network.get("summary", {}) if isinstance(self.hyperspace_network, dict) else {}
        messagebox.showinfo(
            "Gespeichert",
            (
                f"{len(self.calibrated)} Planeten, {len(self.grid_markers)} Grid-Marker, {len(self.vector_paths)} Kurven und {len(self.grid_guides)} Grid-Guides gespeichert.\n"
                f"Hyperrouten-Vektoren aktualisiert: {saved_route_vectors}\n"
                f"Hypernetz: {int(hyper_summary.get('transfer_nodes', 0))} Transferknoten, {int(hyper_summary.get('edges', 0))} Kanten\n"
                f"Lernbeispiele: {len(self.snap_learning_samples)}\n"
                f"{self.calibrated_path}\n{self.grid_markers_path}\n{self.vector_paths_path}\n{self.hyperspace_routes_path}\n{self.grid_guides_path}"
                + (
                    "\nWarnungen:\n" + "\n".join(route_warnings[:4])
                    if route_warnings
                    else ""
                )
            ),
        )

    def _serialize_vector_path(self, path: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(path.get("id") or ""),
            "layer_id": str(path.get("layer_id") or path.get("id") or ""),
            "name": str(path.get("name") or "Pfad"),
            "closed": bool(path.get("closed")),
            "draft": False,
            "opacity_pct": int(path.get("opacity_pct", 100)),
            "fill_tone": str(path.get("fill_tone", "")),
            "points": deepcopy(path.get("points", [])),
        }

    def _save_hyperspace_routes(self) -> tuple[int, list[str]]:
        if not self.hyperspace_routes:
            self.hyperspace_network = {}
            return 0, []
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for path in self.vector_paths:
            if not self._is_hyperspace_route_path(path):
                continue
            route_id = str(path.get("route_id") or path.get("id") or "").strip()
            if route_id:
                grouped[route_id].append(path)
        routes_payload = deepcopy(self.hyperspace_routes)
        saved = 0
        warnings: list[str] = []
        selected_paths: dict[str, dict[str, Any]] = {}
        for route in routes_payload:
            route_id = str(route.get("id") or "").strip()
            candidates = grouped.get(route_id, [])
            if not candidates:
                route["connections"] = []
                route["network_summary"] = {
                    "route_id": route_id,
                    "layer_id": str(route.get("layer_id") or route_id),
                    "name": str(route.get("name") or route_id),
                    "route_length": 0.0,
                    "node_ids": [],
                    "transfer_node_ids": [],
                    "connected_route_ids": [],
                    "transfer_count": 0,
                }
                continue
            candidates = sorted(
                candidates,
                key=lambda item: (
                    len(item.get("points", [])),
                    self._vector_segment_count(item),
                ),
                reverse=True,
            )
            selected = candidates[0]
            route["name"] = str(selected.get("name") or route.get("name") or route_id)
            route["layer_id"] = str(selected.get("layer_id") or route.get("layer_id") or route_id)
            route["opacity_pct"] = int(selected.get("opacity_pct", route.get("opacity_pct", 96)))
            if selected.get("stroke_tone"):
                route["stroke_tone"] = str(selected.get("stroke_tone"))
            route["vector_path"] = self._serialize_vector_path(selected)
            selected_paths[route_id] = selected
            saved += 1
            if len(candidates) > 1:
                warnings.append(
                    f'{route.get("name", route_id)}: {len(candidates)} Teilpfade vorhanden, gespeichert wurde der groesste.'
                )
        network_payload = self._build_hyperspace_route_network(routes_payload, selected_paths)
        self.hyperspace_routes_path.write_text(
            json.dumps({"routes": routes_payload, "network": network_payload}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self.hyperspace_routes = routes_payload
        self.hyperspace_network = network_payload
        return saved, warnings

    def _export_py(self):
        out = Path(__file__).parent / "calibrated_update.py"
        lines = [
            "# Kalibrierte Koordinaten - in planets.py uebernehmen\n",
            "CALIBRATED = {\n",
        ]
        for name, data in sorted(self.calibrated.items()):
            lines.append(
                f'    "{name}": {{"x": {data["x"]}, "y": {data["y"]}}},\n'
            )
        lines.append("}\n")
        out.write_text("".join(lines), encoding="utf-8")

    def _dedupe_loaded_calibrated(self):
        cleaned: dict[str, dict] = {}
        seen: set[str] = set()
        for name, data in self.calibrated.items():
            key = self._normalize_name_key(name)
            if key in seen:
                continue
            seen.add(key)
            cleaned[name] = data
        self.calibrated = cleaned

    def _dedupe_loaded_grid_markers(self):
        cleaned: dict[str, dict] = {}
        seen: set[str] = set()
        for name, data in self.grid_markers.items():
            key = self._normalize_name_key(name)
            if key in seen:
                continue
            seen.add(key)
            cleaned[name] = data
        self.grid_markers = cleaned

    def _migrate_grid_markers_from_calibrated(self):
        migrated: dict[str, dict] = {}
        remaining: dict[str, dict] = {}
        for name, data in self.calibrated.items():
            if self._looks_like_grid_marker_name(name):
                migrated[name] = data
            else:
                remaining[name] = data
        self.calibrated = remaining
        for name, data in migrated.items():
            self.grid_markers.setdefault(name, data)

    def _load_existing(self):
        if self.calibrated_path.exists():
            with open(self.calibrated_path, encoding="utf-8") as handle:
                self.calibrated = json.load(handle)
            self._dedupe_loaded_calibrated()
        if self.grid_markers_path.exists():
            with open(self.grid_markers_path, encoding="utf-8") as handle:
                self.grid_markers = json.load(handle)
            self._dedupe_loaded_grid_markers()
        self._migrate_grid_markers_from_calibrated()
        self._dedupe_loaded_calibrated()
        self._dedupe_loaded_grid_markers()
        if self.vector_paths_path.exists():
            try:
                payload = json.loads(self.vector_paths_path.read_text(encoding="utf-8"))
                self.vector_paths = self._normalize_loaded_vector_paths(payload)
            except Exception:
                self.vector_paths = []
        if self.hyperspace_routes_path.exists():
            try:
                payload = json.loads(self.hyperspace_routes_path.read_text(encoding="utf-8"))
                self.hyperspace_network = (
                    payload.get("network", {})
                    if isinstance(payload, dict) and isinstance(payload.get("network"), dict)
                    else {}
                )
                source_routes = payload.get("routes", []) if isinstance(payload, dict) else payload
                if isinstance(source_routes, list):
                    self.hyperspace_routes = [
                        route for route in source_routes if isinstance(route, dict)
                    ]
                    for index, route in enumerate(self.hyperspace_routes):
                        path = self._build_hyperspace_route_vector_path(route, index)
                        if path is not None:
                            self.vector_paths.append(path)
            except Exception:
                self.hyperspace_routes = []
                self.hyperspace_network = {}
        if self.grid_guides_path.exists():
            try:
                payload = json.loads(self.grid_guides_path.read_text(encoding="utf-8"))
                self.grid_guides = self._normalize_loaded_grid_guides(payload)
            except Exception:
                self.grid_guides = []
        max_numeric_id = 0
        for path in self.vector_paths:
            match = re.fullmatch(r"rim-(\d+)", str(path.get("id", "")))
            if match:
                max_numeric_id = max(max_numeric_id, int(match.group(1)))
        self._vector_id_counter = max_numeric_id + 1 if max_numeric_id else len(self.vector_paths) + 1
        max_grid_guide = 0
        for guide in self.grid_guides:
            match = re.fullmatch(r"grid-guide-(\d+)", str(guide.get("id", "")))
            if match:
                max_grid_guide = max(max_grid_guide, int(match.group(1)))
        self._grid_guide_id_counter = max_grid_guide + 1 if max_grid_guide else len(self.grid_guides) + 1
        if self.snap_learning_path.exists():
            try:
                payload = json.loads(
                    self.snap_learning_path.read_text(encoding="utf-8")
                )
                samples = payload.get("samples", []) if isinstance(payload, dict) else payload
                if isinstance(samples, list):
                    self.snap_learning_samples = [
                        sample
                        for sample in samples
                        if isinstance(sample, dict)
                        and isinstance(sample.get("features"), dict)
                        and "delta_x_px" in sample
                        and "delta_y_px" in sample
                    ][:SNAP_LEARNING_MAX_SAMPLES]
            except Exception:
                self.snap_learning_samples = []
        self._set_vector_info()


def main():
    if len(sys.argv) < 2:
        image_path = Path(__file__).parent / "image.png"
        if not image_path.exists():
            print("Verwendung: python calibrate.py image.png")
            sys.exit(1)
    else:
        image_path = Path(sys.argv[1])

    if not image_path.exists():
        print(f"Datei nicht gefunden: {image_path}")
        sys.exit(1)

    root = tk.Tk()
    root.geometry("1440x900")
    app = CalibrateApp(root, str(image_path))
    root.mainloop()
    return app


if __name__ == "__main__":
    main()
