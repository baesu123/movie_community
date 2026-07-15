import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://example.supabase.co";
const supabasekey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "public-anon-key";

if (
  !import.meta.env.VITE_SUPABASE_URL ||
  !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
) {
  console.warn(
    "Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env 파일을 확인해 주세요.",
  );
}

export const supabase = createClient(supabaseUrl, supabasekey);
