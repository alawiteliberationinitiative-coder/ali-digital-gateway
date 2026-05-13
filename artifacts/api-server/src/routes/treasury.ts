import { Router } from "express";

const router = Router();

const TONCENTER_API = "https://toncenter.com/api/v2";
const TON_USD_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd";

let cache: { balanceTon: number; balanceUsd: number; lastUpdated: Date } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

router.get("/treasury/balance", async (req, res): Promise<void> => {
  const address = process.env.TON_TREASURY_ADDRESS;

  if (!address) {
    res.json({
      address: "غير مُهيَّأ بعد",
      balanceTon: 0,
      balanceUsd: 0,
      lastUpdated: new Date().toISOString(),
    });
    return;
  }

  if (cache && Date.now() - cache.lastUpdated.getTime() < CACHE_TTL_MS) {
    res.json({ address, ...cache, lastUpdated: cache.lastUpdated.toISOString() });
    return;
  }

  try {
    const [balRes, priceRes] = await Promise.all([
      fetch(`${TONCENTER_API}/getAddressBalance?address=${encodeURIComponent(address)}`),
      fetch(TON_USD_PRICE_API),
    ]);

    const balData = await balRes.json() as { ok: boolean; result: string };
    const priceData = await priceRes.json() as { "the-open-network"?: { usd: number } };

    const balanceTon = balData.ok ? Number(balData.result) / 1e9 : 0;
    const tonUsd = priceData["the-open-network"]?.usd ?? 0;
    const balanceUsd = Math.round(balanceTon * tonUsd * 100) / 100;

    cache = { balanceTon, balanceUsd, lastUpdated: new Date() };

    res.json({ address, balanceTon, balanceUsd, lastUpdated: cache.lastUpdated.toISOString() });
  } catch {
    res.json({
      address,
      balanceTon: cache?.balanceTon ?? 0,
      balanceUsd: cache?.balanceUsd ?? 0,
      lastUpdated: cache?.lastUpdated.toISOString() ?? new Date().toISOString(),
    });
  }
});

export default router;
