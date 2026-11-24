/**
 * PDF generation for Ficha Técnica de Medición
 * Yes/No values use colored cells (no Unicode) for universal PDF compatibility
 */
const PDFGen = (() => {

  const COLORS = {
    titleBg:    [255, 192, 0],
    titleText:  [255, 255, 255],
    secBg:      [46, 117, 182],
    sec5Bg:     [0, 176, 240],
    secText:    [255, 255, 255],
    gridBorder: [180, 198, 220],
    labelBg:    [221, 235, 247],
    labelText:  [31, 73, 125],
    valueText:  [0, 0, 0],
    yesGreenBg: [198, 239, 206],
    yesGreenTx: [0, 97, 0],
    noRedBg:    [255, 199, 206],
    noRedTx:    [156, 0, 6],
    noneBg:     [242, 242, 242],
    noneTx:     [140, 140, 140],
    footerText: [120, 120, 120],
  };

  // Returns a styled autoTable cell reflecting a yes/no/unset value
  function ynCell(val, extraStyles = {}) {
    if (val === true)  return { content: 'SÍ',  styles: { fillColor: COLORS.yesGreenBg, textColor: COLORS.yesGreenTx, fontStyle: 'bold', halign: 'center', ...extraStyles } };
    if (val === false) return { content: 'NO',  styles: { fillColor: COLORS.noRedBg,    textColor: COLORS.noRedTx,    fontStyle: 'bold', halign: 'center', ...extraStyles } };
    return               { content: '—',   styles: { fillColor: COLORS.noneBg,      textColor: COLORS.noneTx,     halign: 'center', ...extraStyles } };
  }

  function labelCell(text, colSpan) {
    const cell = { content: text, styles: { fillColor: COLORS.labelBg, textColor: COLORS.labelText, fontStyle: 'bold' } };
    if (colSpan) cell.colSpan = colSpan;
    return cell;
  }

  function valueCell(text, colSpan) {
    const cell = { content: text ?? '—' };
    if (colSpan) cell.colSpan = colSpan;
    return cell;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${months[parseInt(m)-1]} ${y}`;
  }

  function formatTime(t) { return t || '—'; }

  // Normalize aguaTipo: supports old array format and new object format
  function getAguaTipo(ficha, key) {
    const at = ficha.aguaTipo;
    if (!at) return null;
    if (Array.isArray(at)) return at.includes(key) ? true : null;
    const v = at[key];
    return v === true ? true : v === false ? false : null;
  }

  function aguaTipoSummary(ficha) {
    const corriendo = getAguaTipo(ficha, 'corriendo');
    const estancada = getAguaTipo(ficha, 'estancada');
    const parts = [];
    if (corriendo === true)  parts.push('Corriendo');
    if (estancada === true)  parts.push('Estancada');
    if (parts.length) return parts.join(' + ');
    if (corriendo === false && estancada === false) return 'Ninguno';
    return '—';
  }

  const TABLE_STYLES = {
    fontSize: 9.5,
    cellPadding: 3,
    lineColor: COLORS.gridBorder,
    lineWidth: 0.3,
    textColor: COLORS.valueText,
    valign: 'middle',
  };

  const COL_STYLES = {
    0: { cellWidth: 40 },
    1: { cellWidth: 'auto' },
    2: { cellWidth: 40 },
    3: { cellWidth: 'auto' },
  };

  const OPTION_LABELS = {
    tipologiaConstruccion: { casa: 'Casa', condominio: 'Condominio', edificio: 'Edificio', otro: 'Otro' },
    posicionPisoBajo: {
      sobre_terreno: 'Sobre el terreno',
      bajo_terreno: 'Bajo el terreno',
      semienterrado: 'Semienterrado',
      sobre_columnas: 'Sobre columnas',
      enterrado_lateral: 'Enterrado o semienterrado en alguno de sus lados',
      otro: 'Otro',
    },
    usoSotano: { cimiento: 'Cimiento', bodega_garaje: 'Bodega/Garaje', ventilacion: 'Lugar de ventilación', trabajo: 'Lugar de trabajo', otro: 'Otro' },
    tipoEspacio: { dormitorio: 'Dormitorio', sala: 'Sala', estudio_laboratorio: 'Estudio/Laboratorio', otro: 'Otro' },
    pisoMedicion: { planta_baja: 'Planta baja', numero: 'Número de piso' },
  };

  function selectedLabel(group, value, otherValue = '') {
    if (!value) return '—';
    const label = OPTION_LABELS[group]?.[value] || value;
    return value === 'otro' && otherValue ? `${label}: ${otherValue}` : label;
  }

  function listSummary(value) {
    if (Array.isArray(value) && value.length) return value.join(', ');
    if (typeof value === 'string' && value.trim()) return value.trim();
    return '—';
  }

  function safeFilenamePart(value, fallback) {
    const normalized = String(value || fallback)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || fallback;
  }

  function drawGroundPosition(doc, type, x, y, w, h) {
    if (!OPTION_LABELS.posicionPisoBajo[type]) return;
    const sx = (value) => x + (value / 320) * w;
    const sy = (value) => y + (value / 160) * h;
    const sw = (value) => (value / 320) * w;
    const sh = (value) => (value / 160) * h;

    doc.setFillColor(247, 250, 255);
    doc.setDrawColor(...COLORS.gridBorder);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');

    const earthRect = (top, height) => {
      doc.setFillColor(255, 244, 214);
      doc.roundedRect(sx(20), sy(top), sw(280), sh(height), 1.5, 1.5, 'F');
      doc.setDrawColor(214, 158, 24);
      doc.setLineWidth(0.8);
      doc.line(sx(20), sy(top), sx(300), sy(top));
    };
    const house = (bodyY, bodyH, highlightTop = null) => {
      doc.setFillColor(221, 235, 247);
      doc.setDrawColor(46, 117, 182);
      doc.setLineWidth(0.8);
      doc.triangle(sx(102), sy(bodyY), sx(160), sy(bodyY - 38), sx(218), sy(bodyY), 'FD');
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(sx(112), sy(bodyY), sw(96), sh(bodyH), 1.2, 1.2, 'FD');
      doc.setDrawColor(...COLORS.gridBorder);
      doc.line(sx(112), sy(bodyY + bodyH / 2), sx(208), sy(bodyY + bodyH / 2));
      doc.setFillColor(224, 247, 232);
      doc.setDrawColor(74, 180, 105);
      doc.rect(sx(130), sy(bodyY + 13), sw(16), sh(14), 'FD');
      doc.rect(sx(174), sy(bodyY + 13), sw(16), sh(14), 'FD');
      if (highlightTop !== null) {
        doc.setFillColor(255, 235, 184);
        doc.setDrawColor(214, 158, 24);
        doc.rect(sx(112), sy(highlightTop), sw(96), sy(bodyY + bodyH) - sy(highlightTop), 'FD');
      }
    };

    if (type === 'sobre_terreno') {
      earthRect(116, 28);
      house(54, 62, 85);
    } else if (type === 'bajo_terreno') {
      earthRect(86, 58);
      house(34, 92, 86);
    } else if (type === 'semienterrado') {
      earthRect(103, 41);
      house(38, 88, 82);
    } else if (type === 'sobre_columnas') {
      earthRect(132, 12);
      house(42, 60);
      doc.setDrawColor(46, 117, 182);
      doc.setLineWidth(1.8);
      [126, 160, 194].forEach((columnX) => doc.line(sx(columnX), sy(102), sx(columnX), sy(132)));
    } else if (type === 'enterrado_lateral') {
      doc.setFillColor(255, 244, 214);
      doc.setDrawColor(214, 158, 24);
      doc.setLineWidth(0.8);
      doc.lines([
        [sw(75), 0], [sw(55), -sh(30)], [sw(150), 0], [0, sh(58)], [-sw(280), 0],
      ], sx(20), sy(116), [1, 1], 'FD', true);
      house(38, 88, 82);
    } else if (type === 'otro') {
      doc.setFillColor(255, 244, 214);
      doc.roundedRect(sx(20), sy(120), sw(280), sh(24), 1.5, 1.5, 'F');
      doc.setDrawColor(214, 158, 24);
      doc.setLineDashPattern([2, 1.5], 0);
      doc.line(sx(20), sy(120), sx(300), sy(120));
      doc.setLineDashPattern([], 0);
      house(48, 68);
      doc.setFillColor(255, 244, 214);
      doc.setDrawColor(214, 158, 24);
      doc.circle(sx(254), sy(48), sw(18), 'FD');
      doc.setTextColor(166, 112, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('?', sx(254), sy(53), { align: 'center' });
    }
  }

  async function generate(ficha, fotos = []) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = 210;
    const pageH = 297;
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = margin;

    function sectionHeader(title, bgColor = COLORS.secBg) {
      doc.setFillColor(...bgColor);
      doc.rect(margin, y, contentW, 9, 'F');
      doc.setTextColor(...COLORS.secText);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), margin + 4, y + 6.2);
      y += 9;
    }

    function autoTable(body, colStyles = COL_STYLES) {
      doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        body,
        theme: 'grid',
        styles: TABLE_STYLES,
        columnStyles: colStyles,
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    function checkPageBreak(needed = 24) {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    }

    // ---- TITLE ----
    doc.setFillColor(...COLORS.titleBg);
    doc.rect(margin, y, contentW, 14, 'F');
    doc.setTextColor(...COLORS.titleText);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(ficha.tipo === 'radon' ? 'FICHA DE MEDICIÓN DE CONCENTRACIÓN DE RADÓN' : 'FICHA DE VARIABLES Y EQUIPOS DE MEDICIÓN EN CUEVAS', pageW / 2, y + 9.5, { align: 'center' });
    y += 14 + 4;

    // ---- FIRST SECTIONS ----
    if (ficha.tipo === 'radon') {
      checkPageBreak(78);
      sectionHeader('1. Datos Generales');
      autoTable([
        [ labelCell('Nombres completos'), { content: ficha.nombresCompletos || '—', colSpan: 3 } ],
        [ labelCell('Provincia'), valueCell(ficha.provincia), labelCell('Cantón'), valueCell(ficha.canton) ],
        [ labelCell('Parroquia'), valueCell(ficha.parroquia), labelCell('Barrio'), valueCell(ficha.barrio) ],
        [ labelCell('Código de casa'), valueCell(ficha.codigoCasa), labelCell('Número de cuadra'), valueCell(ficha.numeroCuadra) ],
        [ labelCell('Latitud'), valueCell(ficha.latitud), labelCell('Longitud'), valueCell(ficha.longitud) ],
        [ labelCell('Altura sobre el nivel del mar [m.s.n.m]'), valueCell(ficha.altura), { content: '' }, { content: '' } ],
      ]);

      checkPageBreak(62);
      sectionHeader('2. Datos de la vivienda');
      const constructionType = selectedLabel('tipologiaConstruccion', ficha.tipologiaConstruccion, ficha.tipologiaConstruccionOtro);
      const groundPosition = selectedLabel('posicionPisoBajo', ficha.posicionPisoBajo, ficha.posicionPisoBajoOtro);
      const basementUse = selectedLabel('usoSotano', ficha.usoSotano, ficha.usoSotanoOtro);
      autoTable([
        [ labelCell('Tipología de construcción'), { content: constructionType, colSpan: 3 } ],
        [ labelCell('Posición del piso más bajo'), { content: groundPosition, colSpan: 3 } ],
        [ labelCell('Uso del piso semienterrado o sótano'), { content: basementUse, colSpan: 3 } ],
      ]);
      if (ficha.posicionPisoBajo) {
        checkPageBreak(76);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.labelText);
        doc.text('Esquema de la posición seleccionada', margin, y);
        y += 6;
        const diagramWidth = 110;
        const diagramHeight = 45;
        drawGroundPosition(doc, ficha.posicionPisoBajo, margin + (contentW - diagramWidth) / 2, y, diagramWidth, diagramHeight);
        y += diagramHeight + 7;
      }

      checkPageBreak(36);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.labelText);
      doc.text('Características de la construcción', margin, y);
      y += 4;
      autoTable([
        [ labelCell('Año'), valueCell(ficha.anoConstruccion), labelCell('Terreno'), valueCell(listSummary(ficha.tiposTerreno)) ],
        [ labelCell('Materiales'), valueCell(listSummary(ficha.materialesConstruccion), 1), labelCell('Climatización'), valueCell(listSummary(ficha.climatizacion)) ],
        [ labelCell('Humedad en paredes'), ynCell(ficha.humedadParedes), labelCell('Grietas o fisuras'), ynCell(ficha.grietasParedes) ],
      ]);

      checkPageBreak(76);
      sectionHeader('3. Datos de medición');
      const spaceType = selectedLabel('tipoEspacio', ficha.tipoEspacio, ficha.tipoEspacioOtro);
      const measurementFloor = ficha.pisoMedicion === 'numero'
        ? `Número de piso: ${ficha.numeroPisoMedicion || '—'}`
        : selectedLabel('pisoMedicion', ficha.pisoMedicion);
      autoTable([
        [ labelCell('Tipo de electreto'), { content: RadonCalc.canonicalType(ficha.tipoElectreto) === 'SST' ? 'Short-term (SST)' : RadonCalc.canonicalType(ficha.tipoElectreto) === 'SLT' ? 'Long-term (SLT)' : (ficha.tipoElectreto || '—'), colSpan: 3 } ],
        [ labelCell('Código del electreto'), { content: ficha.codigoElectreto || '—', colSpan: 3 } ],
        [ labelCell('Fecha inicial'), valueCell(formatDate(ficha.fecha)), labelCell('Fecha final'), valueCell(formatDate(ficha.fechaFin)) ],
        [ labelCell('Hora de inicio'), valueCell(formatTime(ficha.horaInicio)), labelCell('Hora de fin'), valueCell(formatTime(ficha.horaFin)) ],
        [ labelCell('Voltaje inicial'), valueCell(ficha.voltajeInicial), labelCell('Voltaje final'), valueCell(ficha.voltajeFinal) ],
        [ labelCell('Fondo gamma [µSv/h]'), valueCell(ficha.fondoGamma), labelCell('Duración [días]'), valueCell(RadonCalc.durationDays(ficha.fecha, ficha.horaInicio, ficha.fechaFin, ficha.horaFin)?.toFixed(3)) ],
        [ labelCell('Concentración [Bq/m³]'), valueCell(RadonCalc.calculate(ficha.tipoElectreto, ficha.fecha, ficha.horaInicio, ficha.fechaFin, ficha.horaFin, ficha.voltajeInicial, ficha.voltajeFinal, ficha.fondoGamma, ficha.altura)?.concentration), labelCell('± Error absoluto [Bq/m³]'), valueCell(RadonCalc.calculate(ficha.tipoElectreto, ficha.fecha, ficha.horaInicio, ficha.fechaFin, ficha.horaFin, ficha.voltajeInicial, ficha.voltajeFinal, ficha.fondoGamma, ficha.altura)?.absoluteError) ],
        [ labelCell('Tipo de espacio'), { content: spaceType, colSpan: 3 } ],
        [ labelCell('Piso de medición'), { content: measurementFloor, colSpan: 3 } ],
      ]);
    } else {
      checkPageBreak(70);
      sectionHeader('1. Detalles de cueva');
      const aguaVal = ficha.agua === 'si' ? true : ficha.agua === 'no' ? false : null;
      autoTable([
        [ labelCell('Cueva'), valueCell(ficha.cueva),  labelCell('Punto'), valueCell(ficha.punto) ],
        [ labelCell('Provincia'), valueCell(ficha.provincia), labelCell('Cantón'), valueCell(ficha.canton) ],
        [ labelCell('Fecha de inicio'), valueCell(formatDate(ficha.fecha)), labelCell('Fecha de fin'), valueCell(formatDate(ficha.fechaFin)) ],
        [ labelCell('Hora de inicio'), valueCell(formatTime(ficha.horaInicio)), labelCell('Hora de fin'), valueCell(formatTime(ficha.horaFin)) ],
        [ labelCell('Agua'), ynCell(aguaVal), labelCell('Tipo'), valueCell(ficha.agua === 'si' ? aguaTipoSummary(ficha) : '—') ],
        [ labelCell('Sección transversal'), { content: ficha.seccionTransversal || '—', colSpan: 3 } ],
      ]);
    }

    // ---- PARAMETERS ----
    if (ficha.tipo !== 'radon') {
      checkPageBreak(50);
      sectionHeader('2. Medición de parámetros ambientales');

      const p = ficha.parametros || {};
      autoTable([
        [ labelCell('Humedad'),        ynCell(p.humedad),    labelCell('Temperatura'),     ynCell(p.temperatura) ],
        [ labelCell('Presión'),        ynCell(p.presion),    labelCell('Velocidad del viento'), ynCell(p.velViento)   ],
        [ labelCell('CO2'),            ynCell(p.co2),        { content: '' },              { content: '' }       ],
      ]);
    }

    // ---- IONIZING RADIATION EQUIPMENT ----
    checkPageBreak(50);
    sectionHeader(ficha.tipo === 'radon' ? '4. Equipos adicionales de medición de radiación ionizante' : '3. Equipos de radiación ionizante');

    const eq = ficha.equiposRadiacion || {};
    if (ficha.tipo === 'radon') {
      autoTable([
        [ labelCell('AlphaE'), ynCell(eq.alphaE), labelCell('GammaScout'), ynCell(eq.gammaScout) ],
        [ labelCell('SaphyRAD'), ynCell(eq.saphyRad), { content: '' }, { content: '' } ],
      ]);
    } else {
      autoTable([
        [ labelCell('GammaScout'), ynCell(eq.gammaScout), labelCell('Dosímetros'), ynCell(eq.dosimetros) ],
        [ labelCell('AlphaE'), ynCell(eq.alphaE), labelCell('SaphyRAD'), ynCell(eq.saphyRad) ],
        [ labelCell('Protección contra la humedad'), valueCell([eq.alphaEFundaProtectora === true ? 'Funda protectora' : '', eq.alphaEDesecante === true ? 'Desecante' : ''].filter(Boolean).join(', ') || '—', 3) ],
        [ labelCell('Sonda SaphyRAD'), { content: eq.saphyRad === true ? (eq.saphyRadSonda || '—') : '—', colSpan: 3 } ],
      ]);
    }

    // ---- ADDITIONAL EQUIPMENT ----
    if (ficha.tipo !== 'radon') {
      checkPageBreak(28);
      sectionHeader('4. Equipos adicionales');

      const ad = ficha.equiposAdicionales || {};
      autoTable([
        [ labelCell('Medidor de radiación cósmica', 1), ynCell(ad.medidorRadiacionCosmica, { cellWidth: 30 }) ],
        [ labelCell('Otro equipo', 1), valueCell(ad.otroEquipo || '—') ],
      ], { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30 } });
    }

    // ---- OBSERVATIONS ----
    checkPageBreak(36);
    sectionHeader('5. Observaciones y/o notas', COLORS.sec5Bg);

    const obsText = ficha.observaciones || '(Sin observaciones)';
    const obsLines = doc.splitTextToSize(obsText, contentW - 8);
    let remainingObs = [...obsLines];
    while (remainingObs.length) {
      let capacity = Math.floor((pageH - margin - y - 10) / 5);
      if (capacity < 2) { doc.addPage(); y = margin; capacity = Math.floor((pageH - margin - y - 10) / 5); }
      const lines = remainingObs.splice(0, capacity);
      const obsH = Math.max(20, lines.length * 5 + 8);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...COLORS.gridBorder);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, contentW, obsH, 'FD');
      doc.setTextColor(...COLORS.valueText);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 4, y + 5);
      y += obsH + 6;
      if (remainingObs.length) { doc.addPage(); y = margin; }
    }

    // ---- FOTOS — una por página, respetando relación de aspecto ----
    for (let i = 0; i < fotos.length; i++) {
      doc.addPage();

      // Header de sección en cada página de foto
      let fy = margin;
      doc.setFillColor(80, 80, 80);
      doc.rect(margin, fy, contentW, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`FOTOGRAFÍA ${i + 1} DE ${fotos.length}`, margin + 4, fy + 6.2);
      fy += 9 + 4;

      // El recuadro conserva la proporción original y deja margen alrededor de fotos grandes.
      const availW = contentW * 0.82;
      const availH = (pageH - fy - margin - 10) * 0.76;

      try {
        const image = await prepareImageForPdf(fotos[i].blob);
        const dims = { w: image.width, h: image.height };

        // Escala uniforme para que quepa sin recortar
        const scale  = Math.min(availW / dims.w, availH / dims.h);
        const pdfW   = dims.w * scale;
        const pdfH   = dims.h * scale;

        // Centrar horizontal y verticalmente en el espacio disponible
        const ix = margin + (availW - pdfW) / 2;
        const iy = fy     + (availH - pdfH) / 2;

        doc.addImage(image.dataUrl, image.format, ix, iy, pdfW, pdfH, undefined, 'MEDIUM');
      } catch {
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, fy, contentW, availH, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text('[Imagen no disponible]', pageW / 2, fy + availH / 2, { align: 'center' });
      }

      // Caption centrado al pie
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.footerText);
      const caption = fotos[i].name ? `${fotos[i].name}` : `Foto ${i + 1}`;
      doc.text(caption, pageW / 2, pageH - margin + 2, { align: 'center' });
    }

    // ---- FOOTER ----
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.footerText);
      doc.text(
        `Generado: ${new Date().toLocaleString('es')}   |   ID: ${(ficha.id || '').substring(0, 8)}`,
        margin, pageH - 8
      );
      doc.text(`Pág. ${p} / ${total}`, pageW - margin, pageH - 8, { align: 'right' });
    }

    let filename;
    if (ficha.tipo === 'radon') {
      const date = ficha.fecha || new Date().toISOString().substring(0, 10);
      const parts = [
        safeFilenamePart(ficha.canton, 'SinCanton'),
        safeFilenamePart(ficha.numeroCuadra, 'SinCuadra'),
        safeFilenamePart(ficha.nombresCompletos, 'SinNombre'),
        safeFilenamePart(date, 'SinFecha'),
      ];
      filename = `Radon_${parts.join('_')}.pdf`;
    } else {
      const fichaName = ficha.cueva;
      const baseName = fichaName ? (ficha.punto ? `${fichaName}_${ficha.punto}` : fichaName) : 'Ficha';
      const safeName = baseName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
      filename = `Ficha_${safeName}_${ficha.fecha || new Date().toISOString().substring(0, 10)}.pdf`;
    }
    return { blob: doc.output('blob'), filename };
  }

  async function prepareImageForPdf(blob) {
    const format = blob.type.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
    const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
    let bitmap;
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      } catch {
        try { bitmap = await createImageBitmap(blob); } catch { bitmap = null; }
      }
    }

    const canvas = document.createElement('canvas');
    if (bitmap) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close?.();
    } else {
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    return { dataUrl, width: canvas.width, height: canvas.height, format };
  }

  return { generate };
})();
