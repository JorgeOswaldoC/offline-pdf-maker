# Ficharium

Ficharium es una aplicación web para registrar fichas de Cuevas, Radón en Casas, Parámetros de Emergencia y Close Chamber. Funciona en computadoras y teléfonos; después de cargar sus recursos puede utilizarse sin conexión. Los datos se guardan en el navegador del dispositivo.

**[Abrir Ficharium](https://jorgeoswaldoc.github.io/offline-pdf-maker/)** · **[Descargar el manual de uso (PDF)](Manual-Ficharium.pdf)**

## Antes de empezar

- Entra desde el enlace anterior. En Android puedes instalarla desde el menú del navegador; en iPhone, abre la página en Safari y selecciona **Compartir → Añadir a pantalla de inicio**.
- En el menú ☰ de la pantalla principal, **Sobre Ficharium** abre el manual publicado en GitHub Pages; necesita conexión.
- El almacenamiento pertenece al navegador y a la dirección utilizada. Los registros de GitHub Pages, del servidor local y de otros dispositivos son independientes; no se sincronizan automáticamente.
- Exporta respaldos JSON antes de cambiar de dispositivo, borrar datos del navegador o limpiar la aplicación. Las fotografías se incluyen en los respaldos de las fichas que las contienen.
- La sección Parámetros de Emergencia solicita su código una vez por navegador y dirección. Es una barrera de acceso local, no un sistema de cuentas ni de cifrado de los datos.

## Colecciones

### Cuevas

Crea una ficha y completa las secciones de ubicación, parámetros ambientales, equipos, observaciones y fotografías. Los campos se guardan automáticamente. Desde la ficha o su tarjeta puedes exportar PDF o JSON; en la colección puedes importar y respaldar fichas.

### Radón en Casas

Registra los datos generales y la ubicación, las características de la vivienda y los datos de medición. En la sección 3 selecciona el tipo de electreto **Short** o **Long**, su código, las fechas, los voltajes y el fondo gamma. En los valores decimales se acepta coma o punto. El código de casa es opcional. Se pueden introducir coordenadas manualmente o solicitar las del dispositivo.

En la sección 4, selecciona los equipos adicionales utilizados. Si marcas **Sí** para SaphyRAD, aparece el selector de sonda con las opciones **Sin sonda**, **AB16** y **GSP145**; la selección se guarda junto con la ficha.

La tarjeta muestra el nombre, número de cuadra y código de casa si existe, además de provincia, cantón y parroquia. Al elegir PDF se abre una vista previa con opciones para descargar y compartir. También puedes exportar CSV desde la tarjeta o el formulario y descargar un CSV de toda la colección. El CSV contiene los datos generales y de medición, excluyendo el tipo de espacio y el piso de medición.

### Parámetros de Emergencia

Después de introducir el código de acceso, crea un diseño con especies, tratamientos, repeticiones, semillas y duración. La aplicación muestra el total de unidades y permite registrar estados por semilla y día. Según los datos disponibles, puedes generar etiquetas, gráficas de mortalidad y exportaciones CSV, Excel, PNG y PDF. El menú permite respaldar cada experimento en JSON. El estado puede marcarse como **Parcial** o **Completado** y volver a cambiarse.

### Close Chamber

Crea un experimento para un alimento o fertilizante, con marca, origen opcional, responsable, granulometrías, pesos y control opcional. El número de tratamientos es la cantidad de granulometrías multiplicada por la de pesos.

Cada granulometría tiene una tabla. Añade una fila y selecciona el peso y el tipo de electreto; introduce código, fechas, horas y voltajes. El código de electreto no se puede repetir. Guarda cada fila con el icono correspondiente; para modificar una fila guardada, usa el lápiz y vuelve a guardarla. La fila en edición se muestra amarilla y la guardada, verde. La duración permitida es de 2 a 7 días para SST y de 30 a 120 días para SLT; el voltaje inicial debe ser positivo y el final debe ser menor.

Puedes descargar CSV y PDF por experimento, respaldarlo en JSON o descargar un CSV de todos los experimentos. El botón PDF abre una vista previa con opciones para descargar y compartir; el documento incluye el diseño y las tablas. También puedes marcar el experimento como completado o volverlo a parcial.

## Cálculo de concentración de radón

Radón en Casas y Close Chamber usan el método de Ficharium basado en el sistema E-PERM. `V_i` y `V_f` son los voltajes inicial y final; `T` es la duración exacta en días decimales. El fondo gamma se ingresa en µSv/h y se convierte a nGy/h:

$$CF=A+B\ln\left(\frac{V_i+V_f}{2}\right)$$

$$BG_{\mathrm{nGy}/\mathrm{h}}=1000\,BG_{\mu\mathrm{Sv}/\mathrm{h}}$$

$$C=\left[\frac{V_i-V_f}{T\,CF}-\frac{BG_{\mathrm{nGy}/\mathrm{h}}\,G}{8.696}\right]37\,ElevCF\quad[\mathrm{Bq/m^3}]$$

La incertidumbre combina los componentes de voltaje y fondo gamma:

$$E_1=5,\quad E_2=\frac{\sqrt{2}}{V_i-V_f}\,100,\quad E_3=\frac{3.7}{C}\,100$$

$$E_{total}=\sqrt{E_1^2+E_2^2+E_3^2},\qquad Error_{abs}=\left|\frac{C\,E_{total}}{100}\right|$$

Ficharium usa estos coeficientes y corrección de elevación: SST `A=0.314473`, `B=0.260619`, `G=0.087`; SLT `A=0.031243`, `B=0.021880`, `G=0.087`; `ElevCF=0.79+(6×3.28084×h)/100000`. La implementación requiere `V_i>0`, `0≤V_f<V_i`, un fondo gamma no negativo y altura numérica. Acepta 2–7 días para SST y 30–120 días para SLT, incluidos los límites. La duración se calcula con fecha y hora; la concentración y el error se reportan con tres decimales. Si falta un dato o no puede calcularse un resultado finito y distinto de cero, el resultado queda vacío.

El manual incluido agrega una página con estas ecuaciones y restricciones. La referencia metodológica es el [E-PERM System User’s Manual, versión 4.0.2 (Rad Elec)](https://www.radelec.com/manuals/E-PERM%20System%20User%27s%20Manual.pdf), en particular los apartados de factores de calibración, elevación y algoritmos (pp. 46–53). Ficharium documenta sus coeficientes y adaptaciones; para configuraciones específicas de cámara, consulta el manual del fabricante.

Para conservar el punto decimal en hojas de cálculo, la concentración CSV se exporta como texto con un tabulador inicial; CSV no dispone de tipos de celda propios.

## Respaldos y limpieza

En el menú **☰** de la pantalla principal o de cada colección puedes importar JSON y exportar respaldos. El respaldo general incluye fichas, fotografías y experimentos de plantas. Para trasladar datos, exporta el JSON en el dispositivo de origen y luego impórtalo en el de destino. Si importas un identificador ya existente, se actualiza ese registro.

**Limpiar caché y datos** elimina las fichas, fotografías, experimentos y caché del navegador tras la confirmación. Haz primero un respaldo JSON y comprueba que el archivo se haya guardado.

## Desarrollo y documentación

La aplicación es una PWA estática en HTML, CSS y JavaScript, con IndexedDB, Service Worker, jsPDF y AutoTable locales. No requiere una etapa de compilación ni un servidor de aplicaciones.

```bash
python3 -m http.server 8765
# Abrir http://localhost:8765/
node scripts/generar-manual.js
```

Para abrir temporalmente el servidor desde otro dispositivo de la misma red Tailscale, ejecuta `./iniciar-offline-pdf-maker.sh`; el script imprime la dirección que debes abrir en ese dispositivo.

El último comando regenera [Manual-Ficharium.pdf](Manual-Ficharium.pdf) usando jsPDF incluido en el proyecto. **En cada nueva versión deben revisarse y actualizarse tanto este README como el manual PDF**, además de comprobar sus enlaces y contenido. Las instrucciones del proyecto están en [AGENTS.md](AGENTS.md).
