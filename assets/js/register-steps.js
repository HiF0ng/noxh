document.addEventListener('DOMContentLoaded', async () => {
  const projectId = new URLSearchParams(window.location.search).get('id');
  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value || 'Đang cập nhật';
  };

  let project = null;
  try {
    project = projectId ? JSON.parse(localStorage.getItem(`noxh_registration_project_${projectId}`) || 'null') : null;
  } catch (_) {}
  if (projectId && window.SupabaseService) project = await window.SupabaseService.getProject(projectId) || project;
  if (!project) {
    setText('#register-project-title', 'Không tìm thấy dự án');
    return;
  }

  const details = project.details || {};
  const gallery = (Array.isArray(details.gallery) ? details.gallery : []).map(url => typeof url === 'string' ? url.trim() : '').filter(Boolean);
  const imageSlots = [project.imageUrl, gallery[0], gallery[1]].map(url => typeof url === 'string' ? url.trim() : '');
  const galleryImages = [...new Set([imageSlots[0], ...gallery].filter(Boolean))];
  ['#register-hero-main', '#register-hero-second', '#register-hero-third'].forEach((selector, index) => {
    const image = document.querySelector(selector);
    const skeleton = document.querySelector(`${selector}-skeleton`);
    const url = imageSlots[index];
    if (!image || !url) return;
    image.onload = () => {
      image.classList.remove('opacity-0');
      skeleton?.classList.add('hidden');
    };
    image.onerror = () => {
      image.classList.add('opacity-0');
      image.removeAttribute('src');
      skeleton?.classList.remove('hidden');
      if (selector === '#register-hero-third') {
        const viewGallery = document.getElementById('register-view-gallery');
        viewGallery?.classList.add('hidden');
        viewGallery?.classList.remove('flex');
      }
    };
    image.src = url;
  });
  const galleryLabel = document.getElementById('register-gallery-label');
  if (galleryLabel) galleryLabel.textContent = 'Xem tất cả ảnh';
  const viewGallery = document.getElementById('register-view-gallery');
  if (galleryImages.length) {
    viewGallery?.classList.toggle('hidden', !imageSlots[2]);
    viewGallery?.classList.toggle('flex', Boolean(imageSlots[2]));
    let galleryIndex = 0;
    let galleryModal = document.getElementById('register-project-gallery-modal');
    if (!galleryModal) {
      galleryModal = document.createElement('div');
      galleryModal.id = 'register-project-gallery-modal';
      galleryModal.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-black/85 p-4';
      galleryModal.innerHTML = '<button type="button" data-close class="absolute top-5 right-5 text-white text-4xl" aria-label="Đóng">×</button><button type="button" data-prev class="absolute left-4 md:left-10 text-white text-5xl" aria-label="Ảnh trước">‹</button><img data-image class="max-h-[88vh] max-w-[88vw] object-contain rounded-lg" alt="Ảnh dự án"><button type="button" data-next class="absolute right-4 md:right-10 text-white text-5xl" aria-label="Ảnh tiếp theo">›</button>';
      document.body.appendChild(galleryModal);
    }
    const renderGallery = () => { galleryModal.querySelector('[data-image]').src = galleryImages[galleryIndex]; };
    const openGallery = url => { galleryIndex = Math.max(0, galleryImages.indexOf(url)); renderGallery(); galleryModal.classList.remove('hidden'); galleryModal.classList.add('flex'); };
    galleryModal.querySelector('[data-close]').onclick = () => { galleryModal.classList.add('hidden'); galleryModal.classList.remove('flex'); };
    galleryModal.querySelector('[data-prev]').onclick = () => { galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length; renderGallery(); };
    galleryModal.querySelector('[data-next]').onclick = () => { galleryIndex = (galleryIndex + 1) % galleryImages.length; renderGallery(); };
    galleryModal.onclick = event => { if (event.target === galleryModal) galleryModal.querySelector('[data-close]').click(); };
    ['register-hero-main', 'register-hero-second', 'register-hero-third'].forEach((id, index) => {
      if (imageSlots[index]) document.getElementById(id)?.addEventListener('click', () => openGallery(imageSlots[index]));
    });
    viewGallery?.addEventListener('click', event => { event.stopPropagation(); openGallery(galleryImages[0]); });
  }

  const estimatedPrice = String(details.estimatedPrice || '').trim().replace(/\s*\/?\s*m(?:2|²)?\s*$/i, '');
  setText('#register-project-title', project.name);
  setText('#register-project-location', details.address || project.location);
  setText('#register-project-price', estimatedPrice ? `Khoảng ${estimatedPrice}/m²` : project.price);
  setText('#register-investor', project.investor || project.owner);
  setText('#register-investor-inline', project.investor || project.owner);
  setText('#register-scale', project.scale || details.scale);
  setText('#register-handover', project.handover || details.handover);
  const projectStatus = project.status === 'Đang nhận đơn'
    ? 'Đang nhận hồ sơ'
    : ((project.status === 'Chờ bàn giao' || project.status === 'Đã bàn giao') ? 'Bàn giao' : project.status);
  setText('#register-status', projectStatus);
  setText('#register-status-inline', projectStatus);

  const storageKey = `noxh_register_steps_${projectId}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (_) {}
  const defaultDocs = [
    { title: 'Đơn đăng ký mua Nhà ở Xã hội', note: 'Ghi rõ thông tin và kí' },
    { title: 'Xác nhận điều kiện nhà ở', note: 'Điền đủ thông tin, kí và nộp online' },
    { title: 'Xác nhận đối tượng', note: 'Giấy xác nhận đối tượng/thu nhập phù hợp với bản thân' }
  ];
  const state = { checks: saved.checks || {}, docs: saved.docs || defaultDocs };
  const persist = () => localStorage.setItem(storageKey, JSON.stringify(state));
  const documentsNode = document.getElementById('register-documents');
  const parentDocumentCheck = document.querySelector('.register-step-check[data-step="documents"]');
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);

  const syncDocumentParent = () => {
    const allCompleted = state.docs.length > 0 && state.docs.every((_, index) => !!state.checks[`doc-${index}`]);
    state.checks.documents = allCompleted;
    if (parentDocumentCheck) parentDocumentCheck.checked = allCompleted;
    persist();
  };

  const renderDocuments = () => {
    if (!documentsNode) return;
    documentsNode.innerHTML = state.docs.map((documentItem, index) => `
      <div class="flex items-start gap-3">
        <input class="register-doc-check mt-3 w-5 h-5 text-primary rounded" data-index="${index}" type="checkbox" ${state.checks[`doc-${index}`] ? 'checked' : ''}>
        ${documentItem.custom ? `
          <div class="flex-1 grid gap-2">
            <div class="flex gap-2">
              <input class="register-custom-title min-w-0 flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest" data-index="${index}" placeholder="Tên tài liệu" value="${escapeHtml(documentItem.title)}">
              <button type="button" class="register-delete-document inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-error/40 text-error hover:bg-error-container transition-colors" data-index="${index}" aria-label="Xóa tài liệu" title="Xóa tài liệu"><span class="material-symbols-outlined">delete</span></button>
            </div>
            <input class="register-custom-note w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm" data-index="${index}" placeholder="Nội dung phụ" value="${escapeHtml(documentItem.note)}">
          </div>` : `
          <div class="flex-1"><span class="block font-semibold">${escapeHtml(documentItem.title)}</span><span class="block text-sm text-on-surface-variant mt-1">${escapeHtml(documentItem.note)}</span></div>`}
      </div>`).join('');

    documentsNode.querySelectorAll('.register-doc-check').forEach(input => {
      input.onchange = () => {
        state.checks[`doc-${input.dataset.index}`] = input.checked;
        syncDocumentParent();
      };
    });
    documentsNode.querySelectorAll('.register-custom-title, .register-custom-note').forEach(input => {
      input.oninput = () => {
        const item = state.docs[Number(input.dataset.index)];
        if (!item) return;
        if (input.classList.contains('register-custom-title')) item.title = input.value;
        else item.note = input.value;
        persist();
      };
    });
    documentsNode.querySelectorAll('.register-delete-document').forEach(button => {
      button.onclick = () => {
        const checkedDocuments = state.docs.map((item, index) => ({ ...item, checked: !!state.checks[`doc-${index}`] }));
        checkedDocuments.splice(Number(button.dataset.index), 1);
        state.docs = checkedDocuments.map(({ checked, ...item }) => item);
        state.checks = { ...state.checks };
        Object.keys(state.checks).filter(key => key.startsWith('doc-')).forEach(key => delete state.checks[key]);
        checkedDocuments.forEach((item, index) => { state.checks[`doc-${index}`] = item.checked; });
        renderDocuments();
        syncDocumentParent();
      };
    });
    syncDocumentParent();
  };

  renderDocuments();
  document.querySelectorAll('.register-step-check').forEach(input => {
    if (input.dataset.step !== 'documents') input.checked = !!state.checks[input.dataset.step];
    input.onchange = () => {
      if (input.dataset.step === 'documents') {
        state.docs.forEach((_, index) => { state.checks[`doc-${index}`] = input.checked; });
        persist();
        renderDocuments();
        return;
      }
      state.checks[input.dataset.step] = input.checked;
      persist();
    };
  });
  document.getElementById('add-register-document')?.addEventListener('click', () => {
    state.docs.push({ title: '', note: '', custom: true });
    persist();
    renderDocuments();
    documentsNode?.querySelector('.register-custom-title:last-of-type')?.focus();
  });

  const notificationButton = document.getElementById('register-enable-notifications');
  const syncNotificationButton = () => {
    if (!notificationButton) return;
    const enabled = localStorage.getItem('noxh_project_progress_notifications') !== 'false';
    notificationButton.innerHTML = `<span class="material-symbols-outlined text-[22px] leading-none translate-y-px ${enabled ? 'icon-fill' : ''}">${enabled ? 'notifications_active' : 'notifications'}</span><span>${enabled ? 'Đã bật thông báo' : 'Bật thông báo email'}</span>`;
    notificationButton.classList.toggle('bg-primary', enabled);
    notificationButton.classList.toggle('text-white', enabled);
    notificationButton.classList.toggle('border-primary', !enabled);
    notificationButton.classList.toggle('text-primary', !enabled);
  };
  if (notificationButton) {
    syncNotificationButton();
    notificationButton.onclick = () => {
      const wasEnabled = localStorage.getItem('noxh_project_progress_notifications') !== 'false';
      localStorage.setItem('noxh_project_progress_notifications', String(!wasEnabled));
      syncNotificationButton();
      if (wasEnabled) showToast('Đã tắt nhận thông báo tiến độ dự án', 'info');
    };
  }
});
