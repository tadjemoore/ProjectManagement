class EventView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    bindUserSwitch(handler) {
        this.view.userSwitcherSelect.addEventListener('change', (e) => {
            handler(e.target.value);
        });
    }

    bindNavigate(handler) {
        const handleNav = (e, target) => {
            e.preventDefault();
            handler(target);
        };

        this.view.navDashboard.addEventListener('click', (e) => handleNav(e, 'dashboard'));
        this.view.navProjects.addEventListener('click', (e) => handleNav(e, 'projects'));
        this.view.navTasks.addEventListener('click', (e) => handleNav(e, 'tasks'));
        this.view.backToProjectsBtn.addEventListener('click', (e) => handleNav(e, 'projects'));
    }

    bindProjectDetailClick(handler) {
        this.view.onProjectCardClick = handler;
    }

    bindCreateProject(handler) {
        this.view.createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedMembers = [];
            this.view.projectMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
                selectedMembers.push(box.value);
            });

            const projectData = {
                title: this.view.projectTitle.value,
                description: this.view.projectDescription.value,
                dueDate: this.view.projectDueDate.value,
                memberIds: selectedMembers
            };

            try {
                await handler(projectData);
                this.view.closeModal(this.view.createProjectModal);
                this.view.createProjectForm.reset();
                this.view.showToast('Project created successfully!');
            } catch (err) {
                this.view.showToast(err?.message || 'Failed to create project', 'error');
            }
        });
    }

    bindCreateTask(handler) {
        this.view.addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskData = {
                projectId: this.view.taskProjectSelect.value,
                title: this.view.taskTitle.value,
                description: this.view.taskDescription.value,
                assigneeId: this.view.taskAssigneeSelect.value,
                priority: this.view.taskPrioritySelect.value,
                dueDate: this.view.taskDueDate.value
            };

            try {
                await handler(taskData);
                this.view.closeModal(this.view.addTaskModal);
                this.view.addTaskForm.reset();
                this.view.showToast('Task added successfully!');
            } catch (err) {
                this.view.showToast('Failed to add task', 'error');
            }
        });
    }

    bindProjectStatusChange(handler) {
        this.view.projectDetailStatusSelect.addEventListener('change', (e) => {
            if (this.view.activeProjectId) {
                handler(this.view.activeProjectId, e.target.value);
                this.view.showToast('Project status updated!');
            }
        });
    }

    bindProjectMembersSave(handler) {
        this.view.manageMembersForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projId = this.view.manageMembersProjectId.value;

            const selectedMembers = [];
            this.view.manageMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
                selectedMembers.push(box.value);
            });

            try {
                await handler(projId, selectedMembers);
                this.view.closeModal(this.view.manageMembersModal);
                this.view.showToast('Project team members updated!');
            } catch (err) {
                this.view.showToast('Failed to update members', 'error');
            }
        });
    }

    bindRoleAssignmentSave(handler) {
        if (!this.view.manageRolesForm) return;

        this.view.manageRolesForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userId = this.view.manageRolesUserSelect.value;
            const role = this.view.manageRolesSelect.value;

            try {
                await handler(userId, role);
                this.view.closeModal(this.view.manageRolesModal);
                this.view.showToast('User role updated!');
            } catch (err) {
                this.view.showToast('Failed to update user role', 'error');
            }
        });
    }

    bindFilters(onProjectFilter, onTaskFilter) {
        const runProjFilter = () => {
            onProjectFilter(this.view.projectSearchInput.value, this.view.projectStatusFilter.value);
        };
        this.view.projectSearchInput.addEventListener('input', runProjFilter);
        this.view.projectStatusFilter.addEventListener('change', runProjFilter);

        const runTaskFilter = () => {
            onTaskFilter(
                this.view.taskSearchInput.value,
                this.view.taskScopeFilter.value,
                this.view.taskStatusFilter.value,
                this.view.taskPriorityFilter.value
            );
        };
        this.view.taskSearchInput.addEventListener('input', runTaskFilter);
        this.view.taskScopeFilter.addEventListener('change', runTaskFilter);
        this.view.taskStatusFilter.addEventListener('change', runTaskFilter);
        this.view.taskPriorityFilter.addEventListener('change', runTaskFilter);
    }
}
