// Strategy backtesting engine for Pine Script v6

export interface ClosedTrade {
  id: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  profit: number;
  entryBar: number;
  exitBar: number;
  entryTime: number;
  exitTime: number;
}

export interface StrategyResult {
  trades: ClosedTrade[];
  equityCurve: { time: number; equity: number }[];
  netProfit: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
}

interface PendingOrder {
  id: string;
  direction: 'long' | 'short';
  qty: number;
  type: 'market' | 'limit' | 'stop';
  limitPrice?: number;
  stopPrice?: number;
  isEntry: boolean;
  fromEntry?: string;
  profitTicks?: number;
  lossTicks?: number;
}

interface OpenPosition {
  direction: 'long' | 'short';
  qty: number;
  avgPrice: number;
  entryBar: number;
  entryTime: number;
  entryId: string;
}

export interface StrategyEngine {
  entry(id: string, direction: string, qty?: number, limit?: number, stop?: number): void;
  close(id?: string, qty?: number): void;
  exit(id: string, fromEntry?: string, profit?: number, loss?: number, limit?: number, stop?: number): void;
  order(id: string, direction: string, qty: number, limit?: number, stop?: number): void;
  cancel(id: string): void;
  cancelAll(): void;

  // Properties
  position_size: number;
  position_avg_price: number;
  equity: number;
  closedtrades: number;
  opentrades: number;
  netprofit: number;
  grossprofit: number;
  grossloss: number;

  // Constants
  long: string;
  short: string;

  // Internal - called by engine each bar
  processBar(barIndex: number, open: number, high: number, low: number, close: number, time: number): void;
  getResult(): StrategyResult;
}

