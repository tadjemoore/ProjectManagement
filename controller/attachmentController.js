class AttachmentController {
    constructor(model, attachmentView, appController) {
        this.model = model;
        this.view = attachmentView;
        this.appController = appController;

        this.activeProjectId = null;
        this.activeAttachmentType = 'quote';
    }

    async init() {
        this.view.bindDocumentTypeButtons((attachmentType) => this.handleOpenTypeModal(attachmentType));
        this.view.bindModalClose();
        this.view.bindRefresh(async() => { try { await this.refreshCurrentType(); } catch (error) { this.view.showToast(error?.message || 'Failed to refresh attachments', 'error'); } });
        this.view.bindUploadAttachment((projectId, file, attachmentType) => this.handleUpload(projectId, file, attachmentType));
        this.view.bindDeleteAttachment((attachmentId, projectId) => this.handleDelete(attachmentId, projectId));
        this.view.bindPreviewAttachment((downloadUrl) => this.handlePreview(downloadUrl));
        this.view.bindBrowseNasFiles();
        // this.view.bindBrowseNasFiles((relativePath) => this.handleBrowseNasFiles(relativePath));
        this.view.bindNasEntryClick((entry) => this.handleNasEntryClick(entry));
        this.view.bindLinkNasFile((projectId, attachmentType, nasRelativePath) =>
            this.handleLinkNasFile(projectId, attachmentType, nasRelativePath));
        this.view.bindFileSelectionFeedback();
        // this.view.bindAutoSubmitOnFileSelect();
    }

    setProjectContext(projectId){
        this.activeProjectId = projectId;
    }

    async handleOpenTypeModal(attachmentType = null) {
        if (!this.activeProjectId) return;
        this.activeAttachmentType = (attachmentType || 'quote').toLowerCase();
        
        this.view.openModalForType(this.activeProjectId, this.activeAttachmentType);
        await this.refreshCurrentType();
    }
    async refreshCurrentType() {
        if (!this.activeProjectId) return;

        const state = this.model.getState();
        const project = state.projects.find(p => p.id === this.activeProjectId);
        if (!project) return;

        const canManageProject = this.appController.canManageProject(project, state);
        const attachments = await this.model.getProjectAttachments(this.activeProjectId, this.activeAttachmentType);
        
        this.view.renderProjectAttachments(this.activeProjectId, attachments, this.activeAttachmentType, canManageProject);
        this.view.setActiveDocumentTab(this.activeAttachmentType);
    }

    async handleUpload(projectId, file, attachmentType = 'general') {
        if (!file) throw new Error('No file selected for upload.');

        const state = this.model.getState();
        const project = state.projects.find(p => p.id === projectId);
        
        if (!this.appController.canManageProject(project, state)) {
            throw new Error('User does not have permission to manage this project.');
        }
        const userId = state.currentUser?.id || localStorage.getItem('currentUserId') || '';
        if(!userId){
            throw new Error('No active user session, Please log in again.');
        }

        await this.model.uploadAttachment(projectId, file, attachmentType, userId);
        await this.refreshCurrentType();

        this.view.showToast('Attachment uploaded successfully.');
    }

    async handleDelete(attachmentId, projectId) {
        const state = this.model.getState();
        const cleanedProjectId = String(projectId || '').trim();
        const resolvedProjectId =(!cleanedProjectId || cleanedProjectId === 'undefined' || cleanedProjectId === 'null') ? (this.activeProjectId || '' ): cleanedProjectId;
        if (!resolvedProjectId) throw new Error('No project context for deleting attachment.');
        const project = state.projects.find(p => p.id === resolvedProjectId);

        if (!this.appController.canManageProject(project, state)) {
            throw new Error('User does not have permission to manage this project.');
        }

        const userId = state.currentUser?.id || localStorage.getItem('currentUserId') || '';
        if(!userId){
            throw new Error('No active user session, Please log in again.');
        }

        await this.model.deleteAttachment(attachmentId, resolvedProjectId, userId);
        await this.refreshCurrentType();

        this.view.showToast('Attachment deleted successfully.');
    }

    handlePreview(downloadUrl) {
        this.view.showPreview(downloadUrl);
    }
    // async handleDownload(attachmentId) {
    //     window.open(`${this.model.apiUrl}/attachments/${attachmentId}/download`, '_blank');
    // }

    async handleBrowseNasFiles(relativePath = '') {
        const data = await this.model.browseNasEntries(relativePath);
        this.view.renderNasEntries(data);
    }

    async handleNasEntryClick(entry){
        if (!entry) return;
        if (entry.isDirectory) {
            await this.handleBrowseNasFiles(entry.relativePath);
            return;
        }
        this.view.setSelectedNasFile(entry.relativePath);
        this.view.showToast(`Selected NAS file: ${entry.relativePath}`, 'success');
    }

    async handleLinkNasFile(projectId, attachmentType, nasRelativePath) {
        if (!nasRelativePath) {
            this.view.showToast('No NAS file selected to link.', 'error');
            return;
        }

        const state = this.model.getState();
        const project = state.projects.find(p => p.id === projectId);
        const userId = state.currentUser?.id || localStorage.getItem('currentUserId') || '';
        if(!userId){
            throw new Error('No active user session, Please log in again.');
        }

        if (!this.appController.canManageProject(project, state)) {
            throw new Error('User does not have permission to manage this project.');
        }
        
        await this.model.linkExistingAttachment(
            projectId,
            attachmentType,
            nasRelativePath,
            userId
        );
        await this.refreshCurrentType();
        this.view.showToast('NAS file linked successfully.');
    }
}
