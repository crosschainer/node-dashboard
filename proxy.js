// Node 18+. Run: `node server.js`
// Supports:
//   - HTTP  : http://<IP>:(26657|5678)/...        ← updated
//   - HTTPS : https://<IP>[:port]/... (any port; IP-only)
// Query params:
//   &host=<override Host header>   (HTTP/HTTPS)
//   &sni=<override TLS SNI>        (HTTPS)
//   &insecure=1 (skip TLS verify)  (HTTPS)

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { isIP } from "node:net";

const PORT = process.env.PORT || 8787;
const CONNECT_TIMEOUT_MS = 7000;
const INACTIVITY_TIMEOUT_MS = 20000;

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

function safeEndJson(res, status, obj, req, respondedRef) {
  if (respondedRef.sent || res.headersSent || res.writableEnded) {
    try { if (!res.writableEnded) res.end(); } catch {}
    return;
  }
  respondedRef.sent = true;
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...cors(req) });
  res.end(JSON.stringify(obj, null, 2));
}

function parseTarget(raw) {
  if (!raw) throw new Error("Missing ?url=scheme://<ip>[:port]/path");
  let u;
  try { u = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (!isIP(u.hostname)) throw new Error("Hostname must be a literal IP (v4 or v6)");
  if (u.protocol === "http:") {
    const allowed = new Set(["26657", "5000"]); // ← allow both 26657 and 5678
    const port = u.port || "";
    if (!allowed.has(port)) throw new Error("For http:// targets, port must be :26657 or :5000");
  } else if (u.protocol !== "https:") {
    throw new Error("Only http:// or https:// targets allowed");
  }
  return u;
}

function hintForCode(code) {
  switch (code) {
    case "ECONNREFUSED": return "Target port closed or service not listening.";
    case "ETIMEDOUT": return "Network timeout (firewall, routing, or host down).";
    case "EHOSTUNREACH": return "No route to host (routing/firewall).";
    case "ENETUNREACH": return "Network unreachable from proxy host.";
    case "ECONNRESET": return "Connection reset by peer or middlebox.";
    case "ERR_TLS_CERT_ALTNAME_INVALID": return "TLS name mismatch (use &sni=<host> / &host=<host> or &insecure=1).";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "SELF_SIGNED_CERT_IN_CHAIN": return "Self-signed/untrusted cert (use &insecure=1 or install a proper cert).";
    default: return "Check connectivity from proxy host, firewall rules, and TLS settings.";
  }
}

const server = http.createServer((req, res) => {
  const responded = { sent: false };
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  // Health
  if (req.method === "GET" && reqUrl.pathname === "/") {
    return safeEndJson(res, 200, {
      ok: true,
      usage: "/proxy?url=http://<ip>:(26657|5000)/<path>  OR  /proxy?url=https://<ip>[:port]/<path>[&host=..][&sni=..][&insecure=1]"
    }, req, responded);
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    if (!responded.sent && !res.headersSent) res.writeHead(204, cors(req));
    if (!res.writableEnded) res.end();
    return;
  }

  if (req.method !== "GET" || reqUrl.pathname !== "/proxy") {
    return safeEndJson(res, 404, { error: "Not found" }, req, responded);
  }

  let target;
  try { target = parseTarget(reqUrl.searchParams.get("url")); }
  catch (e) { return safeEndJson(res, 400, { error: e.message }, req, responded); }

  const insecure = true;
  const hostOverride = reqUrl.searchParams.get("host"); // HTTP Host header
  const sniOverride  = reqUrl.searchParams.get("sni");  // TLS SNI
  const isHttps = target.protocol === "https:";
  const port = Number(target.port) || (isHttps ? 443 : (target.protocol === "http:" ? 80 : 0)); // explicit http ports required by parseTarget

  const headers = {
    "Accept": "application/json, text/html, */*;q=0.1",
    "Accept-Encoding": "identity",
    "User-Agent": "Any-IP-Proxy/1.1",
    "Connection": "close",
    "Host": hostOverride ? `${hostOverride}${target.port ? ":"+target.port : ""}` : target.host,
  };

  const optionsBase = {
    host: target.hostname,   // literal IP
    port,
    path: target.pathname + target.search,
    method: "GET",
    headers,
  };

  const options = isHttps
    ? {
        ...optionsBase,
        servername: sniOverride || (hostOverride || undefined),
        rejectUnauthorized: !insecure,
      }
    : optionsBase;

  const client = (isHttps ? https : http).request(options);

  client.once("response", (up) => {
    if (responded.sent) { try { up.destroy(); } catch {} return; }

    const safe = {};
    for (const [k, v] of Object.entries(up.headers)) {
      const lk = k.toLowerCase();
      if ([
        "content-type","content-length","etag","last-modified","date",
        "cache-control","expires","content-disposition"
      ].includes(lk)) {
        safe[k] = Array.isArray(v) ? v.join(", ") : v;
      }
    }

    responded.sent = true;
    if (!res.headersSent) res.writeHead(up.statusCode || 502, { ...safe, ...cors(req) });

    let idle = setTimeout(() => { try { client.destroy(new Error("Upstream inactivity timeout")); } catch {} }, INACTIVITY_TIMEOUT_MS);
    up.on("data", () => { clearTimeout(idle); idle = setTimeout(() => { try { client.destroy(new Error("Upstream inactivity timeout")); } catch {} }, INACTIVITY_TIMEOUT_MS); });

    up.pipe(res);
    up.once("end", () => { clearTimeout(idle); });
    up.once("error", () => { clearTimeout(idle); try { res.end(); } catch {} });
  });

  client.once("timeout", () => {
    client.destroy(Object.assign(new Error("TCP connect timeout"), { code: "ETIMEDOUT" }));
  });
  client.setTimeout(CONNECT_TIMEOUT_MS);

  client.once("error", (err) => {
    const code = /** @type {any} */(err).code || "UNKNOWN";
    const errno = /** @type {any} */(err).errno || "";
    const details = (err && err.message) ? err.message : String(err);

    if (responded.sent || res.headersSent) {
      try { if (!res.writableEnded) res.end(); } catch {}
      return;
    }

    safeEndJson(res, 502, {
      error: "Upstream fetch failed",
      code,
      errno,
      details,
      target: `${target.protocol}//${target.hostname}:${port}${target.pathname}${target.search}`,
      hints: [
        hintForCode(code),
        (target.protocol === "https:") ? "Try &insecure=1 or set &sni=<expected.domain> (and optionally &host=<expected.domain>)." : undefined,
      ].filter(Boolean)
    }, req, responded);
  });

  client.end();
});

server.listen(PORT, () => {
  console.log(`Any-IP proxy listening on :${PORT}`);
});
