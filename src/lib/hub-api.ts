// Hub data-layer barrel.
// -----------------------------------------------------------------------------
// Every route imports its data functions from here so we can flip the whole
// app between Lovable Cloud (dev preview) and the offline LAN server
// (production Docker image) by setting a single build flag:
//
//   VITE_HUB_MODE=selfhost   ->  Fastify + SQLite over /api/* on the same box
//   (unset / anything else)  ->  Lovable Cloud server functions
//
// Both modules expose identical function signatures.

import * as cloud from "./hub.functions";
import * as lan from "./lan-client";

export const HUB_MODE: "selfhost" | "cloud" =
  import.meta.env.VITE_HUB_MODE === "selfhost" ? "selfhost" : "cloud";

// Cast to the cloud module's types so call sites keep their existing
// return-shape inference. Both implementations honor the same public
// contract; LAN reshapes flat rows into the nested Supabase-style objects.
const impl = (HUB_MODE === "selfhost" ? lan : cloud) as typeof cloud;

// Re-export the concrete implementation. Keep this list in sync with
// `hub.functions.ts` and `lan-client.ts` — CI typechecking catches drift.
export const listMembers            = impl.listMembers;
export const addMember              = impl.addMember;
export const deleteMember           = impl.deleteMember;

export const listPoints             = impl.listPoints;

export const listChores             = impl.listChores;
export const addChore               = impl.addChore;
export const deleteChore            = impl.deleteChore;
export const completeChore          = impl.completeChore;
export const recentCompletions      = impl.recentCompletions;

export const listRewards            = impl.listRewards;
export const addReward              = impl.addReward;
export const deleteReward           = impl.deleteReward;
export const redeemReward           = impl.redeemReward;

export const listShopping           = impl.listShopping;
export const addShopping            = impl.addShopping;
export const toggleShopping         = impl.toggleShopping;
export const deleteShopping         = impl.deleteShopping;
export const clearCheckedShopping   = impl.clearCheckedShopping;

export const listRecipes            = impl.listRecipes;
export const addRecipe              = impl.addRecipe;
export const deleteRecipe           = impl.deleteRecipe;

export const listMealPlan           = impl.listMealPlan;
export const setMealPlan            = impl.setMealPlan;
export const removeMealPlan         = impl.removeMealPlan;
export const generateShoppingFromMeals = impl.generateShoppingFromMeals;

export const listEvents             = impl.listEvents;
export const upcomingEvents         = impl.upcomingEvents;
export const addEvent               = impl.addEvent;
export const deleteEvent            = impl.deleteEvent;
