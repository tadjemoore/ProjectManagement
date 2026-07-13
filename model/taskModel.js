class TaskModel {
    constructor(model) {
        this.model = model;
    }

    async addTask({ projectId, title, description, assigneeId, priority, dueDate }) {
        try {
            const actingUserId = localStorage.getItem('currentUserId') || '';
            const result = await this.model.request('/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title,
                    description,
                    assigneeId: assigneeId || null,
                    priority,
                    dueDate,
                    status: 'pending',
                    actingUserId // Include the acting user ID in the request
                })
            });

            await this.model.loadData();
            return result;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async toggleTask(taskId) {
        try {
            const task = this.model.getState().tasks.find(item => item.id === taskId);
            if (!task) {
                throw new Error(`Task ${taskId} was not found while toggling status.`);
            }

            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            const actingUserId = localStorage.getItem('currentUserId') || '';
            await this.model.request(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, actingUserId }) // Include the acting user ID in the request
            });

            await this.model.loadData();
        } catch (error) {
            console.error('Error toggling task status:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            // Send actor identity so backend can authorize the deletion
            const actingUserId = localStorage.getItem('currentUserId') || '';
            const query = `?actingUserId=${encodeURIComponent(actingUserId)}`;

            // Build endpoint string with task id and query params
            await this.model.request(`/tasks/${taskId}${query}`, { method: 'DELETE' });
            await this.model.loadData();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
}
