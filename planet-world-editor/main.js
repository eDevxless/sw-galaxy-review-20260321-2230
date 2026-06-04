"use strict";
// Azgaar (azgaar.fmg@yandex.com). Minsk, 2017-2023. MIT License
// https://github.com/Azgaar/Fantasy-Map-Generator

// set debug options
const PRODUCTION = location.hostname && location.hostname !== "localhost" && location.hostname !== "127.0.0.1";
const DEBUG = JSON.safeParse(localStorage.getItem("debug")) || {};
const INFO = true;
const TIME = true;
const WARN = true;
const ERROR = true;

// detect device
const MOBILE = window.innerWidth < 600 || navigator.userAgentData?.mobile;

if (PRODUCTION && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.error("ServiceWorker registration failed: ", err);
    });
  });

  window.addEventListener(
    "beforeinstallprompt",
    async event => {
      event.preventDefault();
      const Installation = await import("./modules/dynamic/installation.js?v=1.89.19");
      Installation.init(event);
    },
    {once: true}
  );
}

// append svg layers (in default order)
let svg = d3.select("#map");
let defs = svg.select("#deftemp");
let viewbox = svg.select("#viewbox");
let scaleBar = svg.select("#scaleBar");
let legend = svg.append("g").attr("id", "legend");
let ocean = viewbox.append("g").attr("id", "ocean");
let oceanLayers = ocean.append("g").attr("id", "oceanLayers");
let oceanPattern = ocean.append("g").attr("id", "oceanPattern");
let landmass = viewbox.append("g").attr("id", "landmass");
let texture = viewbox.append("g").attr("id", "texture");
let terrs = viewbox.append("g").attr("id", "terrs");
let lakes = viewbox.append("g").attr("id", "lakes");
let biomes = viewbox.append("g").attr("id", "biomes");
let cells = viewbox.append("g").attr("id", "cells");
let gridOverlay = viewbox.append("g").attr("id", "gridOverlay");
let coordinates = viewbox.append("g").attr("id", "coordinates");
let compass = viewbox.append("g").attr("id", "compass").style("display", "none");
let rivers = viewbox.append("g").attr("id", "rivers");
let terrain = viewbox.append("g").attr("id", "terrain");
let relig = viewbox.append("g").attr("id", "relig");
let cults = viewbox.append("g").attr("id", "cults");
let regions = viewbox.append("g").attr("id", "regions");
let statesBody = regions.append("g").attr("id", "statesBody");
let statesHalo = regions.append("g").attr("id", "statesHalo");
let provs = viewbox.append("g").attr("id", "provs");
let zones = viewbox.append("g").attr("id", "zones");
let borders = viewbox.append("g").attr("id", "borders");
let stateBorders = borders.append("g").attr("id", "stateBorders");
let provinceBorders = borders.append("g").attr("id", "provinceBorders");
let routes = viewbox.append("g").attr("id", "routes");
let roads = routes.append("g").attr("id", "roads");
let trails = routes.append("g").attr("id", "trails");
let searoutes = routes.append("g").attr("id", "searoutes");
let temperature = viewbox.append("g").attr("id", "temperature");
let coastline = viewbox.append("g").attr("id", "coastline");
let ice = viewbox.append("g").attr("id", "ice");
let prec = viewbox.append("g").attr("id", "prec").style("display", "none");
let population = viewbox.append("g").attr("id", "population");
let emblems = viewbox.append("g").attr("id", "emblems").style("display", "none");
let icons = viewbox.append("g").attr("id", "icons");
let labels = viewbox.append("g").attr("id", "labels");
let burgIcons = icons.append("g").attr("id", "burgIcons");
let anchors = icons.append("g").attr("id", "anchors");
let armies = viewbox.append("g").attr("id", "armies");
let markers = viewbox.append("g").attr("id", "markers");
let fogging = viewbox
  .append("g")
  .attr("id", "fogging-cont")
  .attr("mask", "url(#fog)")
  .append("g")
  .attr("id", "fogging")
  .style("display", "none");
let ruler = viewbox.append("g").attr("id", "ruler").style("display", "none");
var debug = viewbox.append("g").attr("id", "debug");

lakes.append("g").attr("id", "freshwater");
lakes.append("g").attr("id", "salt");
lakes.append("g").attr("id", "sinkhole");
lakes.append("g").attr("id", "frozen");
lakes.append("g").attr("id", "lava");
lakes.append("g").attr("id", "dry");

coastline.append("g").attr("id", "sea_island");
coastline.append("g").attr("id", "lake_island");

terrs.append("g").attr("id", "oceanHeights");
terrs.append("g").attr("id", "landHeights");

labels.append("g").attr("id", "states");
labels.append("g").attr("id", "addedLabels");
let burgLabels = labels.append("g").attr("id", "burgLabels");

// population groups
population.append("g").attr("id", "rural");
population.append("g").attr("id", "urban");

// emblem groups
emblems.append("g").attr("id", "burgEmblems");
emblems.append("g").attr("id", "provinceEmblems");
emblems.append("g").attr("id", "stateEmblems");

// compass
compass.append("use").attr("xlink:href", "#defs-compass-rose");

// fogging
fogging.append("rect").attr("x", 0).attr("y", 0).attr("width", "100%").attr("height", "100%");
fogging
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("fill", "#e8f0f6")
  .attr("filter", "url(#splotch)");

// assign events separately as not a viewbox child
scaleBar.on("mousemove", () => tip("Click to open Units Editor")).on("click", () => editUnits());
legend
  .on("mousemove", () => tip("Drag to change the position. Click to hide the legend"))
  .on("click", () => clearLegend());

// main data variables
var grid = {}; // initial graph based on jittered square grid and data
var pack = {}; // packed graph and data
var seed;
let mapId;
let mapHistory = [];
let elSelected;
let modules = {};
let notes = [];
let rulers = new Rulers();
let customization = 0;

// global options; in v2.0 to be used for all UI settings
let options = {
  pinNotes: false,
  winds: [225, 45, 225, 315, 135, 315],
  temperatureEquator: 27,
  temperatureNorthPole: -30,
  temperatureSouthPole: -15,
  stateLabelsMode: "auto",
  showBurgPreview: true,
  burgs: {
    groups: JSON.safeParse(localStorage.getItem("burg-groups")) || Burgs.getDefaultGroups()
  }
};

// global style object; in v2.0 to be used for all map styles and render settings
let style = {burgLabels: {}, burgIcons: {}, anchors: {}};

let biomesData = Biomes.getDefault();
let nameBases = Names.getNameBases(); // cultures-related data
let color = d3.scaleSequential(d3.interpolateSpectral); // default color scheme
const lineGen = d3.line().curve(d3.curveBasis); // d3 line generator with default curve interpolation

// d3 zoom behavior
let scale = 1;
let viewX = 0;
let viewY = 0;

let rafId = null;
let pendingScaleChange = false;
let pendingPositionChange = false;
function zoomRaf() {
  const {k, x, y} = d3.event.transform;

  const isScaleChanged = Boolean(scale - k);
  const isPositionChanged = Boolean(viewX - x || viewY - y);
  if (!isScaleChanged && !isPositionChanged) return;

  scale = k;
  viewX = x;
  viewY = y;

  // Coalesce multiple zoom events into one paint.
  // While a RAF is pending, keep updating latest transform state and OR-change flags.
  // The scheduled RAF consumes these accumulated flags and then resets them.
  pendingScaleChange = pendingScaleChange || isScaleChanged;
  pendingPositionChange = pendingPositionChange || isPositionChanged;

  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;

    // Safely clears these flags for future renders
    const didScaleChange = pendingScaleChange;
    const didPositionChange = pendingPositionChange;
    pendingScaleChange = false;
    pendingPositionChange = false;

    // Uses global values, so each frame always draws using the latest positioning values
    viewbox.attr("transform", `translate(${viewX} ${viewY}) scale(${scale})`);

    if (didPositionChange) {
      if (layerIsOn("toggleCoordinates")) drawCoordinates();
    }

    if (customization === 1) {
      const canvas = ensureEl("canvas");
      if (canvas && canvas.style.opacity !== "0") {
        const img = ensureEl("imageToConvert");
        if (img) {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(scale, 0, 0, scale, viewX, viewY);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    }

    if (didScaleChange) {
      invokeActiveZooming();
      drawScaleBar(scaleBar, scale);
      fitScaleBar(scaleBar, svgWidth, svgHeight);
    }

    if (didPositionChange || didScaleChange) {
      window.updateMinimap && updateMinimap();
    }
  });
}

const zoom = d3.zoom().scaleExtent([1, 20]).on("zoom", zoomRaf);

var mapCoordinates = {}; // map coordinates on globe
let populationRate = +ensureEl("populationRateInput").value;
let distanceScale = +ensureEl("distanceScaleInput").value;
let urbanization = +ensureEl("urbanizationInput").value;
let urbanDensity = +ensureEl("urbanDensityInput").value;

applyStoredOptions();

// voronoi graph extension, cannot be changed after generation
var graphWidth = +mapWidthInput.value;
var graphHeight = +mapHeightInput.value;

// svg canvas resolution, can be changed
let svgWidth = graphWidth;
let svgHeight = graphHeight;

landmass.append("rect").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanPattern
  .append("rect")
  .attr("fill", "url(#oceanic)")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", graphWidth)
  .attr("height", graphHeight);
oceanLayers
  .append("rect")
  .attr("id", "oceanBase")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", graphWidth)
  .attr("height", graphHeight);

document.addEventListener("DOMContentLoaded", async () => {
  if (!location.hostname) {
    const wiki = "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Run-FMG-locally";
    alertMessage.innerHTML = /* html */ `Fantasy Map Generator cannot run serverless. Follow the <a href="${wiki}" target="_blank">instructions</a> on how you can easily run a local web-server`;

    $("#alert").dialog({
      resizable: false,
      title: "Loading error",
      width: "28em",
      position: {my: "center center-4em", at: "center", of: "svg"},
      buttons: {
        OK: function () {
          $(this).dialog("close");
        }
      }
    });
  } else {
    hideLoading();
    await checkLoadParameters();
  }
  restoreDefaultEvents(); // apply default viewbox events
  initiateAutosave();
  initTourPromptButton();
});

function hideLoading() {
  d3.select("#loading").transition().duration(3000).style("opacity", 0);
  d3.select("#optionsContainer").transition().duration(2000).style("opacity", 1);
  d3.select("#tooltip").transition().duration(3000).style("opacity", 1);
}

function showLoading() {
  d3.select("#loading").transition().duration(200).style("opacity", 1);
  d3.select("#optionsContainer").transition().duration(100).style("opacity", 0);
  d3.select("#tooltip").transition().duration(200).style("opacity", 0);
}

