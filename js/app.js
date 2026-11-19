/**
 * Ficha Técnica de Medición — Main App
 * SPA with hash routing: #start | #home?type=cave|radon | #form?id=...&type=...
 */
(() => {
  // =========================================
  // State
  // =========================================
  let currentFichaId = null;
  let autoSaveTimer = null;
  let deferredInstallPrompt = null;
  let currentMenuCleanup = null;

  // =========================================
  // Utilities
  // =========================================
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

  function showToast(msg, type = '', duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, duration);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${months[parseInt(m)-1]} ${y}`;
  }

  function isFichaComplete(ficha) {
    return ficha.tipo === 'radon'
      ? !!(ficha.sitio && ficha.fecha && ficha.horaInicio)
      : !!(ficha.cueva && ficha.punto && ficha.fecha && ficha.horaInicio);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function confirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog">
          <div class="dialog-title">${title}</div>
          <div class="dialog-message">${message}</div>
          <div class="dialog-actions">
            <button class="btn btn-ghost btn-sm" data-action="cancel">Cancelar</button>
            <button class="btn btn-danger btn-sm" data-action="confirm">Eliminar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'confirm' || action === 'cancel' || e.target === overlay) {
          overlay.remove();
          resolve(action === 'confirm');
        }
      });
    });
  }

  // =========================================
  // Router
  // =========================================
  function getRoute() {
    const hash = location.hash.replace('#', '') || 'start';
    const [path, query] = hash.split('?');
    const params = {};
    if (query) query.split('&').forEach(p => { const [k, v] = p.split('='); params[k] = decodeURIComponent(v || ''); });
    return { path, params };
  }

  function navigate(path, params = {}) {
    const q = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    location.hash = q ? `${path}?${q}` : path;
  }

  window.addEventListener('hashchange', render);

  // =========================================
  // Main Render
  // =========================================
  async function render() {
    const { path, params } = getRoute();
    if (path === 'form') {
      await renderForm(params.id || 'new', params.type || params.tipo || 'cave');
    } else if (path === 'home') {
      await renderHome(params.type || params.tipo || 'cave');
    } else if (path === 'start') {
      renderStart();
    } else {
      renderStart();
    }
  }

  function renderStart() {
    currentFichaId = null;
    const app = document.getElementById('app');
    app.innerHTML = `
      <main class="start-screen">
        <div class="start-brand"><span class="brand-mark">FM</span><span>Fichas de campo</span></div>
        <section class="start-intro"><p class="eyebrow">HERRAMIENTA DE MEDICIÓN</p><h1>¿Qué vas a registrar?</h1><p>Elige el tipo de ficha para empezar tu trabajo de campo.</p></section>
        <section class="type-grid" aria-label="Tipo de ficha">
          <button class="type-card cave-card" data-type="cave">
            <span class="type-art cave-art" aria-hidden="true"><svg viewBox="0 0 100 80"><path d="M8 72 Q18 50 26 36 Q34 19 50 12 Q66 19 74 36 Q82 50 92 72Z"/><path d="M34 72 Q38 54 50 43 Q62 54 66 72Z"/><path d="M18 56 Q33 47 50 49 Q67 47 82 56"/></svg></span>
            <span class="type-name">Cuevas</span><span class="type-copy">Exploración y mediciones subterráneas</span><span class="type-action">Abrir fichas</span>
          </button>
          <button class="type-card radon-card" data-type="radon">
            <span class="type-art radon-art" aria-hidden="true"><svg viewBox="0 0 100 80"><circle cx="50" cy="40" r="8"/><path d="M46 30 34 10Q28 7 24 13L37 35M58 37 82 35Q87 39 83 45L59 45M43 47 34 69Q37 75 44 73L51 50"/><circle cx="50" cy="40" r="30"/></svg></span>
            <span class="type-name">Radón</span><span class="type-copy">Registro de sitios y medición de radón</span><span class="type-action">Abrir fichas</span>
          </button>
        </section>
        <p class="start-footnote">Tus registros se guardan en este dispositivo.</p>
      </main>`;
    $$('.type-card').forEach(card => card.addEventListener('click', () => navigate('home', { type: card.dataset.type })));
  }

  // =========================================
  // Home Screen
  // =========================================
  async function renderHome(type = 'cave') {
    type = type === 'radon' ? 'radon' : 'cave';
    currentFichaId = null;
    const fichas = (await DB.getAllFichas()).filter(f => (f.tipo || 'cave') === type);
    // Sort by updatedAt desc
    fichas.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="home-screen">
        <header class="app-header">
          <div class="header-title">
            Fichas de ${type === 'radon' ? 'Radón' : 'Cuevas'}
            <div class="header-subtitle">App de campo — ${type === 'radon' ? 'medición de radón' : 'exploración subterránea'}</div>
          </div>
          <div class="header-status">
            <div class="status-dot" id="status-dot"></div>
            <span id="status-text">Online</span>
          </div>
          <button class="btn-icon" id="home-menu-btn" aria-label="Menú" title="Más opciones">⋮</button>
        </header>

        <main class="home-content">
          <button class="collection-switch" id="collection-switch">← Cambiar tipo de ficha</button>
          ${fichas.length === 0 ? renderEmptyState(type) : renderFichaList(fichas, type)}
        </main>

        <button class="fab" id="new-ficha-btn" title="Nueva Ficha">+</button>
      </div>`;

    updateOnlineStatus();

    $('#new-ficha-btn').addEventListener('click', () => navigate('form', { id: 'new', type }));
    $('#home-menu-btn').addEventListener('click', (e) => showHomeMenu(e, type));
    $('#collection-switch').addEventListener('click', () => navigate('start'));

    // Bind ficha card actions
    $$('.ficha-card-main').forEach(el => {
      el.addEventListener('click', () => navigate('form', { id: el.dataset.id, type }));
    });
    $$('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', () => navigate('form', { id: el.dataset.id, type }));
    });
    $$('[data-action="pdf"]').forEach(el => {
      el.addEventListener('click', () => exportPDF(el.dataset.id));
    });
    $$('[data-action="export-json"]').forEach(el => {
      el.addEventListener('click', () => exportJSON(el.dataset.id));
    });
    $$('[data-action="delete"]').forEach(el => {
      el.addEventListener('click', () => deleteFicha(el.dataset.id));
    });
  }

  function renderEmptyState(type) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${type === 'radon' ? '☢️' : '🗺️'}</div>
        <div class="empty-title">Sin fichas aún</div>
        <div class="empty-subtitle">Toca + para crear tu primera ficha de ${type === 'radon' ? 'Radón' : 'Cuevas'}</div>
      </div>`;
  }

  function renderFichaList(fichas, type) {
    return `
      <div class="home-count">${fichas.length} ficha${fichas.length !== 1 ? 's' : ''}</div>
      <div class="ficha-list">
        ${fichas.map(f => renderFichaCard(f, type)).join('')}
      </div>`;
  }

  function renderFichaCard(f, type) {
    const complete = isFichaComplete(f);
    const dateStr = f.fecha ? formatDate(f.fecha) : 'Sin fecha';
    const updStr = new Date(f.updatedAt).toLocaleDateString('es', { day: '2-digit', month: 'short' });

    return `
      <div class="ficha-card">
        <div class="ficha-card-main" data-id="${f.id}" role="button" tabindex="0">
          <div class="ficha-card-header">
            <div class="ficha-card-info">
              <div class="ficha-cueva">${esc(type === 'radon' ? (f.sitio || '(Sin sitio)') : (f.cueva || '(Sin nombre)'))}</div>
              <div class="ficha-meta">
                ${type === 'radon' ? [f.provincia, f.canton, f.parroquia].filter(Boolean).map(v => `<span class="ficha-meta-item">📍 ${esc(v)}</span>`).join('') : (f.punto ? `<span class="ficha-meta-item">📍 ${esc(f.punto)}</span>` : '')}
                <span class="ficha-meta-item">📅 ${dateStr}</span>
                <span class="ficha-meta-item">✏️ ${updStr}</span>
              </div>
            </div>
            <span class="ficha-badge ${complete ? 'complete' : 'partial'}">
              ${complete ? '✓ Completa' : '⏳ Parcial'}
            </span>
          </div>
        </div>
        <div class="ficha-card-actions">
          <button class="ficha-action-btn" data-action="edit" data-id="${f.id}" title="Editar">
            ✏️ Editar
          </button>
          <button class="ficha-action-btn success" data-action="pdf" data-id="${f.id}" title="Exportar PDF">
            📄 PDF
          </button>
          <button class="ficha-action-btn" data-action="export-json" data-id="${f.id}" title="Exportar JSON">
            💾 JSON
          </button>
          <button class="ficha-action-btn danger" data-action="delete" data-id="${f.id}" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>`;
  }

  function showHomeMenu(e, type = 'cave') {
    if (currentMenuCleanup) currentMenuCleanup();
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';

    const menu = document.createElement('div');
    menu.className = 'menu-dropdown';
    menu.style.cssText = `top:${rect.bottom + 4}px; right:${document.documentElement.clientWidth - rect.right}px`;
    const installedAlready = isInStandaloneMode();
    menu.innerHTML = `
      <button class="menu-item" data-menu="import">📂 Importar fichas (JSON)</button>
      <div class="divider"></div>
      <button class="menu-item" data-menu="export-all">💾 Exportar fichas de ${type === 'radon' ? 'Radón' : 'Cuevas'} (JSON)</button>
      <div class="divider"></div>
      ${installedAlready
        ? `<button class="menu-item" data-menu="install" disabled style="opacity:.4;cursor:default">📲 App ya instalada</button>`
        : `<button class="menu-item" data-menu="install">📲 Instalar app</button>`}
      <div class="divider"></div>
      <button class="menu-item danger" data-menu="clear">🗑️ Limpiar caché y datos</button>`;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    function cleanup() {
      overlay.remove();
      menu.remove();
      currentMenuCleanup = null;
    }
    currentMenuCleanup = cleanup;

    overlay.addEventListener('click', cleanup);
    menu.querySelectorAll('[data-menu]').forEach(item => {
      item.addEventListener('click', () => {
        if (item.disabled) return;
        cleanup();
        if (item.dataset.menu === 'import') triggerImport(type);
        if (item.dataset.menu === 'export-all') exportAllJSON(type);
        if (item.dataset.menu === 'install') triggerInstall();
        if (item.dataset.menu === 'clear') showClearDialog();
      });
    });
  }

  function triggerInstall() {
    if (isIOS()) {
      showInstallIOSDialog();
    } else if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
      });
    } else {
      showInstallGenericDialog();
    }
  }

  function showInstallIOSDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">📲 Instalar en iPhone / iPad</div>
        <div class="dialog-message">
          <ol style="padding-left:18px; line-height:2">
            <li>Toca el botón <strong>Compartir</strong> <span style="font-size:16px">⎙</span> en la barra de Safari</li>
            <li>Desplázate y toca <strong>"Añadir a pantalla de inicio"</strong></li>
            <li>Confirma tocando <strong>"Añadir"</strong></li>
          </ol>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" data-action="close">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close' || e.target === overlay) overlay.remove();
    });
  }

  function showInstallGenericDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">📲 Instalar app</div>
        <div class="dialog-message">
          Para instalar, busca la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong> en el menú de tu navegador.<br><br>
          <span style="color:var(--text-secondary); font-size:13px">Nota: algunos navegadores requieren que la página esté servida por HTTPS para permitir la instalación.</span>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" data-action="close">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close' || e.target === overlay) overlay.remove();
    });
  }

  // =========================================
  // Form Screen
  // =========================================
  async function renderForm(id, requestedType = 'cave') {
    requestedType = requestedType === 'radon' ? 'radon' : 'cave';
    let ficha;
    if (id === 'new') {
      ficha = {
        tipo: requestedType,
        id: crypto.randomUUID(),
        cueva: '', punto: '', sitio: '', provincia: '', canton: '', parroquia: '', fecha: '', fechaFin: '', horaInicio: '', horaFin: '',
        agua: '', aguaTipo: { corriendo: null, estancada: null },
        seccionTransversal: '',
        parametros: { humedad: false, temperatura: false, presion: false, velViento: false, co2: false },
        equiposRadiacion: { alphaE: false, gammaScout: false, gmqGmc600: false, dosimetros: false, sondaBeta: false },
        equiposAdicionales: { medidorRadiacionCosmica: false },
        observaciones: '',
      };
      // Pre-create in DB so photos can attach
      await DB.createFicha(ficha);
    } else {
      ficha = await DB.getFicha(id);
      if (!ficha) { navigate('home', { type: requestedType }); return; }
      if (!ficha.tipo) ficha.tipo = 'cave';
    }
    const type = ficha.tipo === 'radon' ? 'radon' : 'cave';
    currentFichaId = ficha.id;

    const fotos = await DB.getFotos(ficha.id);
    const app = document.getElementById('app');

    app.innerHTML = `
      <div class="form-screen" data-type="${type}">
        <header class="app-header">
          <button class="header-back" id="back-btn" title="Volver">←</button>
          <div class="header-title">
            ${esc(type === 'radon' ? (ficha.sitio || 'Nueva ficha de Radón') : (ficha.cueva || 'Nueva Ficha'))}
            <div class="header-subtitle" id="save-status-header">Auto-guardado</div>
          </div>
          <button class="btn-icon" id="form-menu-btn" aria-label="Más opciones">⋮</button>
        </header>

        <main class="form-content" id="form-content">
          ${type === 'radon' ? renderRadonSection1(ficha) : renderSection1(ficha)}
          ${renderSection2(ficha)}
          ${renderSection3(ficha)}
          ${renderSection4(ficha)}
          ${renderSection5(ficha)}
          ${renderPhotosSection(fotos)}
        </main>

        <div class="form-actions">
          <div class="save-status" id="save-status">💾 Guardado automáticamente</div>
          <button class="btn btn-primary btn-full btn-lg" id="export-pdf-btn">📄 Exportar PDF</button>
        </div>
      </div>`;

    bindFormEvents(ficha);
  }

  function renderRadonSection1(f) {
    return `
      <div class="form-section expanded" id="section-1">
        <button class="section-toggle" data-section="1"><div class="section-number">1</div><span class="section-title">Ubicación y detalles de medición</span><span class="section-chevron">▼</span></button>
        <div class="section-body">
          <div class="field"><label for="f-sitio">Sitio o lugar de medición</label><input type="text" id="f-sitio" name="sitio" value="${esc(f.sitio)}" placeholder="Nombre del sitio"></div>
          <div class="field-row"><div class="field"><label for="f-provincia">Provincia</label><input type="text" id="f-provincia" name="provincia" value="${esc(f.provincia)}" placeholder="Provincia"></div><div class="field"><label for="f-canton">Cantón</label><input type="text" id="f-canton" name="canton" value="${esc(f.canton)}" placeholder="Cantón"></div></div>
          <div class="field"><label for="f-parroquia">Parroquia</label><input type="text" id="f-parroquia" name="parroquia" value="${esc(f.parroquia)}" placeholder="Parroquia"></div>
          <div class="field"><label for="f-punto">Punto de medición</label><input type="text" id="f-punto" name="punto" value="${esc(f.punto)}" placeholder="P0, P1, etc."></div>
          <div class="field-row"><div class="field"><label for="f-fecha">Fecha de inicio</label><input type="date" id="f-fecha" name="fecha" value="${esc(f.fecha)}"></div><div class="field"><label for="f-hora-inicio">Hora de inicio</label><input type="time" id="f-hora-inicio" name="horaInicio" value="${esc(f.horaInicio)}"></div></div>
          <div class="field-row"><div class="field"><label for="f-fecha-fin">Fecha de fin</label><input type="date" id="f-fecha-fin" name="fechaFin" value="${esc(f.fechaFin)}"></div><div class="field"><label for="f-hora-fin">Hora de fin</label><input type="time" id="f-hora-fin" name="horaFin" value="${esc(f.horaFin)}"></div></div>
        </div>
      </div>`;
  }

  function renderSection1(f) {
    const aguaTipoVisible = f.agua === 'si' ? 'visible' : '';
    return `
      <div class="form-section expanded" id="section-1">
        <button class="section-toggle" data-section="1">
          <div class="section-number">1</div>
          <span class="section-title">Detalles de cueva</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="field">
            <label for="f-cueva">Cueva <span style="color:var(--danger)">*</span></label>
            <input type="text" id="f-cueva" name="cueva" value="${esc(f.cueva)}" placeholder="Nombre de la cueva" autocomplete="off">
          </div>
          <div class="field">
            <label for="f-punto">Punto <span style="color:var(--danger)">*</span></label>
            <input type="text" id="f-punto" name="punto" value="${esc(f.punto)}" placeholder="P0, P1, etc." autocomplete="off">
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-fecha">Fecha de inicio <span style="color:var(--danger)">*</span></label>
              <input type="date" id="f-fecha" name="fecha" value="${esc(f.fecha)}">
            </div>
            <div class="field">
              <label for="f-hora-inicio">Hora de inicio <span style="color:var(--danger)">*</span></label>
              <input type="time" id="f-hora-inicio" name="horaInicio" value="${esc(f.horaInicio)}">
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-fecha-fin">Fecha de fin</label>
              <input type="date" id="f-fecha-fin" name="fechaFin" value="${esc(f.fechaFin)}">
            </div>
            <div class="field">
              <label for="f-hora-fin">Hora de fin</label>
              <input type="time" id="f-hora-fin" name="horaFin" value="${esc(f.horaFin)}">
            </div>
          </div>
          <div class="field">
            <label>Agua (presencia)</label>
            <div class="radio-group">
              <label class="radio-option ${f.agua === 'si' ? 'selected' : ''}">
                <input type="radio" name="agua" value="si" ${f.agua === 'si' ? 'checked' : ''}> Sí
              </label>
              <label class="radio-option ${f.agua === 'no' ? 'selected' : ''}">
                <input type="radio" name="agua" value="no" ${f.agua === 'no' ? 'checked' : ''}> No
              </label>
            </div>
          </div>
          <div class="conditional-field ${aguaTipoVisible}" id="agua-tipo-field">
            <label>Tipo de agua</label>
            <div class="toggle-grid">
              ${toggleItem('Corriendo', 'aguaTipo.corriendo', aguaTipoVal(f, 'corriendo'))}
              ${toggleItem('Estancada', 'aguaTipo.estancada', aguaTipoVal(f, 'estancada'))}
            </div>
          </div>
          <div class="field">
            <label for="f-seccion">Sección transversal</label>
            <input type="text" id="f-seccion" name="seccionTransversal" value="${esc(f.seccionTransversal)}" placeholder="Descripción de la sección" autocomplete="off">
          </div>
        </div>
      </div>`;
  }

  function renderSection2(f) {
    const p = f.parametros || {};
    return `
      <div class="form-section" id="section-2">
        <button class="section-toggle" data-section="2">
          <div class="section-number">2</div>
          <span class="section-title">Parámetros ambientales</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="toggle-grid">
            ${toggleItem('Humedad', 'parametros.humedad', p.humedad)}
            ${toggleItem('Temperatura', 'parametros.temperatura', p.temperatura)}
            ${toggleItem('Presión', 'parametros.presion', p.presion)}
            ${toggleItem('Vel. del viento', 'parametros.velViento', p.velViento)}
            ${toggleItem('CO2', 'parametros.co2', p.co2)}
          </div>
        </div>
      </div>`;
  }

  function renderSection3(f) {
    const e = f.equiposRadiacion || {};
    return `
      <div class="form-section" id="section-3">
        <button class="section-toggle" data-section="3">
          <div class="section-number">3</div>
          <span class="section-title">Equipos de radiación ionizante</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="toggle-grid">
            ${toggleItem('AlphaE', 'equiposRadiacion.alphaE', e.alphaE)}
            ${toggleItem('GammaScout', 'equiposRadiacion.gammaScout', e.gammaScout)}
            ${toggleItem('GMQ-GMC+600', 'equiposRadiacion.gmqGmc600', e.gmqGmc600)}
            ${toggleItem('Dosímetros', 'equiposRadiacion.dosimetros', e.dosimetros)}
            ${toggleItem('Sonda Beta', 'equiposRadiacion.sondaBeta', e.sondaBeta)}
          </div>
        </div>
      </div>`;
  }

  function renderSection4(f) {
    const a = f.equiposAdicionales || {};
    return `
      <div class="form-section" id="section-4">
        <button class="section-toggle" data-section="4">
          <div class="section-number">4</div>
          <span class="section-title">Equipos adicionales</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="toggle-grid">
            ${toggleItem('Medidor de radiación cósmica', 'equiposAdicionales.medidorRadiacionCosmica', a.medidorRadiacionCosmica)}
          </div>
        </div>
      </div>`;
  }

  function renderSection5(f) {
    return `
      <div class="form-section" id="section-5">
        <button class="section-toggle" data-section="5">
          <div class="section-number">5</div>
          <span class="section-title">Observaciones y/o notas</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="field">
            <label for="f-obs">Observaciones</label>
            <textarea id="f-obs" name="observaciones" rows="5" placeholder="Anota cualquier observación relevante sobre la medición...">${esc(f.observaciones)}</textarea>
          </div>
        </div>
      </div>`;
  }

  function renderPhotosSection(fotos) {
    return `
      <div class="form-section" id="section-photos">
        <button class="section-toggle" data-section="photos">
          <div class="section-number">📷</div>
          <span class="section-title">Fotografías adjuntas</span>
          <span class="section-chevron">▼</span>
        </button>
        <div class="section-body">
          <div class="photos-container">
            <div class="photo-grid" id="photo-grid">
              ${fotos.map(renderPhotoThumb).join('')}
            </div>
            <button class="add-photo-btn" id="add-photo-btn">
              📷 Agregar foto
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderPhotoThumb(foto) {
    const url = URL.createObjectURL(foto.blob);
    return `
      <div class="photo-thumb" data-foto-id="${foto.id}">
        <img src="${url}" alt="Foto adjunta" loading="lazy">
        <button class="photo-thumb-delete" data-foto-id="${foto.id}" title="Eliminar foto">✕</button>
      </div>`;
  }

  // Normalize aguaTipo: supports old array format and new object format
  function aguaTipoVal(f, key) {
    const at = f.aguaTipo;
    if (!at) return null;
    if (Array.isArray(at)) return at.includes(key) ? true : null; // old format: no selection = null
    return at[key] ?? null;
  }

  function toggleItem(label, name, value) {
    // value: true=Sí, false=No, null/undefined=sin seleccionar
    const yesCls = value === true  ? 'active-yes' : '';
    const noCls  = value === false ? 'active-no'  : '';
    return `
      <div class="toggle-item">
        <div class="toggle-item-label">${label}</div>
        <div class="toggle-item-options">
          <button class="toggle-btn ${yesCls}" data-toggle="${name}" data-value="true">Sí</button>
          <button class="toggle-btn ${noCls}"  data-toggle="${name}" data-value="false">No</button>
        </div>
      </div>`;
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // =========================================
  // Form Event Binding
  // =========================================
  function bindFormEvents(ficha) {
    const save = debounce(() => autoSave(), 500);

    // Section toggles
    $$('.section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.closest('.form-section');
        section.classList.toggle('expanded');
      });
    });

    // Text inputs
    $$('input[type="text"], input[type="date"], input[type="time"], textarea').forEach(el => {
      el.addEventListener('input', save);
    });

    // Agua radio
    $$('input[name="agua"]').forEach(radio => {
      radio.addEventListener('change', () => {
        // Update selected state
        $$('.radio-option').forEach(o => o.classList.remove('selected'));
        radio.closest('.radio-option')?.classList.add('selected');
        // Toggle agua tipo visibility
        const aguaTipoField = document.getElementById('agua-tipo-field');
        if (aguaTipoField) {
          aguaTipoField.className = `conditional-field ${radio.value === 'si' ? 'visible' : ''}`;
        }
        save();
      });
    });

    // Agua tipo checkboxes
    $$('input[name="aguaTipo"]').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('.checkbox-option')?.classList.toggle('selected', cb.checked);
        save();
      });
    });

    // Toggle buttons (Sí/No for all toggle fields)
    $$('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.toggle;
        const isYes = btn.dataset.value === 'true';
        // Find the pair
        const yesBtn = document.querySelector(`[data-toggle="${name}"][data-value="true"]`);
        const noBtn  = document.querySelector(`[data-toggle="${name}"][data-value="false"]`);
        yesBtn.className = `toggle-btn${isYes  ? ' active-yes' : ''}`;
        noBtn.className  = `toggle-btn${!isYes ? ' active-no'  : ''}`;
        setNestedValue(ficha, name, isYes);
        save();
      });
    });

    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => navigate('home', { type: ficha.tipo || 'cave' }));

    // Form menu
    document.getElementById('form-menu-btn')?.addEventListener('click', (e) => showFormMenu(e, ficha));

    // PDF export
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => exportPDF(ficha.id));

    // Photos
    document.getElementById('add-photo-btn')?.addEventListener('click', () => {
      const input = document.getElementById('photo-input');
      input.value = '';
      input.onchange = async () => {
        for (const file of input.files) {
          const foto = await DB.addFoto(ficha.id, file, file.name);
          const grid = document.getElementById('photo-grid');
          if (grid) grid.insertAdjacentHTML('beforeend', renderPhotoThumb(foto));
        }
        showToast(`${input.files.length} foto(s) agregada(s)`, 'success');
      };
      input.click();
    });

    // Photo delete
    document.getElementById('photo-grid')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-foto-id]');
      if (!btn || !btn.classList.contains('photo-thumb-delete')) return;
      const fotoId = parseInt(btn.dataset.fotoId);
      await DB.deleteFoto(fotoId);
      btn.closest('.photo-thumb')?.remove();
      showToast('Foto eliminada');
    });
  }

  function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // =========================================
  // Auto-save
  // =========================================
  async function autoSave() {
    if (!currentFichaId) return;
    const data = collectFormData();
    try {
      setSaveStatus('saving');
      await DB.updateFicha(currentFichaId, data);
      // Update header title
      const headerTitle = document.querySelector('.header-title');
      if (headerTitle && (data.cueva || data.sitio)) {
        headerTitle.childNodes[0].textContent = data.tipo === 'radon' ? data.sitio : data.cueva;
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  function setSaveStatus(state) {
    const el = document.getElementById('save-status');
    if (!el) return;
    if (state === 'saving') {
      el.textContent = '⏳ Guardando...';
      el.className = 'save-status saving';
    } else if (state === 'saved') {
      el.textContent = '✓ Guardado';
      el.className = 'save-status saved';
      setTimeout(() => {
        if (el.className.includes('saved')) {
          el.textContent = '💾 Auto-guardado activo';
          el.className = 'save-status';
        }
      }, 2000);
    } else {
      el.textContent = '⚠️ Error al guardar';
      el.className = 'save-status';
    }
  }

  function collectFormData() {
    const ficha = { tipo: document.querySelector('.form-screen')?.dataset.type || 'cave' };

    // Text fields
    ['cueva', 'punto', 'sitio', 'provincia', 'canton', 'parroquia', 'fecha', 'fechaFin', 'horaInicio', 'horaFin', 'seccionTransversal', 'observaciones'].forEach(name => {
      const el = document.querySelector(`[name="${name}"]`) || document.getElementById(`f-${name}`) || document.getElementById(`f-${camelToKebab(name)}`);
      if (el) ficha[name] = el.value;
    });

    // Also try by ID directly
    ficha.cueva = document.getElementById('f-cueva')?.value ?? ficha.cueva;
    ficha.punto = document.getElementById('f-punto')?.value ?? ficha.punto;
    ficha.fecha = document.getElementById('f-fecha')?.value ?? ficha.fecha;
    ficha.fechaFin = document.getElementById('f-fecha-fin')?.value ?? ficha.fechaFin;
    ficha.horaInicio = document.getElementById('f-hora-inicio')?.value ?? ficha.horaInicio;
    ficha.horaFin = document.getElementById('f-hora-fin')?.value ?? ficha.horaFin;
    ficha.seccionTransversal = document.getElementById('f-seccion')?.value ?? ficha.seccionTransversal;
    ficha.observaciones = document.getElementById('f-obs')?.value ?? ficha.observaciones;

    // Agua
    const aguaRadio = document.querySelector('input[name="agua"]:checked');
    ficha.agua = aguaRadio?.value || '';

    // Toggle buttons (includes aguaTipo toggles now)
    const toggleNames = [
      'aguaTipo.corriendo', 'aguaTipo.estancada',
      'parametros.humedad','parametros.temperatura','parametros.presion','parametros.velViento','parametros.co2',
      'equiposRadiacion.alphaE','equiposRadiacion.gammaScout','equiposRadiacion.gmqGmc600','equiposRadiacion.dosimetros','equiposRadiacion.sondaBeta',
      'equiposAdicionales.medidorRadiacionCosmica',
    ];

    ficha.aguaTipo = {};
    ficha.parametros = {};
    ficha.equiposRadiacion = {};
    ficha.equiposAdicionales = {};

    toggleNames.forEach(name => {
      const yesBtn = document.querySelector(`[data-toggle="${name}"][data-value="true"]`);
      const noBtn  = document.querySelector(`[data-toggle="${name}"][data-value="false"]`);
      // null = neither pressed, true/false = explicitly selected
      const val = yesBtn?.classList.contains('active-yes') ? true
               : noBtn?.classList.contains('active-no')   ? false
               : null;
      setNestedValue(ficha, name, val);
    });

    return ficha;
  }

  function camelToKebab(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  // =========================================
  // Form Menu
  // =========================================
  function showFormMenu(e, ficha) {
    if (currentMenuCleanup) currentMenuCleanup();
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';

    const menu = document.createElement('div');
    menu.className = 'menu-dropdown';
    menu.style.cssText = `top:${rect.bottom + 4}px; right:${document.documentElement.clientWidth - rect.right}px`;
    menu.innerHTML = `
      <button class="menu-item" data-menu="pdf">📄 Exportar PDF</button>
      <button class="menu-item" data-menu="json">💾 Exportar JSON</button>
      <div class="divider"></div>
      <button class="menu-item danger" data-menu="delete">🗑️ Eliminar ficha</button>`;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    function cleanup() {
      overlay.remove();
      menu.remove();
      currentMenuCleanup = null;
    }
    currentMenuCleanup = cleanup;

    overlay.addEventListener('click', cleanup);
    menu.querySelectorAll('[data-menu]').forEach(item => {
      item.addEventListener('click', () => {
        cleanup();
        if (item.dataset.menu === 'pdf') exportPDF(ficha.id);
        if (item.dataset.menu === 'json') exportJSON(ficha.id);
        if (item.dataset.menu === 'delete') deleteFicha(ficha.id, true);
      });
    });
  }

  // =========================================
  // Clear Cache & Data
  // =========================================
  function showClearDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">🗑️ Limpiar caché y datos</div>
        <div class="dialog-message">
          <strong style="color:var(--warning)">⚠️ Guarda tus fichas en JSON antes de limpiar.</strong><br><br>
          Esta acción eliminará <strong>todas las fichas, fotos y caché</strong> del dispositivo. No se puede deshacer.<br><br>
          Podrás volver a importar tus fichas desde los archivos JSON exportados.
        </div>
        <div class="dialog-actions" style="flex-direction:column; gap:8px">
          <button class="btn btn-primary btn-full" data-action="export-first">💾 Exportar todo primero</button>
          <div style="display:flex; gap:8px; width:100%">
            <button class="btn btn-ghost btn-sm" style="flex:1" data-action="cancel">Cancelar</button>
            <button class="btn btn-danger btn-sm" style="flex:1" data-action="clear-now">Limpiar de todas formas</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (!action && e.target !== overlay) return;
      if (action === 'export-first') {
        await exportAllJSON();
        // Keep dialog open so user can then choose to clear
        return;
      }
      overlay.remove();
      if (action === 'clear-now') await clearAllData();
    });
  }

  async function clearAllData() {
    showToast('Limpiando datos...', '', 4000);
    try {
      // Delete all fichas (and their photos, via DB.deleteFicha cascade)
      const fichas = await DB.getAllFichas();
      for (const f of fichas) await DB.deleteFicha(f.id);

      // Clear service worker caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // Unregister service worker so it re-registers fresh on next load
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      showToast('Datos y caché eliminados', 'success');
      const { params } = getRoute();
      await renderHome(params.type || 'cave');
    } catch (err) {
      console.error(err);
      showToast('Error al limpiar', 'error');
    }
  }

  // =========================================
  // PDF Export
  // =========================================
  async function exportPDF(id) {
    showToast('Generando PDF...', '', 3000);
    try {
      // Save current form state first if we're on the form screen
      if (currentFichaId === id) {
        await DB.updateFicha(id, collectFormData());
      }
      const ficha = await DB.getFicha(id);
      const fotos = await DB.getFotos(id);
      await PDFGen.generate(ficha, fotos);
      showToast('PDF exportado', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar PDF', 'error');
    }
  }

  // =========================================
  // JSON Export / Import
  // =========================================
  async function exportJSON(id) {
    const ficha = await DB.getFicha(id);
    const fotos = await DB.getFotos(id);

    // Convert photo blobs to base64
    const fotosExport = await Promise.all(fotos.map(async f => {
      const base64 = await blobToBase64(f.blob);
      return { name: f.name, type: f.blob.type, data: base64, createdAt: f.createdAt };
    }));

    const exportData = { ficha, fotos: fotosExport, exportedAt: new Date().toISOString(), version: 2 };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fichaName = ficha.tipo === 'radon' ? ficha.sitio : ficha.cueva;
    const baseName = fichaName ? (ficha.punto ? `${fichaName}_${ficha.punto}` : fichaName) : 'Ficha';
    const safeName = baseName.replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚüÜñÑ ]/g, '_');
    a.download = `Ficha_${safeName}_${ficha.fecha || 'sin-fecha'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON exportado', 'success');
  }

  async function exportAllJSON(type) {
    const allFichas = await DB.getAllFichas();
    const fichas = type ? allFichas.filter(f => (f.tipo || 'cave') === type) : allFichas;
    const allData = await Promise.all(fichas.map(async f => {
      const fotos = await DB.getFotos(f.id);
      const fotosExport = await Promise.all(fotos.map(async foto => {
        const base64 = await blobToBase64(foto.blob);
        return { name: foto.name, type: foto.blob.type, data: base64, createdAt: foto.createdAt };
      }));
      return { ficha: f, fotos: fotosExport };
    }));

    const exportData = { fichas: allData, exportedAt: new Date().toISOString(), version: 2 };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fichas_${type === 'radon' ? 'Radon' : type === 'cave' ? 'Cuevas' : 'Medicion'}_${new Date().toISOString().substring(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${fichas.length} fichas exportadas`, 'success');
  }

  function triggerImport(type) {
    const input = document.getElementById('import-file');
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importJSON(data, type);
      } catch (err) {
        showToast('Error al leer el archivo', 'error');
        console.error(err);
      }
    };
    input.click();
  }

  async function importJSON(data, currentType = 'cave') {
    let imported = 0;
    const items = data.fichas || [{ ficha: data.ficha, fotos: data.fotos }];

    for (const item of items) {
      const { ficha: rawFicha, fotos = [] } = item;
      const ficha = { ...rawFicha, tipo: rawFicha?.tipo || 'cave' };
      if (!ficha?.id) continue;
      // Check if exists, if so update
      const existing = await DB.getFicha(ficha.id);
      if (existing) {
        await DB.updateFicha(ficha.id, ficha);
      } else {
        await DB.createFicha(ficha);
      }
      // Import photos
      for (const fotoData of fotos) {
        const blob = base64ToBlob(fotoData.data, fotoData.type);
        await DB.addFoto(ficha.id, blob, fotoData.name);
      }
      imported++;
    }

    showToast(`${imported} ficha(s) importada(s)`, 'success');
    await renderHome(currentType);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(base64, type) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  // =========================================
  // Delete
  // =========================================
  async function deleteFicha(id, fromForm = false) {
    const ficha = await DB.getFicha(id);
    const name = ficha?.tipo === 'radon' ? (ficha?.sitio || 'esta ficha') : (ficha?.cueva || 'esta ficha');
    const ok = await confirm('Eliminar ficha', `¿Eliminar "${name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    await DB.deleteFicha(id);
    showToast('Ficha eliminada');
    navigate('home', { type: ficha?.tipo || 'cave' });
  }

  // =========================================
  // Online/Offline Status
  // =========================================
  function updateOnlineStatus() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot) return;
    if (navigator.onLine) {
      dot.className = 'status-dot';
      if (text) text.textContent = 'Online';
    } else {
      dot.className = 'status-dot offline';
      if (text) text.textContent = 'Offline';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', () => {
    updateOnlineStatus();
    showToast('Modo offline — datos guardados localmente', 'warning', 3000);
  });

  // =========================================
  // PWA Install
  // =========================================

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  // Capture the install prompt for Android/desktop — used when menu option is tapped
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('App instalada correctamente', 'success');
  });

  // =========================================
  // Service Worker Registration
  // =========================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  // =========================================
  // Init
  // =========================================
  async function init() {
    try {
      await render();
    } catch (err) {
      console.error('Init error:', err);
      document.getElementById('app').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Error al cargar</div>
          <div class="empty-subtitle">${err.message}</div>
        </div>`;
    }
  }

  init();
})();
