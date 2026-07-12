import { randomUUID } from "node:crypto";
import { db } from "../db.js";

// DEFAULT 60 SEED STAPLES
const DEFAULT_ESSENTIALS = [
  { name: "Milk", category: "dairy" },
  { name: "Eggs", category: "dairy" },
  { name: "Butter", category: "dairy" },
  { name: "Cheddar Cheese", category: "dairy" },
  { name: "Greek Yogurt", category: "dairy" },
  { name: "Sour Cream", category: "dairy" },
  { name: "Cream Cheese", category: "dairy" },
  { name: "White Bread", category: "bakery" },
  { name: "Wheat Bread", category: "bakery" },
  { name: "Tortillas", category: "bakery" },
  { name: "Bagels", category: "bakery" },
  { name: "English Muffins", category: "bakery" },
  { name: "Bananas", category: "produce" },
  { name: "Apples", category: "produce" },
  { name: "Strawberries", category: "produce" },
  { name: "Blueberries", category: "produce" },
  { name: "Avocados", category: "produce" },
  { name: "Onions", category: "produce" },
  { name: "Potatoes", category: "produce" },
  { name: "Garlic", category: "produce" },
  { name: "Carrots", category: "produce" },
  { name: "Broccoli", category: "produce" },
  { name: "Spinach", category: "produce" },
  { name: "Tomatoes", category: "produce" },
  { name: "Bell Peppers", category: "produce" },
  { name: "Chicken Breast", category: "pantry" },
  { name: "Ground Beef", category: "pantry" },
  { name: "Bacon", category: "pantry" },
  { name: "Pork Chops", category: "pantry" },
  { name: "Salmon Fillets", category: "pantry" },
  { name: "Canned Tuna", category: "pantry" },
  { name: "White Rice", category: "pantry" },
  { name: "Pasta Noodles", category: "pantry" },
  { name: "Tomato Sauce", category: "pantry" },
  { name: "Olive Oil", category: "pantry" },
  { name: "Peanut Butter", category: "pantry" },
  { name: "Strawberry Jam", category: "pantry" },
  { name: "Cereal", category: "pantry" },
  { name: "Oatmeal", category: "pantry" },
  { name: "Black Beans", category: "pantry" },
  { name: "Flour", category: "pantry" },
  { name: "Sugar", category: "pantry" },
  { name: "Coffee Beans", category: "pantry" },
  { name: "Tea Bags", category: "pantry" },
  { name: "Honey", category: "pantry" },
  { name: "Ketchup", category: "pantry" },
  { name: "Mayonnaise", category: "pantry" },
  { name: "Mustard", category: "pantry" },
  { name: "Frozen Pizza", category: "frozen" },
  { name: "Frozen Peas", category: "frozen" },
  { name: "Frozen Berries", category: "frozen" },
  { name: "Ice Cream", category: "frozen" },
  { name: "Toilet Paper", category: "general" },
  { name: "Paper Towels", category: "general" },
  { name: "Garbage Bags", category: "general" },
  { name: "Dish Soap", category: "general" },
  { name: "Hand Soap", category: "general" },
  { name: "Laundry Detergent", category: "general" },
  { name: "Orange Juice", category: "general" },
  { name: "Apple Juice", category: "general" },
];

