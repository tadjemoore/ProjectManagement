class ProjectModel {
    constructor(model) {
        this.model = model;
    }

    async addProject({ title, description, dueDate, memberIds, initialTasks = [] }) {
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

            const safeInitialTasks = Array.isArray(initialTasks) ? initialTasks : [];

            const result = await this.model.request('/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: safeTitle,
                    description: description || '',
                    dueDate: dueDate || '',
                    status: 'not_started',
                    ownerId: currentUserId,
                    memberIds: uniqueMemberIds,
                    initialTasks: safeInitialTasks
                })
            });

            await this.model.loadData();
            return result;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }
    
    async deleteProject(projectId) {
        try {
            const actingUserId = localStorage.getItem('currentUserId') || '';
            // Pass acting user in query so backend can authorize the deletion
            const query = `?actingUserId=${encodeURIComponent(actingUserId)}`;

            await this.model.request(`/projects/${projectId}${query}`, {
                method: 'DELETE'
            });

            await this.model.loadData();
        } catch (error) {
            console.error('Error deleting project:', error);
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
