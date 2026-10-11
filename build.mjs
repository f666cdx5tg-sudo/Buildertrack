import { build } from "esbuild";
import fs from "fs";

const version = /APP_VERSION = "([^"]+)"/.exec(fs.readFileSync("src/app.jsx", "utf8"))[1];
const r = await build({
  entryPoints: ["src/app.jsx"], bundle: true, minify: true, write: false,
  format: "iife", target: "es2020", jsx: "transform",
  define: { "process.env.NODE_ENV": '"production"' }, legalComments: "none",
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const page = ({ title, manifest, appTitle }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${title}</title>
<meta name="theme-color" content="#0f0f0f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${appTitle}">
<link rel="manifest" href="${manifest}">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%}body{background:#0f0f0f}#root{height:100vh}
@media (max-width:800px){.bt-big{grid-template-columns:1fr !important}}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;

const manifest = (name, short, start, id) => JSON.stringify({
  name, short_name: short, id, start_url: start, scope: "./", display: "standalone",
  background_color: "#0f0f0f", theme_color: "#0f0f0f", orientation: "any",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
}, null, 2);

// Network-first so a new version shows up on the next open; cached copy when offline.
const sw = `const CACHE = "buildtrack-${version}";
const SHELL = ["./", "index.html", "request.html", "manifest.webmanifest", "manifest-tenant.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match("index.html"))));
});
`;

fs.writeFileSync("index.html", page({ title: "BuildTrack NYC", manifest: "manifest.webmanifest", appTitle: "BuildTrack" }));
fs.writeFileSync("request.html", page({ title: "Repair Request", manifest: "manifest-tenant.webmanifest", appTitle: "Repair Request" }));
fs.writeFileSync("manifest.webmanifest", manifest("BuildTrack NYC", "BuildTrack", "./index.html", "buildtrack-manager"));
fs.writeFileSync("manifest-tenant.webmanifest", manifest("Repair Request", "Repairs", "./request.html", "buildtrack-tenant"));
fs.writeFileSync("sw.js", sw);
console.log("built v" + version, (fs.statSync("index.html").size / 1024).toFixed(0) + " KB x2");
