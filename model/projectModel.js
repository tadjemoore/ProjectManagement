class ProjectModel {
    constructor(model) {
        this.model = model;
    }

    async addProject({ title, description, dueDate, memberIds }) {
        try {
            const currentUserId = this.model.getState().currentUser?.id;
            const safeTitle = (title || '').trim();

            if (!safeTitle) {
                throw new Error('Project title cannot be empty.');
            }

            if (!currentUserId) {
                throw new Error('Cannot create a project without an active user.');
            }

            const normalizedMemberIds = Array.isArray(memberIds) ? memberIds : [];
            const uniqueMemberIds = Array.from(new Set(normalizedMemberIds.map(String).filter(Boolean)));

            if (!uniqueMemberIds.includes(String(currentUserId))) {
                uniqueMemberIds.push(String(currentUserId));
            }

            const result = await this.model.request('/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: safeTitle,
                    description: description || '',
                    dueDate: dueDate || '',
                    status: 'not_started',
                    ownerId: currentUserId,
                    memberIds: uniqueMemberIds
                })
            });

            await this.model.loadData();
            return result;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    async updateProjectStatus(projectId, status) {
        try {
            await this.model.request(`/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, actingUserId: localStorage.getItem('currentUserId') })
            });

            await this.model.loadData();
        } catch (error) {
            console.error('Error updating project status:', error);
            throw error;
        }
    }

    async updateProjectMembers(projectId, memberIds) {
        try {
            await this.model.request(`/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberIds, actingUserId: localStorage.getItem('currentUserId') })
            });

            await this.model.loadData();
        } catch (error) {
            console.error('Error updating project members:', error);
            throw error;
        }
    }
}