export function createStrategyEngine(initialCapital?: number): StrategyEngine {
  const capital = initialCapital ?? 100000;

  let currentEquity = capital;
  let position: OpenPosition | null = null;
  const pendingOrders: PendingOrder[] = [];
  const closedTrades: ClosedTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];

  let grossProfit = 0;
  let grossLoss = 0;

  // Current bar data (set by processBar before user code runs)
  let barIndex = 0;
  let barOpen = 0;
  let barHigh = 0;
  let barLow = 0;
  let barClose = 0;
  let barTime = 0;

  // Orders queued during user script execution (applied at NEXT bar)
  let queuedOrders: PendingOrder[] = [];

  function fillOrder(order: PendingOrder, fillPrice: number): void {
    if (order.isEntry) {
      // Close any opposite position first
      if (position && position.direction !== order.direction) {
        closePosition(fillPrice, order.id);
      }

      // Open new position or add to existing
      if (!position) {
        position = {
          direction: order.direction,
          qty: order.qty,
          avgPrice: fillPrice,
          entryBar: barIndex,
          entryTime: barTime,
          entryId: order.id,
        };
      } else if (position.direction === order.direction) {
        // Pyramiding: average in
        const totalQty = position.qty + order.qty;
        position.avgPrice = (position.avgPrice * position.qty + fillPrice * order.qty) / totalQty;
        position.qty = totalQty;
      }
    } else {
      // Exit / close order
      if (position) {
        const qtyToClose = Math.min(order.qty, position.qty);
        closePositionPartial(fillPrice, qtyToClose, order.id);
      }
    }
  }

  function closePosition(exitPrice: number, exitId: string): void {
    if (!position) return;
    closePositionPartial(exitPrice, position.qty, exitId);
  }

  function closePositionPartial(exitPrice: number, qty: number, exitId: string): void {
    if (!position) return;

    const qtyToClose = Math.min(qty, position.qty);
    let profit: number;
    if (position.direction === 'long') {
      profit = (exitPrice - position.avgPrice) * qtyToClose;
    } else {
      profit = (position.avgPrice - exitPrice) * qtyToClose;
    }

    closedTrades.push({
      id: exitId,
      direction: position.direction,
      entryPrice: position.avgPrice,
      exitPrice,
      qty: qtyToClose,
      profit,
      entryBar: position.entryBar,
      exitBar: barIndex,
      entryTime: position.entryTime,
      exitTime: barTime,
    });

    if (profit > 0) {
      grossProfit += profit;
    } else {
      grossLoss += Math.abs(profit);
    }

    currentEquity += profit;

    if (qtyToClose >= position.qty) {
      position = null;
    } else {
      position.qty -= qtyToClose;
    }
  }

  function tryFillPending(): void {
    // Process pending orders against current bar's OHLC
    const remaining: PendingOrder[] = [];

    for (const order of pendingOrders) {
      let filled = false;

      if (order.type === 'market') {
        // Market orders fill at this bar's open
        fillOrder(order, barOpen);
        filled = true;
      } else if (order.type === 'limit') {
        // Limit buy fills if low <= limitPrice; limit sell fills if high >= limitPrice
        const limitPrice = order.limitPrice!;
        if (order.direction === 'long' && barLow <= limitPrice) {
          fillOrder(order, limitPrice);
          filled = true;
        } else if (order.direction === 'short' && barHigh >= limitPrice) {
          fillOrder(order, limitPrice);
          filled = true;
        }
      } else if (order.type === 'stop') {
        // Stop buy fills if high >= stopPrice; stop sell fills if low <= stopPrice
        const stopPrice = order.stopPrice!;
        if (order.direction === 'long' && barHigh >= stopPrice) {
          fillOrder(order, stopPrice);
          filled = true;
        } else if (order.direction === 'short' && barLow <= stopPrice) {
          fillOrder(order, stopPrice);
          filled = true;
        }
      }

      if (!filled) {
        remaining.push(order);
      }
    }

    pendingOrders.length = 0;
    pendingOrders.push(...remaining);
  }

  function getUnrealizedPnL(): number {
    if (!position) return 0;
    if (position.direction === 'long') {
      return (barClose - position.avgPrice) * position.qty;
    } else {
      return (position.avgPrice - barClose) * position.qty;
    }
  }

  const engine: StrategyEngine = {
    entry(id: string, direction: string, qty?: number, limit?: number, stop?: number): void {
      const dir = direction === 'long' ? 'long' : 'short';
      const orderQty = qty ?? 1;

      let orderType: 'market' | 'limit' | 'stop' = 'market';
      if (limit !== undefined) orderType = 'limit';
      else if (stop !== undefined) orderType = 'stop';

      // Remove any existing entry order with same id
      const idx = queuedOrders.findIndex(o => o.id === id && o.isEntry);
      if (idx >= 0) queuedOrders.splice(idx, 1);

      queuedOrders.push({
        id,
        direction: dir,
        qty: orderQty,
        type: orderType,
        limitPrice: limit,
        stopPrice: stop,
        isEntry: true,
      });
    },

    close(id?: string, qty?: number): void {
      if (!position) return;

      // If id is specified, only close if position was entered with that id
      if (id && position.entryId !== id) return;

      queuedOrders.push({
        id: id ?? '__close__',
        direction: position.direction === 'long' ? 'short' : 'long',
        qty: qty ?? position.qty,
        type: 'market',
        isEntry: false,
      });
    },

    exit(id: string, fromEntry?: string, profit?: number, loss?: number, limit?: number, stop?: number): void {
      if (!position) return;
      if (fromEntry && position.entryId !== fromEntry) return;

      // Calculate limit/stop from profit/loss ticks relative to entry
      let exitLimit = limit;
      let exitStop = stop;

      if (profit !== undefined && exitLimit === undefined) {
        if (position.direction === 'long') {
          exitLimit = position.avgPrice + profit;
        } else {
          exitLimit = position.avgPrice - profit;
        }
      }
      if (loss !== undefined && exitStop === undefined) {
        if (position.direction === 'long') {
          exitStop = position.avgPrice - loss;
        } else {
          exitStop = position.avgPrice + loss;
        }
      }

      // Create limit exit if specified
      if (exitLimit !== undefined) {
        queuedOrders.push({
          id,
          direction: position.direction === 'long' ? 'short' : 'long',
          qty: position.qty,
          type: 'limit',
          limitPrice: exitLimit,
          isEntry: false,
          fromEntry,
        });
      }

      // Create stop exit if specified
      if (exitStop !== undefined) {
        queuedOrders.push({
          id: id + '_stop',
          direction: position.direction === 'long' ? 'short' : 'long',
          qty: position.qty,
          type: 'stop',
          stopPrice: exitStop,
          isEntry: false,
          fromEntry,
        });
      }

      // If neither limit nor stop, market exit
      if (exitLimit === undefined && exitStop === undefined) {
        queuedOrders.push({
          id,
          direction: position.direction === 'long' ? 'short' : 'long',
          qty: position.qty,
          type: 'market',
          isEntry: false,
          fromEntry,
        });
      }
    },

    order(id: string, direction: string, qty: number, limit?: number, stop?: number): void {
      const dir = direction === 'long' ? 'long' : 'short';
      let orderType: 'market' | 'limit' | 'stop' = 'market';
      if (limit !== undefined) orderType = 'limit';
      else if (stop !== undefined) orderType = 'stop';

      queuedOrders.push({
        id,
        direction: dir,
        qty,
        type: orderType,
        limitPrice: limit,
        stopPrice: stop,
        isEntry: true,
      });
    },

    cancel(id: string): void {
      // Remove pending orders with this id
      for (let i = pendingOrders.length - 1; i >= 0; i--) {
        if (pendingOrders[i].id === id) {
          pendingOrders.splice(i, 1);
        }
      }
      for (let i = queuedOrders.length - 1; i >= 0; i--) {
        if (queuedOrders[i].id === id) {
          queuedOrders.splice(i, 1);
        }
      }
    },

    cancelAll(): void {
      pendingOrders.length = 0;
      queuedOrders.length = 0;
    },

    // Properties
    get position_size(): number {
      if (!position) return 0;
      return position.direction === 'long' ? position.qty : -position.qty;
    },

    get position_avg_price(): number {
      return position?.avgPrice ?? 0;
    },

    get equity(): number {
      return currentEquity + getUnrealizedPnL();
    },

    get closedtrades(): number {
      return closedTrades.length;
    },

    get opentrades(): number {
      return position ? 1 : 0;
    },

    get netprofit(): number {
      return currentEquity - capital;
    },

    get grossprofit(): number {
      return grossProfit;
    },

    get grossloss(): number {
      return grossLoss;
    },

    // Constants
    long: 'long',
    short: 'short',

    processBar(idx: number, open: number, high: number, low: number, close: number, time: number): void {
      barIndex = idx;
      barOpen = open;
      barHigh = high;
      barLow = low;
      barClose = close;
      barTime = time;

      // Move queued orders from previous bar into pending
      // (Market orders from previous bar fill at this bar's open)
      if (queuedOrders.length > 0) {
        pendingOrders.push(...queuedOrders);
        queuedOrders = [];
      }

      // Try to fill pending orders
      tryFillPending();

      // Record equity curve point
      equityCurve.push({
        time: barTime,
        equity: currentEquity + getUnrealizedPnL(),
      });
    },

    getResult(): StrategyResult {
      const totalTrades = closedTrades.length;
      const wins = closedTrades.filter(t => t.profit > 0).length;
      const winRate = totalTrades > 0 ? wins / totalTrades : 0;

      const totalProfit = closedTrades.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
      const totalLoss = closedTrades.filter(t => t.profit < 0).reduce((s, t) => s + Math.abs(t.profit), 0);
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

      // Calculate max drawdown from equity curve
      let peak = capital;
      let maxDrawdown = 0;
      for (const point of equityCurve) {
        if (point.equity > peak) peak = point.equity;
        const drawdown = peak - point.equity;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      return {
        trades: closedTrades,
        equityCurve,
        netProfit: currentEquity - capital + getUnrealizedPnL(),
        totalTrades,
        winRate,
        profitFactor,
        maxDrawdown,
      };
    },
  };

  return engine;
}
