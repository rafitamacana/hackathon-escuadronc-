import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://doywsoxbtjeodvnstdve.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_H2TDEHP8I3HxgCTbfQT9Xw_FDvz72PH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);