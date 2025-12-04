// ========================================
// CONFIGURAÇÃO SUPABASE
// ========================================
const SUPABASE_URL = 'https://hagnhuqjdtffhadodrps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZ25odXFqZHRmZmhhZG9kcnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTU1MjksImV4cCI6MjA4MDQzMTUyOX0.WlwsStm4GopnwLBOBwv6fpmfywvkKh0U1WgKmMaFP4Q';

// Importa o cliente Supabase via CDN
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// AUTENTICAÇÃO
// ========================================
const auth = {
    // Registro de novo usuário
    async signUp(email, password, name) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });
        
        if (error) throw error;
        return data;
    },
    
    // Login
    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data;
    },
    
    // Login com Google
    async signInWithGoogle() {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        return data;
    },
    
    // Logout
    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    },
    
    // Usuário atual
    async getUser() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    },
    
    // Escuta mudanças de autenticação
    onAuthStateChange(callback) {
        return supabaseClient.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },
    
    // Recuperar senha
    async resetPassword(email) {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) throw error;
    }
};

// ========================================
// DATABASE - CATEGORIAS
// ========================================
const db = {
    categories: {
        async getAll() {
            const { data, error } = await supabaseClient
                .from('categories')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return data;
        },
        
        async create(category) {
            const user = await auth.getUser();
            const { data, error } = await supabaseClient
                .from('categories')
                .insert({ ...category, user_id: user.id })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        
        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        
        async delete(id) {
            const { error } = await supabaseClient
                .from('categories')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        }
    },
    
    // ========================================
    // DATABASE - TRANSAÇÕES
    // ========================================
    transactions: {
        async getAll() {
            const { data, error } = await supabaseClient
                .from('transactions')
                .select(`
                    *,
                    category:categories(id, name, icon, color)
                `)
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data;
        },
        
        async getByMonth(year, month) {
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            
            const { data, error } = await supabaseClient
                .from('transactions')
                .select(`
                    *,
                    category:categories(id, name, icon, color)
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data;
        },
        
        async create(transaction) {
            const user = await auth.getUser();
            const { data, error } = await supabaseClient
                .from('transactions')
                .insert({ ...transaction, user_id: user.id })
                .select(`
                    *,
                    category:categories(id, name, icon, color)
                `)
                .single();
            
            if (error) throw error;
            return data;
        },
        
        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('transactions')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select(`
                    *,
                    category:categories(id, name, icon, color)
                `)
                .single();
            
            if (error) throw error;
            return data;
        },
        
        async delete(id) {
            const { error } = await supabaseClient
                .from('transactions')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        }
    },
    
    // ========================================
    // DATABASE - PERFIL
    // ========================================
    profile: {
        async get() {
            const user = await auth.getUser();
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            return data;
        },
        
        async update(updates) {
            const user = await auth.getUser();
            const { data, error } = await supabaseClient
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', user.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    }
};

// Exporta para uso global
window.auth = auth;
window.db = db;
window.supabaseClient = supabaseClient;