// decide which map should be loaded or generated on page load
async function checkLoadParameters() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  // of there is a valid maplink, try to load .map/.gz file from URL
  if (params.get("maplink")) {
    WARN && console.warn("Load map from URL");
    const maplink = params.get("maplink");
    const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    const valid = pattern.test(maplink);
    if (valid) {
      setTimeout(() => {
        loadMapFromURL(maplink, 1);
      }, 1000);
      return;
    } else showUploadErrorMessage("Map link is not a valid URL", maplink);
  }

  // if there is a seed (user of MFCG provided), generate map for it
  if (params.get("seed")) {
    WARN && console.warn("Generate map for seed");
    await generateMapOnLoad();
    return;
  }

  // check if there is a map saved to indexedDB
  if (ensureEl("onloadBehavior").value === "lastSaved") {
    try {
      const blob = await ldb.get("lastMap");
      if (blob) {
        WARN && console.warn("Loading last stored map");
        uploadMap(blob);
        return;
      }
    } catch (error) {
      ERROR && console.error(error);
    }
  }

  // else generate random map
  WARN && console.warn("Generate random map");
  generateMapOnLoad();
}

async function generateMapOnLoad() {
  await applyStyleOnLoad(); // apply previously selected default or custom style
  await generate(); // generate map
  applyLayersPreset(); // apply saved layers preset and reder layers
  drawLayers();
  fitMapToScreen();
  focusOn(); // based on searchParams focus on point, cell or burg from MFCG
  toggleAssistant();
}

// focus on coordinates, cell or burg provided in searchParams
function focusOn() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  const fromMGCG = params.get("from") === "MFCG" && document.referrer;
  if (fromMGCG) {
    if (params.get("seed").length === 13) {
      // show back burg from MFCG
      const burgSeed = params.get("seed").slice(-4);
      params.set("burg", burgSeed);
    } else {
      // select burg for MFCG
      findBurgForMFCG(params);
      return;
    }
  }

  const scaleParam = params.get("scale");
  const cellParam = params.get("cell");
  const burgParam = params.get("burg");

  if (scaleParam || cellParam || burgParam) {
    const scale = +scaleParam || 8;

    if (cellParam) {
      const cell = +params.get("cell");
      const [x, y] = pack.cells.p[cell];
      zoomTo(x, y, scale, 1600);
      return;
    }

    if (burgParam) {
      const burg = isNaN(+burgParam) ? pack.burgs.find(burg => burg.name === burgParam) : pack.burgs[+burgParam];
      if (!burg) return;

      const {x, y} = burg;
      zoomTo(x, y, scale, 1600);
      return;
    }

    const x = +params.get("x") || graphWidth / 2;
    const y = +params.get("y") || graphHeight / 2;
    zoomTo(x, y, scale, 1600);
  }
}

let isAssistantLoaded = false;
function toggleAssistant() {
  const showAssistant = document.getElementById("azgaarAssistant")?.value === "show";
  if (showAssistant) {
    if (isAssistantLoaded) {
      const assistantContainer = document.getElementById("chat-widget-container");
      if (assistantContainer) assistantContainer.style.display = "block";
    } else {
      import("./libs/openwidget.min.js").then(() => {
        isAssistantLoaded = true;
        setTimeout(() => {
          const bubble = document.getElementById("chat-widget-minimized");
          if (bubble) {
            bubble.dataset.tip = "Click to open the Assistant";
            bubble.on("mouseover", showDataTip);
          }
        }, 5000);
      });
    }
  } else if (isAssistantLoaded) {
    const assistantContainer = document.getElementById("chat-widget-container");
    if (assistantContainer) assistantContainer.style.display = "none";
  }
}

function initTourPromptButton() {
  const MAX_SHOWS = 3;
  const STORAGE_KEY = "fmg-tour-prompt-count";
  const btn = document.getElementById("tourPromptButton");
  if (!btn) return;

  const count = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  if (count >= MAX_SHOWS) return;

  localStorage.setItem(STORAGE_KEY, count + 1);
  btn.style.display = "flex";
  btn.addEventListener("click", () => {
    UITour.start();
  });
}

// find burg for MFCG and focus on it
function findBurgForMFCG(params) {
  const cells = pack.cells,
    burgs = pack.burgs;
  if (pack.burgs.length < 2) {
    ERROR && console.error("Cannot select a burg for MFCG");
    return;
  }

  // used for selection
  const size = +params.get("size");
  const coast = +params.get("coast");
  const port = +params.get("port");
  const river = +params.get("river");

  let selection = defineSelection(coast, port, river);
  if (!selection.length) selection = defineSelection(coast, !port, !river);
  if (!selection.length) selection = defineSelection(!coast, 0, !river);
  if (!selection.length) selection = [burgs[1]]; // select first if nothing is found

  function defineSelection(coast, port, river) {
    if (port && river) return burgs.filter(b => b.port && cells.r[b.cell]);
    if (!port && coast && river) return burgs.filter(b => !b.port && cells.t[b.cell] === 1 && cells.r[b.cell]);
    if (!coast && !river) return burgs.filter(b => cells.t[b.cell] !== 1 && !cells.r[b.cell]);
    if (!coast && river) return burgs.filter(b => cells.t[b.cell] !== 1 && cells.r[b.cell]);
    if (coast && river) return burgs.filter(b => cells.t[b.cell] === 1 && cells.r[b.cell]);
    return [];
  }

  // select a burg with closest population from selection
  const selected = d3.scan(selection, (a, b) => Math.abs(a.population - size) - Math.abs(b.population - size));
  const burgId = selection[selected].i;
  if (!burgId) {
    ERROR && console.error("Cannot select a burg for MFCG");
    return;
  }

  const b = burgs[burgId];
  const referrer = new URL(document.referrer);
  for (let p of referrer.searchParams) {
    if (p[0] === "name") b.name = p[1];
    else if (p[0] === "size") b.population = +p[1];
    else if (p[0] === "seed") b.MFCG = +p[1];
    else if (p[0] === "shantytown") b.shanty = +p[1];
    else b[p[0]] = +p[1]; // other parameters
  }
  if (params.get("name") && params.get("name") != "null") b.name = params.get("name");

  const label = burgLabels.select("[data-id='" + burgId + "']");
  if (label.size()) {
    label
      .text(b.name)
      .classed("drag", true)
      .on("mouseover", function () {
        d3.select(this).classed("drag", false);
        label.on("mouseover", null);
      });
  }

  zoomTo(b.x, b.y, 8, 1600);
  invokeActiveZooming();
  tip("Here stands the glorious city of " + b.name, true, "success", 15000);
}

// Zoom to a specific point
function zoomTo(x, y, z = 8, d = 2000) {
  const transform = d3.zoomIdentity.translate(x * -z + svgWidth / 2, y * -z + svgHeight / 2).scale(z);
  svg.transition().duration(d).call(zoom.transform, transform);
}

// Reset zoom to initial
function resetZoom(d = 1000) {
  svg.transition().duration(d).call(zoom.transform, d3.zoomIdentity);
}

// active zooming feature
function invokeActiveZooming() {
  const isOptimized = shapeRendering.value === "optimizeSpeed";

  if (coastline.select("#sea_island").size() && +coastline.select("#sea_island").attr("auto-filter")) {
    // toggle shade/blur filter for coatline on zoom
    const filter = scale > 1.5 && scale <= 2.6 ? null : scale > 2.6 ? "url(#blurFilter)" : "url(#dropShadow)";
    coastline.select("#sea_island").attr("filter", filter);
  }

  // rescale labels on zoom
  if (labels.style("display") !== "none") {
    labels.selectAll("g").each(function () {
      if (this.id === "burgLabels") return;
      const desired = +this.dataset.size;
      const relative = Math.max(rn((desired + desired / scale) / 2, 2), 1);
      if (rescaleLabels.checked) this.setAttribute("font-size", relative);

      const hidden = hideLabels.checked && (relative * scale < 6 || relative * scale > 60);
      if (hidden) this.classList.add("hidden");
      else this.classList.remove("hidden");
    });
  }

  // rescale emblems on zoom
  if (emblems.style("display") !== "none") {
    emblems.selectAll("g").each(function () {
      const size = this.getAttribute("font-size") * scale;
      const hidden = hideEmblems.checked && (size < 25 || size > 300);
      if (hidden) this.classList.add("hidden");
      else this.classList.remove("hidden");
      if (!hidden && window.COArenderer && this.children.length && !this.children[0].getAttribute("href"))
        renderGroupCOAs(this);
    });
  }

  // change states halo width
  if (!customization && !isOptimized) {
    const desired = +statesHalo.attr("data-width");
    const haloSize = rn(desired / scale ** 0.8, 2);
    statesHalo.attr("stroke-width", haloSize).style("display", haloSize > 0.1 ? "block" : "none");
  }

  // rescale map markers
  +markers.attr("rescale") &&
    pack.markers?.forEach(marker => {
      const {i, x, y, size = 30, hidden} = marker;
      const el = !hidden && document.getElementById(`marker${i}`);
      if (!el) return;

      const zoomedSize = Math.max(rn(size / 5 + 24 / scale, 2), 1);
      el.setAttribute("width", zoomedSize);
      el.setAttribute("height", zoomedSize);
      el.setAttribute("x", rn(x - zoomedSize / 2, 1));
      el.setAttribute("y", rn(y - zoomedSize, 1));
    });

  // rescale rulers to have always the same size
  if (ruler.style("display") !== "none") {
    const size = rn((10 / scale ** 0.3) * 2, 2);
    ruler.selectAll("text").attr("font-size", size);
  }
}

// add drag to upload logic, pull request from @evyatron
void (function addDragToUpload() {
  document.addEventListener("dragover", function (e) {
    e.stopPropagation();
    e.preventDefault();
    ensureEl("mapOverlay").style.display = null;
  });

  document.addEventListener("dragleave", function (e) {
    ensureEl("mapOverlay").style.display = "none";
  });

  document.addEventListener("drop", function (e) {
    e.stopPropagation();
    e.preventDefault();

    const overlay = ensureEl("mapOverlay");
    overlay.style.display = "none";
    if (e.dataTransfer.items == null || e.dataTransfer.items.length !== 1) return; // no files or more than one
    const file = e.dataTransfer.items[0].getAsFile();

    if (!file.name.endsWith(".map") && !file.name.endsWith(".gz")) {
      alertMessage.innerHTML =
        "Please upload a map file (<i>.map</i> or <i>.gz</i> formats) you have previously downloaded";
      $("#alert").dialog({
        resizable: false,
        title: "Invalid file format",
        position: {my: "center", at: "center", of: "svg"},
        buttons: {
          Close: function () {
            $(this).dialog("close");
          }
        }
      });
      return;
    }

    // all good - show uploading text and load the map
    overlay.style.display = null;
    overlay.innerHTML = "Uploading<span>.</span><span>.</span><span>.</span>";
    if (closeDialogs) closeDialogs();
    uploadMap(file, () => {
      overlay.style.display = "none";
      overlay.innerHTML = "Drop a map file to open";
    });
  });
})();

