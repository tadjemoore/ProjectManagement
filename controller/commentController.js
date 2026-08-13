class CommentController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;
        this.activeProjectComments = [];
    }

    async fetchProjectComments(projectId) {
        try{
            const commentData = await this.model.getProjectComments(projectId);
            this.activeProjectComments = Array.isArray(commentData?.comments) ? commentData.comments : [];
            return this.activeProjectComments;
        } catch (error) {
            this.activeProjectComments = [];
            console.error('Error fetching project comments:', error);
            this.view.showToast('Unable to load project comments.', 'error');
            return [];
        }
    }

    async handleCreateProjectComment(projectId, commentData) {
        await this.model.createProjectComment({
            projectId,
            content: commentData.content,
            taskId: commentData.taskId || ""
        })
        return await this.fetchProjectComments(projectId);
    }

    async handleDeleteProjectComment(projectId, commentId) {
        await this.model.deleteProjectComment(commentId);
        return await this.fetchProjectComments(projectId);
    }

    getCachedComments() {
        return this.activeProjectComments;
    }
}