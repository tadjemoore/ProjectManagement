class AttachmentView {
    constructor(appView) {
        this.appView = appView;
    }

    bindDocumentTypeButtons(handler){
        document.addEventListener('click', (event) => {
            const typeBtn = event.target.closest('.document-tab-btn');
            if (!typeBtn) return;
            
            // Open modal for selected type
            handler(typeBtn.dataset.attachmentType)
        });
    }
    
    bindModalClose(){
        document.addEventListener('click', (event) => {
            if(event.target.id !=='closeProjectAttachmentsModalBtn') return;
            const previewPanel = document.getElementById('projectAttachmentPreviewPanel');
            const previewFrame = document.getElementById('projectAttachmentPreviewFrame');
            const fileInput = document.getElementById('projectAttachmentFile');
            const fileLabel = document.getElementById('selectedUploadFileName');

            if (previewFrame) previewFrame.src = '';
            if (previewPanel) previewPanel.classList.add('hidden');
            if (fileInput) fileInput.value = '';
            if (fileLabel) fileLabel.textContent = 'No file selected';
            
            document.getElementById('projectAttachmentsModal')?.classList.remove('open');
        });
    }
   
    bindRefresh(handler){
        document.addEventListener('click', (event) => {
            const btn = event.target.closest('#refreshProjectAttachmentsBtn');
            if (!btn) return;
            handler();
        });
    }
    
    openModalForType(projectId, attachmentType) {
        const normalizedType = (attachmentType || 'quote').toLowerCase();
        const modal = document.getElementById('projectAttachmentsModal');
        const form = document.getElementById('projectAttachmentsForm');
        const title = document.getElementById('projectAttachmentsModalTitle');
        const typeLabel = document.getElementById('projectAttachmentsTypeLabel');

        if (form) {
            form.dataset.projectId = projectId;
            form.dataset.attachmentType = normalizedType;
        }

        if (typeLabel) typeLabel.value = attachmentType;
        if (title) title.textContent = `Project Documents - ${attachmentType.toUpperCase()}`;

        //Highlight Active top button
        document.querySelectorAll('.document-tab-btn').forEach((btn) => {
            const isActive = btn.dataset.attachmentType === attachmentType;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-secondary', !isActive);
        });

        const previewPanel = document.getElementById('projectAttachmentPreviewPanel');
        const previewFrame = document.getElementById('projectAttachmentPreviewFrame');
        const fileInput = document.getElementById('projectAttachmentFile');
        const fileLabel = document.getElementById('selectedUploadFileName');

        if (previewFrame) previewFrame.src = '';
        if (previewPanel) previewPanel.classList.add('hidden');
        if (fileInput) fileInput.value = '';
        if (fileLabel) fileLabel.textContent = 'No file selected';

        modal?.classList.add('open');
    }

    bindUploadAttachment(handler) {
        document.addEventListener('submit', async event => {
            if (!event.target.matches('.attachment-form')) return;
            event.preventDefault();

            const projectId = event.target.dataset.projectId;
            const attachmentType = (event.target.dataset.attachmentType || 'quote').toLowerCase();
            const file = document.getElementById('projectAttachmentFile')?.files[0] || null;
                // const storageSubpath = document.getElementById('attachmentsStorageSubpath')?.value.trim() || '';

            try {
                await handler(projectId, file, attachmentType);
            } catch (error) {
                this.showToast(error?.message || 'Failed to upload attachment', 'error');
            }
        });
    }

    bindDeleteAttachment(handler) {
        document.addEventListener('click', async event => {
            const btn = event.target.closest('.delete-attachment-button');
            if (!btn) return;
            event.preventDefault();
            event.stopPropagation();
            const attachmentId = btn.dataset.attachmentId;
            const rawProjectId = btn.dataset.projectId || document.getElementById('projectAttachmentsForm')?.dataset.projectId || this.appView.activeProjectId || '';
            const projectId = rawProjectId && rawProjectId !== 'undefined' && rawProjectId !== 'null' ? rawProjectId : '';
            try {
                await handler(attachmentId, projectId);
            } catch (error) {
                console.error('Error deleting attachment:', error);
                this.showToast(error?.message || 'Failed to delete attachment', 'error');
            }
        });
    }


    bindPreviewAttachment(handler) {
        document.addEventListener('click', async event => {
            const btn = event.target.closest('.preview-attachment-button');
            if (!btn) return;
            event.preventDefault();
            event.stopPropagation();
            handler(btn.dataset.downloadUrl || '');
        });
    }

    setActiveDocumentTab(attachmentTab){
        document.querySelectorAll('.document-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.attachmentType === attachmentTab);
        });

        const form = document.getElementById('projectAttachmentsForm');
        const typeLabel = document.getElementById('projectAttachmentsTypeLabel');
        const typeHidden = document.getElementById('projectAttachmentsActiveType');

        if (form) form.dataset.attachmentType = (attachmentTab || 'quote').toLowerCase();
        if (typeLabel) typeLabel.value = attachmentTab;
        if (typeHidden) typeHidden.value = attachmentTab;
    }


    renderProjectAttachments(projectId, attachments, attachmentType, canManageProject) {
        const safeProjectId = projectId && projectId !== 'undefined' && projectId !== 'null' ? projectId : '';
        const list = document.getElementById('projDetailAttachmentsList');
        if (!list) return;

        if (!Array.isArray(attachments) || attachments.length === 0) {
            list.innerHTML = `<p>No ${attachmentType} files uploaded yet.</p>`;
            return;
        }

        list.innerHTML = attachments.map((a) => {
            const previewUrl = `/api/attachments/${a.id}/download?projectId=${encodeURIComponent(safeProjectId)}`;
            const downloadUrl = `/api/attachments/${a.id}/download?projectId=${encodeURIComponent(safeProjectId)}&download=1`;
            return `
                <div class="project-task-item">
                    <div class="project-task-left">
                        <div class="project-task-details">
                            <h4>${a.file_name}</h4>
                            <p>Type: ${a.attachment_type} | Uploaded: ${a.uploaded_date || '-'}</p>
                        </div>
                    </div>
                    <div class="project-task-right" style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-secondary btn-sm preview-attachment-button" data-download-url="${previewUrl}">
                            Preview
                        </button>
                        <a class="btn btn-secondary btn-sm" href="${downloadUrl}">
                            Download
                        </a>
                        ${canManageProject ? `
                            <button type="button" class="btn btn-danger-outline btn-sm delete-attachment-button"
                                data-attachment-id="${a.id}"
                                data-project-id="${safeProjectId}">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    showPreview(downloadUrl) {
        const panel = document.getElementById('projectAttachmentPreviewPanel');
        const frame = document.getElementById('projectAttachmentPreviewFrame');
        if (!panel || !frame || !downloadUrl) return;

        // Reuse server download endpoint for browser-native preview
        frame.src = downloadUrl ||'';
        panel.classList.remove('hidden');
    }

    showToast(message, type = 'success') {
        this.appView.showToast(message, type);
    }

    bindBrowseNasFiles() {
        document.addEventListener('click', async event => {
            const btn = event.target.closest('#browseNasFilesBtn');
            if (!btn) return;

            const fileInput = document.getElementById('projectAttachmentFile');
            fileInput?.click();           
        });
    }

    bindNasEntryClick(handler) {
        document.addEventListener('click', async event => {
            const row = event.target.closest('.nas-entry-row');
            if (!row) return;
            handler({
                relativePath: row.dataset.path || '',
                isDirectory: row.dataset.isDirectory === 'true',
            });
        });
    }

    bindLinkNasFile(handler) {
        document.addEventListener('click', (event) => {
            const btn = event.target.closest('#linkNasFileBtn');
            if (!btn) return;

            const selected = document.getElementById('selectedNasFilePath')?.value || '';
            const form = document.getElementById('projectAttachmentsForm');
            const projectId = form?.dataset.projectId || '';
            const attachmentType = (form?.dataset.attachmentType || 'quote').toLowerCase();

            console.log('[UPLOAD SUBMIT] dataset attachmentType =', event.target.dataset.attachmentType, 'resolved =', attachmentType, 'projectId =', projectId);
            handler(projectId, attachmentType, selected);
        });
    }

    bindFileSelectionFeedback() {
        document.addEventListener('change', (event) => {
            const input = event.target.closest('#projectAttachmentFile');
            if (!input) return;

            const file = input.files[0] || null;
            const label = document.getElementById('selectedUploadFileName');

            if (label) {
                label.textContent = file ? `Selected file: ${file.name}` : 'No file selected';
            }
        });
    }

    // bindAutoSubmitOnFileSelect() {
    //     document.addEventListener('change', (event) => {
    //         const input = event.target.closest('#projectAttachmentFile');
    //         if (!input) return;
            
    //         const form = document.getElementById('projectAttachmentsForm');
    //         form?.requestSubmit();
    //     });
    // }

    renderNasEntries(browserData) {
        const listEl = document.getElementById('nasBrowserList');
        if (!listEl) return;

        const parentRow = browserData.currentPath
            ? `<div class="nas-entry-row" data-path="${browserData.parentPath || ''}" data-is-directory="true">.. (parent folder)</div>`
            : '';

        const rows = (browserData.entries || []).map((entry) => `
            <div class="nas-entry-row" data-path="${entry.relative_path || entry.relativePath}" data-is-directory="${entry.is_directory || entry.isDirectory ? 'true' : 'false'}">
                ${entry.is_directory || entry.isDirectory ? 'Folder' : 'File'} - ${entry.name}
            </div>
        `).join('');

        listEl.innerHTML = parentRow + rows;
    }

    setSelectedNasFile(path) {
        const input = document.getElementById('selectedNasFilePath');
        if (input) input.value = path || '';
    }
}