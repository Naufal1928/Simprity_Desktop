// File: js/auth.js
// Dipanggil oleh login.html dan register.html

window.disableAuthCheck = true; // Jangan arahkan ke login jika sudah di halaman login

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('loginError');

            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                
                // Jika sukses
                localStorage.setItem("user", JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    fullname: data.user.user_metadata?.full_name || 'User'
                }));
                
                window.location.href = "home.html";
            } catch (err) {
                errorMsg.style.display = 'block';
                errorMsg.innerText = err.message;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('registerError');

            try {
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });
                if (error) throw new Error(error.message);

                alert("Registrasi berhasil! Silakan login.");
                window.location.href = "login.html";
            } catch (err) {
                errorMsg.style.display = 'block';
                errorMsg.innerText = err.message;
            }
        });
    }
});
