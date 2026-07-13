class CommonView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    updateHeaderDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        this.view.currentDateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }

    getAvatarColor(name) {
        const colors = [
            'linear-gradient(135deg, #4f46e5, #3b82f6)',
            'linear-gradient(135deg, #06b6d4, #0891b2)',
            'linear-gradient(135deg, #10b981, #059669)',
            'linear-gradient(135deg, #ec4899, #d946ef)',
            'linear-gradient(135deg, #f59e0b, #d97706)',
            'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            'linear-gradient(135deg, #ef4444, #dc2626)',
            'linear-gradient(135deg, #3b82f6, #1d4ed8)'
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    showView(viewName) {
        this.view.activeView = viewName;

        if (viewName === 'project-detail') {
            this.view.headerNewProjectBtn.classList.add('hidden');
            this.view.headerNewTaskBtn.classList.add('hidden');
        } else {
            this.view.headerNewProjectBtn.classList.remove('hidden');
            this.view.headerNewTaskBtn.classList.remove('hidden');
        }

        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active-view');
        });

        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active-view');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        let navName = viewName;
        if (viewName === 'project-detail') navName = 'projects';

        const activeNavItem = document.getElementById(`nav-${navName}`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        const titleMap = {
            dashboard: 'Dashboard',
            projects: 'Projects Platform',
            tasks: 'Global Tasks Board',
            'project-detail': 'Project Details'
        };
        this.view.pageTitle.textContent = titleMap[viewName] || 'Management Workspace';
    }

    openModal(modal) {
        modal.classList.add('open');
    }

    closeModal(modal) {
        modal.classList.remove('open');
    }

    showToast(message, type = 'success') {
        const toast = this.view.toastNotification;
        const msgEl = toast.querySelector('.toast-message');
        const iconEl = toast.querySelector('.toast-icon');

        msgEl.textContent = message;

        if (type === 'success') {
            toast.style.borderLeftColor = 'var(--color-success)';
            iconEl.className = 'fa-solid fa-circle-check toast-icon';
            iconEl.style.color = 'var(--color-success)';
        } else {
            toast.style.borderLeftColor = 'var(--color-danger)';
            iconEl.className = 'fa-solid fa-triangle-exclamation toast-icon';
            iconEl.style.color = 'var(--color-danger)';
        }

        toast.classList.remove('hidden');

        if (this.view.toastTimeout) clearTimeout(this.view.toastTimeout);
        this.view.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    }

    renderUserSwitcher(users, activeUserId) {
        this.view.userSwitcherSelect.innerHTML = users.map(user => 
            `<option value="${user.id}" ${user.id === activeUserId ? 'selected' : ''}>${user.name} (${user.role})</option>`
        ).join('');
    }

    renderActiveUser(user) {
        if (!user) return;

        const initials = this.getInitials(user.name);
        const color = this.getAvatarColor(user.name);

        this.view.activeUserAvatar.textContent = initials;
        this.view.activeUserAvatar.style.background = color;
        this.view.activeUserName.textContent = user.name;
        this.view.activeUserRole.textContent = user.role;

        this.view.modalProjectOwnerDisplay.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${color}">${initials}</div>
            <span>${user.name} (${user.role}) &bull; Owner</span>
        `;
    }
}
