class AttachmentModel {
    constructor(appModel) {
        this.appModel = appModel;
    }

    getState() {
        return this.appModel.getState();
    }

    async uploadAttachment(projectId, file, attachmentType ='general', actingUserId ='', storageSubpath ='') {
        const formData = new FormData();
        const resolvedUserId = (actingUserId || localStorage.getItem('currentUserId') || '').trim();

        formData.append("projectId", projectId);
        formData.append("file", file);
        formData.append("attachmentType", attachmentType);
        formData.append("actingUserId", resolvedUserId);
        formData.append("storageSubpath", storageSubpath);

        if (!resolvedUserId) {
            console.warn('[ATTACH UPLOAD] resolvedUserId is empty before request');
        }

        console.log('[ATTACH UPLOAD] apiUrl:', this.appModel.apiUrl);
        console.log('[ATTACH UPLOAD] formData', {
            projectId,
            attachmentType,
            actingUserId: resolvedUserId,
            storageSubpath,
            fileName: file?.name || 'No file selected'
        });

        const response = await fetch(`${this.appModel.apiUrl}/attachments/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let message = 'Failed to upload attachment';
            try {
                const errorData = await response.json();
                message = errorData.error || errorData.message || message;
            } catch (error) {
                // Ignore JSON parsing errors
            }
            // this.view.showToast(message);
            throw new Error(message);
        }
        return await response.json();
    }

    async getProjectAttachments(projectId, attachmentType ='all') {
        const params = new URLSearchParams({ projectId });
        if (attachmentType && attachmentType !== 'all') {
            params.append('attachmentType', attachmentType);
        }
        
        const response = await fetch(`${this.appModel.apiUrl}/attachments?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch attachments');
            // this.view.showToast('Failed to fetch attachments. Please try again.');
        }
        return await response.json();
    }

    async deleteAttachment(attachmentId, projectId, actingUserId ='') {
        const resolvedUserId = (actingUserId || localStorage.getItem('currentUserId') || '').trim();
        const params = new URLSearchParams({ projectId });
        if (resolvedUserId) params.append('actingUserId', resolvedUserId);

        const response = await fetch(`${this.appModel.apiUrl}/attachments/${attachmentId}?${params.toString()}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            let message = 'Failed to delete attachment';
            try {
                const errorData = await response.json();
                message = errorData.error || errorData.message || message;
            } catch (error) {
                // Ignore JSON parsing errors
            }
            // this.view.showToast(message);
            throw new Error(message);
        }
        return await response.json();
    }

    async browseNasEntries(relativePath ='') {
        const params = new URLSearchParams();
        if (relativePath) params.append('relativePath', relativePath);

        const response = await fetch(`${this.appModel.apiUrl}/attachments/nas-browse?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to browse NAS entries');
        }
        return await response.json();
    }

    async linkExistingAttachment(projectId, attachmentType, nasRelativePath, actingUserId ='') {
        const response = await fetch(`${this.appModel.apiUrl}/attachments/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                attachmentType,
                nasRelativePath,
                actingUserId
            })
        });

        if (!response.ok) {
            let message = 'Failed to link existing attachment';
            try {
                const errorData = await response.json();
                message = errorData.error || errorData.message || message;
            } catch (error) {
                // Ignore JSON parsing errors
            }
            // this.view.showToast(message);
            throw new Error(message);
        }
        return await response.json();
    }
}

