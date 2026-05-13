import { Router } from "express";
import { db, eq, usersTable } from "@workspace/db";

const router = Router();

function generateAliId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ALI-2026-${suffix}`;
}

const PSEUDONYMS = [
  "Cipher", "Nexus", "Vortex", "Spectre", "Phantom", "Oracle", "Axiom",
  "Zenith", "Prism", "Solaris", "Cobalt", "Vector", "Nyx", "Helios",
  "Quasar", "Lycan", "Titan", "Argon", "Ember", "Onyx",
];

function generatePseudonym(): string {
  const base = PSEUDONYMS[Math.floor(Math.random() * PSEUDONYMS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${base}-${num}`;
}

function generateKey(prefix: string): string {
  const hex = () =>
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .toUpperCase()
      .padStart(6, "0");
  return `${prefix}-${hex()}-${hex()}-${hex()}`;
}

router.post("/users/register", async (req, res): Promise<void> => {
  const { telegramId, telegramUsername, firstName, lastName } = req.body as {
    telegramId?: string;
    telegramUsername?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };

  if (!telegramId) {
    res.status(400).json({ error: "telegramId is required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  if (existing) {
    const user = {
      ...existing,
      mddBalance: Number(existing.mddBalance),
    };
    res.status(200).json(user);
    return;
  }

  let aliId = generateAliId();
  let attempts = 0;
  while (attempts < 10) {
    const [conflict] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.aliId, aliId));
    if (!conflict) break;
    aliId = generateAliId();
    attempts++;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      aliId,
      pseudonym: generatePseudonym(),
      telegramId,
      telegramUsername: telegramUsername ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      vaultKey: generateKey("VLT"),
      identityKey: generateKey("IDT"),
      masterKey: generateKey("MST"),
      mddBalance: "250",
      rank: "Initiate",
      level: 1,
      keysConfirmed: false,
    })
    .returning();

  const user = {
    ...created,
    mddBalance: Number(created!.mddBalance),
  };

  res.status(201).json(user);
});

router.get("/users/me", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;

  if (!telegramId) {
    res.status(400).json({ error: "x-telegram-id header required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ ...user, mddBalance: Number(user.mddBalance) });
});

router.patch("/users/me/pseudonym", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  if (!telegramId) {
    res.status(400).json({ error: "x-telegram-id header required" });
    return;
  }

  const { pseudonym } = req.body as { pseudonym?: string };
  if (!pseudonym || typeof pseudonym !== "string") {
    res.status(400).json({ error: "pseudonym is required" });
    return;
  }

  const trimmed = pseudonym.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    res.status(400).json({ error: "الاسم المستعار يجب أن يكون بين 3 و 30 حرفاً" });
    return;
  }
  if (!/^[\w\u0600-\u06FF\- ]+$/.test(trimmed)) {
    res.status(400).json({ error: "الاسم المستعار يحتوي على رموز غير مسموح بها" });
    return;
  }

  const [conflict] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.pseudonym, trimmed));

  if (conflict) {
    res.status(409).json({ error: "هذا الاسم المستعار محجوز، جرب اسماً آخر" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ pseudonym: trimmed })
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ ...updated, mddBalance: Number(updated.mddBalance) });
});

router.post("/users/confirm-keys", async (req, res): Promise<void> => {
  const { telegramId } = req.body as { telegramId?: string };

  if (!telegramId) {
    res.status(400).json({ error: "telegramId is required" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ keysConfirmed: true })
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ ...user, mddBalance: Number(user.mddBalance) });
});

export default router;
