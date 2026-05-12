import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userProgressRouter from "./userProgress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userProgressRouter);

export default router;
