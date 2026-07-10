import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function mealRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  app.get("/recipes", async (req: any) => {
    const cat = req.query.category;
    // Strictly filter by category if provided, otherwise send all
    if (cat) {
       return db.prepare("SELECT * FROM recipes WHERE category = ? COLLATE NOCASE ORDER BY name").all(cat);
    }
    return db.prepare("SELECT * FROM recipes ORDER BY category, name").all();
  });

  app.get("/plan", async () => {
    return db.prepare(`
      SELECT mp.*, r.name as recipe_name, r.category as recipe_category, r.image_url, r.instructions, r.ingredients as recipe_ingredients 
      FROM meal_plan mp 
      LEFT JOIN recipes r ON mp.recipe_id = r.id
    `).all();
  });

  app.post("/plan", async (req: any) => {
    const date = req.body.plan_date.split('T')[0];
    db.prepare(`
      INSERT INTO meal_plan (id, plan_date, meal, recipe_id, created_at) 
      VALUES (?, ?, ?, ?, datetime('now')) 
      ON CONFLICT(plan_date, meal) DO UPDATE SET recipe_id = excluded.recipe_id
    `).run(randomUUID(), date, req.body.meal, req.body.recipe_id);
    broadcast("meal-plan"); 
    return { success: true };
  });

  app.delete("/plan/:id", async (req: any) => {
    db.prepare("DELETE FROM meal_plan WHERE id = ?").run(req.params.id);
    broadcast("meal-plan"); 
    return { success: true };
  });

  app.post("/build-shopping", async (req: any) => {
    const f = req.body.from.split('T')[0];
    const t = req.body.to.split('T')[0];
    const rows = db.prepare(`
      SELECT r.ingredients FROM meal_plan mp 
      JOIN recipes r ON mp.recipe_id = r.id 
      WHERE mp.plan_date BETWEEN ? AND ?
    `).all(f, t) as any[];
    
    for (const row of rows) {
      if (row.ingredients) {
        row.ingredients.split(/[,\n]+/).forEach((ing: string) => {
          if (ing.trim()) {
            db.prepare("INSERT INTO shopping_items (id, name, created_at) VALUES (?, ?, datetime('now'))")
              .run(randomUUID(), ing.trim());
          }
        });
      }
    }
    broadcast("shopping"); 
    return { success: true, added: rows.length };
  });
}
