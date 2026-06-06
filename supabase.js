// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = "https://pgawswfurouzstkapwby.supabase.co";
const SUPABASE_KEY = "sb_publishable_QXe7A_iIUh-XlVxDeptrtw_CI46xPM7";

export const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
});