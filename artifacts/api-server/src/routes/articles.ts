import { Router } from "express";
import { db, eq, usersTable, articlesTable } from "@workspace/db";

const router = Router();

const ADMIN_IDS = ["6213952907"];

async function getUser(telegramId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return user;
}

router.get("/articles", async (_req, res): Promise<void> => {
  const rows = await db.select().from(articlesTable).orderBy(articlesTable.createdAt);
  res.json(rows);
});

router.post("/articles", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const isAdmin = ADMIN_IDS.includes(telegramId);
  if (!isAdmin && user.role !== "staff" && user.role !== "admin") {
    res.status(403).json({ error: "ليس لديك صلاحية النشر — هذه الميزة مخصصة لفريق العمل المنتخب فقط" });
    return;
  }

  const { title, body } = req.body as { title?: string; body?: string };
  if (!title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "العنوان والمحتوى مطلوبان" });
    return;
  }
  if (title.length > 200) { res.status(400).json({ error: "العنوان طويل جداً (200 حرف كحد أقصى)" }); return; }
  if (body.length > 20000) { res.status(400).json({ error: "المحتوى طويل جداً (20,000 حرف كحد أقصى)" }); return; }

  const [article] = await db
    .insert(articlesTable)
    .values({
      title: title.trim(),
      body: body.trim(),
      authorTelegramId: telegramId,
      authorPseudonym: user.pseudonym,
      authorAliId: user.aliId,
    })
    .returning();

  res.status(201).json(article);
});

router.delete("/articles/:id", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid article id" }); return; }

  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!article) { res.status(404).json({ error: "Article not found" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const isAdmin  = ADMIN_IDS.includes(telegramId) || user.role === "admin";
  const isAuthor = article.authorTelegramId === telegramId;

  if (!isAdmin && !isAuthor) {
    res.status(403).json({ error: "ليس لديك صلاحية حذف هذا المقال" });
    return;
  }

  await db.delete(articlesTable).where(eq(articlesTable.id, id));
  res.json({ success: true });
});

export default router;
