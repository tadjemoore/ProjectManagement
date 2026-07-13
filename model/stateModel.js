class StateModel {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || '/api';
        this.state = {
            currentUser: null,
            users: [],
            projects: [],
            tasks: []
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        const snapshot = this.getState();
        this.listeners.forEach(listener => listener(snapshot));
    }

    getState() {
        return {
            ...this.state,
            users: [...this.state.users],
            projects: [...this.state.projects],
            tasks: [...this.state.tasks],
            currentUser: this.state.currentUser ? { ...this.state.currentUser } : null
        };
    }

    setState(patch, notify = true) {
        this.state = { ...this.state, ...patch };
        if (notify) {
            this.notify();
        }
    }

    resolveCurrentUser(preferredUserId = null, allowDemoFallback = false) {
        const users = this.state.users || [];
        if (!users.length) {
            this.state.currentUser = null;
            return{ok: false, reason: 'no-users' };
        }

        if (preferredUserId) {
            const foundUser = users.find(user => user.id === preferredUserId);
            if (foundUser) {
                this.state.currentUser = foundUser;
                return { ok: true, user: foundUser };
            }
            this.state.currentUser = null;
            return { ok: false, reason: 'user-not-found' };
        }

        if (allowDemoFallback) {
            this.state.currentUser = users[0];
            return { ok: true, user: users[0] };
        }

        this.state.currentUser = null;
        return { ok: false, reason: 'no-preferred-user' };
    }

    syncCurrentUser(preferredUserId = null, allowDemoFallback = false) {
        const result = this.resolveCurrentUser(preferredUserId, allowDemoFallback);
        this.notify();
        return result;
    }

    changeUser(userId) {
        const foundUser = this.state.users.find(user => user.id === userId);
        if (!foundUser) {
            return false;
        }
        this.state.currentUser = foundUser;
        this.notify();
        return true;
    }
}
