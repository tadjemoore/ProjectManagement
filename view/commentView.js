class CommentView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    renderProjectComments(project, projectTasks, options = {}) {
        const comments = Array.isArray(options.projectComments) ? options.projectComments : [];

        if (!comments.length) {
            this.view.projectDetailCommentsList.innerHTML = '';
            this.view.projectCommentsEmptyState.classList.remove('hidden');
        } else {
            this.view.projectCommentsEmptyState.classList.add('hidden');
            this.view.projectDetailCommentsList.innerHTML = comments.map(comment => {
                const authorName = comment.user?.name || 'Unknown';
                const initials = this.view.getInitials(authorName);
                const color = this.view.getAvatarColor(authorName);
                const canDeleteComment = 
                    options.currentUserId === comment.userId || ['Admin', 'Manager'].includes(options.currentUserRole);

                return `
                    <div class="project-comment-card" data-comment-id="${comment.id}">
                        <div class="project-comment-header">
                            <div class="owner-display-compact">
                                <div class="avatar avatar-sm" style="background: ${color}">${initials}</div>
                                <span>${authorName}</span>
                            </div>
                            <span class="comment-date">${comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
                        </div>

                        ${comment.taskTitle ? `<div class="comment-task-link">Task: ${comment.taskTitle}</div>` : ''}
                        <p class="project-comment-body">${comment.content || ''}</p>
                        ${canDeleteComment ? `
                            <button class="btn-delete-task" data-id="${comment.id}" title="Delete Comment">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>` : ''}
                    </div>
                `;
            }).join('');

        }

        this.view.openProjectCommentModalBtn.onclick = () => {
            this.view.addProjectCommentTaskSelect.innerHTML = [
                `<option value="">No linked task</option>`,
                ...projectTasks.map(task => `<option value="${task.id}">${task.title}</option>`)
            ].join('');
            
            this.view.addProjectCommentForm.reset();
            this.view.openModal(this.view.addProjectCommentModal);
        }

        this.view.closeAddProjectCommentModalBtn.onclick = () => {
            this.view.closeModal(this.view.addProjectCommentModal);
        }

        this.view.cancelAddProjectCommentBtn.onclick = () => {
            this.view.closeModal(this.view.addProjectCommentModal);
        }

        this.view.addProjectCommentForm.onsubmit = async (event) => {
            event.preventDefault();
            if (typeof options.onCreateComment !== 'function') return;

            const content = (this.view.addProjectCommentBody.value || '').trim();
            const taskId = (this.view.addProjectCommentTaskSelect.value || '').trim();

            if (!content) {
                this.view.showToast('Comment content cannot be empty.', 'error');
                return;
            }
            try {
                await options.onCreateComment({ content, taskId });
                this.view.closeModal(this.view.addProjectCommentModal);
            }catch (error) {
                this.view.showToast('Failed to submit comment.', 'error');
            }
        };

        this.view.projectDetailCommentsList.onclick = async (event) => {
            const button = event.target.closest('.btn-delete-comment');
            if (!button) return;
            if (typeof options.onDeleteComment !== 'function') return;

            const commentId = button.getAttribute('data-id');
            if (!commentId) return;

            if(!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) return;

            try {
                await options.onDeleteComment(commentId);
            }catch (error) {
                this.view.showToast('Failed to delete comment.', 'error');
            }
        };
    }
}