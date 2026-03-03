import { UTCTimestamp } from 'lightweight-charts';
import { StrategyResult } from '../runtime/builtins/strategy';

/**
 * Collect strategy trade entry/exit markers (does not call setMarkers).
 * Entry: arrowUp (long) or arrowDown (short) below/above bar.
 * Exit: opposite arrow, colored by P&L (green=profit, red=loss).
 */
export function collectStrategyMarkers(
  strategy: StrategyResult,
): any[] {
  const markers: any[] = [];

  for (const trade of strategy.trades ?? []) {
    // Entry marker
    const entryTimeSec = Math.floor(trade.entryTime / 1000);
    markers.push({
      time: entryTimeSec as UTCTimestamp,
      position: trade.direction === 'long' ? 'belowBar' : 'aboveBar',
      color: trade.direction === 'long' ? '#4CAF50' : '#FF5252',
      shape: trade.direction === 'long' ? 'arrowUp' : 'arrowDown',
      text: `${trade.direction === 'long' ? 'L' : 'S'} ${trade.entryPrice.toFixed(2)}`,
    });

    // Exit marker
    if (trade.exitTime && trade.exitPrice != null) {
      const exitTimeSec = Math.floor(trade.exitTime / 1000);
      const pnl = trade.profit ?? 0;
      markers.push({
        time: exitTimeSec as UTCTimestamp,
        position: trade.direction === 'long' ? 'aboveBar' : 'belowBar',
        color: pnl >= 0 ? '#4CAF50' : '#FF5252',
        shape: pnl >= 0 ? 'arrowDown' : 'arrowUp',
        text: `X ${trade.exitPrice.toFixed(2)}`,
      });
    }
  }

  return markers;
}
