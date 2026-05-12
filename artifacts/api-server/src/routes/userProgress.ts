import { Router } from "express";
import { db, userProgressTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetUserProgressParams,
  UpsertUserProgressParams,
  UpsertUserProgressBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/user-progress/:sessionId", async (req, res) => {
  const parsed = GetUserProgressParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { sessionId } = parsed.data;

  const rows = await db
    .select()
    .from(userProgressTable)
    .where(eq(userProgressTable.sessionId, sessionId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Progress not found" });
    return;
  }

  const row = rows[0]!;
  res.json({
    sessionId: row.sessionId,
    completedNodes: row.completedNodes,
    currentNode: row.currentNode,
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.put("/user-progress/:sessionId", async (req, res) => {
  const paramsParsed = UpsertUserProgressParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const bodyParsed = UpsertUserProgressBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { sessionId } = paramsParsed.data;
  const { completedNodes, currentNode } = bodyParsed.data;

  const rows = await db
    .insert(userProgressTable)
    .values({ sessionId, completedNodes, currentNode })
    .onConflictDoUpdate({
      target: userProgressTable.sessionId,
      set: { completedNodes, currentNode, updatedAt: new Date() },
    })
    .returning();

  const row = rows[0]!;
  res.json({
    sessionId: row.sessionId,
    completedNodes: row.completedNodes,
    currentNode: row.currentNode,
    updatedAt: row.updatedAt.toISOString(),
  });
});

export default router;
