import { Router } from "express";
import healthzRouter from "./healthz.js";
import usersRouter from "./users.js";
import adsRouter from "./ads.js";
import quizRouter from "./quiz.js";
import treasuryRouter from "./treasury.js";
import articlesRouter from "./articles.js";

const router = Router();

router.use(healthzRouter);
router.use(usersRouter);
router.use(adsRouter);
router.use(quizRouter);
router.use(treasuryRouter);
router.use(articlesRouter);

export default router;
