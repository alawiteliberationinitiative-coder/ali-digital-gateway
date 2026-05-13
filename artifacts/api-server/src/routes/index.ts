import { Router } from "express";
import healthzRouter from "./healthz.js";
import usersRouter from "./users.js";
import adsRouter from "./ads.js";
import treasuryRouter from "./treasury.js";

const router = Router();

router.use(healthzRouter);
router.use(usersRouter);
router.use(adsRouter);
router.use(treasuryRouter);

export default router;
