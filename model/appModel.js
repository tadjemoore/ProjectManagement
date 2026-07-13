class AppModel {
    constructor(options = {}) {
        this.stateModel = new StateModel(options);
        this.projectModel = new ProjectModel(this);
        this.taskModel = new TaskModel(this);

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

    syncCurrentUser(prefferredUserId = null, allowDemoFallback = false) {
        return this.stateModel.syncCurrentUser(prefferredUserId, allowDemoFallback);
    }

    changeUser(userId) {
        return this.stateModel.changeUser(userId);
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

    async addTask(taskData) {
        return this.taskModel.addTask(taskData);
    }

    async toggleTask(taskId) {
        return this.taskModel.toggleTask(taskId);
    }

    async deleteTask(taskId) {
        return this.taskModel.deleteTask(taskId);
    }
}