async function generate(options) {
  try {
    const timeStart = performance.now();
    const {seed: precreatedSeed, graph: precreatedGraph} = options || {};

    invokeActiveZooming();
    setSeed(precreatedSeed);
    INFO && console.group("Generated Map " + seed);

    applyGraphSize();
    randomizeOptions();

    if (shouldRegenerateGrid(grid, precreatedSeed)) grid = precreatedGraph || generateGrid();
    else delete grid.cells.h;
    grid.cells.h = applyLandmassPercent(await HeightmapGenerator.generate(grid));
    pack = {}; // reset pack

    Features.markupGrid();
    addLakesInDeepDepressions();
    openNearSeaLakes();

    OceanLayers();
    defineMapSize();
    calculateMapCoordinates();
    calculateTemperatures();
    generatePrecipitation();

    reGraph();
    Features.markupPack();
    createDefaultRuler();

    Rivers.generate();
    Biomes.define();
    applyPlanetWorldEditorSurfaceBiomes();
    Features.defineGroups();

    Ice.generate();

    rankCells();
    Cultures.generate();
    Cultures.expand();

    Burgs.generate();
    States.generate();
    Routes.generate();
    Religions.generate();

    Burgs.specify();
    applyPlanetWorldEditorSettlements();
    applyPlanetWorldEditorRoutes();
    States.collectStatistics();
    States.defineStateForms();

    Provinces.generate();
    Provinces.getPoles();

    Rivers.specify();
    Lakes.defineNames();

    Military.generate();
    Markers.generate();
    Zones.generate();

    drawScaleBar(scaleBar, scale);
    Names.getMapName();

    WARN && console.warn(`TOTAL: ${rn((performance.now() - timeStart) / 1000, 2)}s`);
    showStatistics();
    INFO && console.groupEnd("Generated Map " + seed);
  } catch (error) {
    ERROR && console.error(error);
    const parsedError = parseError(error);
    clearMainTip();

    alertMessage.innerHTML = /* html */ `An error has occurred on map generation. Please retry. <br />If error is critical, clear the stored data and try again.
      <p id="errorBox">${parsedError}</p>`;
    $("#alert").dialog({
      resizable: false,
      title: "Generation error",
      width: "32em",
      buttons: {
        "Cleanup data": () => cleanupData(),
        Regenerate: function () {
          regenerateMap("generation error");
          $(this).dialog("close");
        },
        Ignore: function () {
          $(this).dialog("close");
        }
      },
      position: {my: "center", at: "center", of: "svg"}
    });
  }
}

function applyLandmassPercent(heights) {
  const landmassControl = ensureEl("landmassPercent");
  if (!landmassControl || !heights?.length) return heights;

  const sliderShare = landmassControl.querySelector("input[type=number]")?.value;
  const selectedShare = +landmassControl.value || +sliderShare || +landmassControl.getAttribute("value") || 45;
  if (!landmassControl.value) landmassControl.value = selectedShare;
  const requestedShare = minmax(selectedShare, 5, 95) / 100;
  const sortedHeights = Array.from(heights).sort((a, b) => a - b);
  const seaLevelIndex = minmax(Math.floor(sortedHeights.length * (1 - requestedShare)), 0, sortedHeights.length - 1);
  const sourceSeaLevel = sortedHeights[seaLevelIndex];
  const minHeight = sortedHeights[0];
  const maxHeight = sortedHeights[sortedHeights.length - 1];
  const seaRange = Math.max(1, sourceSeaLevel - minHeight);
  const landRange = Math.max(1, maxHeight - sourceSeaLevel);

  for (let i = 0; i < heights.length; i++) {
    const height = heights[i];
    heights[i] =
      height < sourceSeaLevel
        ? minmax(Math.round(((height - minHeight) / seaRange) * 19), 0, 19)
        : minmax(Math.round(20 + ((height - sourceSeaLevel) / landRange) * 80), 20, 100);
  }

  return heights;
}

function isPlanetWorldEditor() {
  return /(?:^|\/)planet-world-editor\/?$/i.test(window.location.pathname.replace(/\\/g, "/"));
}

function applyPlanetWorldEditorSettlements() {
  if (!isPlanetWorldEditor()) return;

  setupPlanetWorldEditorReturnButton();
  setupPlanetWorldEditorPopulationControl();
  schedulePlanetWorldEditorRoutesRefresh();

  const settlements = new URL(window.location.href).searchParams
    .get("settlements")
    ?.split("|")
    .map(cleanPlanetWorldSettlementName)
    .filter(Boolean);
  const burgs = getPlanetWorldEditorBurgs();
  burgs.forEach(burg => {
    delete burg.planetCapital;
    delete burg.planetWorldPopulation;
  });
  if (burgs[0]) burgs[0].planetCapital = 1;
  applyPlanetWorldEditorCityPopulations(burgs);
  if (!settlements?.length) return;

  const knownNames = [...new Set(settlements)];
  knownNames.slice(0, burgs.length).forEach((name, index) => {
    burgs[index].name = name;
  });
}

function setupPlanetWorldEditorReturnButton() {
  if (!isPlanetWorldEditor() || document.getElementById("planetWorldReturnButton")) return;

  const button = document.createElement("button");
  button.id = "planetWorldReturnButton";
  button.type = "button";
  button.textContent = "Zurueck zur Galaxy Map";
  button.title = "Zurueck zur allgemeinen Karte";
  button.style.cssText = [
    "position:fixed",
    "right:18px",
    "top:18px",
    "z-index:10050",
    "border:1px solid rgba(120,160,190,.42)",
    "border-radius:999px",
    "padding:10px 16px",
    "background:rgba(8,15,28,.86)",
    "color:#eaf5ff",
    "font:600 13px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "box-shadow:0 12px 34px rgba(0,0,0,.34)",
    "cursor:pointer",
    "backdrop-filter:blur(14px)"
  ].join(";");
  button.addEventListener("mouseenter", () => {
    button.style.borderColor = "rgba(130,205,255,.78)";
    button.style.background = "rgba(14,28,48,.94)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.borderColor = "rgba(120,160,190,.42)";
    button.style.background = "rgba(8,15,28,.86)";
  });
  button.addEventListener("click", () => {
    window.location.href = getPlanetWorldEditorReturnUrl();
  });
  document.body.appendChild(button);
}

function planetWorldEditorIsReadOnly() {
  if (!isPlanetWorldEditor()) return false;
  if (window.SW_MAP_IS_ADMIN) return false;
  if (window.SW_MAP_READ_ONLY) return true;
  return new URL(window.location.href).searchParams.get("readonly") === "1";
}

