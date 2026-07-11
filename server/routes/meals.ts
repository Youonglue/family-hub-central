import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function mealRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // 1. GET ALL RECIPES (The Cookbook)
  // Final Path: GET /api/meals/recipes
  app.get("/recipes", async () => {
    return db.prepare("SELECT * FROM recipes ORDER BY category, name").all();
  });

  // 2. GET THE MEAL PLAN (The Weekly Grid)
  // Final Path: GET /api/meals/plan
  app.get("/plan", async () => {
    // MUSCLE: This JOIN explicitly maps every recipe detail to the plan entry
    return db.prepare(`
      SELECT 
        mp.id, 
        mp.plan_date, 
        mp.meal, 
        mp.recipe_id, 
        r.name as recipe_name, 
        r.category as recipe_category, 
        r.image_url, 
        r.instructions, 
        r.ingredients as recipe_ingredients 
      FROM meal_plan mp 
      LEFT JOIN recipes r ON mp.recipe_id = r.id
    `).all();
  });

  // 3. ADD/ALTER MEAL (Admin Only)
  app.post("/plan", async (req: any, reply: any) => {
    if (req.user?.role !== 'admin') return reply.code(403).send({ error: "Admin only" });
    
    const { plan_date, meal, recipe_id } = req.body;
    // Handle ISO strings from frontend
    const date = plan_date.split('T')[0];

    db.prepare(`
      INSERT INTO meal_plan (id, plan_date, meal, recipe_id, created_at) 
      VALUES (?, ?, ?, ?, datetime('now')) 
      ON CONFLICT(plan_date, meal) DO UPDATE SET recipe_id = excluded.recipe_id
    `).run(randomUUID(), date, meal, recipe_id);
    
    broadcast("meal-plan"); 
    return { success: true };
  });

  // 4. REMOVE MEAL (Admin Only)
  app.delete("/plan/:id", async (req: any, reply: any) => {
    if (req.user?.role !== 'admin') return reply.code(403).send({ error: "Admin only" });
    
    db.prepare("DELETE FROM meal_plan WHERE id = ?").run(req.params.id);
    broadcast("meal-plan"); 
    return { success: true };
  });

  // 5. BUILD SHOPPING LIST
  app.post("/build-shopping", async (req: any) => {
    const { from, to } = req.body;
    const f = from.split('T')[0];
    const t = to.split('T')[0];

    // Grab ingredients from all recipes in the date range
    const rows = db.prepare(`
      SELECT r.ingredients FROM meal_plan mp 
      JOIN recipes r ON mp.recipe_id = r.id 
      WHERE mp.plan_date BETWEEN ? AND ?
    `).all(f, t) as any[];
    
    let addedCount = 0;
    db.transaction(() => {
      for (const row of rows) {
        if (row.ingredients) {
          // Splitting by comma or newline to get individual items
          const items = row.ingredients.split(/[,\n]+/);
          for (const item of items) {
            const trimmed = item.trim();
            if (trimmed) {
              db.prepare("INSERT INTO shopping_items (id, name, completed, created_at) VALUES (?, ?, 0, datetime('now'))")
                .run(randomUUID(), trimmed);
              addedCount++;
            }
          }
        }
      }
    })();

    broadcast("shopping"); 
    return { success: true, added: addedCount };
  });
}
