class NavigationController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;
    }

    init() {
        this.bindViewEvents();
        this.bindModalEvents();
    }

    bindViewEvents() {
        this.view.bindNavigate((target) => this.handleNavigation(target));
        this.view.bindUserSwitch((userId) => this.handleUserSwitch(userId));
        this.view.bindProjectDetailClick((projectId) => this.appController.handleViewProjectDetail(projectId));
    }

    bindModalEvents() {
        this.view.headerNewProjectBtn.addEventListener('click', () => this.appController.openCreateProjectModal());
        if (this.view.manageRolesBtn) {
            this.view.manageRolesBtn.addEventListener('click', () => this.appController.openManageRolesModal());
        }

        const closeProjModal = () => this.view.closeModal(this.view.createProjectModal);
        this.view.closeCreateProjectModalBtn.addEventListener('click', closeProjModal);
        this.view.cancelCreateProjectBtn.addEventListener('click', closeProjModal);

        const openAddTaskModal = (defaultProjectId = null) => {
            const state = this.model.getState();
            const manageableProjects = state.projects.filter(p => this.appController.canManageProjectById(p.id, state));
            // only allow selecting projects the user can manage
            if (!manageableProjects.length) {
                this.view.showToast('You do not have permission to add tasks to any project.', 'error');
                return;
            }

            // if user is in project detail, block modal unless they can manage the project
            if (this.appController.activeProjectId && !this.appController.canManageProjectById(this.appController.activeProjectId, state)) {
                this.view.showToast('You do not have permission to add tasks to this project.', 'error');
                return;
            }

            // use requested project when allowed, otherwise default to first allowed project
            const selectedProjectId = defaultProjectId && manageableProjects.some(p => p.id === defaultProjectId) ? defaultProjectId : manageableProjects[0].id;

            this.view.populateProjectSelector(manageableProjects, selectedProjectId);
            this.view.populateAssigneeSelector(state.users);
            this.view.openModal(this.view.addTaskModal);
        };

        this.view.headerNewTaskBtn.addEventListener('click', () => openAddTaskModal());
        this.view.detailAddTaskBtn.addEventListener('click', () => openAddTaskModal());
        this.view.detailEmptyStateAddTaskBtn.addEventListener('click', () => openAddTaskModal());

        const closeTaskModal = () => this.view.closeModal(this.view.addTaskModal);
        this.view.closeAddTaskModalBtn.addEventListener('click', closeTaskModal);
        this.view.cancelAddTaskBtn.addEventListener('click', closeTaskModal);

        this.view.manageMembersBtn.addEventListener('click', () => this.appController.openManageMembersModal());

        const closeMembersModal = () => this.view.closeModal(this.view.manageMembersModal);
        this.view.closeManageMembersModalBtn.addEventListener('click', closeMembersModal);
        this.view.cancelManageMembersBtn.addEventListener('click', closeMembersModal);

        const closeRolesModal = () => this.view.closeModal(this.view.manageRolesModal);
        this.view.closeManageRolesModalBtn.addEventListener('click', closeRolesModal);
        this.view.cancelManageRolesBtn.addEventListener('click', closeRolesModal);

        const closeTaskDetailsModal = () => this.view.closeModal(this.view.taskDetailsModal);
        this.view.closeTaskDetailsModalBtn?.addEventListener('click', closeTaskDetailsModal);
        this.view.closeTaskDetailsBtn?.addEventListener('click', closeTaskDetailsModal);
        // if (this.view.closeManageRolesModalBtn) {
        //     const closeRolesModal = () => this.view.closeModal(this.view.manageRolesModal);
        //     this.view.closeManageRolesModalBtn.addEventListener('click', closeRolesModal);
        //     this.view.cancelManageRolesBtn.addEventListener('click', closeRolesModal);
        // }

        // Calendar project detail modal close contorls
        const closeCalendarProjectDetailModal = () => {
            this.view.closeModal(this.view.calendarProjectDetailModal);
            this.appController.endCalendarInteraction();
        };        

        // Calendar task detail modal close controls
        const closeCalendarTaskDetailModal = () => {
            this.view.closeModal(this.view.calendarTaskDetailModal);
            this.appController.endCalendarInteraction();
        };

        // Calendar day detail modal close controls
        const closeCalendarDayDetailModal = () => {
            this.view.closeModal(this.view.calendarDayDetailModal);
            this.appController.endCalendarInteraction();
        };
    }

    handleNavigation(targetView) {
        this.appController.handleNavigation(targetView);
    }

    handleUserSwitch(userId) {
        this.appController.handleUserSwitch(userId);
    }
}
