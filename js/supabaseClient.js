const supabaseUrl = 'https://gczxfwebhtbxfbdyqxhv.supabase.co';
const supabaseKey = 'sb_publishable_Knck7ajPWY-GgpvkwFRODg__2COpmRc';

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.error("Supabase script CDN not loaded.");
}

async function checkAuth() {
    if (window.disableAuthCheck) return null;
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        window.location.href = "login.html";
        return null;
    }
    return session.user;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

window.supabaseClient = supabaseClient;
window.checkAuth = checkAuth;
window.logout = logout;
