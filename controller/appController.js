class AppController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.view.appController = this;

        this.projectSearch = '';
        this.projectStatus = 'all';
        this.activeProjectId = null;

        this.taskSearch = '';
        this.taskScope = 'all';
        this.taskStatus = 'all';
        this.taskPriority = 'all';
                
        this.adminRoles = [];

        this.navigationController = new NavigationController(model, view, this);
        this.projectController = new ProjectController(model, view, this);
        this.taskController = new TaskController(model, view, this);
        this.calendarController = new CalendarController(model, view, this);
        
        this.refreshIntervalMs = 5000;
        this.refreshTimer = null;
        this.refreshInFlight = false;

        this.calendarInteractionDepth = 0; // 0 = no modal open, 1 = day detail modal open, 2 = project/task detail modal open
        this.calendarRenderPending = false;
        this.lastCalendarRenderHash = '';
    }

    isAnyModalOpen() {
        return !!document.querySelector('.modal-overlay.open');
    }

    isAnyCalendarModalOpen() {
        return !!document.querySelector('#calendarDayDetailModal.open, #calendarProjectDetailModal.open, #calendarTaskDetailModal.open');
    }

    beginCalendarInteraction() {
        this.calendarInteractionDepth++;
    }

    endCalendarInteraction() {
        this.calendarInteractionDepth = Math.max(0, this.calendarInteractionDepth - 1);

        // If render deferred during interaction, flush now.
        if (this.calendarInteractionDepth === 0 && this.calendarRenderPending) {
            this.calendarRenderPending = false;
            this.requestCalendarRender(this.model.getState(), true);
        }
    }

    buildCalendarRenderHash(state = this.model.getState()) {
        const visibleProjects = this.getVisibleProjects(state)
            .filter(project => project.dueDate)
            .map(project => ({
                id: String(project.id),
                title: project.title || '',
                dueDate: String(project.dueDate || '')
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const visibleTasks = this.getVisibleTasks(state)
            .filter(task => task.dueDate)
            .map(task => ({
                id: String(task.id),
                title: task.title || '',
                dueDate: String(task.dueDate || ''),
                priority: task.priority || 'medium',
                status: task.status || 'pending'
            }))
            .sort((a, b) => a.id.localeCompare(b.id));
        
        return JSON.stringify({
            monthOffset: this.calendarController.calendarMonthOffset,
            sort: this.calendarController.calendarSort,
            search: this.calendarController.calendarSearch || '',
            projects: visibleProjects,
            tasks: visibleTasks
        });
    }

    requestCalendarRender(state = this.model.getState(), force = false) {
        // Keep Calendar rendering scoped to calendar view
        if (this.view.activeView !== 'calendar') return;

        // prevent replacing click targets while user is interacing
        if (this.calendarInteractionDepth > 0 || this.isAnyCalendarModalOpen()) {
            this.calendarRenderPending = true;
            return;
        }

        const nextHash = this.buildCalendarRenderHash(state);
        if (!force && nextHash === this.lastCalendarRenderHash) {
            return;
        }

        this.lastCalendarRenderHash = nextHash;
        this.calendarController.renderCalendar(state);
    }

    async init() {
        this.model.subscribe((state) => this.handleStateChange(state));
        this.navigationController.init();
        this.projectController.init();
        this.taskController.init();
        this.calendarController.init();

        this.view.bindRoleAssignmentSave((userId, role) => this.handleRoleAssignment(userId, role));

        await this.model.loadData();

        const savedUserId = localStorage.getItem('currentUserId');
        const state = this.model.getState();
        const hasSaved = !!savedUserId;
        const exists = hasSaved && state.users.some(user => user.id === savedUserId);

        if (!hasSaved || !exists) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUserId');
            window.location.href = 'login.html';
            return;
        }

        const changed = this.model.changeUser(savedUserId);
        if (!changed) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUserId');
            window.location.href = 'login.html';
            return;
        }

        this.startAutoRefresh();

        window.addEventListener('beforeunload', () => this.stopAutoRefresh());

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState == 'visible') {
                this.startAutoRefresh();
            }
        });

        window.addEventListener('focus', () => this.startAutoRefresh());
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            this.refreshDataSilently();
        }, this.refreshIntervalMs);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async refreshDataSilently() {
        if (this.refreshInFlight) return;

        // Do not refetch while user is interacting with the calendar modals
        if (this.calendarInteractionDepth > 0 || this.isAnyCalendarModalOpen()) {
            return;
        }

        this.refreshInFlight = true;
        try {
            await this.model.loadData();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            this.refreshInFlight = false;
        }
    }

    openCreateProjectModal() {
        const state = this.model.getState();

        if (!state.currentUser || !state.currentUser.id) {
            this.view.showToast('Session invalid. Please log in again.', 'error');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUserId');
            window.location.href = 'login.html';
            return;
        }

        this.view.populateProjectMembersCheckbox(state.users, 'projectMembersCheckboxGrid');
        this.view.openModal(this.view.createProjectModal);
    }

    openManageMembersModal() {
        if (!this.activeProjectId) return;

        const state = this.model.getState();
        const project = state.projects.find(item => item.id === this.activeProjectId);

        if (!project) {
            this.view.showToast('Project not found.', 'error');
            return;
        }


        // authorize first, then open UI
        if (!this.canManageProject(project, state)) {
            this.view.showToast('Only project owners, managers, or admins can manage project members.', 'error');
            return;
        }

        this.view.setupManageMembersModal(project, state.users);
        this.view.openModal(this.view.manageMembersModal);
    }

    async openManageRolesModal() {
        const state = this.model.getState();
        if (state.currentUser?.role !== 'Admin') return;

        try {
            const response = await fetch('/api/admin/roles');
            const roles = await response.json();

            if (!response.ok) {
                this.view.showToast('Unable to load roles.', 'error');
                return;
            }

            this.adminRoles = roles;
            this.view.setupManageRolesModal(state.users, roles);
            this.view.openModal(this.view.manageRolesModal);
        } catch (error) {
            this.view.showToast('Unable to load roles.', 'error');
        }
    }

    handleStateChange(state) {
        const { currentUser, users } = state;

        this.view.renderUserSwitcher(users, currentUser?.id);
        this.view.renderActiveUser(currentUser);

        if (this.view.manageRolesBtn) {
            this.view.manageRolesBtn.classList.toggle('hidden', currentUser?.role !== 'Admin');
        }

        this.renderDashboard(state);
        this.renderProjectsList(state);
        this.renderTasksList(state);

        // Only render calendar when safe and when calendar data actually changed.
        this.requestCalendarRender(state);

        if (this.activeProjectId) {
            const project = state.projects.find(item => item.id === this.activeProjectId);

            if (project) {
                const canManageProject = this.canManageProject(project, state);
                const role = state.currentUser?.role;
                const canDeleteDangerActions = ['Admin', 'Manager'].includes(role);

                this.view.renderProjectDetail(
                    project,
                    this.getVisibleTasks(state),
                    state.users,
                    (taskId) => this.handleTaskToggle(taskId),
                    (taskId) => this.handleTaskDelete(taskId),
                    (taskId) => this.handleTaskClick(taskId),
                    {
                        canManageProject, 
                        canDeleteDangerActions, 
                        onDeleteProject: (projectId) => this.projectController.handleProjectDelete(projectId)
                    }
                );
            } else {
                this.activeProjectId = null;
                this.view.showView('projects');
                this.view.showToast('Project deleted successfully or no longer exists.', 'info');
            }
        }
    }

    handleNavigation(targetView) {
        if (targetView !== 'project-detail') {
            this.activeProjectId = null;
        }

        this.view.showView(targetView);

        // Force one render when entering calendar so it always shows the latest data, even if no state change occurred.
        if (targetView === 'calendar') {
            this.requestCalendarRender(this.model.getState(), true);
        }
    }

    hasGlobalProjectAccess(state = this.model.getState()) {
        // Use can manage/viewl alll projects/tasks based on role
        const role = state.currentUser?.role;
        return role === 'Admin' || role === 'Manager';
    }

    canManageProject(project, state =this.model.getState()) {
        // Controls UI level edit permissions
        const user = state.currentUser;
        if (!user || !project) return false;

        // Admins and Managers keep full control
        if (this.hasGlobalProjectAccess(state)) return true;

        // Employees can manage their own projects
        if (user.role === 'Employee') {
            return project.ownerId === user.id;
        }

        // Fallback 
        return project.memberIds.includes(user.id);
    }

    canManageProjectById(projectId, state = this.model.getState()) {
        const project = state.projects.find(p => p.id === projectId);
        return this.canManageProject(project, state);
    }

    getVisibleProjects(state = this.model.getState()) {
        const { projects, currentUser } = state;
        if (!currentUser) return [];

        if (this.hasGlobalProjectAccess(state)) {
            return projects;
        }
        
        return projects.filter(project => project.memberIds.includes(currentUser.id));
    }

    getVisibleTasks(state = this.model.getState()) {
        const { tasks, projects, currentUser } = state;
        if (!currentUser) return [];

        if (this.hasGlobalProjectAccess(state)) {
            return tasks;
        }

        const visibleProjectIds = new Set(
            projects
                .filter(project => project.memberIds.includes(currentUser.id))
                .map(project => project.id)
        );

        return tasks.filter(task => visibleProjectIds.has(task.projectId));
    }

    canViewProject(projectId, state = this.model.getState()) {
        const { currentUser } = state;
        if (!currentUser) return false;

        const project = state.projects.find(item => item.id === projectId);

        if (!project) return false;

        if (this.hasGlobalProjectAccess(state)) {
            return true;
        }
        
        return !!project && project.memberIds.includes(currentUser.id);
    }

    async handleRoleAssignment(userId, role) {
        const state = this.model.getState();
        if (state.currentUser?.role !== 'Admin') return;

        const response = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update role');
        }

        await this.model.loadData();
    }

    handleUserSwitch(userId) {
        const changed = this.model.changeUser(userId);
        if (changed){
            localStorage.setItem('currentUserId', userId);
            this.view.showToast('Switched active profile!');
        }
        // this.model.changeUser(userId);
        // this.view.showToast('Switched active profile!');
    }

    enrichProjects(projects, tasks) {
        return projects.map(project => {
            const projectTasks = tasks.filter(task => task.projectId === project.id);
            return {
                ...project,
                tasksCount: projectTasks.length,
                completedTasksCount: projectTasks.filter(task => task.status === 'completed').length
            };
        });
    }

    renderDashboard(state = this.model.getState()) {
        const { currentUser } = state;
        if (!currentUser) return;

        const visibleProjects = this.getVisibleProjects(state);
        const visibleTasks = this.getVisibleTasks(state);

        const totalProjects = visibleProjects.length;
        const inProgressProjects = visibleProjects.filter(project => project.status === 'in_progress').length;
        const completedTasksCount = visibleTasks.filter(task => task.status === 'completed').length;
        const pendingTasksCount = visibleTasks.filter(task => task.status === 'pending').length;

        this.view.renderDashboardStats({
            totalProjects,
            inProgressProjects,
            completedTasks: completedTasksCount,
            pendingTasks: pendingTasksCount
        });

        const myProjects = this.enrichProjects(visibleProjects, visibleTasks);
        this.view.renderDashboardMyProjects(myProjects, (projId) => this.handleViewProjectDetail(projId));

        const myPendingTasks = visibleTasks.filter(task => task.assigneeId === currentUser.id && task.status === 'pending');
        this.view.renderDashboardMyTasks(
            myPendingTasks,
            visibleProjects,
            (taskId) => this.handleTaskToggle(taskId),
            (taskId) => this.handleTaskDelete(taskId)
        );
    }

    renderProjectsList(state = this.model.getState()) {
        const visibleProjects = this.getVisibleProjects(state);
        this.view.renderProjectsGrid(
            this.enrichProjects(visibleProjects, this.getVisibleTasks(state)),
            (projId) => this.handleViewProjectDetail(projId),
            this.projectSearch,
            this.projectStatus
        );
    }

    renderTasksList(state = this.model.getState()) {
        const visibleTasks = this.getVisibleTasks(state);
        this.view.renderTasksTable(
            { ...state, tasks: visibleTasks },
            (taskId) => this.handleTaskToggle(taskId),
            (taskId) => this.handleTaskClick(taskId),
            (taskId) => this.handleTaskDelete(taskId),
            this.taskSearch,
            this.taskScope,
            this.taskStatus,
            this.taskPriority,
            state.currentUser?.id
        );
    }

    handleViewProjectDetail(projectId) {
        const state = this.model.getState();
        if (!this.canViewProject(projectId, state)) {
            this.view.showToast('You do not have access to that project.');
            return;
        }

        this.activeProjectId = projectId;
        const project = state.projects.find(item => item.id === projectId);

        if (project) {
            const canManageProject = this.canManageProject(project, state);
            const role = state.currentUser?.role;
            const canDeleteDangerActions = ['Admin', 'Manager'].includes(role);

            this.view.renderProjectDetail(
                project,
                this.getVisibleTasks(state),
                state.users,
                (taskId) => this.handleTaskToggle(taskId),
                (taskId) => this.handleTaskDelete(taskId),
                (taskId) => this.handleTaskClick(taskId),
                {
                    canManageProject,
                    canDeleteDangerActions, 
                    onDeleteProject: (projectId) => this.projectController.handleProjectDelete(projectId),
                }
            );
            this.view.showView('project-detail');
        }
    }

    async handleTaskToggle(taskId) {
        await this.taskController.handleTaskToggle(taskId);
    }

    async handleTaskDelete(taskId) {
        await this.taskController.handleTaskDelete(taskId);
    }

    async handleTaskClick(taskId) {
        const state = this.model.getState();
        const task = state.tasks.find(t => t.id === taskId);

        if (!task) {
            this.view.showToast('Task not found.', 'error');
            return;
        }

        const project = state.projects.find(p => p.id === task.projectId);
        const taskForModal = {
            ...task,
            projectTitle: project ? project.title : 'External Task',
            canEdit: this.canManageProjectById(task.projectId, state)
        }

        this.view.openTaskDetails(taskForModal, state.users);
    }
}

class ProjectManagerApp {
    constructor() {
        this.model = new AppModel();
        this.view = new AppViewModular();
        this.controller = new AppController(this.model, this.view);
    }

    async start() {
        await this.controller.init();
    }
}