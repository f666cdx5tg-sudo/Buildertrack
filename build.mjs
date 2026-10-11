import { build } from "esbuild";
import fs from "fs";
const r = await build({
  entryPoints: ["src/app.jsx"], bundle: true, minify: true, write: false,
  format: "iife", target: "es2020", jsx: "transform",
  define: { "process.env.NODE_ENV": '"production"' }, legalComments: "none",
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BuildTrack NYC</title>
<meta name="theme-color" content="#0A0A0E">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="BuildTrack">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%}body{background:#0A0A0E}#root{height:100vh}
@media (max-width:800px){.bt-big{grid-template-columns:1fr !important}}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;
fs.writeFileSync("dist-BuildTrack-NYC.html", html);
console.log("built", (html.length/1024).toFixed(0)+" KB");
