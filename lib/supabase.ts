import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const missingEnvMessage = 'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseKey) {
  console.warn(missingEnvMessage);
}

const createMissingEnvProxy = () =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(missingEnvMessage);
      }
    }
  ) as any;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : createMissingEnvProxy();
