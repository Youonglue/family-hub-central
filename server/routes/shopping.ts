import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function shoppingRoutes(app: any, opts: any) {
  app.get("/", async () => db.prepare("SELECT * FROM shopping_items ORDER BY checked ASC, created_at DESC").all());
  app.post("/", async (req: any) => {
    db.prepare("INSERT INTO shopping_items (id, name, created_at) VALUES (?,?,datetime('now'))").run(randomUUID(), req.body.name);
    opts.broadcast("shopping"); return { success: true };
  });
  app.patch("/:id", async (req: any) => {
    db.prepare("UPDATE shopping_items SET checked = ? WHERE id = ?").run(req.body.checked ? 1 : 0, req.params.id);
    opts.broadcast("shopping"); return { success: true };
  });
  app.post("/build-from-meals", async (req: any) => {
    const f = req.body.from.split('T')[0], t = req.body.to.split('T')[0];
    const rows = db.prepare(`SELECT r.ingredients FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.plan_date BETWEEN ? AND ?`).all(f, t) as any[];
    for (const row of rows) {
      if (row.ingredients) row.ingredients.split(/[,\n]+/).forEach((ing: string) => {
        if (ing.trim()) db.prepare("INSERT INTO shopping_items (id, name, created_at) VALUES (?,?,datetime('now'))").run(randomUUID(), ing.trim());
      });
    }
    opts.broadcast("shopping"); return { success: true };
  });
}
