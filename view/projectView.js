class ProjectView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    renderProjectsGrid(projects, onProjectClick, searchVal = '', statusVal = 'all') {
        const query = searchVal.toLowerCase().trim();

        const filtered = projects.filter(proj => {
            const matchesSearch = proj.title.toLowerCase().includes(query) ||
                proj.description.toLowerCase().includes(query);
            const matchesStatus = statusVal === 'all' || proj.status === statusVal;
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            this.view.projectsGrid.innerHTML = `
                <div class="empty-state-card" style="grid-column: span 3; padding: 48px;">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>No projects found matching the criteria.</p>
                </div>
            `;
            return;
        }

        this.view.projectsGrid.innerHTML = filtered.map(proj => {
            const totalTasks = proj.tasksCount || 0;
            const completedTasks = proj.completedTasksCount || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const statusLabel = proj.status.replace('_', ' ');
            const initials = this.view.getInitials(proj.owner?.name);
            const avatarBg = this.view.getAvatarColor(proj.owner?.name || 'Owner');

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

        this.view.projectsGrid.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                onProjectClick(id);
            });
        });
    }

    renderProjectDetail(project, tasks, users, onTaskToggle, onTaskDelete, options = {}) {
        if (!project) return;

        const canManageProject = !!options.canManageProject;

        this.view.activeProjectId = project.id;
        this.view.projectDetailStatusSelect.value = project.status;
        this.view.projectDetailStatusSelect.dataset.currentStatus = project.status;
        this.view.projectDetailStatusSelect.disabled = !canManageProject;

        this.view.manageMembersBtn.classList.toggle('hidden', !canManageProject);
        this.view.detailAddTaskBtn.classList.toggle('hidden', !canManageProject);

        const ownerInitials = this.view.getInitials(project.owner?.name);
        const ownerColor = this.view.getAvatarColor(project.owner?.name || 'Owner');
        this.view.projDetailOwner.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${ownerColor}">${ownerInitials}</div>
            <span>${project.owner?.name || 'Unknown'}</span>
        `;

        this.view.projDetailDueDate.innerHTML = `<i class="fa-regular fa-calendar-check"></i> <span>Deadline: ${project.dueDate || 'No Date'}</span>`;

        const projTasks = tasks.filter(t => t.projectId === project.id);
        const totalTasks = projTasks.length;
        const completedTasks = projTasks.filter(t => t.status === 'completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        this.view.projDetailProgressBar.style.width = `${progress}%`;
        this.view.projDetailProgressPercent.textContent = `${progress}% (${completedTasks}/${totalTasks})`;

        const projectMembers = users.filter(u => project.memberIds.includes(u.id));
        this.view.projDetailMembersList.innerHTML = projectMembers.map(u => {
            const isOwner = u.id === project.ownerId;
            const initials = this.view.getInitials(u.name);
            const color = this.view.getAvatarColor(u.name);
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

        if (totalTasks === 0) {
            this.view.projDetailTasksList.innerHTML = '';
            this.view.projTasksEmptyState.classList.remove('hidden');
            this.view.detailEmptyStateAddTaskBtn.classList.toggle('hidden', !canManageProject);
        } else {
            this.view.projTasksEmptyState.classList.add('hidden');
            this.view.projDetailTasksList.innerHTML = projTasks.map(task => {
                const assigneeName = task.assignee?.name || 'Unassigned';
                const initials = this.view.getInitials(assigneeName);
                const avatarBg = task.assignee ? this.view.getAvatarColor(assigneeName) : 'var(--color-neutral)';
                const isCompleted = task.status === 'completed';

                return `
                    <div class="project-task-item ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}">
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

            this.view.projDetailTasksList.querySelectorAll('.task-check').forEach(input => {
                input.addEventListener('change', () => {
                    const id = input.getAttribute('data-id');
                    onTaskToggle(id);
                });
            });

            this.view.projDetailTasksList.querySelectorAll('.btn-delete-task').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this task from this project?')) {
                        onTaskDelete(id);
                    }
                });
            });
        }

        const canDelete = ! !options.canDeleteDangerActions; //Admin/Manager can delete projects and tasks

        this.view.projDetailTitle.textContent = project.title;
        this.view.projDetailDesc.textContent = project.description || 'No description provided.';

        //show project created date
        this.view.projDetailCreatedDate.innerHTML = `<i class="fa-regular fa-calendar-plus"></i> <span>Created: ${project.createdAt || 'No Date'}</span>`;

        // Show/hide danger button based on role
        this.view.detailDeleteTaskBtn.classList.toggle('hidden', !canDelete);
        this.view.detailDeleteProjectBtn.classList.toggle('hidden', !canDelete);

        let selectedTaskId = null;
        this.view.detailDeleteTaskBtn.disabled = true; // Initially disable the delete task button

        // Ensure each row has data-task-id attribute for selection
        // <div class="project-task-item" data-task-id="${task.id}"> in the task rendering above

        // After rendering tasks
        this.view.projDetailTasksList.querySelectorAll('.project-task-item').forEach(row => {
            row.addEventListener('click', () => {
                if (!canDelete) return; // Ignore selection if user cannot delete tasks

                this.view.projDetailTasksList.querySelectorAll('.project-task-item').forEach(r => r.classList.remove('task-selected'));
                row.classList.add('task-selected');
                selectedTaskId = row.getAttribute('data-task-id');
                this.view.detailDeleteTaskBtn.disabled = !selectedTaskId; // Enable delete button if a task is selected
            });
        });

        this.view.detailDeleteTaskBtn.onclick = () => {
            if (!selectedTaskId) return;

            if (confirm('Are you sure you want to delete the selected task from this project?')) {
                onTaskDelete(selectedTaskId);
            }
        };
``
        this.view.detailDeleteProjectBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                options.onProjectDelete(project.id);
            }
        };
    }
}
