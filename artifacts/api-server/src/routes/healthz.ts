import { Router } from "express";

const router = Router();

router.get(["/healthz", "/health"], (_req, res): void => {
  res.json({ status: "ok" });
});

export default router;
