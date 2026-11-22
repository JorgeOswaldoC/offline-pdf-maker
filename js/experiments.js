/**
 * Local-first experiment design and seed-emergence records.
 * Remote authentication/synchronization is intentionally outside this module.
 */
const Experiments = (() => {
  const ACCESS_CODE = 'N445I2';
  const ACCESS_KEY = 'ficharium.experimentos.access.v1';
  const STATUS = {
    '': { label: 'Sin registro', state: 'pendiente' },
    '0': { label: 'No emergió', state: 'no_emergio' },
    '1': { label: 'Emergió', state: 'emergio' },
    M: { label: 'Murió', state: 'murio' },
    S: { label: 'Siembra', state: 'siembra' },
    O: { label: 'En observación', state: 'observacion' },
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const pad = (value) => String(value).padStart(2, '0');
  const canonicalTreatmentCode = (treatment, index = 0) => {
    if (treatment.isControl || treatment.code === 'CTL' || treatment.code === 'T0') return 'T0';
    const match = String(treatment.code || '').match(/^T0*(\d+)$/i);
    return match && Number(match[1]) > 0 ? `T${Number(match[1])}` : `T${index + 1}`;
  };
  const sampleIdentifier = (sample, treatment, index = 0) =>
    `${sample.speciesCode}-${canonicalTreatmentCode(treatment, index)}-R${Number(sample.repetition)}-U${Number(sample.unit)}`;
  const treatmentPosition = (species, treatment) => species.treatments.filter((item) => !item.isControl).indexOf(treatment);
  const localDate = (date) => {
    const d = new Date(`${date}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const dateAfter = (date, days) => {
    if (!date || !Number.isFinite(days)) return '';
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  function hasAccess() {
    try { return localStorage.getItem(ACCESS_KEY) === 'granted'; }
    catch { return false; }
  }

  function renderAccess(root, { toast, navigate, onUnlock }) {
    root.innerHTML = `<main class="experiment-screen experiment-access-screen"><section class="experiment-access-card">
      <button class="btn btn-ghost btn-sm experiment-access-back" type="button" data-access-back>← Volver</button><div class="experiment-access-icon" aria-hidden="true">🌱</div><h1>Experimento Plantas</h1>
      <p>Ingresa el código de acceso una vez para habilitar esta sección en este dispositivo.</p>
      <form data-access-form><label for="experiment-access-code">Código de acceso</label><input id="experiment-access-code" name="accessCode" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="characters" maxlength="6" pattern="[A-Za-z0-9]{6}" required aria-describedby="experiment-access-help"><small id="experiment-access-help">Código de 6 letras o números.</small><button class="btn btn-primary experiment-access-submit" type="submit">Ingresar</button></form>
    </section></main>`;
    root.querySelector('[data-access-back]').addEventListener('click', () => navigate('start'));
    const input = root.querySelector('#experiment-access-code');
    root.querySelector('[data-access-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (input.value.trim().toUpperCase() !== ACCESS_CODE) {
        input.value = '';
        input.focus();
        toast('El código ingresado no es válido', 'error');
        return;
      }
      try { localStorage.setItem(ACCESS_KEY, 'granted'); }
      catch { toast('No se pudo guardar el acceso en este dispositivo', 'error'); return; }
      toast('Acceso habilitado en este dispositivo', 'success');
      await onUnlock();
    });
  }

  async function render(root, { navigate, toast, confirm, showMenu }) {
    const experiments = (await DB.getAllExperiments()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    root.innerHTML = `
      <main class="experiment-screen experiment-list-screen">
        <header class="experiment-header">
          <button class="btn-icon collection-back" data-action="back" aria-label="Cambiar tipo de ficha">←</button>
          <div class="experiment-header-copy"><div class="experiment-title">Experimento Plantas</div><div class="header-subtitle">Emergencia y mortalidad de plántulas</div></div><button class="btn-icon" data-menu aria-label="Menú" title="Más opciones"><svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
        </header>
        <section class="experiment-content">
          ${experiments.length ? `<div class="experiment-list">${experiments.map(renderCard).join('')}</div>` : `
            <div class="empty-state"><div class="empty-icon">🌱</div><div class="empty-title">Todavía no hay experimentos</div><div class="empty-subtitle">Crea un diseño para empezar a registrar semillas.</div><button class="btn btn-primary" data-action="new">Crear experimento</button></div>`}
        </section>
        ${experiments.length ? '<button class="fab experiment-add-button" type="button" data-action="new" aria-label="Crear experimento" title="Crear experimento">+</button>' : ''}
      </main>`;
    root.querySelectorAll('[data-action="back"]').forEach((button) => button.addEventListener('click', () => navigate('start')));
    root.querySelector('[data-menu]').addEventListener('click', e => showMenu(e, 'plants'));
    root.querySelectorAll('[data-action="new"]').forEach((button) => button.addEventListener('click', () => renderCreate(root, { navigate, toast, confirm, showMenu })));
    root.querySelectorAll('[data-open-experiment]').forEach((button) => button.addEventListener('click', () => navigate('experiment', { id: button.dataset.openExperiment })));
    root.querySelectorAll('[data-export-experiment]').forEach((button) => button.addEventListener('click', async () => {
      const record = await DB.getExperiment(button.dataset.exportExperiment);
      if (record) exportExperimentCsv(record);
    }));
    root.querySelectorAll('[data-edit-experiment]').forEach(button => button.addEventListener('click', async () => { const record = await DB.getExperiment(button.dataset.editExperiment); if (record) renderCreate(root, {navigate, toast, confirm, existing:record}); }));
    root.querySelectorAll('[data-json-experiment]').forEach(button => button.addEventListener('click', async () => { const record = await DB.getExperiment(button.dataset.jsonExperiment); if (record) exportExperimentJson(record); }));
    root.querySelectorAll('[data-delete-experiment]').forEach(button => button.addEventListener('click', async () => {
      const record = await DB.getExperiment(button.dataset.deleteExperiment);
      if (!record || !await confirm('Eliminar experimento', `Se eliminará <strong>${escapeHtml(record.name)}</strong> y todos sus registros.`)) return;
      await DB.deleteExperiment(record.id); toast('Experimento eliminado', 'success'); await render(root, {navigate, toast, confirm, showMenu});
    }));
  }

  function renderCard(experiment) {
    const total = experiment.design.totalSeeds;
    const speciesNames = experiment.design.species.map((species) => species.abbreviation).join(', ');
    const progress = countStatuses(experiment).emergio;
    return `<article class="ficha-card">
      <button class="experiment-card-main ficha-card-main" data-open-experiment="${escapeHtml(experiment.id)}">
        <span class="experiment-card-top"><span class="experiment-code">${escapeHtml(experiment.code)}</span><span class="experiment-local-status">● Solo en este dispositivo</span></span>
        <span class="experiment-card-top"><span class="experiment-card-name">${escapeHtml(experiment.name)}</span><span class="ficha-badge ${experiment.isCompleted ? 'complete' : 'partial'}">${experiment.isCompleted ? '✓ Completado' : '⏳ Parcial'}</span></span>
        <span class="experiment-card-meta">${speciesNames} · ${total} semillas · ${localDate(experiment.design.startDate)}–${localDate(experiment.design.endDate)}</span>
        <span class="experiment-card-meta">${progress} emergidas · Actualizado ${new Date(experiment.updatedAt).toLocaleDateString('es-EC')}</span>
      </button>
      <div class="ficha-card-actions"><button class="ficha-action-btn" data-edit-experiment="${escapeHtml(experiment.id)}">✏️ Editar</button><button class="ficha-action-btn" data-json-experiment="${escapeHtml(experiment.id)}">💾 JSON</button><button class="ficha-action-btn" data-export-experiment="${escapeHtml(experiment.id)}">📄 CSV</button><button class="ficha-action-btn danger" data-delete-experiment="${escapeHtml(experiment.id)}" aria-label="Eliminar experimento">🗑️</button></div>
    </article>`;
  }

  function renderCreate(root, { navigate, toast, confirm, showMenu, existing = null }) {
    const editing = Boolean(existing);
    root.innerHTML = `
      <main class="experiment-screen">
        <header class="experiment-header"><button class="btn-icon" data-cancel aria-label="${editing ? 'Volver al experimento' : 'Volver al listado'}">←</button><div><div class="experiment-title">${editing ? 'Editar experimento' : 'Nuevo experimento'}</div><div class="header-subtitle">${editing ? 'Corrige la identificación y el diseño experimental' : 'Diseña las unidades y revisa el total antes de crear'}</div></div></header>
        <form class="experiment-content experiment-form" id="experiment-create-form">
          <section class="experiment-panel"><h2>Identificación</h2>
            <label class="experiment-field">Nombre del experimento<input name="name" value="${escapeHtml(existing?.name || '')}" required maxlength="100" placeholder="Ej. Ensayo de emergencia de Caesalpinia"></label>
            <label class="experiment-field">Código único<input name="code" value="${escapeHtml(existing?.code || '')}" required maxlength="60" pattern="[A-Za-z0-9_-]+" placeholder="Ej. DIPI087_EMERGENCIA_2026_01"></label>
          </section>
          <section class="experiment-panel"><h2>Especies</h2>
            <label class="experiment-field">Cantidad de especies<input name="speciesCount" type="number" min="1" max="20" value="1" required></label>
            <div id="experiment-species-fields"></div>
          </section>
          <section class="experiment-panel"><h2>Tratamientos y unidades</h2>
            <label class="experiment-field">Tratamientos experimentales (sin contar el control)<input name="treatmentCount" type="number" min="1" max="20" value="2" required></label>
            <div id="experiment-treatment-fields" class="experiment-treatment-options"></div>
            <button class="btn btn-ghost btn-sm" type="button" data-refresh-design>Actualizar bloques del diseño</button>
            <div class="experiment-field-row">
              <label class="experiment-field"><span>Repeticiones por tratamiento</span><input name="replicates" type="number" min="1" max="100" value="3" required></label>
              <label class="experiment-field"><span>Semillas por repetición</span><input name="seedsPerReplicate" type="number" min="1" max="500" value="10" required></label>
            </div>
            <label class="experiment-control"><input name="hasControl" type="checkbox" checked> Incluir grupo control T0 con igual número de repeticiones y semillas</label>
          </section>
          <section class="experiment-panel experiment-duration"><h2>Duración</h2>
            <label class="experiment-field"><span>Fecha inicial</span><input name="startDate" type="date" required></label>
            <label class="experiment-field"><span>Duración (días)</span><input name="durationDays" type="number" min="1" max="3650" value="30" required></label>
            <label class="experiment-field"><span>Fecha de finalización</span><input name="calculatedEndDate" type="date" readonly></label>
          </section>
          <section class="experiment-review" id="experiment-design-review" aria-live="polite"></section>
          <button class="btn btn-primary btn-full btn-lg" type="submit">${editing ? 'Guardar cambios' : 'Crear experimento'}</button>
          <button class="btn btn-ghost btn-full" type="button" data-cancel>${editing ? 'Cancelar cambios' : 'Cancelar'}</button>
        </form>
      </main>`;
    const form = root.querySelector('#experiment-create-form');
    const speciesFields = root.querySelector('#experiment-species-fields');
    const treatmentFields = root.querySelector('#experiment-treatment-fields');
    const review = root.querySelector('#experiment-design-review');
    const readDynamic = (container) => [...container.querySelectorAll('.experiment-species-row')].map((row) => ({
      name: row.querySelector('[name^="speciesName"]')?.value || '',
      abbreviation: row.querySelector('[name^="speciesAbbreviation"]')?.value || '',
    }));
    const renderDynamicFields = () => {
      const speciesCount = Math.min(20, Math.max(1, Number(form.elements.speciesCount.value) || 1));
      const treatmentCount = Math.min(20, Math.max(1, Number(form.elements.treatmentCount.value) || 1));
      const oldSpecies = [...speciesFields.querySelectorAll('.experiment-species-row')].map((row) => ({
        name: row.querySelector('[name^="speciesName"]')?.value || '', abbreviation: row.querySelector('[name^="speciesAbbreviation"]')?.value || '',
      }));
      const oldTreatments = [...treatmentFields.querySelectorAll('[data-treatment-name]')].map((field) => field.dataset.treatmentName);
      speciesFields.innerHTML = Array.from({ length: speciesCount }, (_, index) => `
        <div class="experiment-species-row"><strong>Especie ${index + 1}</strong>
          <label class="experiment-field">Nombre científico<input name="speciesName${index}" value="${escapeHtml(oldSpecies[index]?.name || '')}" required placeholder="Nombre de la especie"></label>
          <label class="experiment-field">Abreviatura única<input name="speciesAbbreviation${index}" value="${escapeHtml(oldSpecies[index]?.abbreviation || `SP${pad(index + 1)}`)}" required maxlength="8" pattern="[A-Za-z0-9]+" placeholder="Ej. CAE"></label>
        </div>`).join('');
      treatmentFields.innerHTML = Array.from({ length: treatmentCount }, (_, index) => `
        <div class="experiment-treatment-option" data-treatment-name="${escapeHtml(oldTreatments[index] || `Tratamiento ${index + 1}`)}"><span class="experiment-treatment-option-code">T${index + 1}</span><span class="experiment-treatment-option-name">${escapeHtml(oldTreatments[index] || `Tratamiento ${index + 1}`)}</span></div>`).join('');
      updateReview();
    };
    const getDesignForm = () => ({
      speciesCount: Number(form.elements.speciesCount.value),
      treatmentCount: Number(form.elements.treatmentCount.value),
      replicates: Number(form.elements.replicates.value),
      seedsPerReplicate: Number(form.elements.seedsPerReplicate.value),
      hasControl: form.elements.hasControl.checked,
      startDate: form.elements.startDate.value,
      durationDays: Number(form.elements.durationDays.value),
    });
    function updateReview() {
      const config = getDesignForm();
      const controls = config.hasControl ? 1 : 0;
      const totalSeeds = config.speciesCount * (config.treatmentCount + controls) * config.replicates * config.seedsPerReplicate;
      const endDate = form.elements.durationDays.validity.valid && form.elements.durationDays.value
        ? dateAfter(config.startDate, config.durationDays) : '';
      form.elements.calculatedEndDate.value = endDate;
      review.innerHTML = `<h2>Revisión del diseño</h2><p><strong>Fecha final:</strong> ${endDate ? localDate(endDate) : 'Selecciona fecha inicial y duración'}</p><p><strong>Total de semillas:</strong> ${Number.isFinite(totalSeeds) ? totalSeeds.toLocaleString('es-EC') : '—'}</p><p>${config.speciesCount} ${config.speciesCount === 1 ? 'especie' : 'especies'} × ${config.treatmentCount + controls} tratamiento(s) × ${config.replicates} repetición(es) × ${config.seedsPerReplicate} semilla(s)</p><p class="experiment-review-species">${readDynamic(speciesFields).map((species) => escapeHtml(species.name || 'Especie sin nombre')).join(' · ')}</p>`;
      review.classList.toggle('has-error', totalSeeds > 10000);
      form.querySelector('[type="submit"]').disabled = totalSeeds > 10000;
      if (totalSeeds > 10000) review.innerHTML += '<p>El diseño supera el límite local de 10 000 semillas por experimento.</p>';
    }
    if (existing) {
      const design = existing.design;
      form.elements.speciesCount.value = design.species.length;
      form.elements.treatmentCount.value = design.treatmentCount ?? design.species[0]?.treatments.filter((treatment) => !treatment.isControl).length ?? 1;
      form.elements.replicates.value = design.replicates;
      form.elements.seedsPerReplicate.value = design.seedsPerReplicate;
      form.elements.hasControl.checked = design.hasControl;
      form.elements.startDate.value = design.startDate;
      form.elements.durationDays.value = design.durationDays;
    } else {
      form.elements.startDate.value = new Date().toISOString().slice(0, 10);
    }
    renderDynamicFields();
    if (existing) {
      existing.design.species.forEach((species, index) => {
        form.elements[`speciesName${index}`].value = species.name;
        form.elements[`speciesAbbreviation${index}`].value = species.abbreviation;
      });
      const treatmentNames = existing.design.species[0]?.treatments.filter((treatment) => !treatment.isControl) || [];
      treatmentNames.forEach((treatment, index) => {
        const block = treatmentFields.querySelectorAll('[data-treatment-name]')[index];
        if (!block) return;
        block.dataset.treatmentName = treatment.name;
        block.querySelector('.experiment-treatment-option-name').textContent = treatment.name;
      });
      updateReview();
    }
    form.addEventListener('input', (event) => {
      if (event.target.name === 'speciesCount' || event.target.name === 'treatmentCount') renderDynamicFields();
      else updateReview();
    });
    form.addEventListener('change', (event) => {
      if (event.target.name === 'speciesCount' || event.target.name === 'treatmentCount') renderDynamicFields();
      else updateReview();
    });
    root.querySelector('[data-refresh-design]').addEventListener('click', renderDynamicFields);
    root.querySelectorAll('[data-cancel]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      if (existing) renderDetail(root, existing.id, { navigate, toast, confirm });
      else render(root, { navigate, toast, confirm, showMenu });
    }));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const code = form.elements.code.value.trim();
      const duplicate = (await DB.getAllExperiments()).find((experiment) => experiment.code.toLowerCase() === code.toLowerCase() && experiment.id !== existing?.id);
      if (duplicate) { toast('Ese código de experimento ya existe', 'warning'); return; }
      const config = getDesignForm();
      const species = [...speciesFields.querySelectorAll('.experiment-species-row')].map((row) => ({
        name: row.querySelector('[name^="speciesName"]').value.trim(),
        abbreviation: row.querySelector('[name^="speciesAbbreviation"]').value.trim().toUpperCase(),
      }));
      if (new Set(species.map((item) => item.abbreviation)).size !== species.length) { toast('Las abreviaturas de especies deben ser únicas', 'warning'); return; }
      const treatmentNames = [...treatmentFields.querySelectorAll('[data-treatment-name]')].map((field, index) => field.dataset.treatmentName?.trim() || `Tratamiento ${index + 1}`);
      const treatmentDefinitions = treatmentNames.map((name, index) => ({ code: `T${index + 1}`, name, repetitions: config.replicates, seedsPerRepetition: config.seedsPerReplicate, isControl: false }));
      if (config.hasControl) treatmentDefinitions.unshift({ code: 'T0', name: 'Control', repetitions: config.replicates, seedsPerRepetition: config.seedsPerReplicate, isControl: true });
      try {
        const values = {
          code, name: form.elements.name.value.trim(), startDate: config.startDate,
          durationDays: config.durationDays, hasControl: config.hasControl,
          treatmentCount: config.treatmentCount, replicates: config.replicates,
          seedsPerReplicate: config.seedsPerReplicate, species, treatmentDefinitions,
        };
        if (existing) {
          const update = reconcileExperiment(existing, values);
          if (update.removedUnits || update.removedMeasurements) {
            const impact = [];
            if (update.removedUnits) impact.push(`${update.removedUnits} ${update.removedUnits === 1 ? 'unidad con datos' : 'unidades con datos'}`);
            if (update.removedMeasurements) impact.push(`${update.removedMeasurements} ${update.removedMeasurements === 1 ? 'registro diario' : 'registros diarios'} fuera del nuevo diseño`);
            const accepted = await confirm('Confirmar reducción del diseño', `El cambio quitará ${impact.join(' y ')}. ¿Guardar los cambios?`);
            if (!accepted) return;
          }
          await DB.updateExperiment(existing.id, update.record);
          toast('Diseño actualizado y guardado en este dispositivo', 'success');
          renderDetail(root, existing.id, { navigate, toast, confirm });
        } else {
          const record = createExperimentRecord(values);
          const created = await DB.createExperiment(record);
          toast('Experimento creado y guardado en este dispositivo', 'success');
          navigate('experiment', { id: created.id });
        }
      } catch (error) {
        console.error(error);
        toast('No se pudo guardar el experimento', 'error');
      }
    });
  }

  function makeSamples(speciesCode, treatment, speciesName) {
    const samples = [];
    for (let repetition = 1; repetition <= treatment.repetitions; repetition++) {
      for (let unit = 1; unit <= treatment.seedsPerRepetition; unit++) {
        samples.push(makeSample(speciesCode, treatment, speciesName, repetition, unit));
      }
    }
    return samples;
  }

  function makeSample(speciesCode, treatment, speciesName, repetition, unit) {
    return {
      uuid: DB.newId(),
      id: `${speciesCode}-${treatment.code}-R${repetition}-U${unit}`,
      species: speciesName, speciesCode, treatment: treatment.name, treatmentCode: treatment.code,
      repetition, unit, values: [],
    };
  }

  function createExperimentRecord(values) {
    const endDate = dateAfter(values.startDate, values.durationDays);
    return {
      type: 'experiment', code: values.code, name: values.name,
      design: {
        startDate: values.startDate, durationDays: values.durationDays, endDate,
        hasControl: values.hasControl, treatmentCount: values.treatmentCount,
        replicates: values.replicates, seedsPerReplicate: values.seedsPerReplicate,
        totalSeeds: values.species.length * values.treatmentDefinitions.length * values.replicates * values.seedsPerReplicate,
        species: values.species.map((item) => ({ ...item, treatments: values.treatmentDefinitions.map((treatment) => ({
          ...treatment,
          samples: makeSamples(item.abbreviation, treatment, item.name),
        })) })),
      },
      events: [], archived: false, sync: { status: 'local', pending: 0, lastSyncedAt: null },
    };
  }

  function reconcileExperiment(existing, values) {
    const kept = new Map();
    const species = values.species.map((item, speciesIndex) => {
      const previousSpecies = existing.design.species[speciesIndex];
      const treatments = values.treatmentDefinitions.map((definition) => {
        const previousTreatment = definition.isControl
          ? previousSpecies?.treatments.find((treatment) => treatment.isControl || treatment.code === 'CTL' || treatment.code === 'T0')
          : previousSpecies?.treatments.filter((treatment) => !treatment.isControl).find((treatment, index) => index === Number(definition.code.slice(1)) - 1);
        const samples = [];
        for (let repetition = 1; repetition <= values.replicates; repetition++) {
          for (let unit = 1; unit <= values.seedsPerReplicate; unit++) {
            const oldSample = previousTreatment?.samples.find((sample) => sample.repetition === repetition && sample.unit === unit);
            const sample = oldSample
              ? { ...oldSample, id: `${item.abbreviation}-${definition.code}-R${repetition}-U${unit}`, species: item.name, speciesCode: item.abbreviation, treatment: definition.name, treatmentCode: definition.code, values: [...(oldSample.values || [])] }
              : makeSample(item.abbreviation, definition, item.name, repetition, unit);
            kept.set(sample.uuid, sample);
            samples.push(sample);
          }
        }
        return { ...definition, samples };
      });
      return { ...item, treatments };
    });

    const oldSamples = existing.design.species.flatMap((item) => item.treatments.flatMap((treatment) => treatment.samples));
    const eventsBySample = new Map();
    existing.events.forEach((event) => {
      if (!eventsBySample.has(event.sampleUuid)) eventsBySample.set(event.sampleUuid, []);
      eventsBySample.get(event.sampleUuid).push(event);
    });
    const removed = oldSamples.filter((sample) => !kept.has(sample.uuid));
    const removedUnitsWithHistory = new Set();
    const removedDailyRecords = new Set();
    const addRemovedRecord = (sampleUuid, day) => removedDailyRecords.add(`${sampleUuid}:${day}`);

    removed.forEach((sample) => {
      const sampleEvents = eventsBySample.get(sample.uuid) || [];
      if (sample.values.some((value) => value !== null && value !== undefined) || sampleEvents.length) removedUnitsWithHistory.add(sample.uuid);
      sample.values.forEach((value, day) => { if (value !== null && value !== undefined) addRemovedRecord(sample.uuid, day); });
      sampleEvents.forEach((event) => addRemovedRecord(sample.uuid, event.day));
    });

    kept.forEach((sample) => {
      const sampleEvents = eventsBySample.get(sample.uuid) || [];
      sample.values.forEach((value, day) => {
        if (day > values.durationDays && value !== null && value !== undefined) addRemovedRecord(sample.uuid, day);
      });
      sampleEvents.forEach((event) => { if (event.day > values.durationDays) addRemovedRecord(sample.uuid, event.day); });
      sample.values = sample.values.slice(0, values.durationDays + 1);
    });

    const events = existing.events.filter((event) => kept.has(event.sampleUuid) && event.day <= values.durationDays).map((event) => {
      const sample = kept.get(event.sampleUuid);
      return {
        ...event, sampleId: sample.id, speciesCode: sample.speciesCode,
        treatmentCode: sample.treatmentCode, date: dateAfter(values.startDate, event.day),
      };
    });
    const endDate = dateAfter(values.startDate, values.durationDays);
    return {
      record: {
        ...existing, code: values.code, name: values.name, events,
        design: {
          startDate: values.startDate, durationDays: values.durationDays, endDate,
          hasControl: values.hasControl, treatmentCount: values.treatmentCount,
          replicates: values.replicates, seedsPerReplicate: values.seedsPerReplicate,
          totalSeeds: values.species.length * values.treatmentDefinitions.length * values.replicates * values.seedsPerReplicate,
          species,
        },
      },
      removedUnits: removedUnitsWithHistory.size,
      removedMeasurements: removedDailyRecords.size,
    };
  }

  async function renderDetail(root, id, { navigate, toast, confirm }) {
    const experiment = await DB.getExperiment(id);
    if (!experiment) { toast('No se encontró el experimento', 'error'); navigate('experiments'); return; }
    root.innerHTML = `
      <main class="experiment-screen"><header class="experiment-header"><button class="btn-icon" data-back aria-label="Volver">←</button><div class="experiment-header-copy"><div class="experiment-title">${escapeHtml(experiment.code)}</div><div class="header-subtitle">${escapeHtml(experiment.name)}</div></div>
        <details class="experiment-actions-menu"><summary aria-label="Abrir menú de acciones" title="Acciones"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></summary><div class="experiment-actions-panel">
          <button type="button" data-edit>Editar diseño</button>
          <button type="button" data-export>Exportar CSV completo</button>
          <button type="button" data-export-xlsx>Generar Excel</button>
          <button type="button" data-export-json>Respaldar experimento (JSON)</button>
          <button type="button" data-export-labels>Generar PDF de códigos individuales</button>
        </div></details>
      </header>
        <section class="experiment-content">
          <div class="experiment-summary"><span class="experiment-local-status">● Solo en este dispositivo · Sin sincronizar</span><h2>Diseño del experimento</h2>
            <p>Inicio: ${localDate(experiment.design.startDate)} · Fin: ${localDate(experiment.design.endDate)} (${experiment.design.durationDays} días)</p>
            <p>${experiment.design.species.length} ${experiment.design.species.length === 1 ? 'especie' : 'especies'} · ${experiment.design.totalSeeds.toLocaleString('es-EC')} semillas · ${experiment.design.hasControl ? 'Incluye control' : 'Sin control'}</p>
          </div>
      ${experiment.design.species.map((species) => `<section class="experiment-species-panel"><h2>${escapeHtml(species.name)} <small>(${escapeHtml(species.abbreviation)})</small></h2><div class="experiment-treatment-list">${species.treatments.map((treatment) => `<button class="experiment-treatment" data-matrix="${escapeHtml(species.abbreviation)}|${escapeHtml(treatment.code)}"><strong>${canonicalTreatmentCode(treatment, treatmentPosition(species, treatment))} · ${escapeHtml(treatment.name)}</strong><span>${treatment.samples.length} semillas · ${treatment.repetitions} repeticiones</span><span class="experiment-treatment-count">${countTreatment(treatment).emergio} emergidas</span></button>`).join('')}</div>${speciesHasRecordedData(species) ? `<button class="btn btn-primary btn-sm experiment-feature-action experiment-mortality-trigger" data-mortality="${escapeHtml(species.abbreviation)}">Generar gráfica</button>` : ''}</section>`).join('')}
          <button type="button" class="btn ${experiment.isCompleted ? 'btn-ghost' : 'btn-success'} btn-full experiment-completion" data-completion>${experiment.isCompleted ? 'Marcar como parcial' : 'Marcar experimento como completado'}</button>
        </section></main>`;
    root.querySelector('[data-back]').addEventListener('click', () => navigate('experiments'));
    root.querySelector('[data-completion]').addEventListener('click', async () => {
      await DB.updateExperiment(id, {isCompleted: !experiment.isCompleted});
      toast(experiment.isCompleted ? 'Experimento marcado como parcial' : 'Experimento completado', 'success');
      await renderDetail(root, id, {navigate, toast, confirm});
    });
    root.querySelectorAll('[data-matrix]').forEach((button) => button.addEventListener('click', () => {
      const [species, treatment] = button.dataset.matrix.split('|');
      navigate('experiment-matrix', { id, species, treatment });
    }));
    root.querySelectorAll('[data-mortality]').forEach((button) => button.addEventListener('click', () => navigate('experiment-mortality', { id, species: button.dataset.mortality })));
    const actionsMenu = root.querySelector('.experiment-actions-menu');
    root.querySelector('[data-export]').addEventListener('click', () => { actionsMenu.open = false; exportExperimentCsv(experiment); });
    root.querySelector('[data-export-xlsx]').addEventListener('click', () => { actionsMenu.open = false; exportExperimentXlsx(experiment); });
    root.querySelector('[data-export-json]').addEventListener('click', () => {
      actionsMenu.open = false;
      try { exportExperimentJson(experiment); toast('Respaldo JSON del experimento generado', 'success'); }
      catch (error) { console.error(error); toast('No se pudo generar el respaldo JSON', 'error'); }
    });
    root.querySelector('[data-export-labels]').addEventListener('click', () => {
      actionsMenu.open = false;
      try { exportSampleLabelsPdf(experiment); toast('PDF de códigos individuales generado', 'success'); }
      catch (error) { console.error(error); toast('No se pudo generar el PDF de códigos', 'error'); }
    });
    root.querySelector('[data-edit]')?.addEventListener('click', () => { actionsMenu.open = false; renderCreate(root, { navigate, toast, confirm, existing: experiment }); });
  }

  function speciesHasRecordedData(species) {
    return species.treatments.some((treatment) => treatment.samples.some((sample) =>
      Array.isArray(sample.values) && sample.values.some((value) => value !== null && value !== undefined && value !== '')));
  }

  function mortalitySummary(species) {
    return species.treatments.map((treatment) => {
      const n = treatment.samples.length;
      const deaths = treatment.samples.filter((sample) => sample.values?.includes('M')).length;
      const repetitionRates = [...new Set(treatment.samples.map((sample) => sample.repetition))].map((repetition) => {
        const units = treatment.samples.filter((sample) => sample.repetition === repetition);
        const dead = units.filter((sample) => sample.values?.includes('M')).length;
        return units.length ? (dead / units.length) * 100 : 0;
      });
      const mean = repetitionRates.length ? repetitionRates.reduce((sum, value) => sum + value, 0) / repetitionRates.length : 0;
      const deviation = repetitionRates.length > 1
        ? Math.sqrt(repetitionRates.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (repetitionRates.length - 1))
        : null;
      return {
        treatment, code: canonicalTreatmentCode(treatment), n, deaths,
        mortality: n ? (deaths / n) * 100 : 0,
        registered: treatment.samples.filter((sample) => Array.isArray(sample.values) && sample.values.some((value) => value !== null && value !== undefined && value !== '')).length,
        deviation, repetitions: repetitionRates.length,
      };
    });
  }

  function mortalitySvg(summary, species, experiment) {
    const width = 1000, height = 640;
    const plot = { x: 112, y: 128, width: 842, height: 382 };
    const baseline = plot.y + plot.height;
    const band = plot.width / Math.max(summary.length, 1);
    const barWidth = Math.min(62, band * 0.58);
    const grid = Array.from({ length: 11 }, (_, index) => {
      const value = index * 10;
      const y = baseline - (value / 100) * plot.height;
      return `<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.width}" y2="${y}" class="chart-grid"/><text x="${plot.x - 14}" y="${y + 5}" text-anchor="end" class="chart-tick">${value}</text>`;
    }).join('');
    const bars = summary.map((item, index) => {
      const center = plot.x + band * (index + 0.5);
      const barHeight = (item.mortality / 100) * plot.height;
      const y = baseline - barHeight;
      const pct = `${item.mortality.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%`;
      const treatmentIndex = treatmentPosition(species, item.treatment);
      const code = canonicalTreatmentCode(item.treatment, treatmentIndex);
      return `<g><title>${escapeHtml(code)} · ${escapeHtml(item.treatment.name)}: ${pct} (${item.deaths}/${item.n} semillas)</title><rect x="${center - barWidth / 2}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" class="chart-bar"/><text x="${center}" y="${Math.max(plot.y + 20, y - 10)}" text-anchor="middle" class="chart-value">${pct}</text><text x="${center}" y="${baseline + 28}" text-anchor="middle" class="chart-category">${escapeHtml(code)}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mortalidad observada de ${escapeHtml(species.name)} por tratamiento"><style>text{font-family:Arial,Helvetica,sans-serif;fill:#172033}.chart-title{font-size:30px;font-weight:700}.chart-subtitle{font-size:16px;fill:#536174}.chart-grid{stroke:#d9e0e8;stroke-width:1}.chart-axis{stroke:#344054;stroke-width:2}.chart-tick{font-size:14px;fill:#475467}.chart-bar{fill:#5b94b4}.chart-value{font-size:14px;font-weight:700}.chart-category{font-size:15px;font-weight:700}.chart-axis-label{font-size:18px;font-weight:600}.chart-legend{font-size:16px;fill:#344054}</style><rect width="100%" height="100%" fill="#fff"/><text x="${width / 2}" y="48" text-anchor="middle" class="chart-title">Mortalidad observada · <tspan font-style="italic">${escapeHtml(species.name)}</tspan></text><text x="${width / 2}" y="76" text-anchor="middle" class="chart-subtitle">${escapeHtml(experiment.code)} · Mortalidad por tratamiento</text><rect x="${plot.x}" y="94" width="18" height="18" rx="2" class="chart-bar"/><text x="${plot.x + 27}" y="109" class="chart-legend">Mortalidad observada</text>${grid}<line x1="${plot.x}" y1="${plot.y}" x2="${plot.x}" y2="${baseline}" class="chart-axis"/><line x1="${plot.x}" y1="${baseline}" x2="${plot.x + plot.width}" y2="${baseline}" class="chart-axis"/><text transform="translate(31 ${plot.y + plot.height / 2}) rotate(-90)" text-anchor="middle" class="chart-axis-label">Mortalidad reportada (%)</text>${bars}<text x="${plot.x + plot.width / 2}" y="${height - 42}" text-anchor="middle" class="chart-axis-label">Tratamiento</text></svg>`;
  }

  async function renderMortality(root, { id, species: speciesCode }, { navigate, toast }) {
    const experiment = await DB.getExperiment(id);
    const species = experiment?.design.species.find((item) => item.abbreviation === speciesCode);
    if (!experiment || !species) { toast('No se encontró la gráfica solicitada', 'error'); navigate('experiments'); return; }
    const summary = mortalitySummary(species);
    const svg = mortalitySvg(summary, species, experiment);
    const percent = (value) => `${value.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%`;
    root.innerHTML = `
      <main class="experiment-screen experiment-mortality-screen"><header class="experiment-header"><button class="btn-icon" data-back aria-label="Volver al experimento">←</button><div class="experiment-header-copy"><div class="experiment-title">Mortalidad observada</div><div class="header-subtitle">${escapeHtml(species.name)} · ${escapeHtml(experiment.code)}</div></div></header>
        <section class="experiment-content mortality-content"><div class="mortality-chart-card">${svg}</div>
          <section class="mortality-summary"><h2>Resumen por tratamiento</h2><div class="mortality-table-scroll"><table class="mortality-table"><thead><tr><th>Código</th><th>Tratamiento</th><th>Semillas (n)</th><th>Con datos</th><th>Muertas</th><th>Mortalidad</th><th>DE entre repeticiones</th><th>Repeticiones</th></tr></thead><tbody>${summary.map((item) => `<tr><td><strong>${escapeHtml(canonicalTreatmentCode(item.treatment, treatmentPosition(species, item.treatment)))}</strong></td><td>${escapeHtml(item.treatment.name)}</td><td>${item.n}</td><td>${item.registered}</td><td>${item.deaths}</td><td>${percent(item.mortality)}</td><td>${item.deviation === null ? '—' : percent(item.deviation)}</td><td>${item.repetitions}</td></tr>`).join('')}</tbody></table></div><p class="mortality-method-note">Una semilla se cuenta como muerta si registra M en cualquier día. El porcentaje corresponde a semillas muertas sobre el total diseñado; la DE resume la variación entre repeticiones.</p></section>
          <footer class="mortality-export-actions"><button class="btn btn-primary btn-sm experiment-feature-action" data-export-png>Descargar PNG</button><button class="btn btn-primary btn-sm experiment-feature-action" data-export-pdf>Descargar PDF</button></footer>
        </section>
      </main>`;
    root.querySelector('[data-back]').addEventListener('click', () => navigate('experiment', { id }));
    root.querySelector('[data-export-png]').addEventListener('click', async () => {
      try { await exportMortalityPng(svg, `${experiment.code}_${species.abbreviation}`); toast('Gráfica PNG guardada a 600 dpi', 'success'); }
      catch (error) { console.error(error); toast('No se pudo generar el PNG', 'error'); }
    });
    root.querySelector('[data-export-pdf]').addEventListener('click', () => {
      try { exportMortalityPdf(summary, species, experiment); toast('PDF de mortalidad generado', 'success'); }
      catch (error) { console.error(error); toast('No se pudo generar el PDF', 'error'); }
    });
  }

  function safeFilename(value) {
    return String(value || 'Experimento').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  }

  function exportSampleLabelsPdf(experiment) {
    const labels = experiment.design.species.flatMap((species) => species.treatments.flatMap((treatment) =>
      treatment.samples.map((sample) => ({
        code: sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)),
      }))));
    if (!labels.length) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const columns = 7, rows = 10, pageCapacity = columns * rows, margin = 5;
    const pageWidth = 210, pageHeight = 297;
    const cellWidth = (pageWidth - margin * 2) / columns;
    const cellHeight = (pageHeight - margin * 2) / rows;
    doc.setDrawColor(110, 120, 132);
    doc.setLineWidth(0.3);
    labels.forEach((label, index) => {
      const pageIndex = Math.floor(index / pageCapacity);
      if (pageIndex > 0 && index % pageCapacity === 0) doc.addPage('a4', 'portrait');
      const cellIndex = index % pageCapacity;
      const x = margin + (cellIndex % columns) * cellWidth;
      const y = margin + Math.floor(cellIndex / columns) * cellHeight;
      doc.rect(x, y, cellWidth, cellHeight);
      doc.setFont('helvetica', 'bold');
      let fontSize = 11;
      doc.setFontSize(fontSize);
      while (fontSize > 6 && doc.getTextWidth(label.code) > cellWidth - 4) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
      }
      doc.setTextColor(28, 36, 52);
      doc.text(label.code, x + cellWidth / 2, y + cellHeight / 2 + 1, { align: 'center' });
    });
    doc.save(`Etiquetas_${safeFilename(experiment.code)}.pdf`);
  }

  function crc32Bytes(bytes) {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ -1) >>> 0;
  }

  function pngChunk(type, data) {
    const typeBytes = new TextEncoder().encode(type);
    const chunk = new Uint8Array(12 + data.length);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length, false);
    chunk.set(typeBytes, 4);
    chunk.set(data, 8);
    view.setUint32(8 + data.length, crc32Bytes(chunk.subarray(4, 8 + data.length)), false);
    return chunk;
  }

  async function addPngDpi(blob, dpi) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pixelsPerMeter = Math.round(dpi / 0.0254);
    const resolution = new Uint8Array(9);
    const resolutionView = new DataView(resolution.buffer);
    resolutionView.setUint32(0, pixelsPerMeter, false);
    resolutionView.setUint32(4, pixelsPerMeter, false);
    resolutionView.setUint8(8, 1);
    const parts = [bytes.subarray(0, 8)];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8, inserted = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset, false);
      const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
      const end = offset + 12 + length;
      if (end > bytes.length) throw new Error('Invalid PNG chunk');
      if (type !== 'pHYs') parts.push(bytes.subarray(offset, end));
      if (type === 'IHDR') { parts.push(pngChunk('pHYs', resolution)); inserted = true; }
      offset = end;
      if (type === 'IEND') break;
    }
    if (!inserted) throw new Error('PNG header not found');
    return new Blob(parts, { type: 'image/png' });
  }

  async function exportMortalityPng(svg, filenameBase) {
    const scaleWidth = 5400;
    const scaleHeight = Math.round(scaleWidth * (640 / 1000));
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const sourceUrl = URL.createObjectURL(svgBlob);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Could not render chart SVG'));
        image.src = sourceUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = scaleWidth;
      canvas.height = scaleHeight;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const raster = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
      const png = await addPngDpi(raster, 600);
      const url = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mortalidad_${safeFilename(filenameBase)}_600dpi.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      canvas.width = 0;
      canvas.height = 0;
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  function exportMortalityPdf(summary, species, experiment) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const plot = { x: 30, y: 48, width: 252, height: 112 };
    const baseline = plot.y + plot.height;
    const band = plot.width / Math.max(summary.length, 1);
    const barWidth = Math.min(17, band * 0.58);
    doc.setTextColor(24, 32, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(`Mortalidad observada - ${species.name}`, pageWidth / 2, 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(83, 97, 116);
    doc.text(`${experiment.code} · Mortalidad por tratamiento`, pageWidth / 2, 25, { align: 'center' });
    doc.setFillColor(91, 148, 180);
    doc.roundedRect(plot.x, 31, 5, 5, 1, 1, 'F');
    doc.setTextColor(52, 64, 84);
    doc.text('Mortalidad observada', plot.x + 8, 35);
    doc.setFontSize(8);
    for (let value = 0; value <= 100; value += 10) {
      const y = baseline - (value / 100) * plot.height;
      doc.setDrawColor(218, 224, 232);
      doc.setLineWidth(0.25);
      doc.line(plot.x, y, plot.x + plot.width, y);
      doc.setTextColor(71, 84, 103);
      doc.text(String(value), plot.x - 4, y + 1, { align: 'right' });
    }
    doc.setDrawColor(52, 64, 84);
    doc.setLineWidth(0.6);
    doc.line(plot.x, plot.y, plot.x, baseline);
    doc.line(plot.x, baseline, plot.x + plot.width, baseline);
    doc.setFontSize(10);
    doc.text('Mortalidad reportada (%)', 11, plot.y + plot.height / 2, { angle: 90, align: 'center' });
    summary.forEach((item, index) => {
      const center = plot.x + band * (index + 0.5);
      const height = (item.mortality / 100) * plot.height;
      doc.setFillColor(91, 148, 180);
      doc.roundedRect(center - barWidth / 2, baseline - height, barWidth, Math.max(height, 0.1), 1, 1, 'F');
      doc.setFontSize(8);
      doc.setTextColor(24, 32, 48);
      doc.text(`${item.mortality.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%`, center, Math.max(plot.y - 2, baseline - height - 3), { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(canonicalTreatmentCode(item.treatment, treatmentPosition(species, item.treatment)), center, baseline + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    doc.setFontSize(10);
    doc.text('Tratamiento', plot.x + plot.width / 2, baseline + 17, { align: 'center' });

    doc.addPage('a4', 'landscape');
    doc.setTextColor(24, 32, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('Resumen por tratamiento', 14, 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${species.name} · ${experiment.code}`, 14, 26);
    doc.autoTable({
      startY: 34,
      head: [['Código', 'Tratamiento', 'Semillas (n)', 'Con datos', 'Muertas', 'Mortalidad (%)', 'DE entre repeticiones', 'Repeticiones']],
      body: summary.map((item) => [
        canonicalTreatmentCode(item.treatment, treatmentPosition(species, item.treatment)), item.treatment.name,
        item.n, item.registered, item.deaths,
        item.mortality.toLocaleString('es-EC', { maximumFractionDigits: 1 }),
        item.deviation === null ? '—' : item.deviation.toLocaleString('es-EC', { maximumFractionDigits: 1 }), item.repetitions,
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: [36, 48, 66] },
      headStyles: { fillColor: [39, 104, 151], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [242, 246, 250] },
      margin: { left: 14, right: 14 },
    });
    doc.setFontSize(9);
    doc.setTextColor(83, 97, 116);
    doc.text('Mortalidad observada: semillas con M en cualquier día / total de semillas diseñadas × 100.', 14, Math.min((doc.lastAutoTable?.finalY || 40) + 10, 200));
    doc.save(`Mortalidad_${safeFilename(experiment.code)}_${safeFilename(species.abbreviation)}.pdf`);
  }

  async function renderMatrix(root, { id, species: speciesCode, treatment: treatmentCode }, { navigate, toast, confirm }) {
    let experiment = await DB.getExperiment(id);
    const species = experiment?.design.species.find((item) => item.abbreviation === speciesCode);
    const treatment = species?.treatments.find((item) => item.code === treatmentCode);
    if (!experiment || !treatment) { toast('No se encontró la tabla solicitada', 'error'); navigate('experiments'); return; }
    const days = Array.from({ length: experiment.design.durationDays + 1 }, (_, index) => index);
    if (days.length * treatment.samples.length > 50000) { toast('La matriz supera el límite visual local de 50 000 celdas', 'error'); navigate('experiment', { id }); return; }
    const dateHeaders = days.map((day) => `<th><span>Día ${day}</span><small>${localDate(dateAfter(experiment.design.startDate, day))}</small></th>`).join('');
    root.innerHTML = `
      <main class="experiment-screen experiment-matrix-screen"><header class="experiment-header"><button class="btn-icon" data-back aria-label="Volver">←</button><div><div class="experiment-title">${escapeHtml(species.name)} · ${escapeHtml(treatment.name)}</div><div class="header-subtitle">${escapeHtml(experiment.code)} · ${treatment.samples.length} unidades</div></div><button class="btn btn-ghost btn-sm" data-export>CSV</button></header>
        <div class="experiment-matrix-help">·: Sin registro · S: Siembra · 1: Emergió · 0: No emergió · M: Murió · O: En observación</div>
        <div class="experiment-matrix-scroll"><table class="experiment-matrix"><thead><tr><th class="sample-column">Muestra / repetición</th>${dateHeaders}</tr></thead><tbody>${treatment.samples.map((sample) => `<tr><th class="sample-column"><strong>${escapeHtml(sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)))}</strong><small>Repetición ${sample.repetition} · Unidad ${sample.unit}</small></th>${days.map((day) => {
          const value = sample.values[day] ?? '';
          const status = STATUS[value]?.state || 'pendiente';
          return `<td class="matrix-cell state-${status}"><select aria-label="${escapeHtml(sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)))}, día ${day}" data-sample="${escapeHtml(sample.uuid)}" data-day="${day}" data-prev="${escapeHtml(value)}"><option value="" ${value === '' ? 'selected' : ''}>·</option><option value="S" ${value === 'S' ? 'selected' : ''}>Siembra</option><option value="0" ${value === '0' ? 'selected' : ''}>0</option><option value="1" ${value === '1' ? 'selected' : ''}>1</option><option value="M" ${value === 'M' ? 'selected' : ''}>M</option><option value="O" ${value === 'O' ? 'selected' : ''} ${sample.values.slice(0, day).includes('M') ? 'disabled' : ''}>O · Observación</option></select></td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div>
        <footer class="experiment-matrix-footer"><span>🟦 Siembra</span><span>🟩 Emergió</span><span>🟥 Murió</span><span>🟨 Observación</span><span>⬜ Sin emergencia</span><span>· Pendiente</span></footer>
      </main>`;
    root.querySelector('[data-back]').addEventListener('click', () => navigate('experiment', { id }));
    root.querySelector('[data-export]').addEventListener('click', () => exportTreatmentCsv(experiment, species, treatment));
    let saveQueue = Promise.resolve();
    root.querySelectorAll('[data-sample]').forEach((select) => select.addEventListener('change', async () => {
      const sample = treatment.samples.find((item) => item.uuid === select.dataset.sample);
      const day = Number(select.dataset.day);
      const previous = select.dataset.prev;
      const next = select.value;
      if (next === '1' && !sample.values.slice(0, day).includes('S')) {
        select.value = previous;
        toast('Registra Siembra en una fecha anterior antes de marcar Emergió', 'warning');
        return;
      }
      if (next === 'O' && sample.values.slice(0, day).includes('M')) {
        select.value = previous;
        toast('No se puede registrar observación después de la muerte', 'warning');
        return;
      }
      if (next === 'M' && sample.values.slice(day + 1).includes('O')) {
        select.value = previous;
        toast('No se puede declarar muerte si hay una observación posterior', 'warning');
        return;
      }
      if (['1', '0', 'M'].includes(next) && sample.values.some((value, index) => index !== day && value === next)) {
        select.value = previous;
        toast(`El valor ${next} solo puede registrarse una vez en la fila de esta unidad`, 'warning');
        return;
      }
      if (next === '1' && sample.values.slice(0, day).includes('M')) {
        select.value = previous;
        toast('No se puede registrar una emergencia después de la fecha de muerte', 'warning');
        return;
      }
      if (next === 'M' && sample.values.slice(day + 1).includes('1')) {
        select.value = previous;
        toast('No se puede declarar muerte si hay una emergencia registrada en una fecha posterior', 'warning');
        return;
      }
      if (next === 'S' && sample.values.some((value, index) => index !== day && value === 'S')) {
        select.value = previous;
        toast('La semilla ya tiene una fecha de siembra registrada', 'warning');
        return;
      }
      if (next === 'M' && !sample.values.slice(0, day + 1).some((value) => value === '1' || value === 'M')) {
        const accepted = await confirm('Mortalidad antes de emergencia', `La muestra <strong>${escapeHtml(sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)))}</strong> no tiene un registro previo de emergencia. ¿Guardar de todos modos?`);
        if (!accepted) { select.value = previous; return; }
      }
      sample.values[day] = next || null;
      select.closest('tr').querySelectorAll('select[data-sample]').forEach((daySelect) => {
        const observationOption = daySelect.querySelector('option[value="O"]');
        observationOption.disabled = sample.values.slice(0, Number(daySelect.dataset.day)).includes('M');
      });
      experiment.events.push({ id: DB.newId(), sampleId: sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)), sampleUuid: sample.uuid, speciesCode, treatmentCode, day, date: dateAfter(experiment.design.startDate, day), state: STATUS[next].state, value: next || null, updatedAt: new Date().toISOString(), origin: 'local' });
      select.dataset.prev = next;
      select.closest('td').className = `matrix-cell state-${STATUS[next].state}`;
      saveQueue = saveQueue.catch(() => undefined).then(() => DB.updateExperiment(id, experiment));
      try { await saveQueue; toast('Registro guardado localmente'); }
      catch (error) { console.error(error); toast('No se pudo guardar el cambio', 'error'); }
    }));
  }

  function countTreatment(treatment) {
    return treatment.samples.reduce((counts, sample) => {
      if (sample.values.includes('S')) counts.sembradas++;
      const recorded = sample.values.filter((value) => value !== null && value !== undefined);
      const latest = recorded[recorded.length - 1] || '';
      const state = STATUS[latest]?.state || 'pendiente';
      counts[state === 'siembra' ? 'pendiente' : state]++;
      return counts;
    }, { pendiente: 0, sembradas: 0, no_emergio: 0, emergio: 0, murio: 0, observacion: 0 });
  }

  function countStatuses(experiment) {
    return experiment.design.species.flatMap((species) => species.treatments).reduce((total, treatment) => {
      const counts = countTreatment(treatment);
      Object.keys(total).forEach((key) => { total[key] += counts[key]; });
      return total;
    }, { pendiente: 0, sembradas: 0, no_emergio: 0, emergio: 0, murio: 0, observacion: 0 });
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function treatmentCsvRows(experiment, species, treatment) {
    const rows = [['id_muestra', 'especie', 'tratamiento', 'repeticion', 'unidad', 'fecha', 'estado', 'valor', 'actualizado_por', 'actualizado_en', 'origen']];
    treatment.samples.forEach((sample) => Array.from({ length: experiment.design.durationDays + 1 }, (_, day) => day).forEach((day) => {
      const value = sample.values[day] ?? '';
      const latestEvent = [...experiment.events].reverse().find((event) => event.sampleUuid === sample.uuid && event.day === day);
      rows.push([sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)), species.name, treatment.name, sample.repetition, sample.unit,
        dateAfter(experiment.design.startDate, day), STATUS[value].state, value, 'local', latestEvent?.updatedAt || experiment.createdAt, latestEvent?.origin || 'local']);
    }));
    return rows;
  }

  function downloadCsv(filename, rows) {
    const text = `\uFEFF${rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportTreatmentCsv(experiment, species, treatment) {
    downloadCsv(`${experiment.code}_${species.abbreviation}_${canonicalTreatmentCode(treatment, treatmentPosition(species, treatment))}.csv`, treatmentCsvRows(experiment, species, treatment));
  }

  function exportExperimentCsv(experiment) {
    const rows = [['id_muestra', 'especie', 'tratamiento', 'repeticion', 'unidad', 'fecha', 'estado', 'valor', 'actualizado_por', 'actualizado_en', 'origen']];
    experiment.design.species.forEach((species) => species.treatments.forEach((treatment) => {
      rows.push(...treatmentCsvRows(experiment, species, treatment).slice(1));
    }));
    downloadCsv(`${experiment.code}_completo.csv`, rows);
  }

  function exportExperimentJson(experiment) {
    const backup = {
      format: 'ficharium-experiment-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      experiment,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFilename(experiment.code)}_respaldo.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportExperimentXlsx(experiment) {
    const counts = countStatuses(experiment);
    const sheets = [{ name: 'Resumen', rows: [
      [{ value: 'RESUMEN DEL EXPERIMENTO', style: 1 }],
      ['Código', experiment.code], ['Nombre', experiment.name],
      ['Inicio', experiment.design.startDate], ['Fecha final', experiment.design.endDate],
      ['Duración (días)', experiment.design.durationDays], ['Total de semillas', experiment.design.totalSeeds],
      ['Especies', experiment.design.species.length], ['Control', experiment.design.hasControl ? 'Sí' : 'No'],
      ['Sembradas', counts.sembradas], ['Emergidas', counts.emergio], ['Muertas', counts.murio], ['No emergieron', counts.no_emergio], ['En observación', counts.observacion], ['Pendientes', counts.pendiente],
      [{ value: 'Especie', style: 1 }, { value: 'Abreviatura', style: 1 }, { value: 'Tratamiento', style: 1 }, { value: 'Código', style: 1 }, { value: 'Repeticiones', style: 1 }, { value: 'Semillas/repetición', style: 1 }, { value: 'Semillas totales', style: 1 }],
      ...experiment.design.species.flatMap((species) => species.treatments.map((treatment) => [species.name, species.abbreviation, treatment.name, canonicalTreatmentCode(treatment, treatmentPosition(species, treatment)), treatment.repetitions, treatment.seedsPerRepetition, treatment.samples.length])),
    ] }];

    experiment.design.species.forEach((species) => species.treatments.forEach((treatment) => {
      const dayHeaders = Array.from({ length: experiment.design.durationDays + 1 }, (_, day) => ({ value: `Día ${day}\n${localDate(dateAfter(experiment.design.startDate, day))}`, style: 1 }));
      const rows = [[{ value: 'Muestra', style: 1 }, { value: 'Siembra', style: 1 }, ...dayHeaders]];
      treatment.samples.forEach((sample) => {
        const values = sample.values.map((value) => {
          if (value === 'S') return { value: 'S', style: 5 };
          if (value === '1') return { value: 1, style: 2 };
          if (value === 'M') return { value: 'M', style: 3 };
          if (value === '0') return { value: 0, style: 4 };
          if (value === 'O') return { value: 'Obs', style: 6 };
          return { value: '', style: 4 };
        });
        const sowingDay = sample.values.findIndex((value) => value === 'S');
        rows.push([{ value: sampleIdentifier(sample, treatment, treatmentPosition(species, treatment)) }, { value: sowingDay >= 0 ? dateAfter(experiment.design.startDate, sowingDay) : '' }, ...values]);
      });
      sheets.push({ name: `${species.abbreviation}_${canonicalTreatmentCode(treatment, treatmentPosition(species, treatment))}`, rows });
    }));

    const blob = XlsxWorkbook.build(sheets);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${experiment.code}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { hasAccess, renderAccess, render, renderDetail, renderMatrix, renderMortality };
})();
