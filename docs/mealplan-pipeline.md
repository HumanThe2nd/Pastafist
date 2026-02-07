# Client Schema (SQLite, Minimal)

```sql
PRAGMA foreign_keys = ON;

-- Single local onboarding profile
CREATE TABLE preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

-- Cached generated plan payloads from server
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
```

# Server Schema (MongoDB / PyMongo, Minimal)

```js
// plans collection validator
{
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "createdAt", "preferences", "summary", "meals", "groceryList"],
    properties: {
      _id: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      preferences: {
        bsonType: "object",
        required: [
          "budget",
          "currency",
          "budgetPeriod",
          "mealsPerDay",
          "timePerMeal",
          "travelRadiusMinutes",
          "travelMode",
          "servings",
          "dietType",
          "allergies",
          "exclusions",
          "macroFocus",
          "preferredStores"
        ],
        properties: {
          budget: { bsonType: ["double", "int", "long", "decimal"] },
          currency: { bsonType: "string" },
          budgetPeriod: { enum: ["weekly", "biweekly", "monthly"] },
          mealsPerDay: { bsonType: ["int", "long"] },
          timePerMeal: { bsonType: ["int", "long"] },
          travelRadiusMinutes: { bsonType: ["int", "long"] },
          travelMode: { enum: ["walk", "bike", "transit", "drive"] },
          servings: { bsonType: ["int", "long"] },
          dietType: {
            enum: [
              "none",
              "vegetarian",
              "vegan",
              "pescatarian",
              "halal",
              "kosher",
              "keto",
              "gluten-free",
              "dairy-free",
              "other"
            ]
          },
          allergies: { bsonType: "array", items: { bsonType: "string" } },
          exclusions: { bsonType: "array", items: { bsonType: "string" } },
          macroFocus: { enum: ["balanced", "high-protein", "low-carb", "high-fiber"] },
          calorieGoal: { bsonType: ["int", "long", "null"] },
          gender: { enum: ["female", "male", "non-binary", "prefer-not-to-say", null] },
          location: { bsonType: ["string", "null"] },
          preferredStores: { bsonType: "array", items: { bsonType: "string" } }
        }
      },
      summary: {
        bsonType: "object",
        required: ["totalCost", "currency"],
        properties: {
          totalCost: { bsonType: ["double", "int", "long", "decimal"] },
          currency: { bsonType: "string" }
        }
      },
      meals: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["day", "slot", "title", "ingredients"],
          properties: {
            day: { bsonType: ["int", "long"] },
            slot: { bsonType: "string" },
            title: { bsonType: "string" },
            ingredients: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["ingredientId", "amount"],
                properties: {
                  ingredientId: { bsonType: "string" },
                  amount: {
                    bsonType: "object",
                    required: ["amount", "unit", "unitType"],
                    properties: {
                      amount: { bsonType: ["double", "int", "long", "decimal"] },
                      unit: { bsonType: "string" },
                      unitType: { enum: ["mass", "volume", "count"] }
                    }
                  }
                }
              }
            }
          }
        }
      },
      groceryList: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["ingredientId", "name", "totalNeeded", "storeOptions"],
          properties: {
            ingredientId: { bsonType: "string" },
            name: { bsonType: "string" },
            totalNeeded: {
              bsonType: "object",
              required: ["amount", "unit", "unitType"],
              properties: {
                amount: { bsonType: ["double", "int", "long", "decimal"] },
                unit: { bsonType: "string" },
                unitType: { enum: ["mass", "volume", "count"] }
              }
            },
            storeOptions: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["store", "productId", "purchaseUrl", "unitPrice", "quantityToBuy"],
                properties: {
                  store: { bsonType: "string" },
                  productId: { bsonType: "string" },
                  purchaseUrl: { bsonType: "string" },
                  unitPrice: { bsonType: ["double", "int", "long", "decimal"] },
                  quantityToBuy: { bsonType: ["int", "long"] }
                }
              }
            }
          }
        }
      }
    }
  }
}

// indexes
// db.plans.createIndex({ createdAt: -1 })
// db.plans.createIndex({ "preferences.location": 1 })
```

Notes:
- `meals[].ingredients[].ingredientId` references `groceryList[].ingredientId`.
- Frontend only displays this payload; server computes quantities/prices/URLs.
