// We have completely removed the Supabase cloud integration!
// This is a temporary "dummy" object to prevent the app from instantly crashing 
// while we rewrite the components to use your local Node/SQLite server.

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    // This will warn us in the browser console exactly which files still need to be rewritten
    console.warn(`[Supabase Removed] Something tried to call supabase.${String(prop)}.`);
    
    // Return a dummy chainable function so the app doesn't crash when it tries to do supabase.from('...').select()
    return function() {
      return {
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        eq: function() { return this; },
        order: function() { return this; },
        single: function() { return this; }
      };
    };
  },
});
