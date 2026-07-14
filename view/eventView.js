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
        const container = this.view.projectSeedTasksContainer;
    const addTaskBtn = this.view.addProjectSeedTaskBtn;
    const membersGrid = this.view.projectMembersCheckboxGrid;

    if (!container || !addTaskBtn || !membersGrid) return;

    // Build assignee options from currently checked project members
    const buildAssigneeOptionsHtml = () => {
        const selectedMemberIds = [];
        membersGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((box) => {
            selectedMemberIds.push(box.value);
        });

        // Always keep an Unassigned option at the top
        const options = ['<option value="">Unassigned</option>'];

        selectedMemberIds.forEach((id) => {
            const checkbox = membersGrid.querySelector(`input[type="checkbox"][value="${id}"]`);
            // Label text comes from the sibling <span> rendered in members grid
            const label = checkbox?.nextElementSibling?.textContent?.trim() || id;
            options.push(`<option value="${id}">${label}</option>`);
        });

        return options.join('');
    };

    // Push fresh assignee options into all seed-task rows
    const refreshAllSeedTaskAssignees = () => {
        const optionsHtml = buildAssigneeOptionsHtml();
        container.querySelectorAll('.seed-task-assignee').forEach((select) => {
            const currentValue = select.value; // Preserve current selection if still valid
            select.innerHTML = optionsHtml;

            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            } else {
                select.value = '';
            }
        });
    };

    // Create one task row DOM block
    const makeSeedTaskRowHtml = () => `
        <div class="project-seed-task-row">
            <input type="text" class="form-input seed-task-title" placeholder="Task Title">
            <input type="text" class="form-input seed-task-desc" placeholder="Task Description (Optional)">
            <select class="form-select seed-task-assignee">
                <option value="">Unassigned</option>
            </select>
            <select class="form-select seed-task-priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
            </select>
            <input type="date" class="form-input seed-task-due-date">
            <button type="button" class="btn btn-secondary btn-sm remove-seed-task-btn" title="Remove Task">&times;</button>
        </div>
    `;

    // Wire one-time handlers only once
    if (!container.dataset.wired) {
        container.dataset.wired = 'true';

        addTaskBtn.addEventListener('click', () => {
            // Add a new row, then immediately populate assignee list from selected members
            container.insertAdjacentHTML('beforeend', makeSeedTaskRowHtml());
            refreshAllSeedTaskAssignees();
        });

        container.addEventListener('click', (evt) => {
            if (!evt.target.classList.contains('remove-seed-task-btn')) return;

            const rows = container.querySelectorAll('.project-seed-task-row');
            if (rows.length === 1) return; // Keep one row visible for UX clarity

            evt.target.closest('.project-seed-task-row')?.remove();
        });

        // Critical fix: refresh assignee dropdowns whenever member selection changes
        membersGrid.addEventListener('change', (evt) => {
            if (evt.target.matches('input[type="checkbox"]')) {
                refreshAllSeedTaskAssignees();
            }
        });
    }

    // Initial refresh when modal/event wiring runs
    refreshAllSeedTaskAssignees();

    this.view.createProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedMembers = [];
        membersGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((box) => {
            selectedMembers.push(box.value);
        });

        const initialTasks = [];
        container.querySelectorAll('.project-seed-task-row').forEach((row) => {
            const title = row.querySelector('.seed-task-title')?.value?.trim() || '';
            const description = row.querySelector('.seed-task-desc')?.value?.trim() || '';
            const assigneeId = row.querySelector('.seed-task-assignee')?.value || '';
            const priority = (row.querySelector('.seed-task-priority')?.value || 'medium').toLowerCase();
            const dueDate = row.querySelector('.seed-task-due-date')?.value || '';

            if (!title) return; // Skip blank rows instead of blocking project creation

            initialTasks.push({
                title,
                description,
                assigneeId: assigneeId || null, // Null means unassigned
                priority,
                dueDate
            });
        });

        const projectData = {
            title: this.view.projectTitle.value,
            description: this.view.projectDescription.value,
            dueDate: this.view.projectDueDate.value,
            memberIds: selectedMembers,
            initialTasks
        };

        try {
            await handler(projectData);

            this.view.closeModal(this.view.createProjectModal);
            this.view.createProjectForm.reset();
            this.view.showToast('Project created successfully!');

            // Reset seed task list back to one clean row
            container.innerHTML = makeSeedTaskRowHtml();
            refreshAllSeedTaskAssignees();
        } catch (error) {
            this.view.showToast(error?.message || 'Failed to create project', 'error');
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
            if (this.view.projectDetailStatusSelect.disabled) {
                e.target.value = e.target.dataset.currentStatus || e.target.value;
                this.view.showToast('You do not have permission to change the project status.', 'error');
                return;
            }

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
