const DEFAULT_NODE_ADDRESS = '89.163.130.217';
const DEFAULT_RPC_PORT = '26657';
const HTTP_PROXY_PREFIX = 'https://cors.isomorphic-git.org/';

type SupportedProtocol = 'http:' | 'https:';

export interface NodeConnection {
  /**
   * Base URL used internally by the dashboard for all RPC requests. This may include
   * a proxy prefix when the node only exposes HTTP.
   */
  baseUrl: string;
  /**
   * Host (and optional port) shown to the user. This preserves any user supplied
   * port while hiding implementation details like the proxy prefix.
   */
  inputValue: string;
  /**
   * Direct RPC endpoint (protocol + host + port) used before any proxy is applied.
   */
  rpcUrl: string;
  /**
   * True when requests are routed through the proxy helper in order to access HTTP endpoints
   * from the browser without mixed-content issues.
   */
  usesProxy: boolean;
  /**
   * Protocol chosen for the RPC connection. Defaults to HTTP when the user input does not
   * specify one.
   */
  protocol: SupportedProtocol;
  /**
   * Hostname or IP address extracted from the user input.
   */
  hostname: string;
  /**
   * Port appended to the RPC endpoint. Defaults to 26657 unless the user explicitly
   * provides a different port.
   */
  port: string;
}

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z+.-]*:\/\//;

function ensureLeadingProtocol(value: string): string {
  if (!value || !value.trim()) {
    return `http://${DEFAULT_NODE_ADDRESS}`;
  }

  if (PROTOCOL_PATTERN.test(value)) {
    return value;
  }

  return `http://${value}`;
}

function stripHostnameBrackets(hostname: string): string {
  if (!hostname) {
    return hostname;
  }

  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }

  return hostname;
}

function normaliseHostname(hostname: string): string {
  if (!hostname) {
    return DEFAULT_NODE_ADDRESS;
  }

  // IPv6 hostnames need to retain brackets when a port is appended. The WHATWG URL API
  // already includes them, so we only need to add brackets if they are missing.
  if (hostname.includes(':') && !hostname.startsWith('[') && !hostname.endsWith(']')) {
    return `[${hostname}]`;
  }

  return hostname;
}

function determinePort(providedPort: string | number | undefined | null): string {
  if (typeof providedPort === 'string' && providedPort.trim().length > 0) {
    return providedPort;
  }

  if (typeof providedPort === 'number' && Number.isFinite(providedPort)) {
    return String(providedPort);
  }

  return DEFAULT_RPC_PORT;
}

export function buildNodeConnection(rawInput: string): NodeConnection {
  const safeInput = rawInput?.trim() ?? '';
  const withProtocol = ensureLeadingProtocol(safeInput || DEFAULT_NODE_ADDRESS);

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch (error) {
    parsed = new URL(`http://${DEFAULT_NODE_ADDRESS}`);
  }

  const protocol = (parsed.protocol === 'https:' ? 'https:' : 'http:') as SupportedProtocol;
  const hostname = parsed.hostname || DEFAULT_NODE_ADDRESS;
  const normalisedHost = normaliseHostname(hostname);
  const port = determinePort(parsed.port);

  const hostWithPort = port ? `${normalisedHost}:${port}` : normalisedHost;
  const rpcUrl = `${protocol}//${hostWithPort}`;
  const usesProxy = protocol === 'http:';
  const baseUrl = usesProxy ? `${HTTP_PROXY_PREFIX}${rpcUrl}` : rpcUrl;

  const cleanedInput = (() => {
    const rawHostname = stripHostnameBrackets(hostname) || DEFAULT_NODE_ADDRESS;
    const hasCustomPort = Boolean(parsed.port && parsed.port !== DEFAULT_RPC_PORT);

    if (hasCustomPort) {
      const hostForDisplay = rawHostname.includes(':') ? `[${rawHostname}]` : rawHostname;
      return `${hostForDisplay}:${parsed.port}`;
    }

    return rawHostname;
  })();

  return {
    baseUrl,
    inputValue: cleanedInput || stripHostnameBrackets(hostname),
    rpcUrl,
    usesProxy,
    protocol,
    hostname: stripHostnameBrackets(hostname),
    port,
  };
}

export { DEFAULT_NODE_ADDRESS, DEFAULT_RPC_PORT, HTTP_PROXY_PREFIX };
