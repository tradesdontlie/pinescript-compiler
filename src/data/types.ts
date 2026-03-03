export interface Bar {
  time: number;    // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DataSet {
  bars: Bar[];
  symbol: string;
  timeframe: string;
}
