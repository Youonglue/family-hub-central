// server/routes/meals.ts
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

// RECURSIVE INSTRUCTION EXTRACTOR: Unpacks any nested HTML/JSON-LD structure safely
function extractInstructions(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => extractInstructions(item)).filter(Boolean).join("\n\n");
  }
  
  if (typeof obj === "object") {
    if (obj.text && typeof obj.text === "string") {
      return obj.text;
    }
    if (obj.itemListElement && Array.isArray(obj.itemListElement)) {
      return extractInstructions(obj.itemListElement);
    }
    if (obj.text) {
      return extractInstructions(obj.text);
    }
  }
  return "";
}

// RECURSIVE INGREDIENT EXTRACTOR: Unpacks ingredient formats safely
function extractIngredients(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => extractIngredients(item)).filter(Boolean).join("\n");
  }
  
  if (typeof obj === "object" && obj.name) {
    return obj.name;
  }
  return "";
}

// Automated Web-Scraper & Recipe Parser
async function parseRecipeFromUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    if (!response.ok) throw new Error("Failed to fetch recipe page");
    const html = await response.text();

    const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    let match;
    let recipeData: any = null;

    while ((match = regex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1].trim());
        
        const findRecipe = (obj: any): any => {
          if (!obj) return null;
          if (obj["@type"] === "Recipe" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe"))) return obj;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const res = findRecipe(item);
              if (res) return res;
            }
          }
          if (obj["@graph"] && Array.isArray(obj["@graph"])) {
            return findRecipe(obj["@graph"]);
          }
          return null;
        };

        recipeData = findRecipe(json);
        if (recipeData) break;
      } catch (e) {
        // Ignore malformed JSON scripts
      }
    }

    if (!recipeData) {
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      const name = titleMatch ? titleMatch[1].replace(/ - [^-]+$/g, "").trim() : "Imported Web Recipe";
      return {
        name,
        ingredients: "Could not parse ingredients automatically.\nPlease enter them manually.",
        instructions: "Could not parse instructions automatically.\nPlease enter them manually.",
        image_url: ""
      };
    }

    const ingredients = extractIngredients(recipeData.recipeIngredient);
    const instructions = extractInstructions(recipeData.recipeInstructions);

    let image_url = "";
    if (typeof recipeData.image === "string") {
      image_url = recipeData.image;
    } else if (Array.isArray(recipeData.image)) {
      image_url = recipeData.image[0] || "";
    } else if (recipeData.image && typeof recipeData.image.url === "string") {
      image_url = recipeData.image.url;
    }

    return {
      name: recipeData.name || "Imported Web Recipe",
      ingredients: ingredients || "No ingredients found.",
      instructions: instructions || "No instructions found.",
      image_url
    };
  } catch (error) {
    console.error("Scraper Error:", error);
    throw error;
  }
}

