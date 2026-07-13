class AppView {
    constructor() {
        this.elements = this.cacheElements();
        Object.assign(this, this.elements);

        this.updateHeaderDate();
        this.activeView = 'dashboard';
        this.activeProjectId = null;
    }

    cacheElements() {
        return {
            appSidebar: document.getElementById('appSidebar'),
            pageTitle: document.getElementById('pageTitle'),
            currentDateDisplay: document.getElementById('currentDateDisplay'),
            navDashboard: document.getElementById('nav-dashboard'),
            navProjects: document.getElementById('nav-projects'),
            navTasks: document.getElementById('nav-tasks'),
            activeUserAvatar: document.getElementById('activeUserAvatar'),
            activeUserName: document.getElementById('activeUserName'),
            activeUserRole: document.getElementById('activeUserRole'),
            userSwitcherSelect: document.getElementById('userSwitcherSelect'),
            headerNewProjectBtn: document.getElementById('headerNewProjectBtn'),
            headerNewTaskBtn: document.getElementById('headerNewTaskBtn'),
            statTotalProjects: document.getElementById('statTotalProjects'),
            statInProgressProjects: document.getElementById('statInProgressProjects'),
            statCompletedTasks: document.getElementById('statCompletedTasks'),
            statPendingTasks: document.getElementById('statPendingTasks'),
            myProjectsCount: document.getElementById('myProjectsCount'),
            myProjectsContainer: document.getElementById('myProjectsContainer'),
            myTasksCount: document.getElementById('myTasksCount'),
            myTasksContainer: document.getElementById('myTasksContainer'),
            projectSearchInput: document.getElementById('projectSearchInput'),
            projectStatusFilter: document.getElementById('projectStatusFilter'),
            projectsGrid: document.getElementById('projectsGrid'),
            taskSearchInput: document.getElementById('taskSearchInput'),
            taskScopeFilter: document.getElementById('taskScopeFilter'),
            taskStatusFilter: document.getElementById('taskStatusFilter'),
            taskPriorityFilter: document.getElementById('taskPriorityFilter'),
            globalTasksTableBody: document.getElementById('globalTasksTableBody'),
            tasksEmptyState: document.getElementById('tasksEmptyState'),
            backToProjectsBtn: document.getElementById('backToProjectsBtn'),
            projectDetailStatusSelect: document.getElementById('projectDetailStatusSelect'),
            projDetailTitle: document.getElementById('projDetailTitle'),
            projDetailDesc: document.getElementById('projDetailDesc'),
            projDetailOwner: document.getElementById('projDetailOwner'),
            projDetailDueDate: document.getElementById('projDetailDueDate'),
            projDetailProgressBar: document.getElementById('projDetailProgressBar'),
            projDetailProgressPercent: document.getElementById('projDetailProgressPercent'),
            manageMembersBtn: document.getElementById('manageMembersBtn'),
            projDetailMembersList: document.getElementById('projDetailMembersList'),
            detailAddTaskBtn: document.getElementById('detailAddTaskBtn'),
            projDetailTasksList: document.getElementById('projDetailTasksList'),
            projTasksEmptyState: document.getElementById('projTasksEmptyState'),
            detailEmptyStateAddTaskBtn: document.getElementById('detailEmptyStateAddTaskBtn'),
            createProjectModal: document.getElementById('createProjectModal'),
            closeCreateProjectModalBtn: document.getElementById('closeCreateProjectModalBtn'),
            cancelCreateProjectBtn: document.getElementById('cancelCreateProjectBtn'),
            createProjectForm: document.getElementById('createProjectForm'),
            projectTitle: document.getElementById('projectTitle'),
            projectDescription: document.getElementById('projectDescription'),
            projectDueDate: document.getElementById('projectDueDate'),
            projectMembersCheckboxGrid: document.getElementById('projectMembersCheckboxGrid'),
            modalProjectOwnerDisplay: document.getElementById('modalProjectOwnerDisplay'),
            addTaskModal: document.getElementById('addTaskModal'),
            closeAddTaskModalBtn: document.getElementById('closeAddTaskModalBtn'),
            cancelAddTaskBtn: document.getElementById('cancelAddTaskBtn'),
            addTaskForm: document.getElementById('addTaskForm'),
            taskProjectSelect: document.getElementById('taskProjectSelect'),
            taskTitle: document.getElementById('taskTitle'),
            taskDescription: document.getElementById('taskDescription'),
            taskAssigneeSelect: document.getElementById('taskAssigneeSelect'),
            taskPrioritySelect: document.getElementById('taskPrioritySelect'),
            taskDueDate: document.getElementById('taskDueDate'),
            manageMembersModal: document.getElementById('manageMembersModal'),
            closeManageMembersModalBtn: document.getElementById('closeManageMembersModalBtn'),
            cancelManageMembersBtn: document.getElementById('cancelManageMembersBtn'),
            manageMembersForm: document.getElementById('manageMembersForm'),
            manageMembersProjectId: document.getElementById('manageMembersProjectId'),
            manageMembersCheckboxGrid: document.getElementById('manageMembersCheckboxGrid'),
            toastNotification: document.getElementById('toastNotification')
        };
    }

    /**
     * Set the current date in the header subtitle
     */
    updateHeaderDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        this.currentDateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }

    /**
     * Generates a persistent aesthetic color based on a string name.
     */
    getAvatarColor(name) {
        const colors = [
            'linear-gradient(135deg, #4f46e5, #3b82f6)', // Blue-Indigo
            'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
            'linear-gradient(135deg, #10b981, #059669)', // Emerald
            'linear-gradient(135deg, #ec4899, #d946ef)', // Pink-Fuchsia
            'linear-gradient(135deg, #f59e0b, #d97706)', // Amber
            'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Violet
            'linear-gradient(135deg, #ef4444, #dc2626)', // Red
            'linear-gradient(135deg, #3b82f6, #1d4ed8)'  // Blue
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    /**
     * Extract initials from a name (e.g. Sarah Chen => SC)
     */
    getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    /**
     * Switch view visibility
     */
    showView(viewName) {
        this.activeView = viewName;
        
        // Update header button display based on context
        if (viewName === 'project-detail') {
            this.headerNewProjectBtn.classList.add('hidden');
            this.headerNewTaskBtn.classList.add('hidden');
        } else {
            this.headerNewProjectBtn.classList.remove('hidden');
            this.headerNewTaskBtn.classList.remove('hidden');
        }

        // Toggle active-view class on section containers
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active-view');
        });

        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active-view');
        }

        // Update nav items highlight
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Map sub views back to main nav items for active highlight
        let navName = viewName;
        if (viewName === 'project-detail') navName = 'projects';
        
        const activeNavItem = document.getElementById(`nav-${navName}`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Set Title text
        const titleMap = {
            'dashboard': 'Dashboard',
            'projects': 'Projects Platform',
            'tasks': 'Global Tasks Board',
            'project-detail': 'Project Details'
        };
        this.pageTitle.textContent = titleMap[viewName] || 'Management Workspace';
    }

    /**
     * Open Modal helper
     */
    openModal(modal) {
        modal.classList.add('open');
    }

    /**
     * Close Modal helper
     */
    closeModal(modal) {
        modal.classList.remove('open');
    }

    /**
     * Render toast notification
     */
    showToast(message, type = 'success') {
        const toast = this.toastNotification;
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

        // Hide after 3.5 seconds
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    }

    /**
     * Renders user dropdown options in user switcher
     */
    renderUserSwitcher(users, activeUserId) {
        this.userSwitcherSelect.innerHTML = users.map(user => 
            `<option value="${user.id}" ${user.id === activeUserId ? 'selected' : ''}>${user.name} (${user.role})</option>`
        ).join('');
    }

    /**
     * Renders active user info in sidebar & modals
     */
    renderActiveUser(user) {
        if (!user) return;
        
        const initials = this.getInitials(user.name);
        const color = this.getAvatarColor(user.name);
        
        // Sidebar active card
        this.activeUserAvatar.textContent = initials;
        this.activeUserAvatar.style.background = color;
        this.activeUserName.textContent = user.name;
        this.activeUserRole.textContent = user.role;
        
        // Modal Owner badge display
        this.modalProjectOwnerDisplay.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${color}">${initials}</div>
            <span>${user.name} (${user.role}) &bull; Owner</span>
        `;
    }

    /**
     * Renders total statistics dashboard tiles
     */
    renderDashboardStats(stats) {
        this.statTotalProjects.textContent = stats.totalProjects;
        this.statInProgressProjects.textContent = stats.inProgressProjects;
        this.statCompletedTasks.textContent = stats.completedTasks;
        this.statPendingTasks.textContent = stats.pendingTasks;
    }

    /**
     * Renders "Projects I'm on" panel in Dashboard
     */
    renderDashboardMyProjects(projects, onProjectClick) {
        this.myProjectsCount.textContent = projects.length;

        if (projects.length === 0) {
            this.myProjectsContainer.innerHTML = `
                <div class="empty-state-card" style="padding: 24px; border: none; background: transparent;">
                    <p style="font-size: 13px;">You are not assigned to any active projects.</p>
                </div>
            `;
            return;
        }

        this.myProjectsContainer.innerHTML = projects.map(proj => {
            const totalTasks = proj.tasksCount || 0;
            const completedTasks = proj.completedTasksCount || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const statusLabel = proj.status.replace('_', ' ');

            return `
                <div class="project-compact-card" data-id="${proj.id}">
                    <div class="project-compact-header">
                        <h4>${proj.title}</h4>
                        <span class="badge badge-${proj.status.replace('_', '-')}">${statusLabel}</span>
                    </div>
                    <div class="progress-label-row">
                        <span style="color: var(--text-muted); font-size: 11px;">Checklist: ${completedTasks}/${totalTasks}</span>
                        <span style="color: var(--color-secondary); font-size: 11px;">${progress}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach click handlers
        this.myProjectsContainer.querySelectorAll('.project-compact-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                onProjectClick(id);
            });
        });
    }

    /**
     * Renders "My Pending Tasks" panel in Dashboard
     */
    renderDashboardMyTasks(tasks, projects, onToggle, onDelete) {
        this.myTasksCount.textContent = tasks.length;

        if (tasks.length === 0) {
            this.myTasksContainer.innerHTML = `
                <div class="empty-state-card" style="padding: 24px; border: none; background: transparent;">
                    <p style="font-size: 13px;">🎉 All your tasks are completed!</p>
                </div>
            `;
            return;
        }

        this.myTasksContainer.innerHTML = tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : 'External Task';

            return `
                <div class="task-compact-card">
                    <div class="task-compact-left">
                        <label class="checkbox-container">
                            <input type="checkbox" class="task-check" data-id="${task.id}">
                            <span class="checkmark"></span>
                        </label>
                        <div class="task-compact-info">
                            <h4>${task.title}</h4>
                            <p><i class="fa-solid fa-folder-closed"></i> ${projTitle}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                        <button class="btn-delete-task" data-id="${task.id}" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach Checkbox triggers
        this.myTasksContainer.querySelectorAll('.task-check').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-id');
                onToggle(id);
            });
        });

        // Attach Delete triggers
        this.myTasksContainer.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this task?")) {
                    onDelete(id);
                }
            });
        });
    }

    /**
     * Renders the Grid of Projects
     */
    renderProjectsGrid(projects, onProjectClick, searchVal = '', statusVal = 'all') {
        const query = searchVal.toLowerCase().trim();
        
        const filtered = projects.filter(proj => {
            const matchesSearch = proj.title.toLowerCase().includes(query) || 
                                  proj.description.toLowerCase().includes(query);
            const matchesStatus = statusVal === 'all' || proj.status === statusVal;
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            this.projectsGrid.innerHTML = `
                <div class="empty-state-card" style="grid-column: span 3; padding: 48px;">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>No projects found matching the criteria.</p>
                </div>
            `;
            return;
        }

        this.projectsGrid.innerHTML = filtered.map(proj => {
            const totalTasks = proj.tasksCount || 0;
            const completedTasks = proj.completedTasksCount || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const statusLabel = proj.status.replace('_', ' ');
            const initials = this.getInitials(proj.owner?.name);
            const avatarBg = this.getAvatarColor(proj.owner?.name || 'Owner');

            return `
                <div class="project-card" data-id="${proj.id}">
                    <div class="project-card-header">
                        <h3>${proj.title}</h3>
                        <span class="badge badge-${proj.status.replace('_', '-')}">${statusLabel}</span>
                    </div>
                    <p class="project-card-desc">${proj.description || 'No description provided.'}</p>
                    
                    <div class="project-card-progress">
                        <div class="progress-label-row">
                            <span>Checklist progress</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                        </div>
                    </div>

                    <div class="project-card-footer">
                        <div class="card-footer-item">
                            <span class="label">Owner</span>
                            <div class="owner-display-compact">
                                <div class="avatar avatar-sm" style="background: ${avatarBg}">${initials}</div>
                                <span>${proj.owner?.name || 'Unknown'}</span>
                            </div>
                        </div>
                        <div class="card-footer-item">
                            <span class="label">Deadline</span>
                            <div class="date-display-compact">
                                <i class="fa-regular fa-clock"></i>
                                <span>${proj.dueDate || 'No Date'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach card click router
        this.projectsGrid.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                onProjectClick(id);
            });
        });
    }

    /**
     * Renders the big global tasks table
     */
    renderTasksTable({ tasks, projects, users }, onToggle, onDelete, searchVal = '', scopeVal = 'all', statusVal = 'all', priorityVal = 'all', activeUserId) {
        const query = searchVal.toLowerCase().trim();

        const filtered = tasks.filter(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : '';

            const matchesSearch = task.title.toLowerCase().includes(query) || 
                                  task.description.toLowerCase().includes(query) ||
                                  projTitle.toLowerCase().includes(query);
                                  
            const matchesScope = scopeVal === 'all' || task.assigneeId === activeUserId;
            const matchesStatus = statusVal === 'all' || task.status === statusVal;
            const matchesPriority = priorityVal === 'all' || task.priority === priorityVal;

            return matchesSearch && matchesScope && matchesStatus && matchesPriority;
        });

        if (filtered.length === 0) {
            this.globalTasksTableBody.innerHTML = '';
            this.tasksEmptyState.classList.remove('hidden');
            return;
        }

        this.tasksEmptyState.classList.add('hidden');

        this.globalTasksTableBody.innerHTML = filtered.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : 'Unassigned Project';
            const assigneeName = task.assignee?.name || 'Unassigned';
            const initials = this.getInitials(assigneeName);
            const avatarBg = task.assignee ? this.getAvatarColor(assigneeName) : 'var(--color-neutral)';
            const isCompleted = task.status === 'completed';

            return `
                <tr class="${isCompleted ? 'task-completed-row' : ''}">
                    <td>
                        <label class="checkbox-container">
                            <input type="checkbox" class="task-check" data-id="${task.id}" ${isCompleted ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td class="task-title-cell" style="${isCompleted ? 'text-decoration: line-through; color: var(--text-dark);' : ''}">
                        <div style="font-weight: 500;">${task.title}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 400; margin-top: 2px;">${task.description || ''}</div>
                    </td>
                    <td class="task-project-cell">${projTitle}</td>
                    <td>
                        <div class="assignee-display-compact">
                            <div class="avatar avatar-sm" style="background: ${avatarBg}">${initials}</div>
                            <span>${assigneeName}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                    </td>
                    <td class="task-date-cell">${task.dueDate || 'No date'}</td>
                    <td>
                        <button class="btn-delete-task" data-id="${task.id}" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach Checkbox triggers
        this.globalTasksTableBody.querySelectorAll('.task-check').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-id');
                onToggle(id);
            });
        });

        // Attach Delete triggers
        this.globalTasksTableBody.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this task?")) {
                    onDelete(id);
                }
            });
        });
    }

    /**
     * Renders detailed project panel
     */
    renderProjectDetail(project, tasks, users, onTaskToggle, onTaskDelete, onStatusChange) {
        if (!project) return;
        
        this.activeProjectId = project.id;
        
        // Status Dropdown selector
        this.projectDetailStatusSelect.value = project.status;
        
        // Headers & Meta
        this.projDetailTitle.textContent = project.title;
        this.projDetailDesc.textContent = project.description || 'No description provided.';
        
        const ownerInitials = this.getInitials(project.owner?.name);
        const ownerColor = this.getAvatarColor(project.owner?.name || 'Owner');
        this.projDetailOwner.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${ownerColor}">${ownerInitials}</div>
            <span>${project.owner?.name || 'Unknown'}</span>
        `;
        
        this.projDetailDueDate.innerHTML = `<i class="fa-regular fa-calendar-check"></i> <span>Deadline: ${project.dueDate || 'No Date'}</span>`;

        // Progress Calculation
        const projTasks = tasks.filter(t => t.projectId === project.id);
        const totalTasks = projTasks.length;
        const completedTasks = projTasks.filter(t => t.status === 'completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        this.projDetailProgressBar.style.width = `${progress}%`;
        this.projDetailProgressPercent.textContent = `${progress}% (${completedTasks}/${totalTasks})`;

        // Members list sidebar
        const projectMembers = users.filter(u => project.memberIds.includes(u.id));
        this.projDetailMembersList.innerHTML = projectMembers.map(u => {
            const isOwner = u.id === project.ownerId;
            const initials = this.getInitials(u.name);
            const color = this.getAvatarColor(u.name);
            return `
                <div class="member-row">
                    <div class="avatar avatar-sm" style="background: ${color}">${initials}</div>
                    <div class="member-info">
                        <h4>${u.name} ${isOwner ? '<span style="color: var(--color-secondary); font-size: 10px; font-weight: 700;">(OWNER)</span>' : ''}</h4>
                        <p>${u.role}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Tasks Checklist
        if (totalTasks === 0) {
            this.projDetailTasksList.innerHTML = '';
            this.projTasksEmptyState.classList.remove('hidden');
        } else {
            this.projTasksEmptyState.classList.add('hidden');
            
            this.projDetailTasksList.innerHTML = projTasks.map(task => {
                const assigneeName = task.assignee?.name || 'Unassigned';
                const initials = this.getInitials(assigneeName);
                const avatarBg = task.assignee ? this.getAvatarColor(assigneeName) : 'var(--color-neutral)';
                const isCompleted = task.status === 'completed';

                return `
                    <div class="project-task-item ${isCompleted ? 'task-completed' : ''}">
                        <div class="project-task-left">
                            <label class="checkbox-container">
                                <input type="checkbox" class="task-check" data-id="${task.id}" ${isCompleted ? 'checked' : ''}>
                                <span class="checkmark"></span>
                            </label>
                            <div class="project-task-details">
                                <h4>${task.title}</h4>
                                <p>${task.description || 'No description'}</p>
                            </div>
                        </div>
                        <div class="project-task-right">
                            <span class="badge badge-${task.priority}">${task.priority}</span>
                            <div class="assignee-display-compact" title="Assignee: ${assigneeName}">
                                <div class="avatar avatar-sm" style="background: ${avatarBg}">${initials}</div>
                            </div>
                            <button class="btn-delete-task" data-id="${task.id}" title="Delete Task">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Bind checklist toggle checkboxes
            this.projDetailTasksList.querySelectorAll('.task-check').forEach(input => {
                input.addEventListener('change', () => {
                    const id = input.getAttribute('data-id');
                    onTaskToggle(id);
                });
            });

            // Bind task delete button
            this.projDetailTasksList.querySelectorAll('.btn-delete-task').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm("Are you sure you want to delete this task from this project?")) {
                        onTaskDelete(id);
                    }
                });
            });
        }
    }

    /**
     * Population helpers for creating project members list in modals
     */
    populateProjectMembersCheckbox(users, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = users.map(user => `
            <label class="checkbox-member-label">
                <input type="checkbox" name="memberIds" value="${user.id}">
                <span class="checkmark-circle"></span>
                <div class="avatar avatar-sm" style="background: ${this.getAvatarColor(user.name)}">${this.getInitials(user.name)}</div>
                <span>${user.name}</span>
            </label>
        `).join('');
    }

    /**
     * Populate project selector option list in Add Task modal
     */
    populateProjectSelector(projects, activeProjectId = null) {
        this.taskProjectSelect.innerHTML = projects.map(proj => 
            `<option value="${proj.id}" ${proj.id === activeProjectId ? 'selected' : ''}>${proj.title}</option>`
        ).join('');
    }

    /**
     * Populate assignee selector option list in Add Task modal
     */
    populateAssigneeSelector(users) {
        this.taskAssigneeSelect.innerHTML = '<option value="">Unassigned</option>' + users.map(user => 
            `<option value="${user.id}">${user.name} (${user.role})</option>`
        ).join('');
    }

    /**
     * Sets fields for managing members in Member Modal
     */
    setupManageMembersModal(project, users) {
        this.manageMembersProjectId.value = project.id;
        this.populateProjectMembersCheckbox(users, 'manageMembersCheckboxGrid');
        
        // Select members currently on the project
        this.manageMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]').forEach(box => {
            if (project.memberIds.includes(box.value)) {
                box.checked = true;
            }
        });
    }

    /* --- Bind Event Handler Callbacks --- */
    
    bindUserSwitch(handler) {
        this.userSwitcherSelect.addEventListener('change', (e) => {
            handler(e.target.value);
        });
    }

    bindNavigate(handler) {
        const handleNav = (e, target) => {
            e.preventDefault();
            handler(target);
        };

        this.navDashboard.addEventListener('click', (e) => handleNav(e, 'dashboard'));
        this.navProjects.addEventListener('click', (e) => handleNav(e, 'projects'));
        this.navTasks.addEventListener('click', (e) => handleNav(e, 'tasks'));
        this.backToProjectsBtn.addEventListener('click', (e) => handleNav(e, 'projects'));
    }

    bindProjectDetailClick(handler) {
        this.onProjectCardClick = handler;
    }

    bindCreateProject(handler) {
        this.createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const selectedMembers = [];
            this.projectMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
                selectedMembers.push(box.value);
            });

            const projectData = {
                title: this.projectTitle.value,
                description: this.projectDescription.value,
                dueDate: this.projectDueDate.value,
                memberIds: selectedMembers
            };

            try {
                await handler(projectData);
                this.closeModal(this.createProjectModal);
                this.createProjectForm.reset();
                this.showToast("Project created successfully!");
            } catch (err) {
                this.showToast("Failed to create project", "error");
            }
        });
    }

    bindCreateTask(handler) {
        this.addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskData = {
                projectId: this.taskProjectSelect.value,
                title: this.taskTitle.value,
                description: this.taskDescription.value,
                assigneeId: this.taskAssigneeSelect.value,
                priority: this.taskPrioritySelect.value,
                dueDate: this.taskDueDate.value
            };

            try {
                await handler(taskData);
                this.closeModal(this.addTaskModal);
                this.addTaskForm.reset();
                this.showToast("Task added successfully!");
            } catch (err) {
                this.showToast("Failed to add task", "error");
            }
        });
    }

    bindProjectStatusChange(handler) {
        this.projectDetailStatusSelect.addEventListener('change', (e) => {
            if (this.activeProjectId) {
                handler(this.activeProjectId, e.target.value);
                this.showToast("Project status updated!");
            }
        });
    }

    bindProjectMembersSave(handler) {
        this.manageMembersForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projId = this.manageMembersProjectId.value;
            
            const selectedMembers = [];
            this.manageMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
                selectedMembers.push(box.value);
            });

            try {
                await handler(projId, selectedMembers);
                this.closeModal(this.manageMembersModal);
                this.showToast("Project team members updated!");
            } catch (err) {
                this.showToast("Failed to update members", "error");
            }
        });
    }

    /**
     * Global keyups/change registrations for dynamic searching/filtering
     */
    bindFilters(onProjectFilter, onTaskFilter) {
        // Projects listing filters
        const runProjFilter = () => {
            onProjectFilter(this.projectSearchInput.value, this.projectStatusFilter.value);
        };
        this.projectSearchInput.addEventListener('input', runProjFilter);
        this.projectStatusFilter.addEventListener('change', runProjFilter);

        // Tasks listing filters
        const runTaskFilter = () => {
            onTaskFilter(
                this.taskSearchInput.value,
                this.taskScopeFilter.value,
                this.taskStatusFilter.value,
                this.taskPriorityFilter.value
            );
        };
        this.taskSearchInput.addEventListener('input', runTaskFilter);
        this.taskScopeFilter.addEventListener('change', runTaskFilter);
        this.taskStatusFilter.addEventListener('change', runTaskFilter);
        this.taskPriorityFilter.addEventListener('change', runTaskFilter);
    }
}
