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

Registra los datos generales y la ubicación, las características de la vivienda y los datos de medición. En la sección 3 selecciona el tipo de electreto **Short** o **Long**, su código, las fechas y los voltajes. El código de casa es opcional. Se pueden introducir coordenadas manualmente o solicitar las del dispositivo.

La tarjeta muestra el nombre, número de cuadra y código de casa si existe, además de provincia, cantón y parroquia. Exporta el PDF o el CSV de una ficha desde su tarjeta o formulario; también puedes descargar un CSV de toda la colección. El CSV contiene los datos generales y de medición, excluyendo el tipo de espacio y el piso de medición.

### Parámetros de Emergencia

Después de introducir el código de acceso, crea un diseño con especies, tratamientos, repeticiones, semillas y duración. La aplicación muestra el total de unidades y permite registrar estados por semilla y día. Según los datos disponibles, puedes generar etiquetas, gráficas de mortalidad y exportaciones CSV, Excel, PNG y PDF. El menú permite respaldar cada experimento en JSON. El estado puede marcarse como **Parcial** o **Completado** y volver a cambiarse.

### Close Chamber

Crea un experimento para un alimento o fertilizante, con marca, origen opcional, responsable, granulometrías, pesos y control opcional. El número de tratamientos es la cantidad de granulometrías multiplicada por la de pesos.

Cada granulometría tiene una tabla. Añade una fila y selecciona el peso y el tipo de electreto; introduce código, fechas, horas y voltajes. El código de electreto no se puede repetir. Guarda cada fila con el icono correspondiente; para modificar una fila guardada, usa el lápiz y vuelve a guardarla. La fila en edición se muestra amarilla y la guardada, verde. El voltaje final no puede superar al inicial y la fecha final debe ser posterior a la inicial para calcular la concentración.

Puedes descargar CSV y PDF por experimento, respaldarlo en JSON o descargar un CSV de todos los experimentos. El PDF incluye el diseño y las tablas. También puedes marcar el experimento como completado o volverlo a parcial.

## Cálculo de concentración de radón

En Close Chamber y en el CSV de Radón en Casas, `Vi` y `Vf` son los voltajes inicial y final, `T` son los días entre las fechas y `BG = 0`:

```text
Short: CF = 0.314473 + 0.260619 × (Vi + Vf) / 2
Long:  CF = 0.031243 + 0.021880 × (Vi + Vf) / 2
Concentración [Bq/m³] = (Vi − Vf) / (T × CF) − BG
```

El resultado se redondea a tres decimales. Si faltan el tipo, las fechas o los voltajes, si el tiempo es cero o negativo, o si los voltajes no son válidos, la concentración queda vacía. Los registros anteriores sin tipo de electreto requieren seleccionarlo. Para conservar el punto decimal en hojas de cálculo, la concentración CSV se exporta como texto con un tabulador inicial; CSV no dispone de tipos de celda propios.

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

El último comando regenera [Manual-Ficharium.pdf](Manual-Ficharium.pdf) usando jsPDF incluido en el proyecto. **En cada nueva versión deben revisarse y actualizarse tanto este README como el manual PDF**, además de comprobar sus enlaces y contenido. Las instrucciones del proyecto están en [AGENTS.md](AGENTS.md).
