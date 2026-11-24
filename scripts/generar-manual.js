/* Regenera el manual de usuario con los colores de la aplicación. */
const { jsPDF } = require('../js/libs/jspdf.umd.min.js');
const path = require('path');
const doc = new jsPDF({unit:'mm', format:'a4', compress:true, putOnlyUsedFonts:true});
const fs = require('fs');
for (const [file, weight] of [['NotoSans-Regular.ttf','normal'], ['NotoSans-Bold.ttf','bold']]) {
  doc.addFileToVFS(file, fs.readFileSync(path.join(__dirname, 'fonts', file)).toString('base64'));
  doc.addFont(file, 'NotoSans', weight);
}

const W = 210, H = 297, left = 18, right = 192;
const C = {bg:'#0f1724', surface:'#1a2035', card:'#212d40', text:'#e5edf8', muted:'#a8b9cd', blue:'#4a9eff', green:'#4ade80', amber:'#fbbf24', line:'#38506e', teal:'#00b69e'};
let y = 0;
function page(title, eyebrow) {
  if (doc.getNumberOfPages() > 1 || y) doc.addPage();
  doc.setFillColor(C.bg); doc.rect(0,0,W,H,'F');
  doc.setFillColor(C.surface); doc.rect(0,0,W,19,'F');
  doc.setFont('NotoSans','bold'); doc.setFontSize(10); doc.setTextColor(C.text); doc.text('FICHARIUM',left,12);
  doc.setFont('NotoSans','normal'); doc.setFontSize(8); doc.setTextColor(C.muted); doc.text('MANUAL DE USO',right,12,{align:'right'});
  y = 31;
  doc.setFont('NotoSans','bold'); doc.setFontSize(9); doc.setTextColor(C.blue); doc.text(eyebrow.toUpperCase(),left,y); y += 9;
  doc.setFontSize(22); doc.setTextColor(C.text); doc.text(title,left,y); y += 12;
}
function ensure(height) { if (y + height > 277) { page('Continuación','Manual de uso'); } }
function heading(text) { ensure(13); y += 3; doc.setFont('NotoSans','bold'); doc.setFontSize(13); doc.setTextColor(C.text); doc.text(text,left,y); y += 7; }
function para(text, options={}) {
  doc.setFont('NotoSans',options.bold?'bold':'normal'); doc.setFontSize(options.size || 10); doc.setTextColor(options.color || C.muted);
  const lines = doc.splitTextToSize(text, right-left); const height = lines.length * 5.1;
  ensure(height+4); doc.text(lines,left,y,{lineHeightFactor:1.45}); y += height + 3;
}
function bullet(text) {
  doc.setFont('NotoSans','normal'); doc.setFontSize(10); const lines=doc.splitTextToSize(text,right-left-7); ensure(lines.length*5.1+3);
  doc.setFillColor(C.blue); doc.circle(left+1,y-1,0.7,'F'); doc.setTextColor(C.muted); doc.text(lines,left+6,y,{lineHeightFactor:1.45}); y += lines.length*5.1+2;
}
function box(title, lines) {
  const formatted=[]; doc.setFont('NotoSans','normal'); doc.setFontSize(9.5);
  for(const line of lines) formatted.push(...doc.splitTextToSize(line,right-left-12));
  const height=14+formatted.length*5; ensure(height+5);
  doc.setFillColor(C.card); doc.setDrawColor(C.line); doc.roundedRect(left,y-4,right-left,height,3,3,'FD');
  doc.setFont('NotoSans','bold'); doc.setFontSize(10); doc.setTextColor(C.text); doc.text(title,left+6,y+3);
  doc.setFont('NotoSans','normal'); doc.setFontSize(9.5); doc.setTextColor(C.muted); doc.text(formatted,left+6,y+10,{lineHeightFactor:1.45}); y += height+5;
}
function columnHeading(text,x,y,w) {
  doc.setFont('NotoSans','bold'); doc.setFontSize(10); doc.setTextColor(C.text); doc.text(text,x,y);
  doc.setDrawColor(C.line); doc.line(x,y+2,w+x,y+2); return y+8;
}
function columnText(text,x,y,w,size=8.5,color=C.muted) {
  doc.setFont('NotoSans','normal'); doc.setFontSize(size); doc.setTextColor(color);
  const lines=doc.splitTextToSize(text,w); doc.text(lines,x,y,{lineHeightFactor:1.35});
  return y+lines.length*size*0.48+2;
}
function mathBox(text,x,y,w) {
  doc.setFont('NotoSans','normal'); doc.setFontSize(9.2);
  const lines=doc.splitTextToSize(text,w-10); const height=8+lines.length*4.4;
  doc.setFillColor(C.card); doc.setDrawColor(C.line); doc.roundedRect(x,y,w,height,2,2,'FD');
  doc.setTextColor(C.text); doc.text(lines,x+w/2,y+5,{align:'center',lineHeightFactor:1.2});
  return y+height+2.2;
}
function columnBullet(text,x,y,w) {
  doc.setFont('NotoSans','normal'); doc.setFontSize(8.5);
  const lines=doc.splitTextToSize(text,w-7); doc.setFillColor(C.blue); doc.circle(x+1,y-1,0.65,'F');
  doc.setTextColor(C.muted); doc.text(lines,x+5,y,{lineHeightFactor:1.35});
  return y+lines.length*4.2+2;
}
page('Guía de uso','Ficharium');
doc.setFillColor(C.teal); doc.roundedRect(left,y,29,23,3,3,'F'); doc.setFillColor('#f7f0e2'); doc.roundedRect(left+6,y-5,18,14,1,1,'F'); doc.setFillColor(C.teal); doc.roundedRect(left,y+5,29,18,3,3,'F'); doc.setFillColor('#ff8626'); doc.roundedRect(left+3,y+7,7,2.5,1,1,'F');
y += 34;
para('Una aplicación para organizar mediciones, fichas y experimentos desde la computadora o el teléfono.',{size:12,color:C.text});
heading('Cuatro colecciones');
bullet('Cuevas: ubicación, parámetros ambientales, equipos, observaciones y fotografías.');
bullet('Radón en Casas: datos de la vivienda y mediciones con electretos.');
bullet('Parámetros de Emergencia: diseño, seguimiento por semilla y gráficas de mortalidad.');
bullet('Close Chamber: diseño por granulometría y peso, voltajes y concentración de radón.');
box('Abre la aplicación',['https://jorgeoswaldoc.github.io/offline-pdf-maker/','En el navegador puedes añadir Ficharium a la pantalla de inicio.']);
page('Primeros pasos','Acceso y navegación');
heading('Instalar o abrir');
para('Abre el enlace de la portada. En Android usa la opción de instalación del navegador. En iPhone abre la página en Safari y selecciona Compartir y después Añadir a pantalla de inicio.');
heading('Crear y abrir fichas');
bullet('Elige una colección. Si está vacía, usa el botón para crear la primera ficha; después utiliza el botón +.');
bullet('Abre una tarjeta para revisar sus datos. La flecha del encabezado vuelve a la colección o al selector.');
bullet('Las tarjetas ofrecen acciones según el tipo de ficha: editar, exportar y eliminar. La eliminación pide confirmación.');
heading('Sobre Ficharium');
para('En el menú de la pantalla principal, Sobre Ficharium abre el manual publicado en GitHub Pages. Esta opción necesita conexión.');
heading('Datos en el dispositivo');
para('Las fichas y fotografías se guardan en el navegador. Los datos de cada dispositivo y de cada dirección son independientes: GitHub Pages y un servidor local no comparten automáticamente los registros.');
box('Antes de limpiar o cambiar de dispositivo',['Exporta un respaldo JSON y comprueba que el archivo se haya guardado. Después impórtalo en la otra instalación.']);
page('Cuevas y Radón en Casas','Fichas de medición');
heading('Cuevas');
para('Crea una ficha y abre sus secciones para registrar ubicación, fechas, agua, parámetros ambientales, equipos, observaciones y fotografías. Los campos se guardan automáticamente.');
bullet('Usa Exportar PDF para revisar la ficha y sus fotografías; usa JSON para respaldarla o transferirla.');
heading('Radón en Casas');
para('Completa los datos generales y la ubicación. Puedes escribir las coordenadas o solicitarlas al dispositivo. El código de casa es opcional. Registra las características de la vivienda en la sección 2.');
bullet('En la sección 4, marca los equipos adicionales utilizados. Al seleccionar Sí para SaphyRAD aparece el selector de sonda: Sin sonda, AB16 o GSP145. La selección queda guardada en la ficha.');
bullet('En Datos de medición selecciona Short o Long, ingresa el código del electreto, las fechas, los voltajes y el fondo gamma. Para decimales puedes usar coma o punto. La fecha final no puede ser anterior a la inicial y el voltaje final debe ser no negativo y menor que el inicial.');
bullet('Las tarjetas muestran nombre, cuadra, código de casa cuando exista y ubicación. El CSV individual o general incluye los datos generales y de medición, sin espacio ni piso de medición.');
box('Campos obligatorios',['Los campos marcados con * deben completarse para obtener una ficha completa y exportar el PDF. Los registros antiguos sin tipo de electreto necesitan ese dato para calcular la concentración.']);
page('Parámetros de Emergencia','Diseño y seguimiento');
heading('Crear el diseño');
para('La primera entrada desde un navegador y una dirección solicita el código de acceso. Selecciona Crear experimento y completa identificación, especies, tratamientos, repeticiones, semillas y duración. Revisa el total antes de crear.');
heading('Registrar observaciones');
para('Abre el experimento, elige una especie y tratamiento, y registra cada semilla por día. Los estados incluyen siembra, emergencia, no emergencia, muerte y observación. El botón CSV descarga los datos del tratamiento.');
heading('Resultados y exportaciones');
bullet('El menú del experimento permite exportar CSV completo, generar Excel, respaldar JSON y producir etiquetas PDF.');
bullet('Cuando hay registros en una especie, se puede abrir la gráfica de mortalidad con su tabla resumen y descargar PNG o PDF.');
bullet('Al final puedes marcar el experimento como completado o devolverlo a parcial.');
box('Acceso local',['El código se recuerda en ese navegador y esa dirección. Es una barrera local y no cifra los registros ni crea cuentas.']);
page('Close Chamber','Diseño y registro');
heading('Crear el experimento');
para('Elige Alimentos o Fertilizantes y proporciona nombre, marca y responsable; el origen es opcional. Indica cuántas granulometrías y pesos habrá, escribe cada uno y decide si incluyes control. El total de tratamientos es granulometrías por pesos.');
heading('Completar las tablas');
bullet('En cada granulometría pulsa Agregar fila. Selecciona peso y tipo de electreto, e ingresa código, fechas, horas y voltajes. El código no se puede repetir.');
bullet('Guarda con el icono de disco. Una fila amarilla está en edición; una verde está guardada. Para cambiarla, pulsa el lápiz y vuelve a guardar. Desliza horizontalmente para ver todas las columnas.');
bullet('La concentración requiere fechas válidas con al menos un día de diferencia, voltajes válidos y un tipo de electreto.');
heading('Descargar y respaldar');
para('Cada tarjeta ofrece PDF, JSON y CSV. Dentro del experimento se pueden descargar el CSV y el PDF con el diseño y las tablas. Al final de la colección está el CSV que reúne todos los experimentos.');
page('Cálculo de radón','Radón en Casas · Referencia técnica');
const lx=left, lw=82, rx=108, rw=84;
let ly=columnHeading('Ecuaciones aplicadas',lx,y,lw);
ly=columnText('Ficharium calcula T con la diferencia exacta entre fecha y hora inicial y final. Las expresiones siguientes muestran el método y las unidades que aplica la versión actual.',lx,ly,lw,8.4);
ly=mathBox('CF = A + B · ln((Vᵢ + V_f) / 2)',lx,ly,lw);
ly=mathBox('BGₙGy/h = 1000 · BGµSv/h',lx,ly,lw);
ly=mathBox('C = [(Vᵢ - V_f)/(T · CF) - (BGₙGy/h · G)/8.696] · 37 · ElevCF',lx,ly,lw);
ly=mathBox('E₁ = 5;  E₂ = (2^(1/2)/(Vᵢ - V_f)) · 100;  E₃ = (3.7/C) · 100',lx,ly,lw);
ly=mathBox('E_total = (E₁² + E₂² + E₃²)^(1/2)',lx,ly,lw);
ly=mathBox('Error absoluto = |C · E_total / 100| Bq/m³',lx,ly,lw);
ly=mathBox('ElevCF = 0.79 + (6 · 3.28084 · h) / 100000',lx,ly,lw);
ly+=4;
ly=columnText('C se informa en Bq/m³. El error porcentual E_total se redondea a tres decimales; la concentración y su error absoluto se reportan con tres decimales.',lx,ly,lw,8.1);

