/* Local Close Chamber experiments, stored separately by ficha type. */
const CloseChamber = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const newId = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; return [...b].map((v,i) => (i === 4 || i === 6 || i === 8 || i === 10 ? '-' : '') + v.toString(16).padStart(2,'0')).join(''); };
  const options = (values, selected = '') => values.map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const header = (title, menu = '') => `<header class="experiment-header"><button type="button" class="btn-icon ${title === 'Close Chamber' ? 'collection-back' : ''}" data-back aria-label="Volver">←</button><div class="experiment-header-copy"><div class="experiment-title">${esc(title)}</div><div class="header-subtitle">Close Chamber</div></div>${menu}</header>`;
  const bindBack = (root, fn) => root.querySelector('[data-back]').addEventListener('click', fn);
  const calculate = row => {
    if (!row.startDate || !row.endDate || row.initialVoltage === '' || row.finalVoltage === '') return null;
    const days = (Date.parse(`${row.endDate}T00:00:00Z`) - Date.parse(`${row.startDate}T00:00:00Z`)) / 86400000;
    const vi = Number(row.initialVoltage), vf = Number(row.finalVoltage);
    if (!(days > 0) || !Number.isFinite(vi) || !Number.isFinite(vf) || vi < 0 || vf < 0 || vf > vi) return null;
    return Math.round(((vi - vf) / (days * (0.04241 + 0.0000338 * (vi + vf) / 2))) * 1000) / 1000;
  };
  async function list(root, context) {
    const {navigate} = context;
    const items = (await DB.getAllFichas()).filter(x => x.tipo === 'close-chamber').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    root.innerHTML = `<main class="experiment-screen experiment-list-screen">${header('Close Chamber', '<button class="btn-icon" data-menu aria-label="Menú" title="Más opciones"><svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>')}<section class="experiment-content"><div class="experiment-list">${items.map(x => `<article class="ficha-card"><button class="experiment-card-main ficha-card-main" data-open="${esc(x.id)}"><span class="experiment-local-status">● Solo en este dispositivo</span><span class="experiment-card-top"><span class="experiment-card-name">${esc(x.name)}</span><span class="ficha-badge ${x.isCompleted ? 'complete' : 'partial'}">${x.isCompleted ? '✓ Completado' : '⏳ Parcial'}</span></span><span class="experiment-card-meta">${x.granulometries.length * x.weights.length} tratamientos · Responsable: ${esc(x.responsible)}</span><span class="experiment-card-meta">Actualizado ${esc(new Date(x.updatedAt).toLocaleDateString('es-EC'))}</span></button><div class="ficha-card-actions"><button class="ficha-action-btn" data-card-edit="${esc(x.id)}">✏️ Editar</button><button class="ficha-action-btn" data-card-json="${esc(x.id)}">💾 JSON</button><button class="ficha-action-btn" data-card-export="${esc(x.id)}">📄 CSV</button><button class="ficha-action-btn danger" data-card-delete="${esc(x.id)}" aria-label="Eliminar experimento">🗑️</button></div></article>`).join('') || '<div class="empty-state"><div class="empty-icon chamber-empty-icon"><svg viewBox="0 0 100 90" aria-hidden="true"><path d="M45 18a5 5 0 0 1 10 0M40 18h20v13H40z"/><path d="M40 30c-15 4-24 15-24 27v14c0 9 15 14 34 14s34-5 34-14V57c0-12-9-23-24-27"/><path class="chamber-label" d="M17 58h66v15H17z"/><path d="M20 76c8 4 18 6 30 6s22-2 30-6"/></svg></div><div class="empty-title">Todavía no hay experimentos</div><div class="empty-subtitle">Crea un diseño para empezar a registrar mediciones.</div><button class="btn btn-primary" data-new>Crear experimento</button></div>'}</div></section>${items.length ? '<button class="fab experiment-add-button" type="button" data-new aria-label="Crear experimento" title="Crear experimento">+</button>' : ''}</main>`;
    bindBack(root, () => navigate('start'));
    root.querySelector('[data-menu]').onclick = e => context.showMenu(e, 'close-chamber');
    root.querySelector('[data-new]').onclick = () => create(root, context);
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => navigate('close-chamber-detail', {id:b.dataset.open}));
    root.querySelectorAll('[data-card-export]').forEach(b => b.onclick = () => exportCsv(items.find(x => x.id === b.dataset.cardExport)));
    root.querySelectorAll('[data-card-json]').forEach(b => b.onclick = () => exportJson(items.find(x => x.id === b.dataset.cardJson)));
    root.querySelectorAll('[data-card-edit]').forEach(b => b.onclick = () => create(root, context, items.find(x => x.id === b.dataset.cardEdit)));
    root.querySelectorAll('[data-card-delete]').forEach(b => b.onclick = async () => { const item = items.find(x => x.id === b.dataset.cardDelete); if (!item || !await context.confirm('Eliminar experimento', `Se eliminará <strong>${esc(item.name)}</strong> y todos sus registros.`)) return; await DB.deleteFicha(item.id); context.toast('Experimento eliminado', 'success'); await list(root, context); });
  }
  function create(root, context, existing = null) {
    const {navigate, toast} = context;
    root.innerHTML = `<main class="experiment-screen">${header(existing ? 'Editar experimento' : 'Nuevo experimento')}<form class="experiment-content experiment-form chamber-content" data-form>
      <section class="experiment-panel"><h2>Identificación</h2><label class="experiment-field">Tipo de material *<select name="materialType" required><option value="">Selecciona un tipo</option><option value="Alimentos">Alimentos</option><option value="Fertilizantes">Fertilizantes</option></select></label><label class="experiment-field"><span data-name-label>Nombre del material *</span><input name="name" required maxlength="100"></label><label class="experiment-field">Marca *<input name="brand" required maxlength="100"></label><label class="experiment-field">Origen (donde se compró) · opcional<input name="origin" maxlength="150"></label></section>
      <section class="experiment-panel"><h2>Diseño experimental</h2><label class="experiment-field chamber-count">Cantidad de granulometrías *<input name="granCount" type="number" min="1" max="50" value="1" required></label><div data-gran></div><label class="experiment-field chamber-count">Cantidad de pesos *<input name="weightCount" type="number" min="1" max="50" value="1" required></label><div data-weight></div><label class="experiment-control"><input type="checkbox" name="control"> Incluir grupo de control</label><label class="experiment-field">Nombre completo del responsable *<input name="responsible" required maxlength="150"></label></section>
      <section class="experiment-review" data-review aria-live="polite"></section><button class="btn btn-primary btn-full btn-lg" type="submit">${existing ? 'Actualizar diseño' : 'Crear experimento'}</button><button class="btn btn-ghost btn-full" type="button" data-cancel>Cancelar</button></form></main>`;
    const form = root.querySelector('[data-form]');
    const fields = (container, count, label, initial = null) => {
      const old = initial || [...container.querySelectorAll('input')].map(i => i.value);
      container.innerHTML = Array.from({length: Math.min(50, Math.max(0, Number(count) || 0))}, (_, i) => `<label class="experiment-field">${label} ${i+1}<input required maxlength="80" value="${esc(old[i] || '')}" placeholder="${label === 'Peso' ? 'Ej. 2 g' : 'Ej. 100 mm'}"></label>`).join('');
    };
    const update = () => {
      const gs = [...root.querySelectorAll('[data-gran] input')].map(i => i.value.trim()).filter(Boolean);
      const ws = [...root.querySelectorAll('[data-weight] input')].map(i => i.value.trim()).filter(Boolean);
      root.querySelector('[data-name-label]').textContent = form.materialType.value === 'Alimentos' ? 'Nombre del alimento *' : form.materialType.value === 'Fertilizantes' ? 'Nombre del fertilizante *' : 'Nombre del material *';
      root.querySelector('[data-review]').innerHTML = `<h2>Revisión del diseño</h2><p><strong>${form.materialType.value === 'Alimentos' ? 'Alimento' : 'Fertilizante'}:</strong> ${esc(form.elements.name.value || '—')}</p><p><strong>Marca:</strong> ${esc(form.brand.value || '—')} · <strong>Origen:</strong> ${esc(form.origin.value || '—')}</p><p><strong>Granulometrías:</strong> ${esc(gs.join(', ') || '—')}</p><p><strong>Pesos:</strong> ${esc(ws.join(', ') || '—')}</p><p><strong>Tratamientos:</strong> ${Number(form.granCount.value || 0) * Number(form.weightCount.value || 0)}</p><p><strong>Grupo de control:</strong> ${form.control.checked ? 'Sí' : 'No'}</p><p><strong>Responsable:</strong> ${esc(form.responsible.value || '—')}</p>`;
    };
    if (existing) { form.materialType.value = existing.materialType; form.elements.name.value = existing.name; form.brand.value = existing.brand; form.origin.value = existing.origin || ''; form.responsible.value = existing.responsible; form.granCount.value = existing.granulometries.length; form.weightCount.value = existing.weights.length; form.control.checked = existing.control; }
    fields(root.querySelector('[data-gran]'), form.granCount.value, 'Granulometría', existing?.granulometries); fields(root.querySelector('[data-weight]'), form.weightCount.value, 'Peso', existing?.weights); update();
    form.addEventListener('input', e => { if(e.target.name === 'granCount') fields(root.querySelector('[data-gran]'), e.target.value, 'Granulometría'); if(e.target.name === 'weightCount') fields(root.querySelector('[data-weight]'), e.target.value, 'Peso'); update(); });
    form.addEventListener('change', update);
    form.onsubmit = async e => { e.preventDefault(); if (!form.reportValidity()) return;
      const granulometries = [...root.querySelectorAll('[data-gran] input')].map(i => i.value.trim());
      const weights = [...root.querySelectorAll('[data-weight] input')].map(i => i.value.trim());
      if ([...granulometries, ...weights, form.elements.name.value, form.brand.value, form.responsible.value].some(x => !x.trim())) { alert('Completa los campos obligatorios.'); return; }
      if (new Set(granulometries.map(x => x.toLocaleLowerCase())).size !== granulometries.length || new Set(weights.map(x => x.toLocaleLowerCase())).size !== weights.length) { alert('Las granulometrías y los pesos no deben repetirse.'); return; }
      const design = {materialType:form.materialType.value, name:form.elements.name.value.trim(), brand:form.brand.value.trim(), origin:form.origin.value.trim(), responsible:form.responsible.value.trim(), granulometries, weights, control:form.control.checked};
      if (existing) {
        const rows = reconcileRows(existing, design);
        if (!rows) { toast('No se puede quitar una granulometría, peso o control que contiene registros. Elimina o cambia primero esas filas.', 'error', 7000); return; }
        await DB.updateFicha(existing.id, {...design, rows});
        toast('Diseño actualizado', 'success'); await detail(root, existing.id, context);
      } else {
        const item = await DB.createFicha({id:newId(), tipo:'close-chamber', ...design, rows:[]});
        navigate('close-chamber-detail', {id:item.id});
      }
    };
    const cancel = () => existing ? detail(root, existing.id, context) : list(root, context);
    bindBack(root, cancel); root.querySelector('[data-cancel]').onclick = cancel;
  }
  function reconcileRows(existing, design) {
    const oldCount = existing.granulometries.length;
    if (existing.rows.some(r => (r.groupIndex < oldCount && r.groupIndex >= design.granulometries.length) || (r.groupIndex === oldCount && existing.control && !design.control) || (existing.weights.indexOf(r.weight) >= design.weights.length))) return null;
    return existing.rows.map(r => ({...r, groupIndex: existing.control && r.groupIndex === oldCount ? design.granulometries.length : r.groupIndex, weight: design.weights[existing.weights.indexOf(r.weight)] ?? r.weight}));
  }
  async function detail(root, id, {navigate, toast, confirm}) {
    const item = await DB.getFicha(id);
    if (!item || item.tipo !== 'close-chamber') { navigate('close-chamber'); return; }
    const groups = [...item.granulometries, ...(item.control ? ['Grupo de control'] : [])];
    const menu = `<details class="experiment-actions-menu"><summary aria-label="Abrir menú de acciones" title="Acciones"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></summary><div class="experiment-actions-panel"><button type="button" data-edit>Editar diseño</button><button type="button" data-json>Respaldar experimento (JSON)</button></div></details>`;
    root.innerHTML = `<main class="experiment-screen">${header(item.name, menu)}<section class="experiment-content experiment-form chamber-content"><section class="experiment-summary chamber-summary"><span class="experiment-local-status">● Solo en este dispositivo · Sin sincronizar</span><h2>Diseño del experimento</h2><p><strong>Tipo:</strong> ${esc(item.materialType)} · <strong>Marca:</strong> ${esc(item.brand)}</p><p><strong>Origen:</strong> ${esc(item.origin)}</p><p><strong>Responsable:</strong> ${esc(item.responsible)}</p><p><strong>Granulometrías:</strong> ${esc(item.granulometries.join(', '))}</p><p><strong>Pesos:</strong> ${esc(item.weights.join(', '))}</p><p><strong>Tratamientos:</strong> ${item.granulometries.length * item.weights.length} · <strong>Control:</strong> ${item.control ? 'Sí' : 'No'}</p></section><p class="chamber-hint">Guarda cada fila después de ingresar o modificar sus datos. Desliza las tablas para ver todas las columnas.</p>${groups.map((g,i) => `<section class="experiment-panel chamber-table-panel"><h2>${i === item.granulometries.length ? 'Grupo de control' : `Granulometría: ${esc(g)}`}</h2><div class="chamber-table-scroll"><table class="chamber-table"><colgroup><col class="chamber-col-weight"><col class="chamber-col-code"><col class="chamber-col-date"><col class="chamber-col-time"><col class="chamber-col-voltage"><col class="chamber-col-date"><col class="chamber-col-time"><col class="chamber-col-voltage"><col class="chamber-col-result"><col class="chamber-col-actions"></colgroup><thead><tr><th>Peso</th><th>Código electreto</th><th>Fecha inicio</th><th>Hora inicio</th><th>Voltaje inicio</th><th>Fecha fin</th><th>Hora fin</th><th>Voltaje fin</th><th>Concentración</th><th>Acciones</th></tr></thead><tbody>${item.rows.filter(r => r.groupIndex === i).map(r => rowHtml(r,item.weights)).join('')}</tbody></table></div><button type="button" class="btn btn-ghost btn-sm" data-add="${i}">+ Agregar fila</button></section>`).join('')}<button class="btn btn-primary btn-full" data-export>Descargar CSV completo</button><button class="btn btn-primary btn-full" data-pdf>Descargar PDF completo</button><button type="button" class="btn ${item.isCompleted ? 'btn-ghost' : 'btn-success'} btn-full" data-completion>${item.isCompleted ? 'Marcar como parcial' : 'Marcar experimento como completado'}</button></section></main>`;
    const dirty = new Set();
    const requireSaved = () => { if (!dirty.size) return true; toast('Guarda la fila modificada antes de continuar', 'error', 4500); return false; };
    bindBack(root, () => { if (requireSaved()) navigate('close-chamber'); });
    root.querySelector('[data-export]').onclick = () => { if (requireSaved()) exportCsv(item); };
    root.querySelector('[data-pdf]').onclick = () => { if (!requireSaved()) return; try { exportPdf(item); } catch (error) { console.error(error); toast('No se pudo generar el PDF', 'error'); } };
    root.querySelector('[data-completion]').onclick = async () => { if (!requireSaved()) return; await DB.updateFicha(id, {isCompleted: !item.isCompleted}); toast(item.isCompleted ? 'Experimento marcado como parcial' : 'Experimento completado', 'success'); await detail(root, id, {navigate, toast, confirm}); };
    root.querySelector('[data-edit]').onclick = () => { if (requireSaved()) create(root, {navigate, toast, confirm}, item); };
    root.querySelector('[data-json]').onclick = () => { if (!requireSaved()) return; exportJson(item); root.querySelector('.experiment-actions-menu').open = false; toast('Respaldo JSON generado', 'success'); };
    root.querySelectorAll('[data-add]').forEach(b => b.onclick = async () => { if (!requireSaved()) return; item.rows.push({id:newId(),groupIndex:Number(b.dataset.add),weight:item.weights[0],code:'',startDate:'',startTime:'',initialVoltage:'',endDate:'',endTime:'',finalVoltage:''}); await DB.updateFicha(id,{rows:item.rows}); await detail(root,id,{navigate,toast,confirm}); });
    root.querySelectorAll('[data-row]').forEach(tr => {
      const row = item.rows.find(r => r.id === tr.dataset.row);
      const read = () => Object.fromEntries([...tr.querySelectorAll('[data-field]')].map(el => [el.dataset.field, el.value.trim()]));
      tr.addEventListener('input', () => { dirty.add(row.id); tr.classList.remove('is-saved'); const value = calculate({...row,...read()}); tr.querySelector('[data-result]').textContent = value === null ? '—' : value.toFixed(3); });
      tr.addEventListener('change', () => { dirty.add(row.id); tr.classList.remove('is-saved'); });
      tr.querySelector('[data-row-edit]').onclick = () => { tr.querySelectorAll('[data-field]').forEach(field => { field.disabled = false; }); tr.classList.remove('is-saved'); tr.classList.add('is-editing'); dirty.add(row.id); tr.querySelector('[data-field=code]').focus(); };
      tr.querySelector('[data-save]').onclick = async () => {
        const values = read(); const code = values.code.toLocaleLowerCase();
        if (!values.weight || !code) { toast('Ingresa el peso y el código del electreto', 'error'); return; }
        if (values.startDate && values.endDate && values.endDate <= values.startDate) { toast('La fecha final debe ser posterior a la inicial', 'error', 4500); return; }
        if ([values.initialVoltage,values.finalVoltage].some(v => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) { toast('Ingresa voltajes válidos y no negativos', 'error'); return; }
        if (values.initialVoltage !== '' && values.finalVoltage !== '' && Number(values.finalVoltage) > Number(values.initialVoltage)) { toast('El voltaje final no puede superar al inicial', 'error', 4500); return; }
        const all = (await DB.getAllFichas()).filter(x => x.tipo === 'close-chamber');
        if (all.some(x => x.rows.some(r => !(x.id === item.id && r.id === row.id) && r.code.trim().toLocaleLowerCase() === code))) { toast('Ese código de electreto ya existe', 'error', 4500); return; }
        Object.assign(row,values); await DB.updateFicha(id,{rows:item.rows}); dirty.delete(row.id); tr.classList.remove('is-editing'); tr.classList.add('is-saved'); tr.querySelectorAll('[data-field]').forEach(field => { field.disabled = true; }); toast('Fila guardada', 'success');
      };
      tr.querySelector('[data-delete]').onclick = async () => { if ([...dirty].some(key => key !== row.id)) { toast('Guarda las otras filas modificadas antes de continuar', 'error'); return; } if (!await confirm('Eliminar fila','¿Eliminar este registro de electreto?')) return; item.rows = item.rows.filter(r => r.id !== row.id); await DB.updateFicha(id,{rows:item.rows}); await detail(root,id,{navigate,toast,confirm}); };
    });
  }
  function rowHtml(r,weights) {
    const locked = Boolean(r.code);
    const input = (field,type='text',extra='') => `<input data-field="${field}" type="${type}" value="${esc(r[field])}" ${extra} ${locked ? 'disabled' : ''} aria-label="${field}">`;
    const value = calculate(r);
    return `<tr data-row="${esc(r.id)}" class="${locked ? 'is-saved' : 'is-editing'}"><td><select data-field="weight" ${locked ? 'disabled' : ''}>${options(weights,r.weight)}</select></td><td>${input('code')}</td><td>${input('startDate','date')}</td><td>${input('startTime','time')}</td><td>${input('initialVoltage','number','min="0" step="any"')}</td><td>${input('endDate','date')}</td><td>${input('endTime','time')}</td><td>${input('finalVoltage','number','min="0" step="any"')}</td><td data-result>${value === null ? '—' : value.toFixed(3)}</td><td><div class="chamber-row-actions"><button type="button" class="chamber-row-action chamber-edit" data-row-edit aria-label="Editar fila" title="Editar fila"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16zM14 7l3 3"/></svg></button><button type="button" class="chamber-row-action chamber-save" data-save aria-label="Guardar fila" title="Guardar fila"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l3 3v15H4zM7 3v7h9V3M8 21v-7h8v7"/></svg></button><button type="button" class="chamber-row-action chamber-delete" data-delete aria-label="Eliminar fila" title="Eliminar fila"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg></button></div></td></tr>`;
  }
  function exportPdf(item) {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('Close Chamber - Diseño del experimento', 14, 16);
    doc.autoTable({startY:22, body:[
      ['Tipo de material', item.materialType, 'Nombre', item.name],
      ['Marca', item.brand, 'Origen', item.origin || 'No especificado'],
      ['Responsable', item.responsible, 'Tratamientos', String(item.granulometries.length * item.weights.length)],
      ['Granulometrías', item.granulometries.join(', '), 'Pesos', item.weights.join(', ')],
      ['Grupo de control', item.control ? 'Sí' : 'No', 'Estado', item.isCompleted ? 'Completado' : 'Parcial'],
    ], theme:'grid', styles:{font:'helvetica', fontSize:9, cellPadding:2.5, overflow:'linebreak'}, columnStyles:{0:{fontStyle:'bold'},2:{fontStyle:'bold'}}, margin:{left:14,right:14}});
    const groups = [...item.granulometries, ...(item.control ? ['Grupo de control'] : [])];
    const rows = groups.flatMap((group, index) => item.rows.filter(row => row.groupIndex === index).map(row => {
      const value = calculate(row);
      return [group,row.weight,row.code,row.startDate,row.startTime,row.initialVoltage,row.endDate,row.endTime,row.finalVoltage,value === null ? '' : value.toFixed(3)];
    }));
    doc.autoTable({startY:(doc.lastAutoTable?.finalY || 50)+8, head:[['Granulometría','Peso','Código electreto','Fecha inicio','Hora inicio','Voltaje inicio','Fecha fin','Hora fin','Voltaje fin','Concentración']], body:rows, theme:'grid', styles:{font:'helvetica',fontSize:8,cellPadding:2,overflow:'linebreak'}, headStyles:{fillColor:[39,104,151],textColor:[255,255,255]}, alternateRowStyles:{fillColor:[242,246,250]}, margin:{left:14,right:14}});
    doc.save(`Close_Chamber_${item.name.trim().replace(/[\\/:*?"<>|\s]+/g, '_')}.pdf`);
  }
  function exportJson(item) {
    const url = URL.createObjectURL(new Blob([JSON.stringify({fichas:[{ficha:item, fotos:[]}]}, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = `Close_Chamber_${item.name.replace(/[^a-z0-9_-]+/gi, '_')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv(item) {
    const cell = v => { if (v && typeof v === 'object' && v.decimalText) return v.decimalText; let s = String(v ?? ''); if (/^[=+@\t\r]/.test(s) || /^-(?!\d)/.test(s)) s = "'" + s; return `"${s.replace(/"/g,'""')}"`; };
    const rows = [['Tipo de material','Nombre','Marca','Origen','Responsable','Granulometría','Peso','Código electreto','Fecha inicio','Hora inicio','Voltaje inicio','Fecha fin','Hora fin','Voltaje fin','Concentración']];
    [...item.granulometries,...(item.control ? ['Grupo de control'] : [])].forEach((g,i) => item.rows.filter(r => r.groupIndex === i).forEach(r => { const v=calculate(r); rows.push([item.materialType,item.name,item.brand,item.origin,item.responsible,g,r.weight,r.code,r.startDate,r.startTime,r.initialVoltage,r.endDate,r.endTime,r.finalVoltage,v === null ? '' : {decimalText:v.toFixed(3)}]); }));
    const url = URL.createObjectURL(new Blob(['\ufeff'+rows.map(row => row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})); const a = document.createElement('a'); a.href=url; const now = new Date(); const date = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-'); const name = item.name.trim().replace(/[\\/:*?"<>|\s]+/g, '_'); a.download=`Close_Chamber_${name}_${date}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  return {list, detail};
})();
