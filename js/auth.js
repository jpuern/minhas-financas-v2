// ========================================
// AUTH PAGE LOGIC
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já está logado
    checkAuth();
    
    // Setup dos tabs
    setupTabs();
    
    // Setup dos forms
    setupForms();
    
    // Toggle password visibility
    setupPasswordToggle();
});

async function checkAuth() {
    const user = await auth.getUser();
    if (user) {
        window.location.href = 'index.html';
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${target}Form`).classList.add('active');
        });
    });
}

function setupForms() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Registro
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Google Login
    document.getElementById('googleLogin').addEventListener('click', handleGoogleLogin);
    document.getElementById('googleRegister').addEventListener('click', handleGoogleLogin);
    
    // Forgot Password
    document.getElementById('forgotPassword').addEventListener('click', handleForgotPassword);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading(true);
    
    try {
        await auth.signIn(email, password);
        showToast('Login realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Erro no login:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showToast('As senhas não coincidem', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        await auth.signUp(email, password, name);
        showToast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
        
        // Troca para tab de login
        document.querySelector('[data-tab="login"]').click();
    } catch (error) {
        console.error('Erro no registro:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        showLoading(false);
    }
}

async function handleGoogleLogin() {
    showLoading(true);
    
    try {
        await auth.signInWithGoogle();
    } catch (error) {
        console.error('Erro no login Google:', error);
        showToast(getErrorMessage(error), 'error');
        showLoading(false);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    
    if (!email) {
        showToast('Digite seu e-mail primeiro', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        await auth.resetPassword(email);
        showToast('E-mail de recuperação enviado!', 'success');
    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        showLoading(false);
    }
}

function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getErrorMessage(error) {
    const messages = {
        'Invalid login credentials': 'E-mail ou senha incorretos',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar',
        'User already registered': 'Este e-mail já está cadastrado',
        'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres',
        'Unable to validate email address: invalid format': 'Formato de e-mail inválido'
    };
    
    return messages[error.message] || error.message || 'Ocorreu um erro. Tente novamente.';
}
