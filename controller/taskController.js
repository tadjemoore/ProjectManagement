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
        return await this.model.addTask(taskData);
    }

    async handleTaskToggle(taskId) {
        await this.model.toggleTask(taskId);
    }

    async handleTaskDelete(taskId) {
        await this.model.deleteTask(taskId);
    }
}
