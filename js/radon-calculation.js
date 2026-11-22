/* Concentración de radón: calibraciones proporcionadas para electretos Short y Long. */
const RadonCalc = (() => {
  const calibrations = { Short: [0.314473, 0.260619], Long: [0.031243, 0.021880] };
  function concentration(type, startDate, endDate, initialVoltage, finalVoltage) {
    const factors = calibrations[type];
    if (!factors || !startDate || !endDate || String(initialVoltage ?? '').trim() === '' || String(finalVoltage ?? '').trim() === '') return null;
    const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
    const vi = Number(initialVoltage), vf = Number(finalVoltage);
    if (!(days > 0) || !Number.isFinite(vi) || !Number.isFinite(vf) || vi < 0 || vf < 0 || vf > vi) return null;
    const cf = factors[0] + factors[1] * (vi + vf) / 2;
    if (!(cf > 0)) return null;
    return Math.round(((vi - vf) / (days * cf)) * 1000) / 1000;
  }
  function noteHtml() {
    return `<aside class="radon-calibration-note"><strong>Observación sobre el factor de calibración (CF)</strong><p>Short term: CF = 0.314473 + 0.260619 × (V<sub>i</sub> + V<sub>f</sub>) / 2</p><p>Long term: CF = 0.031243 + 0.021880 × (V<sub>i</sub> + V<sub>f</sub>) / 2</p><p>Concentración = (V<sub>i</sub> − V<sub>f</sub>) / (T × CF), con BG = 0 y T igual a los días entre las fechas inicial y final. Se requiere un tipo de electreto y al menos un día de medición.</p></aside>`;
  }
  return { concentration, noteHtml };
})();
