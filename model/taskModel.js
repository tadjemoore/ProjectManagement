class TaskModel {
    constructor(model) {
        this.model = model;
    }

    normalizeDateStart(value) {
        if(!value) return null;
        
        const date = value instanceof Date ? new Date(value) : new Date(value);
        
        if(Number.isNaN(date.getTime())) return null; // Invalid date
        date.setHours(0, 0, 0, 0); // Normalize to start of the day
        return date;
    }

    normalizeDueDateToTime(value) {
        const date = this.normalizeDateStart(value);
        return date ? date.getTime() : null;
    }

    getTodayStart() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of the day
        return today;
    }

    getWeekStart(dateAtMidnight) {
        const start = new Date(dateAtMidnight);
        start.setDate(start.getDate() - start.getDay()); // Set to Sunday of the current week
        return start;
    }

    sortTasksWithCompletedLast(tasks = []) {
        return tasks.slice().sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            return 0;
        });
    }

    sortTasks(tasks = [], sortBy = 'all') {
        const list = tasks.slice(); // Create a shallow copy to avoid mutating the original array

        if(sortBy === 'all') return this.sortTasksWithCompletedLast(list); // Return the copy as is if no sorting is needed

        const compareTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''));

        const compareDueDate = (a, b, direction = 1) => {
            const aTime = this.normalizeDueDateToTime(a.dueDate);
            const bTime = this.normalizeDueDateToTime(b.dueDate);

            const aMissing = aTime === null;
            const bMissing = bTime === null;

            // keep tasks with no due date at the end of the list, regardless of sort direction
            if (aMissing && bMissing) return 0;
            if (aMissing) return 1;
            if (bMissing) return -1;

            const sortedDueDate = direction * (aTime - bTime);
            return sortedDueDate;
        };
        
        const comparators = {
            due_date_ascending: (a, b) => compareDueDate(a, b, 1),
            due_date_descending: (a, b) => compareDueDate(a, b, -1)
        };

        const comparator = comparators[sortBy];
        if (!comparator) return this.sortTasksWithCompletedLast(list); // Return the copy as is if no valid comparator is found
        const sorted = list.sort((a, b) => comparator(a, b) || compareTitle(a, b)); // Fallback to title comparison if due dates are equal
        return this.sortTasksWithCompletedLast(sorted); // Fallback to title comparison if due dates are equal
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
                    status: 'not_started',
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

    applyDueDateMode(tasks = [], mode ='all'){
        const list = tasks.slice(); // Create a shallow copy to avoid mutating the original array
        const compareTitle = (a, b) => 
            String(a.title || '').localeCompare(String(b.title || ''));
    
        // Sort Modes
        if (mode === 'due_date_ascending' || mode === 'due_date_descending') {
            return this.sortTasks(list, mode);
        }

        // Filter Modes
        const today = this.getTodayStart();
        const oneDayMs = 24 * 60 * 60 * 1000; // Milliseconds in a day

        if (mode === 'due_today') {
            return this.sortTasksWithCompletedLast(list.filter(task => {
                const dueDate = this.normalizeDateStart(task.dueDate);
                return dueDate && dueDate.getTime() === today.getTime();
            }).sort(compareTitle)
        );
        }

        if (mode === 'due_this_week') {
            const weekStart = this.getWeekStart(today);
            const weekEnd = new Date(weekStart.getTime() + 6 * oneDayMs); // End of the week (Saturday)

            return list.filter(task => {
                const dueDate = this.normalizeDateStart(task.dueDate);
                return dueDate && dueDate >= weekStart && dueDate <= weekEnd;
            })
            .sort((a, b) => {
                const aTime = this.normalizeDateStart(a.dueDate);
                const bTime = this.normalizeDateStart(b.dueDate);
                return (aTime - bTime) || compareTitle(a, b); // Sort by due date, then title
            });
        }

        if (mode === 'due_this_month') {
            const year = today.getFullYear();
            const month = today.getMonth();

            return this.sortTasksWithCompletedLast(
                list.filter(task => {
                    const dueDate = this.normalizeDateStart(task.dueDate);
                    return dueDate && dueDate.getFullYear() === year && dueDate.getMonth() === month;
                }).sort((a, b) => {
                    const aTime = this.normalizeDateStart(a.dueDate);
                    const bTime = this.normalizeDateStart(b.dueDate);
                    return (aTime - bTime) || compareTitle(a, b);
                })
            );
        }

        if (mode === 'overdue') {
            return list.filter(task => {
                const dueDate = this.normalizeDateStart(task.dueDate);
                return dueDate && dueDate < today;
            }).sort((a, b) => {
                const aTime = this.normalizeDateStart(a.dueDate);
                const bTime = this.normalizeDateStart(b.dueDate);
                return (aTime - bTime) || compareTitle(a, b); // Sort by due date, then title
            });
            return this.sortTasksWithCompletedLast(list);
        }

        return this.sortTasksWithCompletedLast(list); // Return the copy as is if no filtering is needed
    }

    async toggleTask(taskId) {
        try {
            const task = this.model.getState().tasks.find(item => item.id === taskId);
            if (!task) {
                throw new Error(`Task ${taskId} was not found while toggling status.`);
            }

            const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
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
    async updateTask(taskId, updates) {
        try {
            const actingUserId = localStorage.getItem('currentUserId') || '';
            await this.model.request(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...updates, actingUserId })
            });

            await this.model.loadData();
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }
}