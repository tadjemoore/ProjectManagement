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

    openCalendarProjectDetailModal(project, users, tasks = []) {
        // Guard: prevent hard crash
        if (!project || typeof project !== 'object') {
            console.error('Calendar project data is invalid:', project);
            this.view.showToast('Error: Unable to open project details', 'error');
            return;
        }

        const safeUsers = Array.isArray(users) ? users : [];
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const safeMemberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
        
        this.view.calendarProjectDescription.value = project.description || '';
        this.view.calendarProjectTitle.value = project.title || '';
        this.view.calendarProjectDueDate.value = project.dueDate || '';
        
        const ownerName = project.owner?.name || 'Unknown';
        const ownerRole = project.owner?.role || 'Unknown';
        const ownerInitials = this.view.getInitials(project.owner?.name);
        const ownerColor = this.view.getAvatarColor(project.owner?.name || 'Owner');
    
        this.view.calendarProjectOwnerDisplay.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${ownerColor}">${ownerInitials}</div>
            <span>${ownerName} (${ownerRole})</span>`;

        // Members list
        const members = safeUsers.filter(user => safeMemberIds.includes(user.id));

        if (!members.length) {
            this.view.calendarProjectMembersList.innerHTML = '<p>No members assigned to this project.</p>';
        } else {
            this.view.calendarProjectMembersList.innerHTML = members.map(member => {
                const initials = this.view.getInitials(member.name);
                const color = this.view.getAvatarColor(member.name);
                return `
                    <div class="member-card">
                        <div class="avatar avatar-sm" style="background: ${color}">${initials}</div>
                        <span>${member.name} (${member.role})</span>
                    </div>
                `;
            }).join('');
        }

        // Project tasks sorted by due date, empty due dates are last
        const projectTasks = safeTasks
            .filter(task => String(task.projectId) === String(project.id))
            .sort ((a, b) => {
                const aHasDue = !!a.dueDate;
                const bHasDue = !!b.dueDate;
                if (aHasDue && bHasDue) return new Date(a.dueDate) - new Date(b.dueDate);
                if (aHasDue) return -1;
                if (bHasDue) return 1;
                return String(a.title || '').localeCompare(String(b.title || ''));
            });

        if (!projectTasks.length) {
            this.view.calendarProjectTasksList.innerHTML = '<p>No tasks associated with this project.</p>';
        } else {
            this.view.calendarProjectTasksList.innerHTML = projectTasks.map(task => `
                <div class="project-task-row">
                    <div>
                        <strong>${task.title || 'Untitled Task'}</strong>
                        <p>${task.dueDate ? `Due ${task.dueDate}` : 'No due date'}</p>
                    </div>
                    <span class="badge badge-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                </div>
            `).join('');
        }
        this.view.openModal(this.view.calendarProjectDetailModal);
    }


    openCalendarTaskDetailModal(task, users, projects) {
        // Guard: prevent hard crash
        if (!task || typeof task !== 'object') {
            console.error('Calendar task data is invalid:', task);
            this.view.showToast('Error: Unable to open task details', 'error');
            return;
        }
        const safeUsers = Array.isArray(users) ? users : [];
        const safeProjects = Array.isArray(projects) ? projects : [];

        const project = safeProjects.find(item => String(item.id) === String(task.projectId));
        const assignee = safeUsers.find(item => String(item.id) === String(task.assigneeId));

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
                // String compare to avoid id type mismatch (string vs number)
                const item = items.find(entry => String(entry.id) === String(itemId) && entry.type === itemType);

                const onInteractionStart = typeof handlers?.onInteractionStart === 'function' ? handlers.onInteractionStart : () => {};
                const onInteractionEnd = typeof handlers?.onInteractionEnd === 'function' ? handlers.onInteractionEnd : () => {};

                try {
                    if (!item) {
                        console.warn('Calendar day item not found', {itemId, itemType});
                        this.view.showToast?.('Unable to open item details.', 'error');
                        return;
                    }
                    
                    // had detail handlers to origianl domain object from controller
                    const calendarData = item.data || item; // Use item.data if available, otherwise use item directly
                    
                    onInteractionStart(); // Notify app controller that user is interacting with the calendar
                    // Close the day list modal first, then open detail modal via handlers
                    this.view.closeModal(this.view.calendarDayDetailModal);
                    
                    if (item.type === 'project') {
                        handlers.onProjectClick(calendarData);
                    } else {
                        handlers.onTaskClick(calendarData);
                    }
                } catch (error) {
                    console.error('Calendar day item click failed', {error, itemId, itemType, dayLabel});
                    this.view.showToast?.('Failed to open item details.', 'error');
                } finally {
                    onInteractionEnd(); // Notify app controller that user has finished interacting with the calendar
                }
            });
        });
        this.view.openModal(this.view.calendarDayDetailModal);
    }
}   
