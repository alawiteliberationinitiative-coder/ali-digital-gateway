import { Router } from "express";
import healthzRouter from "./healthz.js";
import usersRouter from "./users.js";

const router = Router();

router.use(healthzRouter);
router.use(usersRouter);

export default router;
