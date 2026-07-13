class TaskController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;
    }

    init() {
        this.view.bindCreateTask((taskData) => this.handleCreateTask(taskData));
        this.view.bindFilters(
            (search, status) => {
                this.appController.projectSearch = search;
                this.appController.projectStatus = status;
                this.appController.renderProjectsList();
            },
            (search, scope, status, priority) => {
                this.appController.taskSearch = search;
                this.appController.taskScope = scope;
                this.appController.taskStatus = status;
                this.appController.taskPriority = priority;
                this.appController.renderTasksList();
            }
        );
    }

    async handleCreateTask(taskData) {
        const state = this.model.getState();

        if (!this.appController.canManageProjectById(taskData.projectId, state)) {
            throw new Error('You do not have permission to add tasks to this project.');
        }
        return await this.model.addTask(taskData);
    }

    async handleTaskToggle(taskId) {
        await this.model.toggleTask(taskId);
    }

    async handleTaskDelete(taskId) {
        const state = this.model.getState();
        const role = state.currentUser?.role;

        // Only Admin/Manager can delete tasks
        if (!['Admin', 'Manager'].includes(role)) {
            throw new Error('You do not have permission to delete this task.');
        }

        await this.model.deleteTask(taskId);
    }
}
