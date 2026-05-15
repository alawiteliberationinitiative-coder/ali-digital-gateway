import { Router } from "express";
import healthzRouter   from "./healthz.js";
import usersRouter     from "./users.js";
import adsRouter       from "./ads.js";
import quizRouter      from "./quiz.js";
import treasuryRouter  from "./treasury.js";
import articlesRouter  from "./articles.js";
import spacesRouter    from "./spaces.js";
import followsRouter   from "./follows.js";
import docsRouter      from "./docs.js";
import messagesRouter  from "./messages.js";
import webhookRouter   from "./webhook.js";

const router = Router();

router.use(healthzRouter);
router.use(webhookRouter);
router.use(usersRouter);
router.use(adsRouter);
router.use(quizRouter);
router.use(treasuryRouter);
router.use(articlesRouter);
router.use(spacesRouter);
router.use(followsRouter);
router.use(docsRouter);
router.use(messagesRouter);

export default router;
