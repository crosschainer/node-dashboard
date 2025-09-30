// Node 18+. Run: `node server.js`
// Call: https://proxy.example.com/proxy?url=http://<IP>:26657/<path>[&host=example.com]

import http from "node:http";
import { URL } from "node:url";
import { isIP } from "node:net";

const PORT = process.env.PORT || 8787;
const CONNECT_TIMEOUT_MS = 5000; // time to establish TCP
const INACTIVITY_TIMEOUT_MS = 15000; // no data for this long -> abort

function cors(req, extra = {}) {
  const origin = req.headers.origin || "*";
  const acrh = req.headers["access-control-request-headers"] || "Content-Type, Authorization";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": acrh,
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

function sendJson(res, status, obj, req) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...cors(req) });
  res.end(JSON.stringify(obj, null, 2));
}

function parseTarget(raw) {
  if (!raw) throw new Error("Missing ?url=http://<ip>:26657/<path>");
  let u;
  try { u = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (u.protocol !== "http:") throw new Error("Only http:// targets allowed");
  if ((u.port || "") !== "26657") throw new Error("Target must include :26657");
  if (!isIP(u.hostname)) throw new Error("Hostname must be a literal IP");
  return u;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  // Health
  if (req.method === "GET" && reqUrl.pathname === "/") {
    return sendJson(res, 200, { ok: true, usage: "/proxy?url=http://<ip>:26657/<path>[&host=domain]" }, req);
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors(req));
    return res.end();
  }

  if (req.method !== "GET" || reqUrl.pathname !== "/proxy") {
    return sendJson(res, 404, { error: "Not found" }, req);
  }

  let target;
  try { target = parseTarget(reqUrl.searchParams.get("url")); }
  catch (e) { return sendJson(res, 400, { error: e.message }, req); }

  const hostOverride = reqUrl.searchParams.get("host"); // optional

  // Build outbound request options
  const options = {
    host: target.hostname, // IP literal
    port: Number(target.port) || 26657,
    path: target.pathname + target.search,
    method: "GET",
    headers: {
      "Accept": "application/json, */*;q=0.1",
      "Accept-Encoding": "identity",
      "User-Agent": "Simple-26657-Proxy/1.0",
      "Host": hostOverride ? `${hostOverride}${target.port ? ":"+target.port : ""}` : target.host,
      "Connection": "close",
    },
  };

  const upstream = http.request(options, (up) => {
    // Pass through safe headers + CORS
    const safe = {};
    for (const [k, v] of Object.entries(up.headers)) {
      const lk = k.toLowerCase();
      if (["content-type","content-length","etag","last-modified","date","cache-control","expires"].includes(lk)) {
        safe[k] = Array.isArray(v) ? v.join(", ") : v;
      }
    }
    res.writeHead(up.statusCode || 502, { ...safe, ...cors(req) });

    // Inactivity timeout
    let idleTimer = setTimeout(() => { try { upstream.destroy(new Error("Upstream inactivity timeout")); } catch {} }, INACTIVITY_TIMEOUT_MS);
    up.on("data", () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { try { upstream.destroy(new Error("Upstream inactivity timeout")); } catch {} }, INACTIVITY_TIMEOUT_MS); });

    up.pipe(res);
    up.on("end", () => { clearTimeout(idleTimer); });
  });

  // Connection timeout
  upstream.setTimeout(CONNECT_TIMEOUT_MS, () => {
    upstream.destroy(Object.assign(new Error("TCP connect timeout"), { code: "ETIMEDOUT" }));
  });

  upstream.on("error", (err) => {
    const code = /** @type {any} */(err).code || "UNKNOWN";
    const errno = /** @type {any} */(err).errno || "";
    const details = (err && err.message) ? err.message : String(err);
    sendJson(res, 502, {
      error: "Upstream fetch failed",
      code,
      errno,
      details,
      target: `${target.hostname}:${target.port}${target.pathname}${target.search}`,
      hint: hintForCode(code),
    }, req);
  });

  upstream.end();
});

function hintForCode(code) {
  switch (code) {
    case "ECONNREFUSED": return "Target port closed or service not listening.";
    case "ETIMEDOUT": return "Network timeout (firewall, routing, or host down).";
    case "EHOSTUNREACH": return "No route to host (routing/firewall).";
    case "ENETUNREACH": return "Network unreachable from proxy host.";
    case "ECONNRESET": return "Connection reset (intermediate firewall/IDS or service dropped).";
    default: return "Check connectivity from the proxy host (curl/nc), firewall rules, and whether the node restricts source IPs.";
  }
}

server.listen(PORT, () => {
  console.log(`26657 proxy listening on :${PORT}`);
});