export default async function mealRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS meal_suggestions (
          id TEXT PRIMARY KEY,
          recipe_name TEXT,
          suggested_by TEXT,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS shopping_items (
          id TEXT PRIMARY KEY,
          name TEXT,
          checked INTEGER DEFAULT 0,
          quantity TEXT,
          category TEXT,
          created_at TEXT
        )
      `).run();
    } catch (e) {}
  };

  // 1. GET ALL RECIPES (The Cookbook)
  app.get("/recipes", async () => {
    return db.prepare("SELECT * FROM recipes ORDER BY category, name").all();
  });

  // 2. GET THE MEAL PLAN (The Weekly Grid)
  app.get("/plan", async () => {
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

  // 5. BUILD SHOPPING LIST (Fixed: Parses all ingredients reliably & never alters/deletes meal plans)
  app.post("/build-shopping", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { from, to } = req.body;
      const f = from ? from.split('T')[0] : "";
      const t = to ? to.split('T')[0] : "";

      const rows = db.prepare(`
        SELECT r.name as recipe_name, r.ingredients 
        FROM meal_plan mp 
        JOIN recipes r ON mp.recipe_id = r.id 
        WHERE mp.plan_date BETWEEN ? AND ?
      `).all(f, t) as any[];
      
      let addedCount = 0;
      
      db.transaction(() => {
        for (const row of rows) {
          if (row.ingredients && typeof row.ingredients === "string") {
            // Split ingredients across lines, commas, or bullet points safely
            const rawItems = row.ingredients.split(/[\n,]+/);
            for (const item of rawItems) {
              const cleaned = item.replace(/^[•\-\*]\s*/, "").trim();
              if (cleaned.length > 0 && !cleaned.toLowerCase().includes("could not parse ingredients")) {
                db.prepare(`
                  INSERT INTO shopping_items (id, name, checked, quantity, category, created_at) 
                  VALUES (?, ?, 0, '', 'pantry', datetime('now'))
                `).run(randomUUID(), cleaned);
                addedCount++;
              }
            }
          }
        }
      })();

      broadcast("shopping"); 
      return { success: true, added: addedCount };
    } catch (error) {
      console.error("Build Shopping List Error:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // --- FAMILY MEAL SUGGESTIONS ROUTES ---

  // 6. GET ALL MEAL SUGGESTIONS
  app.get("/suggestions", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare("SELECT * FROM meal_suggestions ORDER BY created_at DESC").all();
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 7. POST NEW MEAL SUGGESTION
  app.post("/suggestions", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { recipe_name, suggested_by } = req.body;

      db.prepare(`
        INSERT INTO meal_suggestions (id, recipe_name, suggested_by, created_at) 
        VALUES (?, ?, ?, datetime('now'))
      `).run(randomUUID(), recipe_name.trim(), suggested_by.trim());

      broadcast("meal-plan");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 8. DISMISS MEAL SUGGESTION (Admin Only)
  app.delete("/suggestions/:id", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can dismiss meal suggestions" });
      }

      db.prepare("DELETE FROM meal_suggestions WHERE id = ?").run(req.params.id);

      broadcast("meal-plan");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // --- CUSTOM COOKBOOK CUSTOMIZATION ROUTES (Admin Only) ---

  // 9. ADD RECIPE MANUALLY
  app.post("/recipes", async (req: any, reply: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can add recipes" });
      }

      const { name, category, ingredients, instructions, image_url } = req.body;
      db.prepare(`
        INSERT INTO recipes (id, name, category, ingredients, instructions, image_url) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), name.trim(), category, ingredients, instructions, image_url || "");

      broadcast("meal-plan");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 10. IMPORT RECIPE AUTOMATICALLY FROM URL
  app.post("/recipes/import-url", async (req: any, reply: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can import recipes" });
      }

      const { url, category } = req.body;
      const parsedRecipe = await parseRecipeFromUrl(url);

      db.prepare(`
        INSERT INTO recipes (id, name, category, ingredients, instructions, image_url) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), parsedRecipe.name, category, parsedRecipe.ingredients, parsedRecipe.instructions, parsedRecipe.image_url);

      broadcast("meal-plan");
      return { success: true, name: parsedRecipe.name };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 11. BULK REMOVE RECIPES FROM COOKBOOK (Admin Only)
  app.post("/recipes/bulk-delete", async (req: any, reply: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can remove recipes" });
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({ error: "No recipe IDs provided" });
      }

      const deleteStmt = db.prepare("DELETE FROM recipes WHERE id = ?");
      const unassignPlanStmt = db.prepare("UPDATE meal_plan SET recipe_id = NULL WHERE recipe_id = ?");

      db.transaction(() => {
        for (const id of ids) {
          unassignPlanStmt.run(id);
          deleteStmt.run(id);
        }
      })();

      broadcast("meal-plan");
      return { success: true, count: ids.length };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 12. REMOVE RECIPE FROM COOKBOOK
  app.delete("/recipes/:id", async (req: any, reply: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can remove recipes" });
      }

      db.prepare("DELETE FROM recipes WHERE id = ?").run(req.params.id);
      
      broadcast("meal-plan");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 13. UPDATE RECIPE IN COOKBOOK (Admin Only)
  app.patch("/recipes/:id", async (req: any, reply: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can edit recipes" });
      }

      const { name, category, ingredients, instructions, image_url } = req.body;
      db.prepare(`
        UPDATE recipes 
        SET name = ?, category = ?, ingredients = ?, instructions = ?, image_url = ? 
        WHERE id = ?
      `).run(name.trim(), category, ingredients, instructions, image_url || "", req.params.id);

      broadcast("meal-plan");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
