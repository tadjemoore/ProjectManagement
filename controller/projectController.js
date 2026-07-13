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
        await this.model.updateProjectStatus(projectId, status);
    }

    async handleProjectMembersSave(projectId, memberIds) {
        await this.model.updateProjectMembers(projectId, memberIds);
    }
}
