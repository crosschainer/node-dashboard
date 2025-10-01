// Node 18+. Run: `node server.js`
// Examples:
//   HTTP 26657: https://proxy.example.com/proxy?url=http://89.163.130.217:26657/net_info
//   HTTPS any IP: https://proxy.example.com/proxy?url=https://127.0.0.1/graphiql
//   HTTPS w/ overrides: https://proxy.example.com/proxy?url=https://203.0.113.10:8443/api&host=api.example.com&sni=api.example.com
//   HTTPS insecure (skip TLS verify): ...&insecure=1

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

function sendJson(res, status, obj, req) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...cors(req) });
  res.end(JSON.stringify(obj, null, 2));
}

function parseTarget(raw) {
  if (!raw) throw new Error("Missing ?url=scheme://<ip>[:port]/path");
  let u;
  try { u = new URL(raw); } catch { throw new Error("Invalid URL"); }
  // Only literal IPs allowed (you asked for "all IPs")
  if (!isIP(u.hostname)) throw new Error("Hostname must be a literal IP (v4 or v6)");
  // For HTTP flows, keep your original constraint to :26657
  if (u.protocol === "http:" && (u.port || "") !== "26657") {
    throw new Error("For http:// targets, port must be :26657");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
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
    case "ECONNRESET": return "Connection reset (intermediate firewall/IDS or service dropped).";
    case "ERR_TLS_CERT_ALTNAME_INVALID": return "TLS name mismatch (use &sni=<host> and/or &host=<host>, or &insecure=1).";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return "Self-signed or untrusted cert (use &insecure=1 or install proper cert).";
    default: return "Check connectivity from proxy host (curl/nc), firewall rules, or TLS settings.";
  }
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  // Health
  if (req.method === "GET" && reqUrl.pathname === "/") {
    return sendJson(res, 200, {
      ok: true,
      usage: "/proxy?url=http://<ip>:26657/<path>  OR  /proxy?url=https://<ip>[:port]/<path>[&host=..][&sni=..][&insecure=1]"
    }, req);
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

  const insecure = reqUrl.searchParams.get("insecure") === "1";
  const hostOverride = reqUrl.searchParams.get("host"); // sets HTTP Host header
  const sniOverride  = reqUrl.searchParams.get("sni");  // sets TLS SNI servername

  const isHttps = target.protocol === "https:";
  const port = Number(target.port) || (isHttps ? 443 : 26657);

  const headers = {
    "Accept": "application/json, text/html, */*;q=0.1",
    "Accept-Encoding": "identity",
    "User-Agent": "AnyIP-Proxy/1.1",
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
        servername: sniOverride || (hostOverride || undefined), // controls SNI
        rejectUnauthorized: !insecure,  // allow self-signed / CN mismatch if insecure=1
      }
    : optionsBase;

  const client = (isHttps ? https : http).request(options, (up) => {
    // Pass through safe headers + CORS
    const safe = {};
    for (const [k, v] of Object.entries(up.headers)) {
      const lk = k.toLowerCase();
      if ([
        "content-type","content-length","etag","last-modified","date","cache-control","expires",
        // allow basic HTML/JS assets too
        "content-disposition"
      ].includes(lk)) {
        safe[k] = Array.isArray(v) ? v.join(", ") : v;
      }
    }
    res.writeHead(up.statusCode || 502, { ...safe, ...cors(req) });

    // Inactivity timeout
    let idle = setTimeout(() => { try { client.destroy(new Error("Upstream inactivity timeout")); } catch {} }, INACTIVITY_TIMEOUT_MS);
    up.on("data", () => { clearTimeout(idle); idle = setTimeout(() => { try { client.destroy(new Error("Upstream inactivity timeout")); } catch {} }, INACTIVITY_TIMEOUT_MS); });

    up.pipe(res);
    up.on("end", () => { clearTimeout(idle); });
  });

  client.setTimeout(CONNECT_TIMEOUT_MS, () => {
    client.destroy(Object.assign(new Error("TCP connect timeout"), { code: "ETIMEDOUT" }));
  });

  client.on("error", (err) => {
    const code = /** @type {any} */(err).code || "UNKNOWN";
    const errno = /** @type {any} */(err).errno || "";
    const details = (err && err.message) ? err.message : String(err);
    sendJson(res, 502, {
      error: "Upstream fetch failed",
      code,
      errno,
      details,
      target: `${target.protocol}//${target.hostname}:${port}${target.pathname}${target.search}`,
      hints: [
        hintForCode(code),
        isHttps ? "Try adding &insecure=1 or set &sni=<expected.domain> (and optionally &host=<expected.domain>)." : undefined,
      ].filter(Boolean)
    }, req);
  });

  client.end();
});

server.listen(PORT, () => {
  console.log(`Any-IP proxy listening on :${PORT}`);
});
