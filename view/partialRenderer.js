async function loadPartial(filePath) {
    // Cache buster to fetch latest partial html
    const versionedPath = `${filePath}?v=20260714b`;
    const response = await fetch(versionedPath, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load partial: ${filePath}`);
    }
    return response.text();
}

window.renderViewPartials = async function () {
    const shellMarkup = await loadPartial('view/partials/appShell.html');
    const modalMarkup = await loadPartial('view/partials/modals.html');

    const shellRoot = document.getElementById('app-shell-root');
    const modalRoot = document.getElementById('modal-root');

    if (shellRoot) {
        shellRoot.innerHTML = shellMarkup;
    }

    if (modalRoot) {
        modalRoot.innerHTML = modalMarkup;
    }
};