export default async function shoppingRoutes(app: any, opts: any) {
  // Self-heal utility to guarantee the shopping_items and staple_library tables exist
  const ensureTableExists = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS shopping_items (
          id TEXT PRIMARY KEY,
          name TEXT,
          checked INTEGER DEFAULT 0,
          quantity TEXT,
          category TEXT DEFAULT 'general',
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    // Dynamic schema alignment: safely inject any missing columns
    const columns = [
      { name: "checked", type: "INTEGER DEFAULT 0" },
      { name: "quantity", type: "TEXT" },
      { name: "category", type: "TEXT DEFAULT 'general'" },
      { name: "created_at", type: "TEXT" }
    ];

    for (const col of columns) {
      try {
        db.prepare(`ALTER TABLE shopping_items ADD COLUMN ${col.name} ${col.type}`).run();
      } catch (e) {}
    }

    // Initialize the Customizable Staple Library Table
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS staple_library (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          category TEXT DEFAULT 'general'
        )
      `).run();

      // Seed default 60 essentials if table is newly created and empty
      const count = db.prepare("SELECT COUNT(*) as n FROM staple_library").get() as any;
      if (count && count.n === 0) {
        const stmt = db.prepare("INSERT OR IGNORE INTO staple_library (id, name, category) VALUES (?, ?, ?)");
        db.transaction(() => {
          for (const item of DEFAULT_ESSENTIALS) {
            stmt.run(randomUUID(), item.name, item.category);
          }
        })();
        console.log("🌱 Database seeded with default 60 shopping staples!");
      }
    } catch (e) {
      console.error("🛠️ Error initializing staple_library:", e);
    }
  };

  // 1. GET ALL SHOPPING ITEMS
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      return db.prepare("SELECT * FROM shopping_items ORDER BY checked ASC, created_at DESC").all();
    } catch (error) {
      console.error("❌ GET SHOPPING ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 2. ADD SHOPPING ITEM
  app.post("/", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      const { name, quantity, category } = req.body;
      db.prepare(`
        INSERT INTO shopping_items (id, name, quantity, category, created_at) 
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(randomUUID(), name, quantity || "", category || "general");
      
      opts.broadcast("shopping"); 
      return { success: true };
    } catch (error) {
      console.error("❌ ADD SHOPPING ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 3. TOGGLE / UPDATE SHOPPING ITEM (checked and/or quantity)
  app.patch("/:id", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      const { checked, quantity } = req.body;
      
      if (checked !== undefined) {
        db.prepare("UPDATE shopping_items SET checked = ? WHERE id = ?").run(checked ? 1 : 0, req.params.id);
      }
      
      if (quantity !== undefined) {
        db.prepare("UPDATE shopping_items SET quantity = ? WHERE id = ?").run(quantity, req.params.id);
      }
      
      opts.broadcast("shopping"); 
      return { success: true };
    } catch (error) {
      console.error("❌ TOGGLE SHOPPING ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 4. GENERATE SHOPPING ITEMS FROM MEAL PLAN
  app.post("/build-from-meals", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      const f = req.body.from.split('T')[0], t = req.body.to.split('T')[0];
      const rows = db.prepare(`SELECT r.ingredients FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.plan_date BETWEEN ? AND ?`).all(f, t) as any[];
      for (const row of rows) {
        if (row.ingredients) row.ingredients.split(/[,\n]+/).forEach((ing: string) => {
          if (ing.trim()) {
            db.prepare(`
              INSERT INTO shopping_items (id, name, category, created_at) 
              VALUES (?, ?, 'meal-plan', datetime('now'))
            `).run(randomUUID(), ing.trim());
          }
        });
      }
      opts.broadcast("shopping"); 
      return { success: true };
    } catch (error) {
      console.error("❌ MEAL SHOPPING ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 5. DELETE SHOPPING ITEM
  app.delete("/:id", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      db.prepare("DELETE FROM shopping_items WHERE id = ?").run(req.params.id);
      opts.broadcast("shopping"); 
      return { success: true };
    } catch (error) {
      console.error("❌ DELETE SHOPPING ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // --- STAPLE LIBRARY ROUTES ---

  // 6. GET ALL LIBRARY STAPLES (Sorted Alphabetically)
  app.get("/staples", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      return db.prepare("SELECT * FROM staple_library ORDER BY name ASC").all();
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 7. ADD MASTER STAPLE (Admin Only)
  app.post("/staples", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can add staple library items" });
      }

      const { name, category } = req.body;
      db.prepare("INSERT OR IGNORE INTO staple_library (id, name, category) VALUES (?, ?, ?)")
        .run(randomUUID(), name.trim(), category || "general");
      
      opts.broadcast("shopping");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 8. DELETE MASTER STAPLE (Admin Only)
  app.delete("/staples/:id", async (req: any, reply: any) => {
    try {
      ensureTableExists();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can delete staple library items" });
      }

      db.prepare("DELETE FROM staple_library WHERE id = ?").run(req.params.id);
      
      opts.broadcast("shopping");
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
