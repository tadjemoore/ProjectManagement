class ModalView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    populateProjectSelector(projects, activeProjectId = null) {
        this.view.taskProjectSelect.innerHTML = projects.map(proj =>
            `<option value="${proj.id}" ${proj.id === activeProjectId ? 'selected' : ''}>${proj.title}</option>`
        ).join('');
    }

    populateAssigneeSelector(users) {
        this.view.taskAssigneeSelect.innerHTML = '<option value="">Unassigned</option>' + users.map(user =>
            `<option value="${user.id}">${user.name} (${user.role})</option>`
        ).join('');
    }

    setupManageMembersModal(project, users) {
        this.view.manageMembersProjectId.value = project.id;
        this.populateProjectMembersCheckbox(users, 'manageMembersCheckboxGrid');

        this.view.manageMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]').forEach(box => {
            if (project.memberIds.includes(box.value)) {
                box.checked = true;
            }
        });
    }

    populateProjectMembersCheckbox(users, targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        target.innerHTML = users.map(user => `
            <label class="checkbox-card">
                <input type="checkbox" value="${user.id}">
                <span>${user.name} (${user.role})</span>
            </label>
        `).join('');
    }

    setupManageRolesModal(users, roles) {
        this.view.manageRolesUserSelect.innerHTML = users.map(user =>
            `<option value="${user.id}">${user.name} (${user.role})</option>`
        ).join('');

        this.view.manageRolesSelect.innerHTML = roles.map(role =>
            `<option value="${role}">${role}</option>`
        ).join('');
    }

    openTaskDetails(task, users) {
        this.view.taskDetailsTaskId.value = task.id;
        this.view.taskDetailsTitleInput.value = task.title || '';
        this.view.taskDetailsDescriptionInput.value = task.description || '';
        if ('value' in this.view.taskDetailsProject){
            this.view.taskDetailsProject.value = task.projectTitle || 'External Task';
        } else {
            this.view.taskDetailsProject.textContent = task.projectTitle || 'External Task';
        }
        this.view.taskDetailsDueDateInput.value = task.dueDate || '';
        this.view.taskDetailsStatusSelect.value = task.status || 'pending';
        this.view.taskDetailsPrioritySelect.value = task.priority || 'medium';
        
        const assigneeOptions = ['<option value="">Unassigned</option>'];
        users.forEach(user => {assigneeOptions.push(`<option value="${user.id}">${user.name} (${user.role})</option>`);});
        this.view.taskDetailsAssigneeSelect.innerHTML = assigneeOptions.join('');
        this.view.taskDetailsAssigneeSelect.value = task.assigneeId || '';
        
        this.setTaskDetailsEditMode(false);
        this.view.openModal(this.view.taskDetailsModal);
        // this.setTaskDetailsEditMode(false);
        // const canEdit = !!task.canEdit;
        // this.view.taskDetailsEditBtn.classList.toggle('hidden', !canEdit);
        
        // this.view.openModal(this.view.taskDetailsModal);

        // this.view.taskDetailsTitle.textContent = task.title;
        // this.view.taskDetailsDescription.textContent = task.description || 'No description';
        // this.view.taskDetailsProject.textContent = task.projectTitle || 'External Task';
        // this.view.taskDetailsAssignee.textContent = assignee ? assignee.name : 'Unassigned';
        // this.view.taskDetailsPriority.textContent = task.priority;
        // this.view.taskDetailsDueDate.textContent = task.dueDate || 'No date';
        // this.view.taskDetailsStatus.textContent = task.status || 'No status';
        // this.view.openModal(this.view.taskDetailsModal);
    }

    setTaskDetailsEditMode(isEditing) {
        this.view.taskDetailsTitleInput.readOnly = !isEditing;
        this.view.taskDetailsDescriptionInput.readOnly = !isEditing;
        this.view.taskDetailsDueDateInput.readOnly = !isEditing;

        this.view.taskDetailsAssigneeSelect.disabled = !isEditing;
        this.view.taskDetailsStatusSelect.disabled = !isEditing;
        this.view.taskDetailsPrioritySelect.disabled = !isEditing;

        this.view.taskDetailsEditBtn.classList.toggle('hidden', isEditing);
        this.view.taskDetailsCancelEditBtn.classList.toggle('hidden', !isEditing);
        this.view.taskDetailsSaveBtn.classList.toggle('hidden', !isEditing);
    }

    collectTaskDetailsFormData() {
        return {
            taskId: this.view.taskDetailsTaskId.value,
            title: this.view.taskDetailsTitleInput.value.trim(),
            description: this.view.taskDetailsDescriptionInput.value.trim(),
            assigneeId: this.view.taskDetailsAssigneeSelect.value || null,
            status: this.view.taskDetailsStatusSelect.value,
            priority: this.view.taskDetailsPrioritySelect.value,
            dueDate: this.view.taskDetailsDueDateInput.value || ''
        };
    }
    
    openEditProjectModal(project, users) {
        this.view.editProjectId.value = project.id;
        this.view.editProjectTitle.value = project.title || '';
        this.view.editProjectDescription.value = project.description || '';
        this.view.editProjectDueDate.value = project.dueDate || '';

        if(!this.view.editModalProjectOwnerDisplay || !this.view.editProjectMembersCheckboxGrid) {
            throw new Error('Edit Project modal is missing required owner or members elements.');
        }

        // Render read only owner badge so editor knows who owns the project
        const ownerInitials = this.view.getInitials(project.owner?.name);
        const ownerColor = this.view.getAvatarColor(project.owner?.name || 'Owner');
        this.view.editModalProjectOwnerDisplay.innerHTML = `<div class="avatar avatar-sm" style="background: ${ownerColor}">${ownerInitials}</div>
            <span>${project.owner?.name || 'Unknown'} (${project.owner?.role || 'Unknown'})</span>`;
        
        this.populateProjectMembersCheckbox(users, 'editProjectMembersCheckboxGrid');

        // Pre-check member already assigned to the project
        this.view.editProjectMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]').forEach(box => {
            if (project.memberIds.includes(box.value)) {
                box.checked = true;
            } 
        });

        this.view.openModal(this.view.editProjectModal);

    }

    collectEditProjectData() {
        const memberIds = [];

        // Collect all checked members from the edit modal
        this.view.editProjectMembersCheckboxGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
            memberIds.push(box.value);
        });

        return {
            projectId: this.view.editProjectId.value,
            title: this.view.editProjectTitle.value.trim(),
            description: this.view.editProjectDescription.value.trim(),
            dueDate: this.view.editProjectDueDate.value,
            memberIds
        };
    }

    openCalendarProjectDetailModal(project, users) {
        this.view.calendarProjectTitle.value = project.title || '';
        this.view.calendarProjectDescription.value = project.description || '';
        this.view.calendarProjectDueDate.value = project.dueDate || '';

        const ownerName = project.owner?.name || 'Unknown';
        const ownerRole = project.owner?.role || 'Unknown';
        const ownerInitials = this.view.getInitials(project.owner?.name);
        const ownerColor = this.view.getAvatarColor(project.owner?.name || 'Owner');
        
        this.view.calendarProjectOwnerDisplay.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${ownerColor}">${ownerInitials}</div>
            <span>${ownerName} (${ownerRole})</span>`;

        const memberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
        this.view.calendarProjectMembersGrid.innerHTML = users.filter(user => project.memberIds.includes(user.id)).map(user => `
            <label class="checkbox-card">
                <input type="checkbox" value="${user.id}" disabled checked>
                <span>${user.name} (${user.role})</span>
            </label>
        `).join('');

        this.view.openModal(this.view.calendarProjectDetailModal);
    }

    openCalendarTaskDetailModal(task, users, projects) {
        const project = projects.find(item => item.id === task.projectId);
        const assignee = users.find(item => item.id === task.assigneeId);

        this.view.calendarTaskTitle.value = task.title || '';
        this.view.calendarTaskDescription.value = task.description || '';
        this.view.calendarTaskProject.value = project ? project.title : 'Unknown Project';
        this.view.calendarTaskAssignee.value = assignee ? `${assignee.name} (${assignee.role})` : 'Unassigned';
        this.view.calendarTaskStatus.value = task.status || '';
        this.view.calendarTaskPriority.value = task.priority || '';
        this.view.calendarTaskDueDate.value = task.dueDate || '';

        this.view.openModal(this.view.calendarTaskDetailModal);
    }

    openCalendarDayDetailModal(dayLabel, items, handlers) {
        this.view.calendarDayTitle.textContent = 'Due Items';
        this.view.calendarDayLabel.textContent = dayLabel;

        if (!items.length) {
            this.view.calendarDayItemsContainer.innerHTML = `
                <div class="empty-state-card" style="padding: 20px">
                    <p>No tasks or projects due on this day.</p>
                </div>
            `;
        } else {
            this.view.calendarDayItemsContainer.innerHTML = items.map(item => `
                <div class="calendar-day-item-row" data-item-id="${item.id}" data-item-type="${item.type}">
                    <div>
                        <strong>${item.title}</strong>
                        <p>${item.type === 'project' ? 'Project' : 'Task'} due ${item.dueDate}</p>
                    </div>
                    <span class="badge badge-${item.type === 'project' ? 'medium' : item.priority}">${item.type}</span>
                </div>
            `).join('');
        }

        this.view.calendarDayItemsContainer.querySelectorAll('.calendar-day-item-row').forEach(row => {
            row.addEventListener('click', () => {
                const itemId = row.getAttribute('data-item-id');
                const itemType = row.getAttribute('data-item-type');
                const item = items.find(entry => entry.id === itemId && entry.type === itemType);

                if (!item) return;

                const calendarData = item.data || item; // Use item.data if available, otherwise use item directly

                // Close the day list modal first, then open detail modal via handlers
                this.view.closeModal(this.view.calendarDayDetailModal);

                if (item.type === 'project') {
                    handlers.onProjectClick(item);
                } else {
                    handlers.onTaskClick(item);
                }
                
                this.view.openModal(this.view.calendarDayDetailModal);
            });
        });
    }
}
