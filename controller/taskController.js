class TaskController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;
    }

    init() {
        this.view.bindCreateTask((taskData) => this.handleCreateTask(taskData));
        this.view.bindTaskDetailsEvents((taskData) => this.handleTaskEdit(taskData));
        this.view.bindFilters(
            (search, status) => {
                this.appController.projectSearch = search;
                this.appController.projectStatus = status;
                this.appController.renderProjectsList();
            },
            (search, scope, status, priority, dueDateMode) => {
                this.appController.taskSearch = search;
                this.appController.taskScope = scope;
                this.appController.taskStatus = status;
                this.appController.taskPriority = priority;
                this.appController.taskDueDateMode = dueDateMode;
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

    async handleTaskEdit(taskData){
        // locate target task in front end
        const state = this.model.getState();
        const task = state.tasks.find(t => t.id === taskData.taskId);

        if (!task) {
            throw new Error('Task not found.');
        }

        if (!this.appController.canManageProjectById(task.projectId, state)) {
            throw new Error('You do not have permission to edit this task.');
        }
        
        const title = (taskData.title || '').trim();
        if (!title) {
            throw new Error('Task title cannot be empty.');
        }
        const allowedStatus = ['not_started', 'in_progress', 'completed', 'on_hold'];
        if (!allowedStatus.includes(taskData.status)) {
            throw new Error(`Invalid task status: ${taskData.status}`);
        }

        await this.model.updateTask(taskData.taskId, {
            title,
            description: (taskData.description || '').trim(),
            assigneeId: taskData.assigneeId,
            status: taskData.status,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
        });
    }
}