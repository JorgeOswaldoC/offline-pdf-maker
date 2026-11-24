/* Cálculo común de radón E-PERM para Radón en Casas y Close Chamber. */
const RadonCalc = (() => {
  const calibrations = {
    SST: { A: 0.314473, B: 0.260619, G: 0.087 },
    SLT: { A: 0.031243, B: 0.021880, G: 0.087 },
  };
  const canonicalType = type => ({ Short: 'SST', Long: 'SLT', 'Short-term (SST)': 'SST', 'Long-term (SLT)': 'SLT' })[type] || type;

  function durationDays(startDate, startTime, endDate, endTime) {
    if (!startDate || !endDate || !startTime || !endTime) return null;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const days = (end - start) / 86400000;
    return Number.isFinite(days) && days > 0 ? days : null;
  }

  function calculate(type, startDate, startTime, endDate, endTime, viValue, vfValue, bgValue, heightValue) {
    type = canonicalType(type);
    const constants = calibrations[type];
    const T = durationDays(startDate, startTime, endDate, endTime);
    const bounds = type === 'SST' ? [2, 7] : type === 'SLT' ? [30, 120] : null;
    const vi = Number(viValue), vf = Number(vfValue), BG = Number(bgValue), h = Number(heightValue);
    if (!constants || !bounds || T === null || T < bounds[0] || T > bounds[1] || [viValue, vfValue, bgValue, heightValue].some(v => String(v ?? '').trim() === '')
      || ![vi, vf, BG, h].every(Number.isFinite) || vi <= 0 || vf < 0 || vf >= vi || BG < 0) return null;

    const CF = constants.A + constants.B * (Math.log(vi + vf) - Math.log(2));
    const BG_nano = BG * 1000;
    const G_background = (BG_nano * constants.G) / 8.696;
    const ElevCF = 0.79 + (6 * 3.28084 / 100000) * h;
    const concentration = ((vi - vf) / (T * CF) - G_background) * 37 * ElevCF;
    if (!(CF > 0) || !Number.isFinite(concentration) || concentration === 0) return null;
    const E1 = 5;
    const E2 = (Math.sqrt(2) / (vi - vf)) * 100;
    const E3 = (3.7 / concentration) * 100;
    const totalError = Math.sqrt(E1 ** 2 + E2 ** 2 + E3 ** 2);
    const roundedConcentration = Math.round(concentration * 1000) / 1000;
    const roundedError = Math.round(totalError * 1000) / 1000;
    return {
      T, CF, BG, BG_nano, G: constants.G, G_background, h, ElevCF,
      E1, E2, E3, totalError: roundedError,
      concentration: roundedConcentration,
      absoluteError: Math.round(Math.abs(roundedConcentration * roundedError / 100) * 1000) / 1000,
    };
  }

  function noteHtml() {
    return `<aside class="radon-calibration-note"><strong>Base de cálculo</strong><p>Las ecuaciones y los criterios de cálculo del factor de calibración (CF) y de la concentración de radón se tomaron del <em>E-PERM® System User's Manual</em>, versión 4.0.2, 7 de junio de 2026, publicado por Rad Elec. Se aplican aquí los parámetros SST y SLT y el protocolo de altura y corrección gamma indicado para esta aplicación.</p><p><strong>Factor de calibración:</strong> CF = A + B × [ln(V<sub>i</sub> + V<sub>f</sub>) − ln(2)].<br><strong>Concentración:</strong> C = [(V<sub>i</sub> − V<sub>f</sub>) / (T × CF) − (BG<sub>nGy/h</sub> × G) / 8.696] × 37 × ElevCF.</p><p><strong>Incertidumbre:</strong> E<sub>total</sub> = √[(5)² + (√2 / (V<sub>i</sub> − V<sub>f</sub>) × 100)² + (3.7 / C × 100)²]. El error absoluto reportado es ±|C × E<sub>total</sub> / 100| Bq/m³.</p><p><strong>Variables:</strong> V<sub>i</sub> y V<sub>f</sub> son los voltajes inicial y final en V; T es el tiempo de exposición en días decimales, calculado con fecha y hora; BG es la lectura del fondo gamma ingresada en µSv/h, convertida a nGy/h multiplicando por 1000 y asumiendo equivalencia numérica 1 Sv = 1 Gy para fotones; h es la altura sobre el nivel del mar en metros; C es la concentración en Bq/m³. A, B y G son constantes de calibración: SST (0.314473, 0.260619, 0.087) y SLT (0.031243, 0.021880, 0.087). ElevCF = 0.79 + (6 × 3.28084 / 100000) × h. E<sub>1</sub>=5; E<sub>2</sub> y E<sub>3</sub> se obtienen de los términos correspondientes de la ecuación de incertidumbre.</p><p>Los valores de T permitidos son 2.0–7.0 días para SST y 30.0–120.0 días para SLT.</p></aside>`;
  }
  return { calculate, durationDays, canonicalType, noteHtml };
})();
