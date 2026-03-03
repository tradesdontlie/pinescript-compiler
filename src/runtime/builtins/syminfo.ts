// Pine Script v6 syminfo built-in module

export interface SymInfo {
  ticker: string;
  tickerid: string;
  prefix: string;
  root: string;
  mintick: number;
  pointvalue: number;
  timezone: string;
  type: string;
  session: string;
  basecurrency: string;
  currency: string;
  description: string;
}

/**
 * Create a default syminfo object.
 * Users can override individual fields when loading real market data.
 */
export function createSyminfo(): SymInfo {
  return {
    ticker: 'AAPL',
    tickerid: 'NASDAQ:AAPL',
    prefix: 'NASDAQ',
    root: 'AAPL',
    mintick: 0.01,
    pointvalue: 1,
    timezone: 'America/New_York',
    type: 'stock',
    session: 'regular',
    basecurrency: 'USD',
    currency: 'USD',
    description: 'Apple Inc.',
  };
}
