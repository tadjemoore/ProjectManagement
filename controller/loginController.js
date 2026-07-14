class LoginController {
    constructor() {
        this.view = new LoginView();
        this.view.bindSubmit((credentials) => this.handleLogin(credentials));
        this.view.bindSignupToggle((visible) => this.view.toggleSignup(visible));
        this.view.bindSignupSubmit((payload) => this.handleSignup(payload));
        this.loadSignupRoles();
    }

    async handleLogin({ username, password }) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username.trim().toLowerCase(), password })
            });

            const data = await response.json();

            if (!response.ok) {
              this.view.showError(data.error || 'Login failed. Please try again.');
              return;  
            }

            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserId', data.user.id);
            this.view.redirectToApp();
        } catch (error) {
            this.view.showError('Unable to connect to the server. Please try again later.');
        }
    }

    async handleSignup({ name, username, role, password, confirmPassword }) {
        if (!name.trim() || !username.trim() || !role.trim() || !password.trim()) {
            this.view.showSignupError('Please fill out all signup fields.');
            return;
        }

        if (password !== confirmPassword) {
            this.view.showSignupError('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    username: username.trim().toLowerCase(),
                    role: role.trim(),
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                this.view.showSignupError(data.error || 'Signup failed. Please try again.');
                return;
            }

            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserId', data.user.id);
            this.view.redirectToApp();
        } catch (error) {
            this.view.showSignupError('Unable to connect to the server. Please try again later.');
        }
    }

    async loadSignupRoles() {
        try {
            const response = await fetch('/api/roles');
            const roles = await response.json();

            if (!response.ok) {
                this.view.setSignupRoles([]);
                return;
            }

            this.view.setSignupRoles(roles);
        } catch (error) {
            this.view.setSignupRoles([]);
        }
    }
}
