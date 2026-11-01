const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const port = 4179;
const previewCode = "lokale-vorschau";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

async function handleLogin(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) {
      sendJson(response, 413, { error: "Request too large" });
      return;
    }
  }

  let submittedCode = "";
  try {
    submittedCode = JSON.parse(body).password || "";
  } catch (_error) {
    sendJson(response, 400, { error: "Invalid request" });
    return;
  }
  if (submittedCode !== previewCode) {
    sendJson(response, 403, { error: "Im lokalen Testlauf lautet der Code: lokale-vorschau" });
    return;
  }

  const payload = Buffer.from(JSON.stringify({
    sub: "admin",
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString("base64url");
  sendJson(response, 200, { token: `${payload}.local-preview` });
}

function serveFile(requestPath, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(requestPath);
  } catch (_error) {
    response.writeHead(400).end("Bad request");
    return;
  }
  const filePath = path.resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.stat(filePath, (statError, stats) => {
    const resolvedPath = stats?.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.stat(resolvedPath, (fileError, fileStats) => {
      if (fileError || !fileStats.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      const type = mimeTypes[path.extname(resolvedPath).toLowerCase()] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
      fs.createReadStream(resolvedPath).pipe(response);
    });
  });
}

http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname === "/api/admin/login") {
    void handleLogin(request, response);
    return;
  }
  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "This local preview has no production API." });
    return;
  }
  serveFile(pathname, response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Lokaler Testserver: http://127.0.0.1:${port}/?admin=1`);
  console.log("Testcode lokale-vorschau; Gebiete und Banner werden nur im Browser gespeichert.");
});
