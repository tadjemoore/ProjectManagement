class AppModel {
    constructor(options = {}) {
        this.stateModel = new StateModel(options);
        this.projectModel = new ProjectModel(this);
        this.taskModel = new TaskModel(this);
        this.calendarModel = new CalendarModel(this);
        this.attachmentModel = new AttachmentModel(this);

        this.apiUrl = this.stateModel.apiUrl;
        this.state = this.stateModel.state;
        this.listeners = this.stateModel.listeners;
    }

    subscribe(listener) {
        return this.stateModel.subscribe(listener);
    }

    notify() {
        return this.stateModel.notify();
    }

    getState() {
        return this.stateModel.getState();
    }

    setState(patch, notify = true) {
        return this.stateModel.setState(patch, notify);
    }

    syncCurrentUser(preferredUserId = null, allowDemoFallback = false) {
        return this.stateModel.syncCurrentUser(preferredUserId, allowDemoFallback);
    }

    changeUser(userId) {
        return this.stateModel.changeUser(userId);
    }

    getCalendarMonthDate(monthOffset = 0) {
        return this.calendarModel.getCalendarMonthDate(monthOffset);
    }

    buildCalendarItems(visibleProjects, visibleTasks, searchQuery= '') {
        const items = this.calendarModel.buildCalendarItems(visibleProjects, visibleTasks);
        return this.calendarModel.filterCalendarItems(items, searchQuery);
    }

    sortCalendarItems(items, sortBy = 'date') {
        return this.calendarModel.sortCalendarItems(items, sortBy);
    }

    getCalendarDayItems(items, dayLabel, sortBy = 'date') {
        return this.calendarModel.getCalendarDayItems(items, dayLabel, sortBy);
    }

    buildCalendarGrid(monthDate, items, sortBy = 'date') {
        return this.calendarModel.buildCalendarGrid(monthDate, items, sortBy);
    }

    async loadData() {
        try {
            const [users, projects, tasks] = await this.requestBatch(['/users', '/projects', '/tasks']);
            this.setState({ users, projects, tasks }, false);

            const preferredUserId = this.state.currentUser?.id || 
                localStorage.getItem('currentUserId') ||
                null;
            this.syncCurrentUser(preferredUserId, false);
        } catch (error) {
            console.error('Error loading application state:', error);
        }
    }

    async requestBatch(endpoints) {
        const responses = await Promise.all(endpoints.map(endpoint => this.request(endpoint)));
        return responses;
    }

    async request(path, options = {}) {
        let response;
        
        try {
            response = await fetch(`${this.apiUrl}${path}`, options);
        } catch (networkError) {
            throw new Error(`Network error while requesting ${path}: ${networkError.message}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        let payload;

        try{
            if (contentType.includes('application/json')) {
                payload = await response.json();
            } else {
                payload = await response.text();
            }
        } catch (parseError) {
            throw new Error(`Failed to parse response from ${path}: ${parseError.message}`);
        }

        if (!response.ok) {
            const errorMessage = payload?.error || payload || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        return payload;
    }

    async addProject(projectData) {
        return this.projectModel.addProject(projectData);
    }

    async deleteProject(projectId) {
        return this.projectModel.deleteProject(projectId);
    }

    async updateProjectStatus(projectId, status) {
        return this.projectModel.updateProjectStatus(projectId, status);
    }

    async updateProjectMembers(projectId, memberIds) {
        return this.projectModel.updateProjectMembers(projectId, memberIds);
    }

    async updateProject(projectId, updates) {
        return this.projectModel.updateProject(projectId, updates);
    }

    async addTask(taskData) {
        return this.taskModel.addTask(taskData);
    }

    async toggleTask(taskId) {
        return this.taskModel.toggleTask(taskId);
    }

    async deleteTask(taskId) {
        return this.taskModel.deleteTask(taskId);
    }
    async updateTask(taskId, updates) {
        return this.taskModel.updateTask(taskId, updates);
    }

    async uploadAttachment(projectId, file, attachmentType = 'general', actingUserId = '', storageSubpath ='') {
        return this.attachmentModel.uploadAttachment(projectId, file, attachmentType, actingUserId, storageSubpath);
    }

    async getProjectAttachments(projectId, attachmentType ='all') {
        return this.attachmentModel.getProjectAttachments(projectId, attachmentType);
    }

    async deleteAttachment(attachmentId, projectId, actingUserId = '') {
        return this.attachmentModel.deleteAttachment(attachmentId, projectId, actingUserId);
    }
}