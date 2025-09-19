import { Router } from "express";
import { supaAdmin, getUserFromAuthHeader } from "../supa";

const router = Router();

// All favorites routes require a logged-in user (via Supabase JWT in Authorization header)
router.use(async (req, res, next) => {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  // @ts-ignore
  req.user = user;
  next();
});

// GET /favorites  -> list user's saved trips
router.get("/", async (req: any, res) => {
  const user = req.user;
  const { data, error } = await supaAdmin
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data || [] });
});

// POST /favorites   { payload: {...resultObject} }
router.post("/", async (req: any, res) => {
  const user = req.user;
  const payload = req.body?.payload;
  if (!payload) return res.status(400).json({ error: "Missing payload" });

  const { data, error } = await supaAdmin
    .from("favorites")
    .insert([{ user_id: user.id, payload }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ item: data });
});

// DELETE /favorites/:id
router.delete("/:id", async (req: any, res) => {
  const user = req.user;
  const id = req.params.id;
  const { error } = await supaAdmin
    .from("favorites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
