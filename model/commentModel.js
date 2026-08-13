class CommentModel{
    constructor(appModel) {
        this.appModel = appModel;
    }

    async getProjectComments(projectId) {
        const params = new URLSearchParams({ projectId });
        const response = await fetch(`${this.appModel.apiUrl}/comments?${params.toString()}`);
        if (!response.ok) {
            let message = `Failed to fetch comments for project ${projectId}. Status: ${response.status}`;
            try {
                const errorData = await response.json();
                message = errorData.error || message;
            } catch (e) {
                // If parsing fails, keep the original message
            }
            throw new Error(message);
        }
        return await response.json();
    }

    async createProjectComment({ projectId, content, taskId = ""}) {
        const actingUserId = (localStorage.getItem("currentUserId") || "").trim();
        const response = await fetch(`${this.appModel.apiUrl}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, actingUserId, content, taskId: taskId || "" })
        });

        if (!response.ok) {
            let message = `Failed to create comment for project ${projectId}. Status: ${response.status}`;
             try {
                const errorData = await response.json();
                message = errorData.error || message;
            } catch (e) {
                // If parsing fails, keep the original message
            }
            throw new Error(message);
        }
        return await response.json();
    }

    async deleteProjectComment(commentId) {
        const actingUserId = (localStorage.getItem("currentUserId") || "").trim();
        const params = new URLSearchParams({ actingUserId });
        const response = await fetch(`${this.appModel.apiUrl}/comments/${commentId}?${params.toString()}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            let message = `Failed to delete comment ${commentId}. Status: ${response.status}`;
            try {
                const errorData = await response.json();
                message = errorData.error || message;
            } catch (e) {
                // If parsing fails, keep the original message
            }
            throw new Error(message);
        }
        return await response.json();
    }
}
