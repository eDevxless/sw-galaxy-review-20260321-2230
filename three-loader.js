window.__threeLoadPromise = null;

window.loadThreeModule = function loadThreeModule() {
  if (typeof window.THREE !== "undefined") {
    return Promise.resolve(window.THREE);
  }
  if (window.__threeLoadPromise) {
    return window.__threeLoadPromise;
  }

  window.__threeLoadPromise = import("https://cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.min.js")
    .then((module) => {
      window.THREE = module;
      document.dispatchEvent(new Event("three-ready"));
      return module;
    })
    .catch((error) => {
      window.__threeLoadPromise = null;
      console.error("Three.js konnte nicht geladen werden.", error);
      throw error;
    });

  return window.__threeLoadPromise;
};
