/**
 * Asserts in-game filter + next-sell ROI math against the real modules.
 * Run: node --experimental-strip-types src/lib/market/spread.check.ts
 */
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

import type { WfmOrder, WfmUserStatus } from "../wfm/types";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".js") &&
      !specifier.endsWith(".json")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { filterActionableOrders } = await import("../wfm/actionable.ts");
const { computeSpreadMetrics, isSpreadOpportunity, nextSellPrice } = await import(
  "./spread.ts"
);

let seq = 0;

function order(opts: {
  platinum: number;
  order_type: "buy" | "sell";
  status: WfmUserStatus;
  visible?: boolean;
}): WfmOrder {
  seq += 1;
  return {
    id: String(seq),
    platinum: opts.platinum,
    quantity: 1,
    order_type: opts.order_type,
    platform: "pc",
    region: "en",
    visible: opts.visible ?? true,
    user: {
      id: `u${seq}`,
      ingame_name: "tester",
      status: opts.status,
      reputation: 0,
      region: "en",
    },
  };
}

const dropped = filterActionableOrders([
  order({ platinum: 1, order_type: "buy", status: "offline" }),
  order({ platinum: 2, order_type: "buy", status: "online" }),
  order({ platinum: 12, order_type: "sell", status: "ingame", visible: false }),
  order({ platinum: 14, order_type: "sell", status: "ingame" }),
]);
assert.equal(dropped.length, 1);
assert.equal(dropped[0].platinum, 14);

const fakeBid = computeSpreadMetrics([
  order({ platinum: 1, order_type: "buy", status: "ingame" }),
  order({ platinum: 200, order_type: "sell", status: "ingame" }),
  order({ platinum: 205, order_type: "sell", status: "ingame" }),
]);
assert.equal(fakeBid.lowestSell, 200);
assert.equal(fakeBid.nextSell, 205);
assert.equal(fakeBid.highestBuy, 1);
assert.equal(fakeBid.spread, 5);
assert.equal(fakeBid.roiPct, 2.5);
assert.equal(isSpreadOpportunity(fakeBid), false);

const snipe = computeSpreadMetrics([
  order({ platinum: 1, order_type: "buy", status: "ingame" }),
  order({ platinum: 5, order_type: "sell", status: "ingame" }),
  order({ platinum: 15, order_type: "sell", status: "ingame" }),
]);
assert.equal(snipe.spread, 10);
assert.equal(snipe.roiPct, 200);
assert.equal(nextSellPrice(snipe.lowestSell, snipe.spread), 15);
assert.equal(isSpreadOpportunity(snipe), true);

const lonely = computeSpreadMetrics([
  order({ platinum: 12, order_type: "sell", status: "ingame" }),
  order({ platinum: 2, order_type: "buy", status: "ingame" }),
]);
assert.equal(lonely.lowestSell, 12);
assert.equal(lonely.highestBuy, 2);
assert.equal(lonely.nextSell, null);
assert.equal(lonely.spread, null);
assert.equal(lonely.roiPct, null);
assert.equal(nextSellPrice(lonely.lowestSell, lonely.spread), null);
assert.equal(isSpreadOpportunity(lonely), false);

console.log("spread.check ok");
