/* Reusable in-app preview for generated PDF blobs. */
window.PDFPreview = (() => {
  function show(blob, filename, notify = () => {}) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(file);
    const overlay = document.createElement('section');
    overlay.className = 'pdf-preview-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', `Vista previa de ${filename}`);

    const header = document.createElement('header');
    header.className = 'pdf-preview-header';
    const closeButton = document.createElement('button');
    closeButton.className = 'btn-icon';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Cerrar vista previa');
    closeButton.textContent = '×';
    const fileTitle = document.createElement('div');
    fileTitle.className = 'pdf-preview-filename';
    fileTitle.textContent = filename;
    const actions = document.createElement('div');
    actions.className = 'pdf-preview-actions';
    const downloadLink = document.createElement('a');
    downloadLink.className = 'btn btn-ghost btn-sm';
    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    downloadLink.textContent = 'Descargar';
    const shareButton = document.createElement('button');
    shareButton.className = 'btn btn-primary btn-sm';
    shareButton.type = 'button';
    shareButton.textContent = 'Compartir';
    actions.append(downloadLink, shareButton);
    header.append(closeButton, fileTitle, actions);

    const frame = document.createElement('iframe');
    frame.className = 'pdf-preview-frame';
    frame.title = `Vista previa del archivo ${filename}`;
    frame.src = objectUrl;
    overlay.append(header, frame);
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      URL.revokeObjectURL(objectUrl);
      document.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = event => { if (event.key === 'Escape') close(); };
    closeButton.addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);
    shareButton.addEventListener('click', async () => {
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        notify('Descarga el PDF para compartirlo desde tu dispositivo', 'warning', 4000);
        return;
      }
      try {
        await navigator.share({ files: [file], title: filename });
      } catch (error) {
        if (error.name !== 'AbortError') notify('No se pudo abrir el menú para compartir', 'error');
      }
    });
  }

  return { show };
})();
