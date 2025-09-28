export interface NodeInfo {
  protocol_version: {
    p2p: string;
    block: string;
    app: string;
  };
  id: string;
  listen_addr: string;
  network: string;
  version: string;
  channels: string;
  moniker: string;
  other: {
    tx_index: string;
    rpc_address: string;
  };
}

export interface SyncInfo {
  latest_block_hash: string;
  latest_app_hash: string;
  latest_block_height: string;
  latest_block_time: string;
  earliest_block_hash: string;
  earliest_app_hash: string;
  earliest_block_height: string;
  earliest_block_time: string;
  catching_up: boolean;
}

export interface ValidatorInfo {
  address: string;
  pub_key: {
    type: string;
    value: string;
  };
  voting_power: string;
}

export interface StatusResponse {
  jsonrpc: string;
  id: number;
  result: {
    node_info: NodeInfo;
    sync_info: SyncInfo;
    validator_info: ValidatorInfo;
  };
}

export interface PeerInfo {
  node_info: NodeInfo;
  is_outbound: boolean;
  connection_status: {
    Duration: string;
    SendMonitor: {
      Start: string;
      Bytes: string;
      Samples: string;
      InstRate: string;
      CurRate: string;
      AvgRate: string;
      PeakRate: string;
      BytesRem: string;
      Duration: string;
      Idle: string;
      TimeRem: string;
      Progress: number;
      Active: boolean;
    };
    RecvMonitor: {
      Start: string;
      Bytes: string;
      Samples: string;
      InstRate: string;
      CurRate: string;
      AvgRate: string;
      PeakRate: string;
      BytesRem: string;
      Duration: string;
      Idle: string;
      TimeRem: string;
      Progress: number;
      Active: boolean;
    };
    Channels: Array<{
      ID: number;
      SendQueueCapacity: string;
      SendQueueSize: string;
      Priority: string;
      RecentlySent: string;
    }>;
  };
  remote_ip: string;
}

export interface NetInfoResponse {
  jsonrpc: string;
  id: number;
  result: {
    listening: boolean;
    listeners: string[];
    n_peers: string;
    peers: PeerInfo[];
  };
}

export interface ABCIInfoResponse {
  jsonrpc: string;
  id: number;
  result: {
    response: {
      version: string;
      app_version: string;
      last_block_height: string;
      last_block_app_hash: string;
    };
  };
}

export interface NodeHealth {
  isOnline: boolean;
  isSynced: boolean;
  hasErrors: boolean;
  errorMessages: string[];
  lastUpdated: Date;
}

export interface DashboardData {
  status: StatusResponse | null;
  netInfo: NetInfoResponse | null;
  abciInfo: ABCIInfoResponse | null;
  health: NodeHealth;
  loading: boolean;
  error: string | null;
}