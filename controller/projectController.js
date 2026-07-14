class ProjectController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;
    }

    init() {
        this.view.bindCreateProject((projectData) => this.handleCreateProject(projectData));
        this.view.bindProjectStatusChange((projId, status) => this.handleProjectStatusChange(projId, status));
        this.view.bindProjectMembersSave((projId, memberIds) => this.handleProjectMembersSave(projId, memberIds));
    }

    async handleCreateProject(projectData) {
        return await this.model.addProject(projectData);
    }

   async handleProjectStatusChange(projectId, status) {
        const state = this.model.getState();
        const project = state.projects.find(p => p.id === projectId);

        if (!this.appController.canManageProject(project, state)) {
            throw new Error('You do not have permission to change the project status.');
        }
        await this.model.updateProjectStatus(projectId, status);
    }

    async handleProjectMembersSave(projectId, memberIds) {
        const state = this.model.getState();
        const project = state.projects.find(p => p.id === projectId);

        if (!this.appController.canManageProject(project, state)) {
            throw new Error('You do not have permission to manage project members.');
        }

        await this.model.updateProjectMembers(projectId, memberIds);
    }

    async handleProjectDelete(projectId) {
        const state = this.model.getState();
        const role = state.currentUser?.role;

        // Only Admin/Manager can delete projects
        if (!['Admin', 'Manager'].includes(role)) {
            throw new Error('You do not have permission to delete this project.');
        }

        await this.model.deleteProject(projectId);

        // clear stale active detail context after deletion
        this.appController.activeProjectId = null;

        // return user to project list view after deletion
        this.view.showView('projects');

        this.view.showToast('Project deleted successfully!');
    }
}
