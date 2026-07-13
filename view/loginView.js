class LoginView {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.errorBox = document.getElementById('loginError');
        this.signupForm = document.getElementById('signupForm');
        this.signupToggleBtn = document.getElementById('signupToggleBtn');
        this.cancelSignupBtn = document.getElementById('cancelSignupBtn');
        this.signupNameInput = document.getElementById('signupName');
        this.signupUsernameInput = document.getElementById('signupUsername');
        this.signupRoleInput = document.getElementById('signupRole');
        this.signupPasswordInput = document.getElementById('signupPassword');
        this.signupConfirmPasswordInput = document.getElementById('signupConfirmPassword');
        this.signupErrorBox = document.getElementById('signupError');
    }

    bindSubmit(handler) {
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.clearError();
            handler({
                username: this.usernameInput.value,
                password: this.passwordInput.value
            });
        });
    }

    showError(message) {
        if (!this.errorBox) return;
        this.errorBox.textContent = message;
        this.errorBox.classList.remove('hidden');
    }

    clearError() {
        if (!this.errorBox) return;
        this.errorBox.textContent = '';
        this.errorBox.classList.add('hidden');
    }

    bindSignupToggle(handler) {
        if (this.signupToggleBtn) {
            this.signupToggleBtn.addEventListener('click', () => handler(true));
        }

        if (this.cancelSignupBtn) {
            this.cancelSignupBtn.addEventListener('click', () => handler(false));
        }
    }

    bindSignupSubmit(handler) {
        if (!this.signupForm) return;

        this.signupForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.clearSignupError();
            handler({
                name: this.signupNameInput.value,
                username: this.signupUsernameInput.value,
                role: this.signupRoleInput.value,
                password: this.signupPasswordInput.value,
                confirmPassword: this.signupConfirmPasswordInput.value
            });
        });
    }

    showSignupError(message) {
        if (!this.signupErrorBox) return;
        this.signupErrorBox.textContent = message;
        this.signupErrorBox.classList.remove('hidden');
    }

    clearSignupError() {
        if (!this.signupErrorBox) return;
        this.signupErrorBox.textContent = '';
        this.signupErrorBox.classList.add('hidden');
    }

    setSignupRoles(roles) {
        if (!this.signupRoleInput) return;

        const normalizedRoles = Array.isArray(roles) ? roles.filter(Boolean) : [];
        this.signupRoleInput.innerHTML = normalizedRoles.length
            ? normalizedRoles.map(role => `<option value="${role}">${role}</option>`).join('')
            : '<option value="">No roles available</option>';

        this.signupRoleInput.disabled = normalizedRoles.length === 0;
        if (normalizedRoles.length > 0) {
            this.signupRoleInput.selectedIndex = -1;
        }
    }

    toggleSignup(visible) {
        if (this.form) {
            this.form.classList.toggle('hidden', visible);
        }
        if (this.signupForm) {
            this.signupForm.classList.toggle('hidden', !visible);
        }
        this.clearError();
        this.clearSignupError();
    }

    redirectToApp() {
        window.location.href = 'index.html';
    }
}