function setupPlanetWorldEditorReadOnlyMode() {
  if (!planetWorldEditorIsReadOnly()) return;
  document.body.classList.add("planet-world-readonly");
  injectPlanetWorldReadOnlyStyles();
  applyPlanetWorldReadOnlyControls();

  if (document.body.dataset.planetWorldReadOnlyReady) return;
  document.body.dataset.planetWorldReadOnlyReady = "1";
  document.addEventListener("beforeinput", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("click", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("input", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("change", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("keydown", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("paste", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("cut", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("drop", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("dragstart", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("pointerdown", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("mousedown", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("dblclick", blockPlanetWorldReadOnlyEvent, true);
  document.addEventListener("contextmenu", blockPlanetWorldReadOnlyEvent, true);
  new MutationObserver(applyPlanetWorldReadOnlyControls).observe(document.body, {childList: true, subtree: true});
}

function injectPlanetWorldReadOnlyStyles() {
  if (document.getElementById("planetWorldReadOnlyStyles")) return;
  const style = document.createElement("style");
  style.id = "planetWorldReadOnlyStyles";
  style.textContent = `
    body.planet-world-readonly #toolsTab,
    body.planet-world-readonly #toolsContent,
    body.planet-world-readonly #styleTab,
    body.planet-world-readonly #styleContent,
    body.planet-world-readonly #optionsTab,
    body.planet-world-readonly #optionsContent,
    body.planet-world-readonly #customizationMenu,
    body.planet-world-readonly #regenerate,
    body.planet-world-readonly #newMapButton,
    body.planet-world-readonly #exportButton,
    body.planet-world-readonly #saveButton,
    body.planet-world-readonly #loadButton {
      display: none !important;
    }

    body.planet-world-readonly input,
    body.planet-world-readonly select,
    body.planet-world-readonly textarea,
    body.planet-world-readonly slider-input,
    body.planet-world-readonly [contenteditable="true"] {
      cursor: not-allowed !important;
    }

    body.planet-world-readonly #map,
    body.planet-world-readonly #viewbox {
      cursor: default !important;
    }

    body.planet-world-readonly #planetWorldReadOnlyBadge {
      position: fixed;
      right: 18px;
      top: 66px;
      z-index: 10049;
      padding: 8px 13px;
      border: 1px solid rgba(130, 205, 255, .34);
      border-radius: 999px;
      background: rgba(8, 15, 28, .76);
      color: #dceeff;
      font: 600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 12px 34px rgba(0, 0, 0, .24);
      backdrop-filter: blur(14px);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function applyPlanetWorldReadOnlyControls() {
  if (!planetWorldEditorIsReadOnly()) return;
  const protectedSelectors = [
    "input",
    "select",
    "textarea",
    "button",
    "slider-input",
    "[contenteditable='true']",
    "[contenteditable='']",
    "[role='button']",
    "#mapLayers > li",
    "#layersContent li",
    "#layersContent .button",
    "#layersContent .buttonoff",
    "#burgEditor .burgFeature",
    "#burgEditor [data-feature]",
    "#burgEditor [id^='burg'][class*='icon-']"
  ];
  document.querySelectorAll(protectedSelectors.join(",")).forEach(element => {
    if (isPlanetWorldReadOnlyAllowedTarget(element)) return;
    element.setAttribute("aria-disabled", "true");
    if ("disabled" in element) element.disabled = true;
    if (element.hasAttribute("contenteditable")) element.setAttribute("contenteditable", "false");
    if (element.matches("input, textarea")) element.readOnly = true;
  });

  if (!document.getElementById("planetWorldReadOnlyBadge")) {
    const badge = document.createElement("div");
    badge.id = "planetWorldReadOnlyBadge";
    badge.textContent = "Zuschauer-Modus";
    document.body.appendChild(badge);
  }
}

function blockPlanetWorldReadOnlyEvent(event) {
  if (!planetWorldEditorIsReadOnly()) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!isPlanetWorldReadOnlyProtectedTarget(target, event.type)) return;

  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  if (typeof tip === "function" && event.type === "click") {
    tip("Zuschauer-Modus: Bearbeiten ist nur fuer Admins moeglich", false, "warn");
  }
}

function planetWorldReadOnlyAllowedSelector() {
  return [
    "#planetWorldReturnButton",
    "#planetWorldReadOnlyBadge",
    "#optionsHide",
    "#optionsTrigger",
    "#layersTab",
    "#aboutTab",
    "#zoomReset",
    ".ui-dialog-titlebar-close"
  ].join(", ");
}

function isPlanetWorldReadOnlyAllowedTarget(target) {
  return Boolean(target.closest(planetWorldReadOnlyAllowedSelector()));
}

function isPlanetWorldReadOnlyProtectedTarget(target, eventType = "") {
  if (isPlanetWorldReadOnlyAllowedTarget(target)) return false;
  if (target.closest("input, select, textarea, button, slider-input, [contenteditable], [role='button']")) return true;
  if (target.closest("#toolsContent, #styleContent, #optionsContent, #customizationMenu")) return true;
  if (target.closest("#mapLayers, #layersContent")) return true;
  if (target.closest("#burgEditor .burgFeature, #burgEditor [data-feature], #burgEditor [id^='burg'][class*='icon-']")) return true;
  if (target.closest(".ui-dialog, .dialog, .context-menu, .stable")) return true;
  if (target.closest("#newMapButton, #exportButton, #saveButton, #loadButton, #regenerate")) return true;
  if (target.closest("[id^='edit'], [id^='add'], [id^='regenerate']")) return true;
  if (target.closest("[id$='Editor'], [id*='Editor'], [class*='editor'], [class*='Editor']")) return true;
  if (["pointerdown", "mousedown", "dblclick", "contextmenu", "dragstart"].includes(eventType) && target.closest("#map, #viewbox")) return true;
  return false;
}

function getPlanetWorldEditorReturnUrl() {
  const params = new URL(window.location.href).searchParams;
  const rawReturnTo = params.get("returnTo");
  if (rawReturnTo) {
    try {
      const target = new URL(rawReturnTo, window.location.origin);
      if (target.origin === window.location.origin) return target.href;
    } catch (_error) {
      // Invalid return target falls back to the main map.
    }
  }
  return new URL("../index.html", window.location.href).href;
}

if (isPlanetWorldEditor()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setupPlanetWorldEditorReturnButton();
      setupPlanetWorldEditorReadOnlyMode();
    }, {once: true});
  } else {
    setupPlanetWorldEditorReturnButton();
    setupPlanetWorldEditorReadOnlyMode();
  }
}

function getPlanetWorldEditorBurgs() {
  if (!pack?.burgs) return [];
  return pack.burgs
    .filter(burg => burg.i && !burg.removed)
    .sort(
      (left, right) =>
        Number(right.capital || 0) - Number(left.capital || 0) ||
        Number(right.population || 0) - Number(left.population || 0)
    );
}

function cleanPlanetWorldSettlementName(value) {
  return String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyPlanetWorldEditorCityPopulations(burgs, forcedPopulation) {
  if (!burgs.length) return;

  const population = Number(forcedPopulation) || getPlanetWorldEditorPopulationFromTable();
  if (!population) return;

  const params = new URL(window.location.href).searchParams;
  const profile = [params.get("name"), params.get("terrain"), params.get("climate"), params.get("species")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let urbanShare = 0.56;
  if (/ecumenopolis|stadtplanet|city planet|city-world|urban|cityscape|st[äa]dtisch|industrial/.test(profile)) urbanShare = 0.86;
  if (/sparse|uninhabited|unbewohnt|no permanent|less than|fewer than|wenige bewohner/.test(profile)) urbanShare = 0.34;
  if (population < 100000) urbanShare = Math.max(urbanShare, 0.62);

  const cityPopulationTotal = Math.max(1, Math.round(population * urbanShare));
  const capitalIndex = Math.max(0, burgs.findIndex(burg => burg.planetCapital || burg.capital));
  const capitalShare = burgs.length === 1 ? 1 : urbanShare >= 0.8 ? 0.14 : population < 1000000 ? 0.24 : 0.18;
  const capitalReserve = Math.round(cityPopulationTotal * capitalShare);
  const weightedPopulationTotal = Math.max(1, cityPopulationTotal - capitalReserve);
  const weights = burgs.map((burg, index) => {
    const port = burg.port ? 1.35 : 1;
    const rank = 1 + (burgs.length - index) / burgs.length;
    if (index === capitalIndex) return 0;
    return Math.max(0.02, Number(burg.population || 0.02)) ** 1.08 * port * rank;
  });
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  const minimumPopulation = population < 50000 ? 80 : population < 1000000 ? 900 : 5000;

  burgs.forEach((burg, index) => {
    const target =
      index === capitalIndex
        ? Math.max(minimumPopulation, capitalReserve)
        : Math.max(minimumPopulation, Math.round((weightedPopulationTotal * weights[index]) / weightTotal));
    burg.planetWorldPopulation = Math.min(population, target);
    burg.population = rn(burg.planetWorldPopulation / populationRate / urbanization, 4);

    if (burg.planetWorldPopulation >= 100000) burg.group = "city";
    else if (burg.planetWorldPopulation >= 5000) burg.group = "town";
    else if (burg.planetWorldPopulation >= 500) burg.group = "village";
    else burg.group = "hamlet";
  });
}

function setupPlanetWorldEditorPopulationControl() {
  if (!isPlanetWorldEditor()) return;

  const row = document.getElementById("planetWorldPopulationRow");
  const input = document.getElementById("planetWorldPopulationInput");
  if (!row || !input) return;

  row.style.display = "";
  if (!input.value) {
    const profilePopulation = getPlanetWorldEditorPopulationFromProfile();
    if (profilePopulation) input.value = formatPlanetWorldPopulationInput(profilePopulation);
  }

  if (!row.dataset.populationControlReady) {
    const applyButton = document.getElementById("planetWorldPopulationApply");
    input.addEventListener("change", applyPlanetWorldPopulationFromControl);
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      applyPlanetWorldPopulationFromControl();
    });
    applyButton?.addEventListener("click", applyPlanetWorldPopulationFromControl);
    row.dataset.populationControlReady = "1";
  }

  updatePlanetWorldPopulationOutput();
}

function applyPlanetWorldPopulationFromControl() {
  if (!isPlanetWorldEditor()) return;
  if (planetWorldEditorIsReadOnly()) {
    updatePlanetWorldPopulationOutput(null, "Zuschauer-Modus");
    if (typeof tip === "function") tip("Zuschauer-Modus: Bearbeiten ist nur fuer Admins moeglich", false, "warn");
    return;
  }

  setupPlanetWorldEditorPopulationControl();
  const input = document.getElementById("planetWorldPopulationInput");
  const population = parsePlanetWorldPopulationText(input?.value);
  if (!population) {
    updatePlanetWorldPopulationOutput(null, "ungueltig");
    if (typeof tip === "function") tip("Planet population is invalid", false, "error");
    return;
  }

  input.value = formatPlanetWorldPopulationInput(population);
  const burgs = getPlanetWorldEditorBurgs();
  if (!burgs.length) return;

  burgs.forEach(burg => {
    delete burg.planetCapital;
    delete burg.planetWorldPopulation;
  });
  if (burgs[0]) burgs[0].planetCapital = 1;

  applyPlanetWorldEditorCityPopulations(burgs, population);
  applyPlanetWorldEditorRoutes();

  if (typeof layerIsOn === "function") {
    if (layerIsOn("togglePopulation") && typeof drawPopulation === "function") drawPopulation();
    if (layerIsOn("toggleBurgIcons") && typeof drawBurgIcons === "function") drawBurgIcons();
    if (layerIsOn("toggleLabels") && typeof drawBurgLabels === "function") drawBurgLabels();
  }

  updatePlanetWorldPopulationOutput(population);
  if (typeof tip === "function") tip(`Planet population applied: ${formatPlanetWorldPopulationOutput(population)}`, false, "success");
}

function updatePlanetWorldPopulationOutput(population, fallback = "") {
  const output = document.getElementById("planetWorldPopulationOutput");
  if (!output) return;

  const value = population || parsePlanetWorldPopulationText(document.getElementById("planetWorldPopulationInput")?.value);
  output.value = value ? formatPlanetWorldPopulationOutput(value) : fallback;
  output.textContent = output.value;
}

function formatPlanetWorldPopulationInput(population) {
  const value = Number(population);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1e12) return `${formatPlanetWorldPopulationUnit(value, 1e12)} trillion`;
  if (value >= 1e9) return `${formatPlanetWorldPopulationUnit(value, 1e9)} Milliarden`;
  if (value >= 1e6) return `${formatPlanetWorldPopulationUnit(value, 1e6)} Millionen`;
  return Math.round(value).toLocaleString("de-DE");
}

function formatPlanetWorldPopulationOutput(population) {
  const value = Number(population);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1e12) return `${formatPlanetWorldPopulationUnit(value, 1e12)} trillion`;
  if (value >= 1e9) return `${formatPlanetWorldPopulationUnit(value, 1e9)} Mrd.`;
  if (value >= 1e6) return `${formatPlanetWorldPopulationUnit(value, 1e6)} Mio.`;
  return Math.round(value).toLocaleString("de-DE");
}

function formatPlanetWorldPopulationUnit(population, divisor) {
  const scaled = Number(population) / divisor;
  const precision = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return String(rn(scaled, precision)).replace(".", ",");
}

function getPlanetWorldEditorPopulationFromTable() {
  const controlPopulation = parsePlanetWorldPopulationText(document.getElementById("planetWorldPopulationInput")?.value);
  if (controlPopulation) return controlPopulation;
  return getPlanetWorldEditorPopulationFromProfile();
}

function getPlanetWorldEditorPopulationFromProfile() {
  const params = new URL(window.location.href).searchParams;
  const explicit = parsePlanetWorldPopulationText(params.get("planetPopulation") || params.get("population"));
  if (explicit) return explicit;
  return parsePlanetWorldPopulationText(params.get("species"));
}

function applyPlanetWorldEditorRoutes() {
  if (!isPlanetWorldEditor() || !pack?.cells || !pack?.burgs?.length || typeof Routes === "undefined") return;

  const locked = Array.isArray(pack.routes) ? pack.routes.filter(route => route.lock).map((route, index) => ({...route, i: index})) : [];
  Routes.generate(locked);

  const burgs = getPlanetWorldEditorBurgs();
  for (const burg of burgs) {
    if (!burg.cell || Routes.isConnected(burg.cell)) continue;
    Routes.connect(burg.cell);
    if (!Routes.isConnected(burg.cell)) connectPlanetWorldEditorBurgFallback(burg, burgs);
  }

  if (typeof routes !== "undefined") routes.selectAll("path").remove();
  if (typeof layerIsOn !== "function" || typeof drawRoutes !== "function") return;

  if (!layerIsOn("toggleRoutes") && typeof turnButtonOn === "function") turnButtonOn("toggleRoutes");
  drawRoutes();
}

function connectPlanetWorldEditorBurgFallback(burg, burgs) {
  if (!pack?.cells?.p?.[burg.cell] || typeof Routes.getNextId !== "function") return;

  const [x, y] = pack.cells.p[burg.cell];
  const target = burgs
    .filter(candidate => candidate.i !== burg.i && candidate.cell && Routes.isConnected(candidate.cell) && pack.cells.p[candidate.cell])
    .sort((left, right) => {
      const [lx, ly] = pack.cells.p[left.cell];
      const [rx, ry] = pack.cells.p[right.cell];
      return (lx - x) ** 2 + (ly - y) ** 2 - ((rx - x) ** 2 + (ry - y) ** 2);
    })[0];
  if (!target) return;

  const routeId = Routes.getNextId();
  const points = [burg.cell, target.cell].map(cell => [...pack.cells.p[cell], cell]);
  pack.routes.push({i: routeId, group: "roads", feature: pack.cells.f[burg.cell], points});
  if (!pack.cells.routes[burg.cell]) pack.cells.routes[burg.cell] = {};
  if (!pack.cells.routes[target.cell]) pack.cells.routes[target.cell] = {};
  pack.cells.routes[burg.cell][target.cell] = routeId;
  pack.cells.routes[target.cell][burg.cell] = routeId;
}

function schedulePlanetWorldEditorRoutesRefresh() {
  if (window.planetWorldRoutesRefreshScheduled) return;
  window.planetWorldRoutesRefreshScheduled = true;

  let attempts = 0;
  const refresh = () => {
    attempts++;
    applyPlanetWorldEditorRoutes();
    if (typeof layerIsOn === "function" && layerIsOn("toggleRoutes")) return;
    if (attempts < 20) setTimeout(refresh, 250);
  };
  if (document.readyState === "complete") refresh();
  else window.addEventListener("load", () => setTimeout(refresh, 0), {once: true});
}

window.applyPlanetWorldPopulationFromControl = applyPlanetWorldPopulationFromControl;
window.applyPlanetWorldEditorRoutes = applyPlanetWorldEditorRoutes;

function parsePlanetWorldPopulationText(value) {
  const text = String(value || "");
  if (!text.trim()) return null;
  if (/sparse|few inhabitants|wenige bewohner/i.test(text)) return 5000;

  const populationSegment =
    text.match(/(?:bevoelkerung|bevölkerung|population)\s*:\s*([^·|;]+)/i)?.[1] ||
    text.match(/(?:bevoelkerung|bevölkerung|population)\s+([^·|;]+)/i)?.[1] ||
    text;
  const values = [];
  const unitPattern =
    /(\d[\d., ]*|\d+(?:[.,]\d+)?)\s*(trillions?|billionen|billion(?:s)?|milliarden?|mrd\.?|million(?:en|s)?|mio\.?|tausend|thousand)\b/gi;
  for (const match of populationSegment.matchAll(unitPattern)) {
    const parsed = parsePlanetWorldPopulationNumber(match[1], match[2]);
    if (parsed) values.push(parsed);
  }

  if (!values.length) {
    const textual = parsePlanetWorldPopulationTextualValue(populationSegment);
    if (textual) values.push(textual);
  }

  if (!values.length) {
    const barePattern = /\b\d[\d., ]{1,}\b/g;
    for (const match of populationSegment.matchAll(barePattern)) {
      const end = match.index + match[0].length;
      if (populationSegment.slice(end, end + 1) === "%") continue;
      const parsed = parsePlanetWorldPopulationNumber(match[0]);
      if (parsed) values.push(parsed);
    }
  }

  if (!values.length) return null;
  const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  if (sorted.length === 1) return Math.round(sorted[0]);
  return Math.round((sorted[0] + sorted[sorted.length - 1]) / 2);
}

function parsePlanetWorldPopulationTextualValue(value) {
  const text = String(value || "").toLowerCase();
  const wordNumbers = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20
  };
  const wordPattern =
    /\b(?:over|at least|more than|around|about|ca\.)?\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(trillions?|billionen|billions?|milliarden?|million(?:en|s)?|tausend|thousand)\b/i;
  const wordMatch = text.match(wordPattern);
  if (wordMatch) return parsePlanetWorldPopulationNumber(String(wordNumbers[wordMatch[1]]), wordMatch[2]);

  if (/\b(?:trillions?|billionen)\b/.test(text)) return 1e12;
  if (/\b(?:billions?|milliarden?)\b/.test(text)) return 1e9;
  if (/\b(?:million(?:en|s)?)\b/.test(text)) return 1e6;
  if (/\b(?:tausend|thousand)\b/.test(text)) return 1e3;
  return null;
}

function parsePlanetWorldPopulationNumber(rawNumber, rawUnit = "") {
  const unit = String(rawUnit || "").toLowerCase();
  let normalized = String(rawNumber || "").trim().replace(/\s+/g, "");
  if (!normalized) return null;

  if (unit && /^\d+,\d{1,3}$/.test(normalized) && !normalized.includes(".")) normalized = normalized.replace(",", ".");
  else if (unit) normalized = normalized.replace(/,/g, "");
  else normalized = normalized.replace(/[,.]/g, "");

  const base = Number(normalized);
  if (!Number.isFinite(base)) return null;
  const multiplier = /trillion|billionen/.test(unit)
    ? 1e12
    : /billion|milliard|mrd/.test(unit)
      ? 1e9
      : /million|mio/.test(unit)
        ? 1e6
        : /tausend|thousand/.test(unit)
          ? 1e3
          : 1;
  return base * multiplier;
}

function getPlanetWorldEditorSurfaceDetails() {
  if (!window.location.pathname.includes("/planet-world-editor/")) return null;

  const params = new URL(window.location.href).searchParams;
  const name = String(params.get("name") || "").toLowerCase();
  const terrain = String(params.get("terrain") || "").toLowerCase();
  const climate = String(params.get("climate") || "").toLowerCase();
  const species = String(params.get("species") || "").toLowerCase();
  const tableText = [terrain, climate].filter(Boolean).join(" ");
  const profileText = [name, tableText, species].filter(Boolean).join(" ");
  const terrainBiomes = getPlanetWorldEditorTerrainBiomes(terrain, climate);
  const hasBiome = id => terrainBiomes.includes(id);
  const hasLava = /\blava|magma|molten|volcan|vulkan|asche|ash[- ]laden|obsidian/.test(tableText);
  const hasWater = /aquat|water world|ozean|ocean|meer|sea\b|tiefse|coral|korallen|reef|lake|seen|fluss/.test(terrain);
  const hasForest = [6, 7, 8, 9].some(hasBiome);
  const hasIce = [10, 11].some(hasBiome);
  const hasWarmLand = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12].some(hasBiome);
  const isIceOnly = hasIce && !hasWarmLand;
  const isLavaWorld =
    /\bmustafar\b/.test(name) ||
    /lava seas|lava sea|molten rock plains|magma ocean|lava ocean|lavawelt|lava world/.test(terrain) ||
    (hasLava && terrainBiomes.every(id => id === 1 || id === 2));

  let surface = "mixed";
  if (isLavaWorld) surface = "lava";
  else if (isIceOnly || /\bhoth\b/.test(name)) surface = "ice";
  else if (hasWater && !terrainBiomes.length) surface = "ocean";
  else if (hasForest) surface = "forest";
  else if (hasBiome(12)) surface = "wetland";
  else if (hasBiome(1) || hasBiome(2)) surface = "desert";
  else if (hasWater) surface = "ocean";
  else if (/eis|ice|snow|schnee|frozen|frigid|glacier|gletscher|polar|arctic/.test(profileText)) surface = "ice";

  return {surface, terrainBiomes, hasLava, hasWater, isIceOnly};
}

function getPlanetWorldEditorSurfaceProfile() {
  return getPlanetWorldEditorSurfaceDetails()?.surface || null;
}

window.getPlanetWorldEditorSurfaceProfile = getPlanetWorldEditorSurfaceProfile;

function getPlanetWorldEditorTerrainBiomes(terrain, climate) {
  const tableTerrain = String(terrain || "");
  const tableClimate = String(climate || "");
  const biomes = [];
  const add = id => {
    if (!biomes.includes(id)) biomes.push(id);
  };

  // Table terrain is authoritative. Climate adds a cold or dry signature where the table names it there.
  if (/lava|magma|molten|ascheebene|ash(?:en)?\b|volcan|vulkan|geotherm/.test(tableTerrain)) add(2);
  if (/wuest|wues|desert|sandduen|dune|salzpfann|salzwuest|salt flat|arid|oase|oases/.test(tableTerrain)) add(1);
  if (/felsfeld|rocky|rocks?\b|barren|badland|basalt|crater|wasteland|ash(?:en)?\b/.test(tableTerrain)) add(2);
  if (/savann/.test(tableTerrain)) add(3);
  const openTerrain = tableTerrain
    .replace(/(?:desert|rocky?|molten(?: rock)?|frozen(?: ice)?|ice|snowy?)\s+plains?\b/g, "")
    .replace(/(?:lava|geyser|crystal)\s+fields?\b/g, "");
  if (/grasebene|grassland|stepp|plains?\b|\bebenen\b|field|farmland|prairie|meadow/.test(openTerrain)) add(4);
  if (/rainforest|bergregenwaeld|dschungel|jungles?\b|lush forest/.test(tableTerrain)) add(7);
  if (/mangrovenwaeld|mangrove|sumpf|suempf|swamps?\b|bogs?\b|bayou|marsh|marschland|wetland|flussdelta/.test(tableTerrain)) add(12);
  if (/forests?\b|waeld|wald\b|mooswaeld|bamboo|woodland|groves?\b/.test(tableTerrain)) {
    add(/tropic|humid|feucht|rain/.test(`${tableTerrain} ${tableClimate}`) ? 8 : 6);
  }
  if (/tundra|arctic|subarkt|subarctic/.test(`${tableTerrain} ${tableClimate}`)) add(10);
  if (/eisflaech|gletscher|glaciers?\b|ice caps?|ice plains?|snow|schnee|frozen ice|frozen plains/.test(tableTerrain)) {
    add(11);
  }
  if (!biomes.length && /eisig|frigid|polar|frozen|ice/.test(tableClimate)) add(10);
  if (!biomes.length && /wuestenartig|desert|arid|trocken/.test(tableClimate)) add(1);

  return biomes;
}

function applyPlanetWorldEditorSurfaceBiomes() {
  const details = getPlanetWorldEditorSurfaceDetails();
  if (!details || !pack.cells?.biome) return;

  applyPlanetWorldEditorBiomePalette(details);

  const cells = pack.cells;
  const namedBiomes = details.terrainBiomes;
  for (const i of cells.i) {
    if (cells.h[i] < 20) continue;

    if (details.isIceOnly && namedBiomes.length === 1) {
      cells.biome[i] = namedBiomes.includes(11) ? 11 : 10;
      continue;
    }

    if (!namedBiomes.length && details.surface === "lava") {
      cells.biome[i] = 2;
      continue;
    }

    if (!namedBiomes.length && details.surface === "ice") {
      cells.biome[i] = 11;
      continue;
    }

    if (namedBiomes.length) {
      cells.biome[i] = getPlanetWorldEditorTerrainBiome(cells, i, details);
    }
  }
}

function getPlanetWorldEditorTerrainBiome(cells, cellId, details) {
  const namedBiomes = details.terrainBiomes;
  if (namedBiomes.length === 1) return namedBiomes[0];

  const height = cells.h[cellId];
  const hasBiome = id => namedBiomes.includes(id);
  const pattern = getPlanetWorldEditorTerrainPattern(cells, cellId);
  const gridCell = cells.g[cellId];
  const temperature = grid.cells.temp[gridCell];

  if (hasBiome(11) && (temperature <= -5 || height > 78) && pattern > 0.28) return 11;
  if (hasBiome(10) && (temperature <= 4 || height > 64) && pattern > 0.18) return 10;
  if (hasBiome(12) && (cells.r[cellId] || height < 29) && pattern < 0.78) return 12;
  if (details.surface === "lava" && hasBiome(2)) {
    if (pattern < 0.86) return 2;
    const remnantBiomes = namedBiomes.filter(id => id !== 2);
    if (remnantBiomes.length) {
      const remnantBand = Math.min(remnantBiomes.length - 1, Math.floor(((pattern - 0.86) / 0.14) * remnantBiomes.length));
      return remnantBiomes[remnantBand];
    }
  }

  const band = Math.min(namedBiomes.length - 1, Math.floor(pattern * namedBiomes.length));
  return namedBiomes[band];
}

function getPlanetWorldEditorTerrainPattern(cells, cellId) {
  const [x, y] = cells.p[cellId];
  const width = graphWidth || 1;
  const height = graphHeight || 1;
  const heightWave = cells.h[cellId] / 100;
  const terrainWave = Math.sin((x + y) * 0.023) * 0.09 + Math.cos((x - y) * 0.017) * 0.06;
  const raw = (x / width) * 0.57 + (y / height) * 0.29 + heightWave * 0.08 + terrainWave;
  return raw - Math.floor(raw);
}

function applyPlanetWorldEditorBiomePalette(details) {
  const {surface, terrainBiomes} = details;
  if (!window.planetWorldBiomeColors) window.planetWorldBiomeColors = [...biomesData.color];
  if (!window.planetWorldBiomeHabitability) window.planetWorldBiomeHabitability = [...biomesData.habitability];
  if (!window.planetWorldBiomeIconsDensity) window.planetWorldBiomeIconsDensity = [...biomesData.iconsDensity];
  biomesData.color = [...window.planetWorldBiomeColors];
  biomesData.habitability = [...window.planetWorldBiomeHabitability];
  biomesData.iconsDensity = [...window.planetWorldBiomeIconsDensity];
  [3, 4, 5, 6, 7, 8, 9, 12].forEach(biome => {
    biomesData.iconsDensity[biome] = Math.min(biomesData.iconsDensity[biome], 35);
  });

  if (details.hasLava) {
    biomesData.color[2] = "#4e2720";
    biomesData.iconsDensity[2] = 0;
  }

  if (surface === "ice") {
    biomesData.color[10] = "#dbe7f0";
    biomesData.color[11] = "#f1fbff";
    biomesData.habitability[11] = 4;
    return;
  }

  if (surface === "lava") {
    biomesData.color[1] = "#3b1a16";
    biomesData.color[2] = "#4e2720";
    biomesData.color[10] = "#6a3425";
    biomesData.color[11] = "#70534b";
    biomesData.iconsDensity[1] = 0;
    biomesData.iconsDensity[2] = 0;
    return;
  }

  if (surface === "desert") {
    biomesData.color[1] = "#e1b96b";
    biomesData.color[2] = "#c7b27e";
  }

  if (surface === "ocean") {
    biomesData.color[5] = "#6cab63";
    biomesData.color[7] = "#2f8757";
  }

  if (surface === "forest" || surface === "wetland" || terrainBiomes.some(id => [6, 7, 8, 9, 12].includes(id))) {
    biomesData.color[6] = "#398f48";
    biomesData.color[7] = "#1b7646";
    biomesData.color[8] = "#286e3f";
    biomesData.color[12] = "#1c8054";
  }
}

function applyPlanetWorldEditorSurfaceStyle() {
  const surface = getPlanetWorldEditorSurfaceProfile();
  if (!surface) return;

  const themes = {
    mixed: {
      land: "#d8d3c1",
      ocean: "#4288b9",
      river: "#76d3ff",
      lake: "#6ebceb",
      terrainDensity: 0.38
    },
    forest: {
      land: "#53683f",
      ocean: "#2d739c",
      river: "#76d7ff",
      lake: "#59adcf",
      terrainDensity: 0.4
    },
    wetland: {
      land: "#536c49",
      ocean: "#386f83",
      river: "#89d3e6",
      lake: "#5ca7a6",
      terrainDensity: 0.42
    },
    ocean: {
      land: "#6e8551",
      ocean: "#1f85bd",
      river: "#9ce8ff",
      lake: "#4cb2df",
      terrainDensity: 0.38
    },
    desert: {
      land: "#c29248",
      ocean: "#3d87ad",
      river: "#79cbe7",
      lake: "#56a8c7",
      terrainDensity: 0.58
    },
    ice: {
      land: "#eff8fb",
      ocean: "#b3dbea",
      river: "#d8f8ff",
      lake: "#d0edf4",
      terrainDensity: 0.42
    },
    lava: {
      land: "#21181a",
      ocean: "#e24b19",
      river: "#ff8a23",
      lake: "#ff6417",
      terrainDensity: 0.32
    }
  };
  const theme = themes[surface] || themes.mixed;
  const iceHeightScheme = "#f8fdff,#dcecf3,#b7d1dd,#829eaf";

  setPlanetWorldSurfaceAttributes("#biomes", {
    opacity: surface === "ice" ? 0.8 : 0.94,
    filter: null,
    mask: "url(#land)"
  });
  setPlanetWorldSurfaceAttributes("#terrain", {
    set: surface === "ice" ? "gray" : "colored",
    size: surface === "lava" ? 0.86 : 1,
    density: theme.terrainDensity
  });
  setPlanetWorldSurfaceAttributes("#landmass", {fill: theme.land});
  setPlanetWorldSurfaceAttributes("#oceanBase", {fill: theme.ocean});
  setPlanetWorldSurfaceAttributes("#oceanHeights", {opacity: surface === "lava" ? 0.2 : 0.34});
  setPlanetWorldSurfaceAttributes("#landHeights", {
    opacity: surface === "ice" ? 0.72 : 0.48,
    scheme: surface === "ice" ? iceHeightScheme : "bright"
  });
  setPlanetWorldSurfaceAttributes("#rivers", {fill: theme.river});
  setPlanetWorldSurfaceAttributes("#freshwater", {fill: theme.lake, stroke: theme.lake, opacity: surface === "lava" ? 0.95 : 0.72});
  setPlanetWorldSurfaceAttributes("#salt", {fill: theme.lake, stroke: theme.lake, opacity: surface === "lava" ? 0.95 : 0.72});

  if (surface === "ice") {
    setPlanetWorldSurfaceAttributes("#ice", {opacity: 1, fill: "#f5fdff", stroke: "#f5fdff"});
    setPlanetWorldSurfaceAttributes("#frozen", {opacity: 1, fill: "#e7f7fb", stroke: "#e7f7fb"});
  }

  if (surface === "lava") {
    setPlanetWorldSurfaceAttributes("#lava", {opacity: 1, fill: "#ff5414", stroke: "#ffb024", "stroke-width": 2.4});
    setPlanetWorldSurfaceAttributes("#dry", {fill: "#4f291f", stroke: "#7f3a22"});
  }
}

window.applyPlanetWorldEditorSurfaceStyle = applyPlanetWorldEditorSurfaceStyle;

function setPlanetWorldSurfaceAttributes(selector, attributes) {
  const element = document.querySelector(selector);
  if (!element) return;

  Object.entries(attributes).forEach(([name, value]) => {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  });
}

// set map seed (string!)
function setSeed(precreatedSeed) {
  if (!precreatedSeed) {
    const first = !mapHistory[0];
    const params = new URL(window.location.href).searchParams;
    const urlSeed = params.get("seed");
    if (first && params.get("from") === "MFCG" && urlSeed.length === 13) seed = urlSeed.slice(0, -4);
    else if (first && urlSeed) seed = urlSeed;
    else seed = generateSeed();
  } else {
    seed = precreatedSeed;
  }

  ensureEl("optionsSeed").value = seed;
  Math.random = aleaPRNG(seed);
}

function addLakesInDeepDepressions() {
  TIME && console.time("addLakesInDeepDepressions");
  const elevationLimit = +ensureEl("lakeElevationLimitOutput").value;
  if (elevationLimit === 80) return;

  const {cells, features} = grid;
  const {c, h, b} = cells;

  for (const i of cells.i) {
    if (b[i] || h[i] < 20) continue;

    const minHeight = d3.min(c[i].map(c => h[c]));
    if (h[i] > minHeight) continue;

    let deep = true;
    const threshold = h[i] + elevationLimit;
    const queue = [i];
    const checked = [];
    checked[i] = true;

    // check if elevated cell can potentially pour to water
    while (deep && queue.length) {
      const q = queue.pop();

      for (const n of c[q]) {
        if (checked[n]) continue;
        if (h[n] >= threshold) continue;
        if (h[n] < 20) {
          deep = false;
          break;
        }

        checked[n] = true;
        queue.push(n);
      }
    }

    // if not, add a lake
    if (deep) {
      const lakeCells = [i].concat(c[i].filter(n => h[n] === h[i]));
      addLake(lakeCells);
    }
  }

  function addLake(lakeCells) {
    const f = features.length;

    lakeCells.forEach(i => {
      cells.h[i] = 19;
      cells.t[i] = -1;
      cells.f[i] = f;
      c[i].forEach(n => !lakeCells.includes(n) && (cells.t[c] = 1));
    });

    features.push({i: f, land: false, border: false, type: "lake"});
  }

  TIME && console.timeEnd("addLakesInDeepDepressions");
}

// near sea lakes usually get a lot of water inflow, most of them should break threshold and flow out to sea (see Ancylus Lake)
function openNearSeaLakes() {
  if (ensureEl("templateInput").value === "Atoll") return; // no need for Atolls

  const cells = grid.cells;
  const features = grid.features;
  if (!features.find(f => f.type === "lake")) return; // no lakes
  TIME && console.time("openLakes");
  const LIMIT = 22; // max height that can be breached by water

  for (const i of cells.i) {
    const lakeFeatureId = cells.f[i];
    if (features[lakeFeatureId].type !== "lake") continue; // not a lake

    check_neighbours: for (const c of cells.c[i]) {
      if (cells.t[c] !== 1 || cells.h[c] > LIMIT) continue; // water cannot break this

      for (const n of cells.c[c]) {
        const ocean = cells.f[n];
        if (features[ocean].type !== "ocean") continue; // not an ocean
        removeLake(c, lakeFeatureId, ocean);
        break check_neighbours;
      }
    }
  }

  function removeLake(thresholdCellId, lakeFeatureId, oceanFeatureId) {
    cells.h[thresholdCellId] = 19;
    cells.t[thresholdCellId] = -1;
    cells.f[thresholdCellId] = oceanFeatureId;
    cells.c[thresholdCellId].forEach(function (c) {
      if (cells.h[c] >= 20) cells.t[c] = 1; // mark as coastline
    });

    cells.i.forEach(i => {
      if (cells.f[i] === lakeFeatureId) cells.f[i] = oceanFeatureId;
    });
    features[lakeFeatureId].type = "ocean"; // mark former lake as ocean
  }

  TIME && console.timeEnd("openLakes");
}

// define map size and position based on template and random factor
function defineMapSize() {
  const [size, latitude, longitude] = getSizeAndLatitude();
  const randomize = new URL(window.location.href).searchParams.get("options") === "default"; // ignore stored options
  if (randomize || !locked("mapSize")) mapSizeOutput.value = mapSizeInput.value = size;
  if (randomize || !locked("latitude")) latitudeOutput.value = latitudeInput.value = latitude;
  if (randomize || !locked("longitude")) longitudeOutput.value = longitudeInput.value = longitude;

  function getSizeAndLatitude() {
    const template = ensureEl("templateInput").value; // heightmap template

    if (template === "africa-centric") return [45, 53, 38];
    if (template === "arabia") return [20, 35, 35];
    if (template === "atlantics") return [42, 23, 65];
    if (template === "britain") return [7, 20, 51.3];
    if (template === "caribbean") return [15, 40, 74.8];
    if (template === "east-asia") return [11, 28, 9.4];
    if (template === "eurasia") return [38, 19, 27];
    if (template === "europe") return [20, 16, 44.8];
    if (template === "europe-accented") return [14, 22, 44.8];
    if (template === "europe-and-central-asia") return [25, 10, 39.5];
    if (template === "europe-central") return [11, 22, 46.4];
    if (template === "europe-north") return [7, 18, 48.9];
    if (template === "greenland") return [22, 7, 55.8];
    if (template === "hellenica") return [8, 27, 43.5];
    if (template === "iceland") return [2, 15, 55.3];
    if (template === "indian-ocean") return [45, 55, 14];
    if (template === "mediterranean-sea") return [10, 29, 45.8];
    if (template === "middle-east") return [8, 31, 34.4];
    if (template === "north-america") return [37, 17, 87];
    if (template === "us-centric") return [66, 27, 100];
    if (template === "us-mainland") return [16, 30, 77.5];
    if (template === "world") return [78, 27, 40];
    if (template === "world-from-pacific") return [75, 32, 30]; // longitude doesn't fit

    const part = grid.features.some(f => f.land && f.border); // if land goes over map borders
    const max = part ? 80 : 100; // max size
    const lat = () => gauss(P(0.5) ? 40 : 60, 20, 25, 75); // latitude shift

    if (!part) {
      if (template === "pangea") return [100, 50, 50];
      if (template === "shattered" && P(0.7)) return [100, 50, 50];
      if (template === "continents" && P(0.5)) return [100, 50, 50];
      if (template === "archipelago" && P(0.35)) return [100, 50, 50];
      if (template === "highIsland" && P(0.25)) return [100, 50, 50];
      if (template === "lowIsland" && P(0.1)) return [100, 50, 50];
    }

    if (template === "pangea") return [gauss(70, 20, 30, max), lat(), 50];
    if (template === "volcano") return [gauss(20, 20, 10, max), lat(), 50];
    if (template === "mediterranean") return [gauss(25, 30, 15, 80), lat(), 50];
    if (template === "peninsula") return [gauss(15, 15, 5, 80), lat(), 50];
    if (template === "isthmus") return [gauss(15, 20, 3, 80), lat(), 50];
    if (template === "atoll") return [gauss(3, 2, 1, 5, 1), lat(), 50];

    return [gauss(30, 20, 15, max), lat(), 50]; // Continents, Archipelago, High Island, Low Island
  }
}

// calculate map position on globe
function calculateMapCoordinates() {
  const sizeFraction = +ensureEl("mapSizeOutput").value / 100;
  const latShift = +ensureEl("latitudeOutput").value / 100;
  const lonShift = +ensureEl("longitudeOutput").value / 100;

  const latT = rn(sizeFraction * 180, 1);
  const latN = rn(90 - (180 - latT) * latShift, 1);
  const latS = rn(latN - latT, 1);

  const lonT = rn(Math.min((graphWidth / graphHeight) * latT, 360), 1);
  const lonE = rn(180 - (360 - lonT) * lonShift, 1);
  const lonW = rn(lonE - lonT, 1);
  mapCoordinates = {latT, latN, latS, lonT, lonW, lonE};
}

// temperature model, trying to follow real-world data
// based on http://www-das.uwyo.edu/~geerts/cwx/notes/chap16/Image64.gif
function calculateTemperatures() {
  TIME && console.time("calculateTemperatures");
  const cells = grid.cells;
  cells.temp = new Int8Array(cells.i.length); // temperature array

  const {temperatureEquator, temperatureNorthPole, temperatureSouthPole} = options;
  const tropics = [16, -20]; // tropics zone
  const tropicalGradient = 0.15;

  const tempNorthTropic = temperatureEquator - tropics[0] * tropicalGradient;
  const northernGradient = (tempNorthTropic - temperatureNorthPole) / (90 - tropics[0]);

  const tempSouthTropic = temperatureEquator + tropics[1] * tropicalGradient;
  const southernGradient = (tempSouthTropic - temperatureSouthPole) / (90 + tropics[1]);

  const exponent = +heightExponentInput.value;

  for (let rowCellId = 0; rowCellId < cells.i.length; rowCellId += grid.cellsX) {
    const [, y] = grid.points[rowCellId];
    const rowLatitude = mapCoordinates.latN - (y / graphHeight) * mapCoordinates.latT; // [90; -90]
    const tempSeaLevel = calculateSeaLevelTemp(rowLatitude);
    DEBUG.temperature && console.info(`${rn(rowLatitude)}° sea temperature: ${rn(tempSeaLevel)}°C`);

    for (let cellId = rowCellId; cellId < rowCellId + grid.cellsX; cellId++) {
      const tempAltitudeDrop = getAltitudeTemperatureDrop(cells.h[cellId]);
      cells.temp[cellId] = minmax(tempSeaLevel - tempAltitudeDrop, -128, 127);
    }
  }

  function calculateSeaLevelTemp(latitude) {
    const isTropical = latitude <= 16 && latitude >= -20;
    if (isTropical) return temperatureEquator - Math.abs(latitude) * tropicalGradient;

    return latitude > 0
      ? tempNorthTropic - (latitude - tropics[0]) * northernGradient
      : tempSouthTropic + (latitude - tropics[1]) * southernGradient;
  }

  // temperature drops by 6.5°C per 1km of altitude
  function getAltitudeTemperatureDrop(h) {
    if (h < 20) return 0;
    const height = Math.pow(h - 18, exponent);
    return rn((height / 1000) * 6.5);
  }

  TIME && console.timeEnd("calculateTemperatures");
}

// simplest precipitation model
function generatePrecipitation() {
  TIME && console.time("generatePrecipitation");
  prec.selectAll("*").remove();
  const {cells, cellsX, cellsY} = grid;
  cells.prec = new Uint8Array(cells.i.length); // precipitation array

  const cellsNumberModifier = (pointsInput.dataset.cells / 10000) ** 0.25;
  const precInputModifier = precInput.value / 100;
  const modifier = cellsNumberModifier * precInputModifier;

  const westerly = [];
  const easterly = [];
  let southerly = 0;
  let northerly = 0;

  // precipitation modifier per latitude band
  // x4 = 0-5 latitude: wet through the year (rising zone)
  // x2 = 5-20 latitude: wet summer (rising zone), dry winter (sinking zone)
  // x1 = 20-30 latitude: dry all year (sinking zone)
  // x2 = 30-50 latitude: wet winter (rising zone), dry summer (sinking zone)
  // x3 = 50-60 latitude: wet all year (rising zone)
  // x2 = 60-70 latitude: wet summer (rising zone), dry winter (sinking zone)
  // x1 = 70-85 latitude: dry all year (sinking zone)
  // x0.5 = 85-90 latitude: dry all year (sinking zone)
  const latitudeModifier = [4, 2, 2, 2, 1, 1, 2, 2, 2, 2, 3, 3, 2, 2, 1, 1, 1, 0.5];
  const MAX_PASSABLE_ELEVATION = 85;

  // define wind directions based on cells latitude and prevailing winds there
  d3.range(0, cells.i.length, cellsX).forEach(function (c, i) {
    const lat = mapCoordinates.latN - (i / cellsY) * mapCoordinates.latT;
    const latBand = ((Math.abs(lat) - 1) / 5) | 0;
    const latMod = latitudeModifier[latBand];
    const windTier = (Math.abs(lat - 89) / 30) | 0; // 30d tiers from 0 to 5 from N to S
    const {isWest, isEast, isNorth, isSouth} = getWindDirections(windTier);

    if (isWest) westerly.push([c, latMod, windTier]);
    if (isEast) easterly.push([c + cellsX - 1, latMod, windTier]);
    if (isNorth) northerly++;
    if (isSouth) southerly++;
  });

  // distribute winds by direction
  if (westerly.length) passWind(westerly, 120 * modifier, 1, cellsX);
  if (easterly.length) passWind(easterly, 120 * modifier, -1, cellsX);

  const vertT = southerly + northerly;
  if (northerly) {
    const bandN = ((Math.abs(mapCoordinates.latN) - 1) / 5) | 0;
    const latModN = mapCoordinates.latT > 60 ? d3.mean(latitudeModifier) : latitudeModifier[bandN];
    const maxPrecN = (northerly / vertT) * 60 * modifier * latModN;
    passWind(d3.range(0, cellsX, 1), maxPrecN, cellsX, cellsY);
  }

  if (southerly) {
    const bandS = ((Math.abs(mapCoordinates.latS) - 1) / 5) | 0;
    const latModS = mapCoordinates.latT > 60 ? d3.mean(latitudeModifier) : latitudeModifier[bandS];
    const maxPrecS = (southerly / vertT) * 60 * modifier * latModS;
    passWind(d3.range(cells.i.length - cellsX, cells.i.length, 1), maxPrecS, -cellsX, cellsY);
  }

  function getWindDirections(tier) {
    const angle = options.winds[tier];

    const isWest = angle > 40 && angle < 140;
    const isEast = angle > 220 && angle < 320;
    const isNorth = angle > 100 && angle < 260;
    const isSouth = angle > 280 || angle < 80;

    return {isWest, isEast, isNorth, isSouth};
  }

  function passWind(source, maxPrec, next, steps) {
    const maxPrecInit = maxPrec;

    for (let first of source) {
      if (first[0]) {
        maxPrec = Math.min(maxPrecInit * first[1], 255);
        first = first[0];
      }

      let humidity = maxPrec - cells.h[first]; // initial water amount
      if (humidity <= 0) continue; // if first cell in row is too elevated consider wind dry

      for (let s = 0, current = first; s < steps; s++, current += next) {
        if (cells.temp[current] < -5) continue; // no flux in permafrost

        if (cells.h[current] < 20) {
          // water cell
          if (cells.h[current + next] >= 20) {
            cells.prec[current + next] += Math.max(humidity / rand(10, 20), 1); // coastal precipitation
          } else {
            humidity = Math.min(humidity + 5 * modifier, maxPrec); // wind gets more humidity passing water cell
            cells.prec[current] += 5 * modifier; // water cells precipitation (need to correctly pour water through lakes)
          }
          continue;
        }

        // land cell
        const isPassable = cells.h[current + next] <= MAX_PASSABLE_ELEVATION;
        const precipitation = isPassable ? getPrecipitation(humidity, current, next) : humidity;
        cells.prec[current] += precipitation;
        const evaporation = precipitation > 1.5 ? 1 : 0; // some humidity evaporates back to the atmosphere
        humidity = isPassable ? minmax(humidity - precipitation + evaporation, 0, maxPrec) : 0;
      }
    }
  }

  function getPrecipitation(humidity, i, n) {
    const normalLoss = Math.max(humidity / (10 * modifier), 1); // precipitation in normal conditions
    const diff = Math.max(cells.h[i + n] - cells.h[i], 0); // difference in height
    const mod = (cells.h[i + n] / 70) ** 2; // 50 stands for hills, 70 for mountains
    return minmax(normalLoss + diff * mod, 1, humidity);
  }

  void (function drawWindDirection() {
    const wind = prec.append("g").attr("id", "wind");

    d3.range(0, 6).forEach(function (t) {
      if (westerly.length > 1) {
        const west = westerly.filter(w => w[2] === t);
        if (west && west.length > 3) {
          const from = west[0][0],
            to = west[west.length - 1][0];
          const y = (grid.points[from][1] + grid.points[to][1]) / 2;
          wind.append("text").attr("text-rendering", "optimizeSpeed").attr("x", 20).attr("y", y).text("\u21C9");
        }
      }
      if (easterly.length > 1) {
        const east = easterly.filter(w => w[2] === t);
        if (east && east.length > 3) {
          const from = east[0][0],
            to = east[east.length - 1][0];
          const y = (grid.points[from][1] + grid.points[to][1]) / 2;
          wind
            .append("text")
            .attr("text-rendering", "optimizeSpeed")
            .attr("x", graphWidth - 52)
            .attr("y", y)
            .text("\u21C7");
        }
      }
    });

    if (northerly)
      wind
        .append("text")
        .attr("text-rendering", "optimizeSpeed")
        .attr("x", graphWidth / 2)
        .attr("y", 42)
        .text("\u21CA");
    if (southerly)
      wind
        .append("text")
        .attr("text-rendering", "optimizeSpeed")
        .attr("x", graphWidth / 2)
        .attr("y", graphHeight - 20)
        .text("\u21C8");
  })();

  TIME && console.timeEnd("generatePrecipitation");
}

// recalculate Voronoi Graph to pack cells
function reGraph() {
  TIME && console.time("reGraph");
  const {cells: gridCells, points, features} = grid;
  const newCells = {p: [], g: [], h: []}; // store new data
  const spacing2 = grid.spacing ** 2;

  for (const i of gridCells.i) {
    const height = gridCells.h[i];
    const type = gridCells.t[i];

    if (height < 20 && type !== -1 && type !== -2) continue; // exclude all deep ocean points
    if (type === -2 && (i % 4 === 0 || features[gridCells.f[i]].type === "lake")) continue; // exclude non-coastal lake points

    const [x, y] = points[i];
    addNewPoint(i, x, y, height);

    // add additional points for cells along coast
    if (type === 1 || type === -1) {
      if (gridCells.b[i]) continue; // not for near-border cells
      gridCells.c[i].forEach(function (e) {
        if (i > e) return;
        if (gridCells.t[e] === type) {
          const dist2 = (y - points[e][1]) ** 2 + (x - points[e][0]) ** 2;
          if (dist2 < spacing2) return; // too close to each other
          const x1 = rn((x + points[e][0]) / 2, 1);
          const y1 = rn((y + points[e][1]) / 2, 1);
          addNewPoint(i, x1, y1, height);
        }
      });
    }
  }

  function addNewPoint(i, x, y, height) {
    newCells.p.push([x, y]);
    newCells.g.push(i);
    newCells.h.push(height);
  }

  const {cells: packCells, vertices} = calculateVoronoi(newCells.p, grid.boundary);
  pack.vertices = vertices;
  pack.cells = packCells;
  pack.cells.p = newCells.p;
  pack.cells.g = createTypedArray({maxValue: grid.points.length, from: newCells.g});
  pack.cells.h = createTypedArray({maxValue: 100, from: newCells.h});
  pack.cells.area = createTypedArray({maxValue: UINT16_MAX, length: packCells.i.length}).map((_, cellId) => {
    const area = Math.abs(d3.polygonArea(getPackPolygon(cellId)));
    return Math.min(area, UINT16_MAX);
  });

  TIME && console.timeEnd("reGraph");
}

function isWetLand(moisture, temperature, height) {
  if (moisture > 40 && temperature > -2 && height < 25) return true; //near coast
  if (moisture > 24 && temperature > -2 && height > 24 && height < 60) return true; //off coast
  return false;
}

// assess cells suitability to calculate population and rand cells for culture center and burgs placement
function rankCells() {
  TIME && console.time("rankCells");
  const {cells, features} = pack;
  cells.s = new Int16Array(cells.i.length); // cell suitability array
  cells.pop = new Float32Array(cells.i.length); // cell population array

  const meanFlux = d3.median(cells.fl.filter(f => f)) || 0;
  const maxFlux = d3.max(cells.fl) + d3.max(cells.conf); // to normalize flux
  const meanArea = d3.mean(cells.area); // to adjust population by cell area

  const scoreMap = {
    estuary: 15,
    ocean_coast: 5,
    save_harbor: 20,
    freshwater: 30,
    salt: 10,
    frozen: 1,
    dry: -5,
    sinkhole: -5,
    lava: -30
  };

  for (const i of cells.i) {
    if (cells.h[i] < 20) continue; // no population in water
    let score = biomesData.habitability[cells.biome[i]]; // base suitability derived from biome habitability
    if (!score) continue; // uninhabitable biomes has 0 suitability

    if (meanFlux) score += normalize(cells.fl[i] + cells.conf[i], meanFlux, maxFlux) * 250; // big rivers and confluences are valued
    score -= (cells.h[i] - 50) / 5; // low elevation is valued, high is not;

    if (cells.t[i] === 1) {
      if (cells.r[i]) score += scoreMap.estuary;
      const feature = features[cells.f[cells.haven[i]]];
      if (feature.type === "lake") {
        score += scoreMap[feature.group] || 0;
      } else {
        score += scoreMap.ocean_coast;
        if (cells.harbor[i] === 1) score += scoreMap.save_harbor;
      }
    }

    cells.s[i] = score / 5; // general population rate
    // cell rural population is suitability adjusted by cell area
    cells.pop[i] = cells.s[i] > 0 ? (cells.s[i] * cells.area[i]) / meanArea : 0;
  }

  TIME && console.timeEnd("rankCells");
}

// show map stats on generation complete
function showStatistics() {
  const heightmap = ensureEl("templateInput").value;
  const isTemplate = heightmap in heightmapTemplates;
  const heightmapType = isTemplate ? "template" : "precreated";
  const isRandomTemplate = isTemplate && !locked("template") ? "random " : "";

  const stats = `  Seed: ${seed}
    Canvas size: ${graphWidth}x${graphHeight} px
    Heightmap: ${heightmap}
    Template: ${isRandomTemplate}${heightmapType}
    Points: ${grid.points.length}
    Cells: ${pack.cells.i.length}
    Map size: ${mapSizeOutput.value}%
    States: ${pack.states.length - 1}
    Provinces: ${pack.provinces.length - 1}
    Burgs: ${pack.burgs.length - 1}
    Religions: ${pack.religions.length - 1}
    Culture set: ${culturesSet.value}
    Cultures: ${pack.cultures.length - 1}`;

  mapId = Date.now(); // unique map id is it's creation date number
  window.mapId = mapId; // expose for test automation
  mapHistory.push({seed, width: graphWidth, height: graphHeight, template: heightmap, created: mapId});
  INFO && console.info(stats);

  // Dispatch event for test automation and external integrations
  window.dispatchEvent(new CustomEvent("map:generated", {detail: {seed, mapId}}));
}

const regenerateMap = debounce(async function (options) {
  WARN && console.warn("Generate new random map");

  const cellsDesired = +ensureEl("pointsInput").dataset.cells;
  const shouldShowLoading = cellsDesired > 10000;
  shouldShowLoading && showLoading();

  closeDialogs("#worldConfigurator, #options3d");
  customization = 0;
  resetZoom(1000);
  undraw();
  await generate(options);
  drawLayers();
  if (ThreeD.options.isOn) ThreeD.redraw();
  if ($("#worldConfigurator").is(":visible")) editWorld();

  fitMapToScreen();
  shouldShowLoading && hideLoading();
  clearMainTip();
}, 250);

// clear the map
function undraw() {
  viewbox
    .selectAll("path, circle, polygon, line, text, use, #texture > image, #zones > g, #armies > g, #ruler > g")
    .remove();
  ensureEl("deftemp")
    .querySelectorAll("path, clipPath, svg")
    .forEach(el => el.remove());
  ensureEl("coas").innerHTML = ""; // remove auto-generated emblems
  notes = [];
  unfog();
}