let ry=columnHeading('Restricciones de la aplicación',rx,y,rw);
ry=columnBullet('SST: duración inclusiva de 2 a 7 días. SLT: de 30 a 120 días. El intervalo se calcula en días decimales con fecha y hora.',rx,ry,rw);
ry=columnBullet('Voltajes: Vᵢ debe ser mayor que cero y 0 <= V_f < Vᵢ.',rx,ry,rw);
ry=columnBullet('El fondo gamma BG es obligatorio y no puede ser negativo. Se ingresa en µSv/h y se convierte a nGy/h multiplicando por 1000.',rx,ry,rw);
ry=columnBullet('La altura sobre el nivel del mar debe ser un valor numérico. La versión actual usa ElevCF = 0.79 + (6 × 3.28084 × h)/100000 para SST y SLT.',rx,ry,rw);
ry=columnBullet('Si faltan datos, el intervalo está fuera del rango o C es cero/no finita, la aplicación no presenta un resultado calculado.',rx,ry,rw);
ry=columnHeading('Coeficientes usados',rx,ry+1,rw);
ry=columnText('SST: A = 0.314473; B = 0.260619; G = 0.087.\nSLT: A = 0.031243; B = 0.021880; G = 0.087.',rx,ry,rw,8.4,C.text);
ry=columnHeading('Referencia y alcance',rx,ry+1,rw);
ry=columnText('Referencia técnica: E-PERM® System User’s Manual, versión 4.0.2, Rad Elec Inc., 7 de junio de 2026; apartados de factores de calibración, corrección por elevación y algoritmos (pp. 46–53).',rx,ry,rw,8.2);
ry=columnText('Ficharium implementa la expresión y los coeficientes indicados en esta página. Es una adaptación de la aplicación: el manual del fabricante describe correcciones por configuración de cámara y otros términos que no se incorporan todos en este cálculo.',rx,ry,rw,8.2,C.amber);
const manualUrl='https://www.radelec.com/manuals/E-PERM%20System%20User%27s%20Manual.pdf';
doc.setFont('NotoSans','normal'); doc.setFontSize(7.3); doc.setTextColor(C.blue);
const manualLink='Abrir el manual oficial de Rad Elec'; doc.text(manualLink,rx,ry+1);
doc.link(rx,ry-3,doc.getTextWidth(manualLink),5,{url:manualUrl});

page('Respaldos y privacidad','Datos locales');
heading('Menú y respaldo');
para('El menú de hamburguesa permite importar archivos JSON y exportar respaldos generales o por colección. El respaldo general incluye fichas, fotos y experimentos de plantas. Al importar un identificador existente se actualiza ese registro.');
para('Limpiar caché y datos elimina los datos guardados en el navegador después de confirmar. Exporta antes un JSON. La aplicación no sincroniza registros entre dispositivos.');
const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);doc.setDrawColor(C.line);doc.line(left,283,right,283);doc.setFont('NotoSans','normal');doc.setFontSize(8);doc.setTextColor(C.muted);doc.text('Ficharium · Manual de uso',left,289);doc.text(`${i} / ${count}`,right,289,{align:'right'});}
doc.setProperties({title:'Ficharium - Manual de uso',subject:'Guía de fichas y experimentos'});
require('fs').writeFileSync(path.join(__dirname,'..','Manual-Ficharium.pdf'), Buffer.from(doc.output('arraybuffer')));
console.log(`Manual generado: ${count} páginas`);
