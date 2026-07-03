// src/integrations/supabase/client.ts
const infiniteMock = new Proxy(() => {}, {
  get: (target, prop) => {
    // If someone calls .auth, .from, .channel, etc., return this same mock
    return infiniteMock;
  },
  apply: (target, thisArg, args) => {
    // If someone calls it as a function (e.g. supabase.from()), return an object with dummy methods
    return {
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
      on: () => ({ subscribe: () => {} }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    };
  }
});

export const supabase = infiniteMock as any;
