class AppViewModular {
    constructor() {
        this.elements = this.cacheElements();
        Object.assign(this, this.elements);

        this.commonView = new CommonView(this);
        this.dashboardView = new DashboardView(this);
        this.projectView = new ProjectView(this);
        this.calendarView = new CalendarView(this);
        this.taskView = new TaskView(this);
        this.modalView = new ModalView(this);
        this.eventView = new EventView(this);
        this.attachmentView = new AttachmentView(this);

        this.commonView.updateHeaderDate();
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
            manageRolesBtn: document.getElementById('manageRolesBtn'),
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
            manageRolesModal: document.getElementById('manageRolesModal'),
            closeManageRolesModalBtn: document.getElementById('closeManageRolesModalBtn'),
            cancelManageRolesBtn: document.getElementById('cancelManageRolesBtn'),
            manageRolesForm: document.getElementById('manageRolesForm'),
            manageRolesUserSelect: document.getElementById('manageRolesUserSelect'),
            manageRolesSelect: document.getElementById('manageRolesSelect'),
            toastNotification: document.getElementById('toastNotification'),
            projDetailCreatedDate: document.getElementById('projDetailCreatedDate'),
            detailDeleteTaskBtn: document.getElementById('detailDeleteTaskBtn'),
            detailDeleteProjectBtn: document.getElementById('detailDeleteProjectBtn'),
            addProjectSeedTaskBtn: document.getElementById('addProjectSeedTaskBtn'),
            projectSeedTasksContainer: document.getElementById('projectSeedTasksContainer'),
            taskDetailsModal: document.getElementById('taskDetailsModal'),
            closeTaskDetailsModalBtn: document.getElementById('closeTaskDetailsModalBtn'),
            closeTaskDetailsBtn: document.getElementById('closeTaskDetailsBtn'),
            taskDetailsForm: document.getElementById('taskDetailsForm'),
            taskDetailsTaskId: document.getElementById('taskDetailsTaskId'),
            taskDetailsTitleInput: document.getElementById('taskDetailsTitleInput'),
            taskDetailsDescriptionInput: document.getElementById('taskDetailsDescriptionInput'),
            taskDetailsProject: document.getElementById('taskDetailsProject'),
            taskDetailsAssigneeSelect: document.getElementById('taskDetailsAssigneeSelect'),
            taskDetailsStatusSelect: document.getElementById('taskDetailsStatusSelect'),
            taskDetailsPrioritySelect: document.getElementById('taskDetailsPrioritySelect'),
            taskDetailsDueDateInput: document.getElementById('taskDetailsDueDateInput'),
            taskDetailsEditBtn: document.getElementById('taskDetailsEditBtn'),
            taskDetailsCancelEditBtn: document.getElementById('taskDetailsCancelEditBtn'),
            taskDetailsSaveBtn: document.getElementById('taskDetailsSaveBtn'),
            detailEditProjectBtn: document.getElementById('detailEditProjectBtn'),
            editProjectModal: document.getElementById('editProjectModal'),
            closeEditProjectModalBtn: document.getElementById('closeEditProjectModalBtn'),
            cancelEditProjectBtn: document.getElementById('cancelEditProjectBtn'),
            editProjectForm: document.getElementById('editProjectForm'),
            editProjectId: document.getElementById('editProjectId'),
            editProjectTitle: document.getElementById('editProjectTitle'),
            editProjectDescription: document.getElementById('editProjectDescription'),
            editProjectDueDate: document.getElementById('editProjectDueDate'),
            editModalProjectOwnerDisplay: document.getElementById('editModalProjectOwnerDisplay'),
            editProjectMembersCheckboxGrid: document.getElementById('editProjectMembersCheckboxGrid'),
            
            navCalendar: document.getElementById('nav-calendar'),
            calendarSearchInput: document.getElementById('calendarSearchInput'),
            calendarPreviousMonthBtn: document.getElementById('calendarPreviousMonthBtn'),
            calendarNextMonthBtn: document.getElementById('calendarNextMonthBtn'),
            calendarMonthLabel: document.getElementById('calendarMonthLabel'),
            calendarSortSelect: document.getElementById('calendarSortSelect'),
            monthlyCalendarGrid: document.getElementById('monthlyCalendarGrid'),
            calendarDayItemsContainer: document.getElementById('calendarDayItemsContainer'),

            calendarProjectDetailModal: document.getElementById('calendarProjectDetailModal'),
            closeCalendarProjectDetailBtn: document.getElementById('closeCalendarProjectDetailBtn'),
            closeCalendarProjectDetailModalBtn: document.getElementById('closeCalendarProjectDetailModalBtn'),
            calendarProjectTitle: document.getElementById('calendarProjectTitle'),
            calendarProjectDescription: document.getElementById('calendarProjectDescription'),
            calendarProjectDueDate: document.getElementById('calendarProjectDueDate'),
            calendarProjectOwnerDisplay: document.getElementById('calendarProjectOwnerDisplay'),
            //calendarProjectMembersGrid: document.getElementById('calendarProjectMembersGrid'),
            calendarProjectMembersList: document.getElementById('calendarProjectMembersList'),
            calendarProjectTasksList: document.getElementById('calendarProjectTasksList'),

            calendarTaskDetailModal: document.getElementById('calendarTaskDetailModal'),
            closeCalendarTaskDetailBtn: document.getElementById('closeCalendarTaskDetailBtn'),
            closeCalendarTaskDetailModalBtn: document.getElementById('closeCalendarTaskDetailModalBtn'),
            calendarTaskTitle: document.getElementById('calendarTaskTitle'),
            calendarTaskDescription: document.getElementById('calendarTaskDescription'),
            calendarTaskProject: document.getElementById('calendarTaskProject'),
            calendarTaskAssignee: document.getElementById('calendarTaskAssignee'),
            calendarTaskStatus: document.getElementById('calendarTaskStatus'),
            calendarTaskPriority: document.getElementById('calendarTaskPriority'),
            calendarTaskDueDate: document.getElementById('calendarTaskDueDate'),

            calendarDayDetailModal: document.getElementById('calendarDayDetailModal'),
            closeCalendarDayDetailModalBtn: document.getElementById('closeCalendarDayDetailModalBtn'),
            closeCalendarDayDetailBtn: document.getElementById('closeCalendarDayDetailBtn'),
            calendarDayTitle: document.getElementById('calendarDayTitle'),
            calendarDayLabel: document.getElementById('calendarDayLabel'),

            projectDocumentTabsStrip: document.getElementById('projectDocumentTabsStrip'),
            projectAttachmentsModal: document.getElementById('projectAttachmentsModal'),
            closeProjectAttachmentsModalBtn: document.getElementById('closeProjectAttachmentsModalBtn'),
            projectAttachmentsForm: document.getElementById('projectAttachmentsForm'),
            projectAttachmentFile: document.getElementById('projectAttachmentFile'),
            projectAttachmentsTypeLabel: document.getElementById('projectAttachmentsTypeLabel'),
            refreshAttachmentsBtn: document.getElementById('refreshAttachmentsBtn'),
            projDetailAttachmentsList: document.getElementById('projDetailAttachmentsList'),
            projectAttachmentPreviewPanel: document.getElementById('projectAttachmentPreviewPanel'),
            projectAttachmentPreviewFrame: document.getElementById('projectAttachmentPreviewFrame')
        };
    }

    updateHeaderDate() { return this.commonView.updateHeaderDate(); }
    getAvatarColor(name) { return this.commonView.getAvatarColor(name); }
    getInitials(name) { return this.commonView.getInitials(name); }
    showView(viewName) { return this.commonView.showView(viewName); }
    openModal(modal) { return this.commonView.openModal(modal); }
    closeModal(modal) { return this.commonView.closeModal(modal); }
    showToast(message, type = 'success') { return this.commonView.showToast(message, type); }
    renderUserSwitcher(users, activeUserId) { return this.commonView.renderUserSwitcher(users, activeUserId); }
    renderActiveUser(user) { return this.commonView.renderActiveUser(user); }
    openTaskDetails(task, users) { return this.modalView.openTaskDetails(task, users); }
    setTaskDetailsEditMode(isEditing){ return this.modalView.setTaskDetailsEditMode(isEditing); }
    collectTaskDetailsFormData() { return this.modalView.collectTaskDetailsFormData(); }
    openEditProjectModal(project, users) { return this.modalView.openEditProjectModal(project, users); }
    collectEditProjectData() {return this.modalView.collectEditProjectData(); }


    renderDashboardStats(stats) { return this.dashboardView.renderDashboardStats(stats); }
    renderDashboardMyProjects(projects, onProjectClick) { return this.dashboardView.renderDashboardMyProjects(projects, onProjectClick); }
    renderDashboardMyTasks(tasks, projects, onToggle, onDelete) { return this.dashboardView.renderDashboardMyTasks(tasks, projects, onToggle, onDelete); }

    renderProjectsGrid(projects, onProjectClick, searchVal = '', statusVal = 'all') { return this.projectView.renderProjectsGrid(projects, onProjectClick, searchVal, statusVal); }
    renderProjectDetail(project, tasks, users, onTaskToggle, onTaskDelete, onTaskClick, options ={}) { return this.projectView.renderProjectDetail(project, tasks, users, onTaskToggle, onTaskDelete, onTaskClick, options); }

    renderTasksTable({ tasks, projects, users }, onToggle, onTaskClick, onDelete, searchVal = '', scopeVal = 'all', statusVal = 'all', priorityVal = 'all', activeUserId) { return this.taskView.renderTasksTable({ tasks, projects, users }, onToggle, onTaskClick, onDelete, searchVal, scopeVal, statusVal, priorityVal, activeUserId); }

    renderMonthlyCalendar(calendarGrid, handlers) {return this.calendarView.renderMonthlyCalendar(calendarGrid, handlers); }

    openCalendarProjectDetailModal(project, users, tasks) { return this.modalView.openCalendarProjectDetailModal(project, users, tasks); }
    openCalendarTaskDetailModal(task, users, projects) { return this.modalView.openCalendarTaskDetailModal(task, users, projects); }
    openCalendarDayDetailModal(dayLabel, items, handlers) { return this.modalView.openCalendarDayDetailModal(dayLabel, items, handlers); }

    populateProjectSelector(projects, activeProjectId = null) { return this.modalView.populateProjectSelector(projects, activeProjectId); }
    populateAssigneeSelector(users) { return this.modalView.populateAssigneeSelector(users); }
    setupManageMembersModal(project, users) { return this.modalView.setupManageMembersModal(project, users); }
    populateProjectMembersCheckbox(users, targetId) { return this.modalView.populateProjectMembersCheckbox(users, targetId); }
    setupManageRolesModal(users, roles) { return this.modalView.setupManageRolesModal(users, roles); }

    bindUserSwitch(handler) { return this.eventView.bindUserSwitch(handler); }
    bindNavigate(handler) { return this.eventView.bindNavigate(handler); }
    bindProjectDetailClick(handler) { return this.eventView.bindProjectDetailClick(handler); }
    bindCreateProject(handler) { return this.eventView.bindCreateProject(handler); }
    bindCreateTask(handler) { return this.eventView.bindCreateTask(handler); }
    bindProjectStatusChange(handler) { return this.eventView.bindProjectStatusChange(handler); }
    bindProjectMembersSave(handler) { return this.eventView.bindProjectMembersSave(handler); }
    bindRoleAssignmentSave(handler) { return this.eventView.bindRoleAssignmentSave(handler); }
    bindFilters(onProjectFilter, onTaskFilter) { return this.eventView.bindFilters(onProjectFilter, onTaskFilter); }
    bindTaskDetailsEvents(onSave) {return this.eventView.bindTaskDetailsEvents(onSave); }
    bindEditProject(handler) { return this.eventView.bindEditProject(handler); }
    bindCalendarControls(handlers) { return this.eventView.bindCalendarControls(handlers); }
}
