interface ImportMetaEnv {
    readonly HYGRAPH_API: string;
    readonly HYGRAPH_MUTATION_TOKEN: string;
    readonly SUPABASE_URL: string
    readonly SUPABASE_KEY: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }