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
        this.view.populateProjectMembersCheckbox(users, 'manageMembersCheckboxGrid');

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
}
