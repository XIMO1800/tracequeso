// ══════════════════════════════════════════════════════════════════════════
// TraceQueso — Codigo.gs  (backend Apps Script)
//
// VERSIÓN: 2026-10-07
// CAMBIO DE ESTA VERSIÓN: CONTROL DE CARGA DE AUTOVENTAS (?tipo=controlesCarga)
//
//   Calidad consulta e imprime desde TraceQueso el registro FOR PR 08-10(1),
//   que Joaquín rellena en la app de pedidos. SOLO LECTURA: no escribe nada en
//   PEDIDOS TIENDA. Aquí solo hay un bloque en doGet que enruta la petición;
//   toda la lectura está en el fichero ControlCarga.gs.
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-10-02 — las gráficas se buscan también en las SUBCARPETAS.
//
//   Joaquín empezó a ordenar las gráficas por mes (carpetas 07.2026, 10.2026...)
//   y en cuanto movió una gráfica convertida a su carpeta, la aplicación dejó de
//   encontrarla y se caía al PDF. getFiles() solo mira el primer nivel.
//   Ahora se recorren también las subcarpetas, tanto para las gráficas de
//   pasteurización (JSON y PDF) como para los JSON de cubas.
//   Ver _recorrerArchivos().
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-10-01 — ACTUALIZACIÓN INCREMENTAL (?tipo=nuevos&dias=N)
//
//   El móvil ya no tiene que bajarse los 90 días en cada actualización. Con los
//   datos de la mañana ya cargados, durante el día solo pide lo registrado en
//   los últimos días: unos kilobytes en vez de 8 MB. Eso entra con una raya de
//   cobertura, que es lo que hay en las cámaras y los secaderos.
//   Ver _filasUltimosDias().
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-09-30 — los JSON del SCADA con el nombre cambiado por Chrome
//
//   EL FALLO (30/09): Joaquín convirtió otra vez la gráfica de pasteurización
//   con el conversor nuevo, la subió a Drive y la app seguía enseñando la
//   conversión vieja: toda la limpieza como SOSA. El motivo es que Chrome, al
//   bajarse el mismo archivo por segunda vez, lo llama "30.09.2026 (1).json".
//   Ese nombre ya no cuadra con el patrón de la fecha, así que el backend lo
//   saltaba SIN DECIR NADA y seguía leyendo el .json antiguo.
//
//   Ahora: se le quita el "(1)" y el "- copia" al nombre antes de comparar, y
//   si hay varios archivos del mismo día MANDA EL MÁS RECIENTE. Vale igual
//   para las gráficas de pasteurización y para los JSON de cubas.
//   Además, cada respuesta lleva _archivo y _subido para poder ver desde la
//   app qué archivo se está leyendo y de cuándo es.
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-09-25 — una CANTIDAD se escribe como NÚMERO, no texto.
//
//   EL FALLO: la cantidad de una entrada llegaba como texto ("8.8") y se metía
//   en la celda tal cual. Google Sheets, en español, lee "8.8" y "8,8" como una
//   FECHA: el 8 de agosto. La celda se quedaba con 08/08/2026 y además cogía
//   formato de fecha, así que volver a guardar 8,8 desde la app la convertía
//   otra vez. Al leerla, la app recibía "2026-08-08" y parseFloat sacaba 2026:
//   de ahí la entrada fantasma de "+2026 L" del lote 3833713 de NATUREN (24/09).
//
//   Ahora la cantidad se convierte a número antes de escribirla (admite coma o
//   punto) y se le quita a la celda cualquier formato de fecha heredado. Ver
//   _numeroSheets() y _escribirNumero().
//
//   Y al cambiar la UNIDAD de un lote se recalcula el stock: sin eso, corregir
//   "unidades" → "L" no arreglaba los consumos ya descontados con la unidad mala.
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-09-24 — el consumo de un parte sin unidad de entrada
//   ya no se descuenta en bruto: si la ficha está en kg o L, se asume que el
//   consumo viene en g/ml (las dosis siempre lo son) y se divide. Y si el lote
//   no aparece en el stock, se coge la unidad del artículo. Es lo que descontó
//   1200 L de cuajo en vez de 1,2 L.
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-09-10 — recomputarConsumoStock() escribe EN BLOQUE.
//
//   Esa función recalcula el CONSUMO y el STOCK ACTUAL de todos los lotes a
//   partir de las salidas. Se ejecuta cada vez que se edita la cantidad o se
//   borra una entrada de material auxiliar. Escribía CELDA A CELDA: dos
//   escrituras por cada lote del stock. Con cientos de lotes eran cientos de
//   llamadas a la hoja (con 400 lotes, 803), y todo ese rato con el candado de
//   escritura echado: los registros de los operarios se quedaban esperando.
//
//   Ahora calcula las dos columnas en memoria y escribe cada una de UNA vez
//   (con 400 lotes, 3 llamadas). EL CÁLCULO NO CAMBIA: mismos valores, mismas
//   filas. Comprobado contra la versión anterior en 3.000 casos simulados
//   (unidades mezcladas, aceite con densidad, lotes duplicados, filas en
//   blanco, columnas que faltan): resultado idéntico en todos.
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-08-23 — dos endpoints nuevos de solo lectura/escritura
// propia que no tocan nada de lo que ya había.
//
//   1) CONTROL DE SALMUERA (hoja SALADERO). Lo rellena Calidad a diario:
//      pH, temperatura, grados Baumé y número de filtrados, más la sal, el
//      ácido láctico y los cambios de material filtrante cuando toquen.
//      La hoja se crea sola la primera vez. Ver gestionarSaladero().
//
//   2) DATOS DE CUBA DEL SCADA (carpeta de Drive "SCADA CUBAS"). Devuelve el
//      JSON diario de una cuba, que el conversor deja ya con las NORMAS DE CASA
//      APLICADAS. Ver leerDatosCuba().
//
// NADA DE LO ANTERIOR SE HA MODIFICADO. Los dos bloques nuevos están al final
// del archivo y sus dos únicos enganches son una línea en doGet (tipo=cuba,
// tipo=saladero) y una línea en _doPostEscritura (_SHEET='SALADERO').
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-08-15 — datos del envasado que se guardaban pero NO VOLVÍAN.
//
// EL PROBLEMA (15/08/2026):
// un envasado con lote de aceite y cantidad se guardaba correctamente en la hoja
// —se veía en Google Sheets—, pero al abrir el registro en el móvil esos campos
// salían vacíos, tanto en la ficha como al editar.
//
// LA CAUSA estaba en la lista COLS de aquí abajo. Esa lista decide qué columnas
// DEVUELVE doGet al móvil. Si una columna no está en ella, el dato se escribe en
// la hoja pero nunca vuelve. Faltaban 14, todas del envasado: LOTE ACEITE,
// CANTIDAD ACEITE (g), LOTE FINAS HIERBAS, VARIEDAD, LOTE ETIQUETAS, CADUCIDAD
// ETIQUETADO, los tres CONTROL MAT, LOTE BOLSA FILM, ACCIONES CORRECTORAS,
// CURACION, CLIENTE y PESO MEDIO.
//
// POR QUÉ PASÓ: al ESCRIBIR, _asegurarColumnasRegistroTotal crea sola cualquier
// columna nueva que mande la app. Al LEER hay que añadirla a mano en COLS. Al ir
// ampliando el envasado se hizo lo primero y se olvidó lo segundo.
//
// A TENER EN CUENTA EN EL FUTURO: cada campo nuevo del envasado (o de cualquier
// sección) hay que añadirlo a COLS, o se guardará y no se verá.
//
// Los datos ya guardados aparecen solos en cuanto se despliega: no hay que
// volver a meter nada.
//
// ──────────────────────────────────────────────────────────────────────────
// VERSIÓN ANTERIOR: 2026-08-13-b — PÉRDIDA DE FILAS en REGISTRO TOTAL.
//
// EL PROBLEMA (confirmado el 11/08/2026 con una selección de minis):
// de una selección salieron 5 registros y a la hoja solo llegaron 3. El móvil no
// tenía nada pendiente: el servidor había respondido "guardado" a todos.
//
// LA CAUSA estaba en tres líneas del doPost:
//     sheet.appendRow(row);                  // escribe la fila
//     var lastRow = sheet.getLastRow();      // vuelve a preguntar cuál es la última
//     sheet.getRange(lastRow, paletCol)...   // escribe ID PALET ahí
// Entre la primera y la segunda línea, OTRA app puede meter una fila. En El Hidalgo
// pasa a diario: TraceQueso y AppSheet escriben en la MISMA hoja, y AppSheet no
// pasa por este script (Loli grababa volteos en el mismo segundo). Cuando eso
// ocurre, getLastRow() apunta a la fila del otro, y el ID PALET se escribe encima
// de la suya. Si además el registro no traía ID PALET, se escribía un apóstrofo
// solo y la celda quedaba en blanco.
//
// LO QUE SE ARREGLA:
//   1) LockService (_conCandado): las escrituras de este script se ponen en fila
//      en vez de solaparse entre ellas (TraceQueso contra sí mismo, partes, stock).
//   2) La fila se LOCALIZA POR SU ID después de escribirla (_filaPorValor), nunca
//      con getLastRow(). Esto protege incluso de AppSheet, que va por fuera y a la
//      que el candado no puede frenar.
//   3) VERIFICACIÓN: si tras escribir la fila no aparece, se responde ok:false.
//      Así el móvil NO la borra de su libreta y la reintenta. Antes se respondía
//      "guardado" sin comprobar nada, y ahí se perdía el dato.
//   4) El ID PALET solo se reescribe si trae valor (no más celdas con un apóstrofo).
//
// El mismo patrón peligroso (appendRow + getLastRow) estaba en PARTES, SALIDAS,
// ENTRADAS y STOCK. Se ha corregido en todos.
//
// PARA VOLVER ATRÁS: en el editor de Apps Script, arriba a la derecha, el icono
// del reloj ("Historial de cambios") guarda todas las versiones anteriores.
// ══════════════════════════════════════════════════════════════════════════
const CODIGO_GS_VERSION = '2026-10-07';

const SHEET_ID = '1XgTnoPDrXLDmWfeQXGFD6g7uo9mdrb1rbm6aR0FoaR0';
const SHEET_NAME = 'REGISTRO TOTAL';

// ══════════════════════════════════════════════
// CORREO DE AVISO DE PEDIDOS DE EXPEDICIONES
// Cambia esta direccion por la de administracion.
// Si quieres avisar a varios, separalos por comas: 'uno@x.com,dos@x.com'
// ══════════════════════════════════════════════
const CORREO_AVISO_PEDIDOS = 'Irene@quesoselhidalgo.com,Joaquin@quesoselhidalgo.com,joacuque@gmail.com';

// Correo del departamento de Calidad para avisos de CAMBIO DE LOTE en partes de
// fabricación. Cuando el quesero cambia manualmente el lote de un fermento/cuajo/
// auxiliar (porque el activo se le agotó antes de tiempo), Calidad recibe un aviso
// para ir a hablar con el quesero y reajustar el stock del lote agotado.
const CORREO_AVISO_CAMBIO_LOTE = 'calidad@quesoselhidalgo.com,Joaquin@quesoselhidalgo.com,joacuque@gmail.com';

// ID de la carpeta de Drive donde se suben las gráficas de pasteurización.
// (Carpeta "Graficas Pasteurizacion" en el Drive de app.quesoselhidalgo)
const CARPETA_GRAFICAS_ID = '14Bw1pbEbjz0YRChJHHUrT520evi6d2zP';

// ══════════════════════════════════════════════════════════════════════════
// COLUMNAS QUE SE DEVUELVEN AL MÓVIL
// ──────────────────────────────────────────────────────────────────────────
// OJO: esta lista es la que decide qué columnas viajan a la app cuando lee
// (doGet y buscarPaleCompleto). Una columna que NO esté aquí se guarda en la
// hoja pero el móvil no la ve nunca: sale vacía en la ficha y en la edición.
// Si se añade un campo nuevo a la app, hay que añadirlo TAMBIÉN aquí.
// (Al escribir no hace falta: _asegurarColumnasRegistroTotal crea la columna.)
//
// (2026-08-15) Añadidas las 14 que faltaban del envasado.
// ══════════════════════════════════════════════════════════════════════════
const COLS = [
  'ID','ID_DISPOSITIVO','FECHA','SECCIÓN','OPERARIO','ID PALET',
  'PESO PALET','PESO MEDIO','SALA VOLTEO','SALA ORIGEN','SALA DESTINO',
  'LOTE QUESO','PRODUCTO','LOTE PRODUCTO','ESCANEAR NUEVO LOTE',
  'TIPO DE QUESO','VARIEDAD','FORMATO/PESO','Nº DE PIEZAS',
  '¿SE PORCIONA EL QUESO?','CUÑAS POR QUESO','TOTAL UNIDADES (Cuñas)',
  'Nº PIEZAS NO APTAS','CONTRAETIQUETAS N/S','PRIMERA CONTRAETIQUETA',
  'ULTIMA CONTRAETIQUETA','CONFORME VACIO Y SELLADO',
  'TERMOFORMADO (Lote tapa)','TERMOFORMADO (Lote fondo)',
  'MATERIAL ENVASADO CAMPANA. (Lote bolsa)',
  'LOTE MANTECA','LOTE ROMERO','LOTE FINAS HIERBAS',
  'LOTE PIMIENTA','LOTE TRUFA','CANTIDAD TRUFA',
  'LOTE ACEITE','CANTIDAD ACEITE (g)',
  '¿SE ETIQUETA EL QUESO?','DESCRIPCION ETIQUETA',
  'Nº DE ETIQUETAS','Nº ETIQUETAS NO CONFORMES',
  'LOTE ETIQUETAS','CADUCIDAD ETIQUETADO',
  'CONTROL MAT INICIO','CONTROL MAT DURANTE','CONTROL MAT FINAL',
  'LOTE BOLSA FILM','ACCIONES CORRECTORAS','CURACION','CLIENTE',
  'FECHA 2ª CAPA','OBSERVACIONES','MAQ.ENVASADO',
  'PROVEEDOR BOBINA TAPA','PROVEEDOR BOBINA FONDO',
  'REFERENCIA BOBINA TAPA','REFERENCIA BOBINA FONDO',
  'CAMBIO BOBINA TAPA','CAMBIO BOBINA FONDO'
];

const SHEET_STOCK    = 'STOCK MATERIAL AUXILIAR';
const SHEET_CLIENTES = 'CLIENTES CONTRAETIQUETAS';
const SHEET_ENTRADAS = 'ENTRADAS MATERIAL AUXILIAR';
const SHEET_SALIDAS  = 'SALIDAS MATERIAL AUXILIAR';
const SHEET_PARTES   = 'PARTES FABRICACION';
const SHEET_RECETAS  = 'RECETAS';
const SHEET_OPERARIOS= 'LISTADO OPERARIOS';

const COLS_PARTES = [
  'ID','FECHA','CUBA','TIPO DE QUESO','VARIEDAD','LITROS',
  'L.VACA','L.CABRA','L.OVEJA','OPERARIO','PH LECHE','TEMP LECHE','DORNIC_LECHE',
  'CO2 LOTE','CO2 CADUCIDAD','CO2 TIEMPO SEG','CO2 CAUDAL LH',
  'HORA ADICION','HORA CORTE','COAG TOTAL MIN','COAG PH','COAG TEMP',
  'REC_PH','REC_DORNIC',
  'REC HI','REC HF','REC TI','REC TF','AGIT HI','AGIT HF',
  'MOL HI','MOL HF','MOL PH','MOL TEMP',
  'PREN BAR1','PREN T1','PREN BAR2','PREN T2',
  'DES FORMATO','DES PH','DES HI','DES HF',
  'PZAS 3KG','PZAS 2KG','PZAS 1KG','PZAS 05KGS','PZAS BARRA','PZAS GIGANTE',
  'CAS SERIE','CAS PRIMERA','CAS ULTIMA','CAS TOTAL',
  'LAVADO_APLICADO','LAVADO_HORA_INI','LAVADO_HORA_FIN','LAVADO_TEMP',
  'CUBA FISICA','OBSERVACIONES'
];

// ══════════════════════════════════════════════════════════════════════════
// CANDADO DE ESCRITURA  (2026-08-12)
// ──────────────────────────────────────────────────────────────────────────
// Apps Script puede ejecutar VARIAS peticiones a la vez. Sin candado, dos
// escrituras simultáneas de este mismo script (dos operarios de TraceQueso, o un
// registro y un parte) se pisan: las dos leen dónde está la última fila y las dos
// escriben en el mismo sitio.
//
// tryLock(30000) espera hasta 30 s a que la anterior termine. Si no lo consigue
// (cola muy larga), NO se aborta: se sigue adelante, porque las escrituras ya son
// seguras por sí mismas (se localiza la fila por su ID) y es mejor guardar el dato
// que perderlo. El candado es la primera barrera; la verificación es la segunda.
//
// IMPORTANTE: este candado NO puede frenar a AppSheet, que escribe en la hoja por
// su propia vía sin pasar por aquí. De eso protege _filaPorValor().
// ══════════════════════════════════════════════════════════════════════════
function _conCandado(fn) {
  var lock = null;
  var conseguido = false;
  try {
    lock = LockService.getScriptLock();
    conseguido = lock.tryLock(30000);
  } catch (e) {
    conseguido = false;
  }
  try {
    return fn();
  } finally {
    if (conseguido && lock) { try { lock.releaseLock(); } catch (e) {} }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// LOCALIZAR UNA FILA POR EL VALOR DE UNA COLUMNA  (2026-08-12)
// ──────────────────────────────────────────────────────────────────────────
// Sustituye a getLastRow() después de un appendRow. La fila se busca por su ID,
// que es único, así que da igual cuántas filas hayan metido otras aplicaciones
// entre medias: siempre se encuentra la propia.
// Se recorre de abajo hacia arriba porque lo que se acaba de escribir está al
// final: en una hoja de 28.000 filas eso lo encuentra en las primeras vueltas.
// Devuelve el número de fila (1-based) o -1 si no está.
// ══════════════════════════════════════════════════════════════════════════
function _filaPorValor(sheet, colIdx0, valor) {
  var buscado = String(valor == null ? '' : valor).trim();
  if (!buscado || colIdx0 < 0 || !sheet) return -1;
  var ultima = sheet.getLastRow();
  if (ultima < 2) return -1;
  var vals = sheet.getRange(1, colIdx0 + 1, ultima, 1).getValues();
  for (var i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][0]).trim() === buscado) return i + 1;
  }
  return -1;
}

// ══════════════════════════════════════════════
// NORMALIZACIÓN DE FECHA DE REGISTRO TOTAL
// TraceQueso enviaba la FECHA en ISO ("2026-06-14T07:10:42.000Z"), mientras que
// AppSheet la escribe como "14/6/2026, 8:10:42". Esta función deja SIEMPRE el
// formato de AppSheet (hora local de Madrid) para que todas las filas queden
// idénticas, las escriba quien las escriba.
// ══════════════════════════════════════════════
function _fechaAppSheet(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(v.trim())) return v;
  var d;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    d = v;
  } else {
    d = new Date(v);
    if (isNaN(d.getTime())) return v;
  }
  return Utilities.formatDate(d, 'Europe/Madrid', 'd/M/yyyy, H:mm:ss');
}

// ══════════════════════════════════════════════
// CADUCIDAD COMO TEXTO (arregla el desfase de -1 día)
// Google Sheets convertía el texto "2028-01-30" en objeto fecha a medianoche;
// al leerlo de vuelta y serializarlo a JSON, el huso horario lo dejaba en el día
// anterior (29). Guardándola como TEXTO (formato @), Google no la interpreta como
// fecha y el día queda exacto. Mismo truco que ya se usa con ID PALET.
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════
// (2026-09-25) UNA CANTIDAD SE ESCRIBE COMO NÚMERO, NUNCA COMO TEXTO
// ──────────────────────────────────────────────────────────────────────────
// EL FALLO: la cantidad llegaba del formulario como TEXTO ("8.8", "8,8") y se
// metía en la celda tal cual con setValue(). Google Sheets, en español, lee
// "8.8" y "8,8" como una FECHA: el 8 de agosto. La celda se quedaba con la
// fecha 08/08/2026 y encima cambiaba su formato a fecha, así que por mucho que
// Joaquín volviera a escribir 8,8, volvía a salir una fecha. Y al leerla, la
// app recibía "2026-08-08" y parseFloat le sacaba 2026: de ahí la entrada
// fantasma de "+2026 L" del lote 3833713 de NATUREN (24/09).
//
// Ahora la cantidad se convierte a NÚMERO de verdad antes de escribirla, y a la
// celda se le quita cualquier formato de fecha heredado. Admite coma o punto.
// Devuelve null si no hay número (y entonces no se toca la celda).
// ══════════════════════════════════════════════════════════════════════════
function _numeroSheets(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = String(v).trim();
  if (s === '') return null;
  // "1.234,56" → "1234.56"   ·   "8,8" → "8.8"   ·   "8.8" → "8.8"
  if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  s = s.replace(/[^0-9.\-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function _escribirNumero(sheet, fila, col, valor) {
  if (col < 0 || !fila || fila < 1) return false;
  var n = _numeroSheets(valor);
  if (n === null) return false;
  var celda = sheet.getRange(fila, col + 1);
  celda.setNumberFormat('0.############');   // quita el formato de fecha heredado
  celda.setValue(n);
  return true;
}

function _escribirCaducidadTexto(sheet, fila, col, valor) {
  if (col < 0 || !fila || fila < 1) return;
  var s = (valor === null || valor === undefined) ? '' : String(valor).trim();
  var mISO = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mISO) s = mISO[1] + '-' + mISO[2] + '-' + mISO[3];
  var mDMY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mDMY) s = mDMY[3] + '-' + ('0'+mDMY[2]).slice(-2) + '-' + ('0'+mDMY[1]).slice(-2);
  var celda = sheet.getRange(fila, col + 1);
  celda.setNumberFormat('@');
  celda.setValue(s);
}

function parseFechaSheets(txt) {
  if (!txt) return null;
  var s = txt.toString().trim();
  // Acepta separador con coma o espacio: "21/5/2026, 3:25:00" o "21/05/2026 08:26"
  var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1]),
                  parseInt(m[4]), parseInt(m[5]));
}

function doGet(e) {
  var tipo = e.parameter.tipo || '';
  var callback = e.parameter.callback || '';

  if (tipo === 'matAux') {
    var datos = getMaterialAuxiliar();
    var json = JSON.stringify({ok: true, data: datos});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  if (tipo === 'clientes') {
    var datos = { clientes: leerHojaCompleta(SHEET_CLIENTES) };
    var json = JSON.stringify({ok: true, data: datos});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  if (tipo === 'pale') {
    var paleId = (e.parameter.id || '').toString().trim().toUpperCase();
    var json = JSON.stringify({ok: true, data: buscarPaleCompleto(paleId)});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  if (tipo === 'partes') {
    var json = JSON.stringify({ok: true, data: leerPartes(e.parameter.fecha || '')});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  if (tipo === 'recetas') {
    var json = JSON.stringify({ok: true, data: leerRecetas()});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // Ingredientes (auxiliares/fermentos/cuajo) de un parte, leídos desde SALIDAS por ID PARTE
  if (tipo === 'ingredientesParte') {
    var json = JSON.stringify({ok: true, data: leerIngredientesParte((e.parameter.id || '').toString().trim())});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // Operarios y permisos, leídos de la hoja LISTADO OPERARIOS (para login y menús)
  if (tipo === 'operarios') {
    var json = JSON.stringify({ok: true, data: leerOperarios()});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // Gráfica de pasteurización del día (PDF en Drive)
  if (tipo === 'grafica') {
    var json = JSON.stringify({ok: true, data: buscarGraficasPasteurizacion(e.parameter.fecha || '')});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // Datos de pasteurización del día: el .json que deja el conversor en la misma
  // carpeta de Drive donde están los PDF. Con eso la app dibuja su propia gráfica.
  if (tipo === 'pasteurizacion') {
    var json = JSON.stringify({ok: true, data: leerPasteurizacion(e.parameter.fecha || '')});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // (2026-08-23) Control diario de la salmuera (hoja SALADERO)
  if (tipo === 'saladero') {
    var json = JSON.stringify({ok: true, data: leerSaladero(e.parameter.desde || '', e.parameter.hasta || '')});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // (2026-08-23) Datos de una cuba del día (JSON en Drive, carpeta SCADA CUBAS)
  if (tipo === 'cuba') {
    var json = JSON.stringify({ok: true, data: leerDatosCuba(e.parameter.fecha || '', e.parameter.cuba || '')});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // (2026-10-01) SOLO LO NUEVO — ACTUALIZACIÓN INCREMENTAL
  // ──────────────────────────────────────────────────────────────────────────
  // Hasta ahora, CADA actualización del móvil se traía los 90 días enteros:
  // unos 39.000 registros, 8 MB. Por el pasillo de una cámara, con una raya de
  // cobertura, eso no entra: tarda, se corta y se queda a medias.
  //
  // Pero el móvil ya tiene los 90 días desde que actualizó por la mañana en el
  // vestuario. Lo único que le falta es lo que se haya registrado desde
  // entonces. Eso son unos pocos kilobytes y entra con mala señal.
  //
  // Idea de Joaquín (01/10): "si no cabe todo, es que tampoco me hace falta
  // todo. Mantén todo y cógeme solo lo último, como mucho lo de hoy."
  //
  // Se lee solo el final de la hoja —los registros se van añadiendo por abajo—
  // y de ahí se filtran los de los últimos N días. OJO: si se EDITA a mano un
  // registro viejo que esté más arriba, esto no lo ve; lo recoge la descarga
  // completa de la mañana siguiente.
  if (tipo === 'nuevos') {
    var dias = parseInt(e.parameter.dias || '2', 10);
    if (isNaN(dias) || dias < 1) dias = 2;
    if (dias > 90) dias = 90;
    var json = JSON.stringify({ ok: true, incremental: true, dias: dias,
                                data: _filasUltimosDias(dias) });
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // (2026-10-07) CONTROL DE CARGA DE LOS VEHÍCULOS DE AUTOVENTA — SOLO LECTURA
  // ──────────────────────────────────────────────────────────────────────────
  // El registro FOR PR 08-10(1) lo rellena Joaquín en la app de pedidos, y los
  // datos viven en la hoja PEDIDOS TIENDA, pestaña AUTOVENTA. Calidad lo
  // consulta e imprime desde TraceQueso sin entrar en aquella app.
  // Toda la lectura está en ControlCarga.gs. Aquí solo se enruta.
  if (tipo === 'controlesCarga') {
    var _ccRes;
    if (!_ccPuede(e.parameter.rol)) {
      _ccRes = { ok: false, error: 'Sin permiso: este registro es de Calidad.' };
    } else {
      _ccRes = { ok: true, data: leerControlesCarga(e.parameter.desde || '',
                                                    e.parameter.hasta || '') };
    }
    var _ccJson = JSON.stringify(_ccRes);
    if (callback) return ContentService.createTextOutput(callback + '(' + _ccJson + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(_ccJson).setMimeType(ContentService.MimeType.JSON);
  }

  // Datos del SCADA para pre-rellenar un parte (Excel en Drive, SOLO LECTURA)
  if (tipo === 'scada') {
    var json = JSON.stringify({ok: true, data: buscarDatosSCADA(e.parameter.fecha || '', e.parameter.cuba || '')});
    if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idx = COLS.map(function(c){ return headers.indexOf(c); });
  var modoCompleto = (tipo === 'completo');
  var limite = new Date();
  limite.setDate(limite.getDate() - 90);
  limite.setHours(0, 0, 0, 0);
  var idxFecha = headers.indexOf('FECHA');
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var fila = data[i];
    if (!modoCompleto) {
      var fechaTxt = idxFecha >= 0 ? fila[idxFecha] : '';
      var fecha = parseFechaSheets(fechaTxt.toString());
      if (fecha && fecha < limite) continue;
    }
    var obj = {};
    // (2026-08-15) Si una columna de COLS no existe en la hoja, indexOf devuelve
    // -1 y fila[-1] es undefined. Se deja como cadena vacía para que el móvil
    // reciba siempre la misma forma de objeto.
    COLS.forEach(function(c, j){ obj[c] = (idx[j] >= 0) ? fila[idx[j]] : ''; });
    rows.push(obj);
  }
  var json = JSON.stringify({ok: true, data: rows});
  if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// (2026-10-01) Los registros de los últimos N días, y solo esos.
// No se lee la hoja entera: se cogen las últimas 6.000 filas, que a razón de
// unos 430 registros al día son más de dos semanas de margen, y de ahí se
// filtran las que caen dentro del plazo pedido. Así la respuesta son unos
// kilobytes en vez de 8 MB, que es de lo que se trata.
// ══════════════════════════════════════════════════════════════════════════
// (2026-10-02) ORDENAR LAS CARPETAS DE DRIVE POR MES
// ──────────────────────────────────────────────────────────────────────────
// Las gráficas se iban soltando sueltas en la carpeta y ya hay cientos. Esto
// las reparte en subcarpetas MM.AAAA (10.2026, 09.2026...), que es como Joaquín
// había empezado a hacerlo a mano.
//
// CÓMO SE USA, desde el editor de Apps Script (no hace falta implementar nada):
//   1. Elegir la función  simularOrganizarCarpetas  y pulsar ▶ Ejecutar.
//      NO MUEVE NADA. Escribe en el registro lo que haría.
//   2. Mirar el registro (Ver → Registro de ejecución).
//   3. Si cuadra, elegir  organizarCarpetasPorMes  y pulsar ▶ Ejecutar.
//
// Es repetible: lo que ya está ordenado lo deja en paz, así que se puede lanzar
// cada mes sin pensar. Solo mira los archivos sueltos en el primer nivel; lo que
// ya esté dentro de una subcarpeta no se toca.
//
// El mes sale del NOMBRE del archivo, no de la fecha de subida:
//   29.09.2026.json      → 09.2026
//   13B..07.2026.pdf     → 07.2026
//   cuba3-29.09.2026.json→ 09.2026
// Lo que no tenga una fecha reconocible se queda donde está y se avisa.
function _mesDeNombre(nombre) {
  // (2026-10-02) OJO CON QUITAR LA EXTENSIÓN.
  // La primera versión hacía replace(/\.[A-Za-z0-9]+$/) para quitarla, y eso se
  // come también el año de un archivo SIN extensión: "29..07.2026" se quedaba en
  // "29..07" y dejaba de reconocerse. Apareció en la simulación del 02/10, con
  // una gráfica de julio que se habría quedado sin colocar.
  // Ahora se prueban las dos formas: con la extensión quitada y con el nombre
  // tal cual. La primera que cuadre, vale.
  var n = String(nombre || '');
  var pruebas = [ n.replace(/\.(pdf|json|xps|csv|txt|xls|xlsx|jpg|jpeg|png|gif|zip)$/i, ''), n ];
  for (var i = 0; i < pruebas.length; i++) {
    var base = _limpiaNombreDescarga(pruebas[i]);
    base = base.replace(/^cuba\s*\d+\s*[-_ ]\s*/i, '');        // cuba3-29.09.2026
    var m = base.match(/^(\d{2})[A-Za-z]?[\.\s]+(\d{2})[\.\s]+((?:20)?\d{2})$/);
    if (m) {
      var mes = m[2];
      var anio = m[3].length === 2 ? ('20' + m[3]) : m[3];
      if (+mes >= 1 && +mes <= 12) return mes + '.' + anio;
    }
  }
  return null;
}

function _subcarpeta(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return padre.createFolder(nombre);
}

function _organizarCarpeta(idCarpeta, etiqueta, simular, res) {
  var padre = DriveApp.getFolderById(idCarpeta);

  // (2026-10-02, segunda pasada) PRIMERO SE APUNTAN, LUEGO SE MUEVEN.
  // La primera versión movía los archivos mientras recorría el iterador de la
  // carpeta. Mover un archivo lo saca de esa carpeta, o sea que se estaba
  // cambiando la lista por la que se iba andando: Drive se salta entradas.
  // Resultado del 02/10: 198 movidos de 226, y la ejecución terminó "bien" sin
  // avisar de nada. Ahora se recorre entera y se guarda la lista, y solo
  // después se mueve. Lo que se recorre ya no cambia mientras se recorre.
  var lista = [];
  var it = padre.getFiles();
  while (it.hasNext()) lista.push(it.next());

  var cache = {};
  for (var i = 0; i < lista.length; i++) {
    var f = lista[i];
    var nom = f.getName();
    var mes = _mesDeNombre(nom);
    if (!mes) { res.sinFecha.push(etiqueta + ' · ' + nom); continue; }
    if (simular) { res.movidos.push(etiqueta + ' · ' + nom + '  →  ' + mes); continue; }
    try {
      if (!cache[mes]) cache[mes] = _subcarpeta(padre, mes);
      f.moveTo(cache[mes]);
      res.movidos.push(etiqueta + ' · ' + nom + '  →  ' + mes);
    } catch (err) {
      res.fallos.push(etiqueta + ' · ' + nom + ': ' + err);
    }
  }
}

function _organizar(simular) {
  var res = { movidos: [], sinFecha: [], fallos: [] };
  _organizarCarpeta(CARPETA_GRAFICAS_ID, 'GRAFICAS', simular, res);
  _organizarCarpeta(CARPETA_CUBAS_ID,    'CUBAS',    simular, res);

  // (2026-10-02) RESUMEN, NO UNA LÍNEA POR ARCHIVO.
  // Con cientos de archivos, escribir una línea por cada uno llena el registro
  // y no se lee. Lo que hace falta para decidir es cuántos van a cada mes.
  var porMes = {};
  res.movidos.forEach(function(l){
    var k = l.split('→')[1];
    k = (k ? k.trim() : '?');
    var cual = l.indexOf('CUBAS') === 0 ? 'CUBAS' : 'GRAFICAS';
    var clave = cual + '  ' + k;
    porMes[clave] = (porMes[clave] || 0) + 1;
  });
  Logger.log(simular ? '══ SIMULACIÓN · NO SE HA MOVIDO NADA ══'
                     : '══ ARCHIVOS MOVIDOS ══');
  Logger.log('Total: ' + res.movidos.length + ' archivos');
  Object.keys(porMes).sort().forEach(function(k){
    Logger.log('   ' + k + '  →  ' + porMes[k] + ' archivos');
  });
  if (res.sinFecha.length) {
    Logger.log('── SE QUEDAN DONDE ESTÁN (sin fecha en el nombre): ' + res.sinFecha.length + ' ──');
    res.sinFecha.slice(0, 40).forEach(function(l){ Logger.log('   ' + l); });
    if (res.sinFecha.length > 40) Logger.log('   ...y ' + (res.sinFecha.length - 40) + ' más');
  }
  if (res.fallos.length) {
    Logger.log('── FALLOS: ' + res.fallos.length + ' ──');
    res.fallos.slice(0, 40).forEach(function(l){ Logger.log('   ' + l); });
  }
  return { total: res.movidos.length, porMes: porMes,
           sinFecha: res.sinFecha.length, fallos: res.fallos.length };
}

function simularOrganizarCarpetas() { return _organizar(true); }
function organizarCarpetasPorMes()  { return _organizar(false); }

// Por si conviene ir carpeta a carpeta (menos trabajo por ejecución).
function organizarSoloGraficas() {
  var res = { movidos: [], sinFecha: [], fallos: [] };
  _organizarCarpeta(CARPETA_GRAFICAS_ID, 'GRAFICAS', false, res);
  Logger.log('GRÁFICAS · movidos: ' + res.movidos.length + ' · sin fecha: ' + res.sinFecha.length + ' · fallos: ' + res.fallos.length);
  return res.movidos.length;
}
function organizarSoloCubas() {
  var res = { movidos: [], sinFecha: [], fallos: [] };
  _organizarCarpeta(CARPETA_CUBAS_ID, 'CUBAS', false, res);
  Logger.log('CUBAS · movidos: ' + res.movidos.length + ' · sin fecha: ' + res.sinFecha.length + ' · fallos: ' + res.fallos.length);
  return res.movidos.length;
}

function _filasUltimosDias(dias) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var ultima = sheet.getLastRow();
  if (ultima < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = COLS.map(function(c){ return headers.indexOf(c); });
  var idxFecha = headers.indexOf('FECHA');

  var cuantas = Math.min(ultima - 1, 6000);
  var primera = ultima - cuantas + 1;
  var data = sheet.getRange(primera, 1, cuantas, headers.length).getValues();

  var limite = new Date();
  limite.setDate(limite.getDate() - dias);
  limite.setHours(0, 0, 0, 0);

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var fila = data[i];
    var fechaTxt = idxFecha >= 0 ? fila[idxFecha] : '';
    var fecha = parseFechaSheets(fechaTxt.toString());
    // Sin fecha legible se manda igualmente: más vale que sobre a que falte.
    if (fecha && fecha < limite) continue;
    var obj = {};
    COLS.forEach(function(c, j){ obj[c] = (idx[j] >= 0) ? fila[idx[j]] : ''; });
    rows.push(obj);
  }
  return rows;
}

function buscarPaleCompleto(paleId) {
  if (!paleId) return [];
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxPalet = headers.indexOf('ID PALET');
  if (idxPalet < 0) return [];
  var idx = COLS.map(function(c){ return headers.indexOf(c); });
  var rows = [];
  var paleIdLimpio = paleId.replace(/\s/g,'').split('!')[0].toUpperCase();
  for (var i = 1; i < data.length; i++) {
    var celda = (data[i][idxPalet] || '').toString().trim().toUpperCase();
    var celdaLimpia = celda.replace(/\s/g,'').split('!')[0];
    if (celdaLimpia === paleIdLimpio || celda === paleId) {
      var obj = {};
      COLS.forEach(function(c, j){ obj[c] = (idx[j] >= 0) ? data[i][idx[j]] : ''; });
      rows.push(obj);
    }
  }
  return rows;
}

// ══════════════════════════════════════════════════════════════════════════
// doPost — TODAS las escrituras pasan por el candado
// ──────────────────────────────────────────────────────────────────────────
// Los dos avisos por correo NO tocan hojas, así que se atienden antes del candado
// para no hacer esperar a nadie por un email.
// ══════════════════════════════════════════════════════════════════════════
function doPost(e) {
  var payload = JSON.parse(e.postData.contents);

  if (payload['_SHEET'] === 'AVISO_PEDIDO')      return gestionarAvisoPedido(payload);
  if (payload['_SHEET'] === 'AVISO_CAMBIO_LOTE') return gestionarAvisoCambioLote(payload);

  return _conCandado(function() { return _doPostEscritura(payload); });
}

function _doPostEscritura(payload) {
  if (payload['_SHEET'] === 'PARTES')   return gestionarPartes(payload);
  if (payload['_SHEET'] === 'RECETAS')  return gestionarRecetas(payload);
  if (payload['_SHEET'] === 'ENTRADAS') return gestionarEntradas(payload);
  if (payload['_SHEET'] === 'STOCK')    return gestionarStock(payload);
  if (payload['_SHEET'] === 'SALIDAS_ENVASADO') return gestionarSalidasEnvasado(payload);
  if (payload['_SHEET'] === 'CLIENTE_NUEVO') return gestionarClienteNuevo(payload);
  if (payload['_SHEET'] === 'SALADERO') return gestionarSaladero(payload);   // (2026-08-23)

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxID = headers.indexOf('ID');
  var valorIDBuscado = String(payload['ID'] || '').trim();
  var filaEncontrada = -1;
  if (valorIDBuscado !== '') {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxID]).trim() === valorIDBuscado) { filaEncontrada = i + 1; break; }
    }
  }
  if (payload['_DELETE']) {
    if (filaEncontrada > -1) sheet.deleteRow(filaEncontrada);
    // (2026-07-28) Devolver al stock el material que consumió este registro
    // (un envasado con aceite/trufa, o un cambio de bobina). Por defecto SÍ se
    // devuelve; la app puede mandar devolverStock:false si algún día se quiere
    // borrar el registro sin tocar el stock.
    var _devolver = (payload.devolverStock !== false);
    var _revertidas = 0;
    try { _revertidas = _borrarSalidasEnvasado(valorIDBuscado, _devolver); } catch (e) {}
    return ContentService.createTextOutput(JSON.stringify({
      ok: filaEncontrada > -1,
      stockDevuelto: _devolver,
      salidasRevertidas: _revertidas
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (payload['_UPDATE']) {
    if (filaEncontrada > -1) {
      if (payload['FECHA'] !== undefined) payload['FECHA'] = _fechaAppSheet(payload['FECHA']);
      headers.forEach(function(h, col) {
        if (payload[h] !== undefined && !h.startsWith('_')) sheet.getRange(filaEncontrada, col+1).setValue(payload[h]);
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ok: filaEncontrada > -1})).setMimeType(ContentService.MimeType.JSON);
  }
  if (filaEncontrada > -1) {
    return ContentService.createTextOutput(JSON.stringify({ok:true, duplicado:true, fila:filaEncontrada})).setMimeType(ContentService.MimeType.JSON);
  }

  // ── INSERTAR UNA FILA NUEVA ──
  headers = _asegurarColumnasRegistroTotal(sheet, headers, payload);
  if (payload['FECHA'] !== undefined) payload['FECHA'] = _fechaAppSheet(payload['FECHA']);
  // (2026-08-13) UNA SOLA ESCRITURA. NO SE VUELVE A TOCAR NINGUNA CELDA.
  //
  // Por qué: el 13/08 volvió a aparecer una fila mezclada — un registro de VOLTEO
  // de AppSheet con el ID PALET de un movimiento de TraceQueso. Y eso fue DESPUÉS
  // de poner el candado y la localización por ID.
  //
  // La causa que quedaba: el ID PALET se escribía en una SEGUNDA operación, ya con
  // la fila puesta. Aunque se localizara bien la fila propia, seguía habiendo un
  // instante entre las dos escrituras. Y ese instante es justo donde choca: cuando
  // el móvil recupera cobertura envía TODOS los registros pendientes de golpe —el
  // 13/08 se hicieron a las 9:15 y llegaron a las 9:40— mientras AppSheet está
  // grabando volteos a la vez.
  //
  // Ahora el ID PALET va DENTRO del appendRow, en la misma operación que el resto
  // de la fila. Si no hay segunda escritura, no hay ventana donde colarse.
  //
  // El apóstrofo delante (') es lo que hace que Google lo trate como TEXTO y no
  // como número; no se guarda en la celda ni se ve. Antes se ponía en la segunda
  // escritura, y por eso existía. Puesto aquí hace lo mismo sin coste ninguno.
  var idxPaletRow = headers.indexOf('ID PALET');
  var row = headers.map(function(h, i){
    var v = payload[h] || '';
    if (i === idxPaletRow && v !== '' && String(v).charAt(0) !== "'") v = "'" + v;
    return v;
  });
  sheet.appendRow(row);

  // VERIFICACIÓN (solo LEE, no escribe): si la fila no aparece, NO se puede decir
  // "guardado". Se responde ok:false y el móvil la mantiene pendiente y la
  // reintenta. Esto es lo que evita que un dato se pierda en silencio.
  SpreadsheetApp.flush();
  var idxIDFinal = headers.indexOf('ID');
  var filaNueva = _filaPorValor(sheet, idxIDFinal, valorIDBuscado);
  if (filaNueva < 0) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'La fila no se pudo verificar en la hoja. El registro sigue pendiente y se reintentará.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ok:true, fila:filaNueva})).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════
// PARTES DE FABRICACIÓN
// ══════════════════════════════════════════════
function _fechaKey(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  if (!s) return '';
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return iso[1] + '-' + ('0'+iso[2]).slice(-2) + '-' + ('0'+iso[3]).slice(-2);
  var dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return dmy[3] + '-' + ('0'+dmy[2]).slice(-2) + '-' + ('0'+dmy[1]).slice(-2);
  return s;
}

function leerPartes(fechaFiltro) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_PARTES);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    headers.forEach(function(h, j){ obj[h] = data[i][j]; });
    var fechaKey = _fechaKey(obj['FECHA']);
    if (fechaFiltro && fechaKey !== _fechaKey(fechaFiltro)) continue;
    obj['FECHA'] = fechaKey;
    rows.push(obj);
  }
  return rows;
}

function _guardarJsonParte(sheet, fila, payload) {
  try {
    if (!fila || fila < 2) return;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var cJson = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).toUpperCase().trim() === 'JSON') { cJson = i; break; }
    }
    if (cJson < 0) return;
    var limpio = {};
    Object.keys(payload).forEach(function(k){ if (k.charAt(0) !== '_') limpio[k] = payload[k]; });
    sheet.getRange(fila, cJson + 1).setValue(JSON.stringify(limpio));
  } catch (e) {}
}

function _volcarBloquesParte(sheet, fila, headers, payload) {
  function set(colName, val) {
    var c = headers.indexOf(colName);
    if (c >= 0 && val !== undefined && val !== null) sheet.getRange(fila, c+1).setValue(val);
  }
  var mapaPlano = {
    'fecha':'FECHA', 'cuba':'CUBA', 'cuba_fisica':'CUBA FISICA', 'tipo':'TIPO DE QUESO', 'variedad':'VARIEDAD',
    'litros':'LITROS', 'lvaca':'L.VACA', 'lcabra':'L.CABRA', 'loveja':'L.OVEJA',
    'operario':'OPERARIO', 'ph':'PH LECHE', 'temp':'TEMP LECHE', 'dornic_leche':'DORNIC_LECHE',
    'observaciones':'OBSERVACIONES'
  };
  Object.keys(mapaPlano).forEach(function(k){
    if (payload[k] !== undefined && payload[k] !== null) set(mapaPlano[k], payload[k]);
  });
  if (payload.co2) {
    set('CO2 LOTE', payload.co2.lote); set('CO2 CADUCIDAD', payload.co2.caducidad);
    set('CO2 TIEMPO SEG', payload.co2.tiempo_seg); set('CO2 CAUDAL LH', payload.co2.caudal_lh);
    set('PH LECHE', payload.co2.ph_leche); set('TEMP LECHE', payload.co2.temp_leche);
    set('DORNIC_LECHE', payload.co2.dornic_leche);
  }
  if (payload.coag) {
    set('HORA ADICION', payload.coag.hadicion); set('HORA CORTE', payload.coag.hc);
    set('COAG TOTAL MIN', payload.coag.total); set('COAG PH', payload.coag.ph); set('COAG TEMP', payload.coag.temp);
  }
  if (payload.desuerado) {
    set('REC_PH', payload.desuerado.rec_ph); set('REC_DORNIC', payload.desuerado.rec_dornic);
    set('REC HI', payload.desuerado.rec_hi); set('REC HF', payload.desuerado.rec_hf);
    set('REC TI', payload.desuerado.rec_ti); set('REC TF', payload.desuerado.rec_tf);
    set('AGIT HI', payload.desuerado.agit_hi); set('AGIT HF', payload.desuerado.agit_hf);
    set('LAVADO_APLICADO', payload.desuerado.lavado_aplicado);
    set('LAVADO_HORA_INI', payload.desuerado.lavado_hi); set('LAVADO_HORA_FIN', payload.desuerado.lavado_hf);
    set('LAVADO_TEMP', payload.desuerado.lavado_temp);
  }
  if (payload.moldeo) {
    set('MOL HI', payload.moldeo.hi); set('MOL HF', payload.moldeo.hf);
    set('MOL PH', payload.moldeo.ph); set('MOL TEMP', payload.moldeo.temp);
  }
  if (payload.piezas) {
    set('PZAS 3KG', payload.piezas['3kg']); set('PZAS 2KG', payload.piezas['2kg']);
    set('PZAS 1KG', payload.piezas['1kg']); set('PZAS 05KGS', payload.piezas['05kg']);
    set('PZAS BARRA', payload.piezas['barra']); set('PZAS GIGANTE', payload.piezas['gigante']);
  }
  if (payload.caseinas) {
    set('CAS SERIE', payload.caseinas.serie); set('CAS PRIMERA', payload.caseinas.primera);
    set('CAS ULTIMA', payload.caseinas.ultima); set('CAS TOTAL', payload.caseinas.total);
  }
  set('TIPO DE QUESO', payload.tipo); set('VARIEDAD', payload.variedad);
  set('OBSERVACIONES', payload.observaciones);
}

function _construirFlatParte(payload) {
  var mapa = {
    'id':           'ID', 'fecha':        'FECHA', 'cuba':         'CUBA', 'cuba_fisica': 'CUBA FISICA',
    'tipo':         'TIPO DE QUESO', 'variedad':     'VARIEDAD', 'litros':       'LITROS',
    'lvaca':        'L.VACA', 'lcabra':       'L.CABRA', 'loveja':       'L.OVEJA',
    'operario':     'OPERARIO', 'ph':           'PH LECHE', 'temp':         'TEMP LECHE',
    'dornic_leche': 'DORNIC_LECHE', 'co2_lote':     'CO2 LOTE', 'co2_cad':      'CO2 CADUCIDAD',
    'co2_seg':      'CO2 TIEMPO SEG', 'co2_caudal':   'CO2 CAUDAL LH',
    'coag_hadicion':'HORA ADICION', 'coag_hc':      'HORA CORTE', 'coag_total':   'COAG TOTAL MIN',
    'coag_ph':      'COAG PH', 'coag_temp':    'COAG TEMP',
    'rec_hi':       'REC HI', 'rec_hf':       'REC HF', 'rec_ti':       'REC TI', 'rec_tf':       'REC TF',
    'agit_hi':      'AGIT HI', 'agit_hf':      'AGIT HF',
    'mol_hi':       'MOL HI', 'mol_hf':       'MOL HF', 'mol_ph':       'MOL PH', 'mol_temp':     'MOL TEMP',
    'pren_bar1':    'PREN BAR1', 'pren_t1':      'PREN T1', 'pren_bar2':    'PREN BAR2', 'pren_t2':      'PREN T2',
    'des_formato':  'DES FORMATO', 'des_ph':       'DES PH', 'des_hi':       'DES HI', 'des_hf':       'DES HF',
    'pzas_3kg':     'PZAS 3KG', 'pzas_2kg':     'PZAS 2KG', 'pzas_1kg':     'PZAS 1KG',
    'pzas_05kg':    'PZAS 05KGS', 'pzas_barra':   'PZAS BARRA', 'pzas_gigante': 'PZAS GIGANTE',
    'cas_serie':    'CAS SERIE', 'cas_primera':  'CAS PRIMERA', 'cas_ultima':   'CAS ULTIMA', 'cas_total':    'CAS TOTAL',
    'observaciones':'OBSERVACIONES'
  };

  var flat = {};
  Object.keys(payload).forEach(function(k) {
    var colName = mapa[k] || k;
    flat[colName] = payload[k];
  });

  if (payload.co2) {
    flat['CO2 LOTE']       = payload.co2.lote       || '';
    flat['CO2 CADUCIDAD']  = payload.co2.caducidad   || '';
    flat['CO2 TIEMPO SEG'] = payload.co2.tiempo_seg  || '';
    flat['CO2 CAUDAL LH']  = payload.co2.caudal_lh   || '';
    flat['PH LECHE']       = payload.co2.ph_leche    || '';
    flat['TEMP LECHE']     = payload.co2.temp_leche  || '';
    flat['DORNIC_LECHE']   = payload.co2.dornic_leche|| '';
  }
  if (payload.coag) {
    flat['HORA ADICION']   = payload.coag.hadicion || '';
    flat['HORA CORTE']     = payload.coag.hc       || '';
    flat['COAG TOTAL MIN'] = payload.coag.total    || '';
    flat['COAG PH']        = payload.coag.ph       || '';
    flat['COAG TEMP']      = payload.coag.temp     || '';
  }
  if (payload.desuerado) {
    flat['REC_PH']          = payload.desuerado.rec_ph    || '';
    flat['REC_DORNIC']      = payload.desuerado.rec_dornic|| '';
    flat['REC HI']          = payload.desuerado.rec_hi    || '';
    flat['REC HF']          = payload.desuerado.rec_hf    || '';
    flat['REC TI']          = payload.desuerado.rec_ti    || '';
    flat['REC TF']          = payload.desuerado.rec_tf    || '';
    flat['AGIT HI']         = payload.desuerado.agit_hi   || '';
    flat['AGIT HF']         = payload.desuerado.agit_hf   || '';
    flat['LAVADO_APLICADO'] = payload.desuerado.lavado_aplicado !== undefined ? payload.desuerado.lavado_aplicado : '';
    flat['LAVADO_HORA_INI'] = payload.desuerado.lavado_hi    || '';
    flat['LAVADO_HORA_FIN'] = payload.desuerado.lavado_hf    || '';
    flat['LAVADO_TEMP']     = payload.desuerado.lavado_temp  || '';
  }
  if (payload.moldeo) {
    flat['MOL HI']   = payload.moldeo.hi   || '';
    flat['MOL HF']   = payload.moldeo.hf   || '';
    flat['MOL PH']   = payload.moldeo.ph   || '';
    flat['MOL TEMP'] = payload.moldeo.temp || '';
  }
  if (payload.prensado) {
    flat['PREN BAR1'] = payload.prensado.bar1 || '';
    flat['PREN T1']   = payload.prensado.t1   || '';
    flat['PREN BAR2'] = payload.prensado.bar2 || '';
    flat['PREN T2']   = payload.prensado.t2   || '';
  }
  if (payload.desmoldeo) {
    flat['DES FORMATO'] = payload.desmoldeo.formato || '';
    flat['DES PH']      = payload.desmoldeo.ph      || '';
    flat['DES HI']      = payload.desmoldeo.hi      || '';
    flat['DES HF']      = payload.desmoldeo.hf      || '';
  }
  if (payload.piezas) {
    flat['PZAS 3KG']     = payload.piezas['3kg']     || 0;
    flat['PZAS 2KG']     = payload.piezas['2kg']     || 0;
    flat['PZAS 1KG']     = payload.piezas['1kg']     || 0;
    flat['PZAS 05KGS']   = payload.piezas['05kg']    || 0;
    flat['PZAS BARRA']   = payload.piezas['barra']   || 0;
    flat['PZAS GIGANTE'] = payload.piezas['gigante'] || 0;
  }
  if (payload.caseinas) {
    flat['CAS SERIE']   = payload.caseinas.serie   || '';
    flat['CAS PRIMERA'] = payload.caseinas.primera || '';
    flat['CAS ULTIMA']  = payload.caseinas.ultima  || '';
    flat['CAS TOTAL']   = payload.caseinas.total   || '';
  }
  flat['TIPO DE QUESO'] = payload.tipo          || '';
  flat['VARIEDAD']      = payload.variedad      || '';
  flat['OBSERVACIONES'] = payload.observaciones || '';
  return flat;
}

function gestionarPartes(payload) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_PARTES);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxID = headers.indexOf('ID');
  var id = String(payload['ID'] || '').trim();
  var filaEncontrada = -1;
  if (id) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxID]).trim() === id) { filaEncontrada = i + 1; break; }
    }
  }

  if (payload['_REACTIVAR']) {
    var idR = String(payload.id || payload.ID || '').trim();
    _borrarSalidasParte(idR, true);
    if (filaEncontrada > -1) {
      headers.forEach(function(h, col) {
        if (payload[h] !== undefined && !h.startsWith('_')) sheet.getRange(filaEncontrada, col+1).setValue(payload[h]);
      });
      _volcarBloquesParte(sheet, filaEncontrada, headers, payload);
      _guardarJsonParte(sheet, filaEncontrada, payload);
    }
    return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'reactivado', stockDevuelto:true})).setMimeType(ContentService.MimeType.JSON);
  }

  if (payload['_DELETE']) {
    var devolver = (payload.devolverStock !== false);
    if (id) {
      for (var d = data.length - 1; d >= 1; d--) {
        if (String(data[d][idxID]).trim() === id) sheet.deleteRow(d + 1);
      }
    } else if (filaEncontrada > -1) {
      sheet.deleteRow(filaEncontrada);
    }
    _borrarSalidasParte(String(payload.id || payload.ID || '').trim(), devolver);
    return ContentService.createTextOutput(JSON.stringify({ok: true, stockDevuelto: devolver})).setMimeType(ContentService.MimeType.JSON);
  }

  if (payload['_UPDATE']) {
    if (filaEncontrada > -1) {
      headers.forEach(function(h, col) {
        if (payload[h] !== undefined && !h.startsWith('_')) sheet.getRange(filaEncontrada, col+1).setValue(payload[h]);
      });
      _volcarBloquesParte(sheet, filaEncontrada, headers, payload);
      _guardarJsonParte(sheet, filaEncontrada, payload);
      _sincronizarSalidasSiProcede(payload);
      return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'actualizado', fila:filaEncontrada})).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (filaEncontrada > -1) {
    headers.forEach(function(h, col) {
      if (payload[h] !== undefined && !h.startsWith('_')) sheet.getRange(filaEncontrada, col+1).setValue(payload[h]);
    });
    _volcarBloquesParte(sheet, filaEncontrada, headers, payload);
    _guardarJsonParte(sheet, filaEncontrada, payload);
    _sincronizarSalidasSiProcede(payload);
    return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'actualizado_sin_update', fila:filaEncontrada})).setMimeType(ContentService.MimeType.JSON);
  }

  var flat = _construirFlatParte(payload);

  var row = COLS_PARTES.map(function(col){ return flat[col] !== undefined ? flat[col] : ''; });
  sheet.appendRow(row);

  // (2026-08-12) Igual que en REGISTRO TOTAL: la fila se localiza por su ID en vez
  // de con getLastRow(). Si otra escritura mete una fila entre medias, el JSON del
  // parte se guardaba en la fila equivocada.
  SpreadsheetApp.flush();
  var filaParte = _filaPorValor(sheet, idxID, id);
  if (filaParte < 0) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'El parte no se pudo verificar en la hoja. Sigue pendiente y se reintentará.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  _guardarJsonParte(sheet, filaParte, payload);

  _sincronizarSalidasSiProcede(payload);

  return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'insertado', fila:filaParte})).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════
// INGREDIENTES DEL PARTE  ←→  SALIDAS MATERIAL AUXILIAR  (Opción B)
// ══════════════════════════════════════════════

function _colIdx(headers, nombre) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toUpperCase().trim() === nombre) return i;
  }
  return -1;
}

function _sincronizarSalidasSiProcede(payload) {
  var idParte = String(payload.id || payload.ID || '').trim();
  if (!idParte) return;
  // ── EVITAR DOBLE DESCUENTO original/revisado ──
  // Cuando Calidad crea un parte REVISADO (PR-), este llega con su propio ID y con
  // los mismos ingredientes que el original (P-). Si sincronizáramos salidas también
  // para el revisado, el stock se descontaría DOS VECES (original + revisado).
  // Regla: SOLO el ORIGINAL descuenta stock. El revisado NUNCA genera salidas propias.
  // Un parte es revisado si su ID empieza por 'PR-' o si version==='revisado'.
  var esRevisado = (idParte.indexOf('PR-') === 0) ||
                   (String(payload.version || '').toLowerCase() === 'revisado');
  if (esRevisado) return;  // el revisado no toca el stock
  // El CO2 cuenta como consumo si está aplicado y tiene lote + tiempo + caudal
  // (los litros se calculan: tiempo_seg / 3600 * caudal_lh).
  var tieneCo2 = payload.co2 && payload.co2.lote &&
                 (parseFloat(payload.co2.tiempo_seg) > 0) &&
                 (parseFloat(payload.co2.caudal_lh) > 0);
  var tiene = (payload.auxiliares && payload.auxiliares.length) ||
              (payload.fermentos && payload.fermentos.length) ||
              (payload.cuajo && payload.cuajo.nombre) ||
              (payload.cuajos_extra && payload.cuajos_extra.length) ||
              tieneCo2;
  if (!tiene) return;
  _sincronizarSalidasParte(idParte, payload);
}

function _borrarSalidasParte(idParte, devolverStock) {
  if (!idParte) return;
  var revertir = (devolverStock !== false);
  var sheetSal = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SALIDAS);
  if (!sheetSal) return;
  var data = sheetSal.getDataRange().getValues();
  if (data.length < 2) return;
  var headers = data[0];
  var cCat = _colIdx(headers, 'CATEGORIA');
  var cArt = _colIdx(headers, 'ARTICULO');
  var cLote = _colIdx(headers, 'LOTE');
  var cCant = _colIdx(headers, 'CANTIDAD');
  var cParte = _colIdx(headers, 'ID PARTE');
  if (cParte < 0) return;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][cParte] || '').trim() === idParte) {
      if (revertir) {
        var cat  = cCat  >= 0 ? data[i][cCat]  : '';
        var art  = cArt  >= 0 ? data[i][cArt]  : '';
        var lote = cLote >= 0 ? data[i][cLote] : '';
        var cant = cCant >= 0 ? (parseFloat(data[i][cCant]) || 0) : 0;
        _aplicarConsumoStock(cat, art, lote, -cant);
      }
      sheetSal.deleteRow(i + 1);
    }
  }
}

function _sincronizarSalidasParte(idParte, payload) {
  var sheetSal = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SALIDAS);
  if (!sheetSal) return;

  _borrarSalidasParte(idParte);

  var fecha    = payload.fecha    || '';
  var operario = payload.operario || '';
  var lista = [];
  (payload.auxiliares || []).forEach(function(a){ lista.push({cat: 'AUXILIAR FABRICACION', ing: a}); });
  (payload.fermentos  || []).forEach(function(f){ lista.push({cat: 'FERMENTO', ing: f}); });
  if (payload.cuajo && payload.cuajo.nombre) lista.push({cat: 'CUAJO', ing: payload.cuajo});
  // Mitades extra del cuajo cuando se ha repartido entre dos lotes (v2.6.319).
  // Van como líneas de CUAJO para que descuenten de la ficha correcta.
  (payload.cuajos_extra || []).forEach(function(c){
    if (c && c.nombre) lista.push({cat: 'CUAJO', ing: c});
  });
  // CO2: consumo en litros = tiempo(seg) / 3600 * caudal(L/h). Dado de alta en
  // stock como artículo "CO2", categoría AUXILIAR FABRICACION, unidad litros.
  // El consumo va directo en litros (sin conversión), por eso unidad 'L' y el
  // cálculo se hace aquí (no es una dosis por receta).
  if (payload.co2 && payload.co2.lote) {
    var co2seg    = parseFloat(payload.co2.tiempo_seg) || 0;
    var co2caudal = parseFloat(payload.co2.caudal_lh)  || 0;
    if (co2seg > 0 && co2caudal > 0) {
      // El caudalímetro marca litros por MINUTO, no por hora (contrastado con el
      // consumo real: una bombona de 50 kg ≈ 25.450 L de gas dura unas 65 cubas,
      // lo que da ~94 L/min con el aparato puesto en 100). Con ÷3600 una bombona
      // habría durado 3.665 cubas, que no se parece en nada a la realidad.
      var co2litros = co2seg / 60 * co2caudal;
      // redondear a 2 decimales para no arrastrar colas largas
      co2litros = Math.round(co2litros * 100) / 100;
      lista.push({cat: 'AUXILIAR FABRICACION', ing: {
        nombre:        'CO2',
        consumo_total: co2litros,
        lote:          payload.co2.lote,
        proveedor:     payload.co2.proveedor || '',
        unidad:        'L',
        _yaEnUnidadStock: true   // ya está en litros, NO volver a dividir por 1000
      }});
    }
  }
  if (!lista.length) return;

  var headers = sheetSal.getRange(1, 1, 1, sheetSal.getLastColumn()).getValues()[0];
  var cId    = _colIdx(headers, 'ID SALIDA');
  var cFecha = _colIdx(headers, 'FECHA');
  var cOp    = _colIdx(headers, 'OPERARIO');
  var cCat   = _colIdx(headers, 'CATEGORIA');
  var cArt   = _colIdx(headers, 'ARTICULO');
  var cProv  = _colIdx(headers, 'PROVEEDOR');
  var cLote  = _colIdx(headers, 'LOTE');
  var cCant  = _colIdx(headers, 'CANTIDAD');
  var cMot   = _colIdx(headers, 'MOTIVO');
  var cUni   = _colIdx(headers, 'UNIDAD');
  var cParte = _colIdx(headers, 'ID PARTE');

  var ts = new Date().getTime();
  lista.forEach(function(item, k) {
    var ing = item.ing;
    if (!ing || !ing.nombre) return;
    // El CO2 ya trae el consumo calculado en litros (unidad de stock) → no convertir.
    // El resto sí se convierte a la unidad del stock. IMPORTANTE: se consulta la unidad
    // REAL de la ficha de stock del lote; antes no se pasaba y la conversión asumía que
    // el stock estaba siempre en g/ml, lo que provocaba un error de x1000 en los artículos
    // cuyo stock está dado de alta en kg/L (ej. fermentos con dosis en kg).
    var _uniStkLote = _unidadStockDeLote(item.cat, ing.nombre, ing.lote || '');
    var cant = ing._yaEnUnidadStock ? (parseFloat(ing.consumo_total) || 0)
                                    : _consumoEnUnidadStock(ing.consumo_total, ing.unidad, _uniStkLote, ing.nombre);
    var idSalida = 'S-' + ts + '-' + k;
    var fila = [];
    for (var c = 0; c < headers.length; c++) fila.push('');
    if (cId    >= 0) fila[cId]    = idSalida;
    if (cFecha >= 0) fila[cFecha] = fecha;
    if (cOp    >= 0) fila[cOp]    = operario;
    if (cCat   >= 0) fila[cCat]   = item.cat;
    if (cArt   >= 0) fila[cArt]   = ing.nombre;
    if (cProv  >= 0) fila[cProv]  = ing.proveedor || '';
    if (cLote  >= 0) fila[cLote]  = ing.lote || '';
    if (cCant  >= 0) fila[cCant]  = cant;
    if (cMot   >= 0) fila[cMot]   = 'CONSUMO PARTE';
    if (cUni   >= 0) fila[cUni]   = _uniStkLote || ing.unidad || '';
    if (cParte >= 0) fila[cParte] = idParte;
    sheetSal.appendRow(fila);
    // La FECHA del consumo se escribe como TEXTO (formato @) para que Google Sheets
    // no la interprete como Date a medianoche y la zona horaria (Madrid, GMT+1/+2)
    // no la desplace al día anterior. Mismo bug/solución que las caducidades.
    // (2026-08-12) La fila se localiza por su ID SALIDA, no con getLastRow().
    if (cFecha >= 0 && fecha) {
      SpreadsheetApp.flush();
      var _filaSal = (cId >= 0) ? _filaPorValor(sheetSal, cId, idSalida) : sheetSal.getLastRow();
      if (_filaSal > 0) {
        var _mF = String(fecha).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        var _fTxt = _mF ? (_mF[1] + '-' + ('0'+_mF[2]).slice(-2) + '-' + ('0'+_mF[3]).slice(-2)) : String(fecha);
        var _celF = sheetSal.getRange(_filaSal, cFecha + 1);
        _celF.setNumberFormat('@');
        _celF.setValue(_fTxt);
      }
    }
    _aplicarConsumoStock(item.cat, ing.nombre, ing.lote || '', cant);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// DENSIDAD: PASAR DE PESO A VOLUMEN  (2026-08-15)
// ──────────────────────────────────────────────────────────────────────────
// Convertir gramos a litros dividiendo por 1000 solo vale si el producto pesa
// como el agua. El ACEITE DE OLIVA VIRGEN EXTRA pesa unos 0,91 kg por litro, así
// que 9.360 g no son 9,36 L sino 10,29 L. Un 10 % de diferencia, siempre en la
// misma dirección: si no se corrige, el stock parece durar más de lo que dura.
//
// Se aplica SOLO a los artículos de esta tabla. Cualquier otro sigue con la
// equivalencia de siempre (1 g = 1 ml), que para productos acuosos es correcta.
// Para añadir uno nuevo basta con poner su nombre y sus kg por litro.
// ══════════════════════════════════════════════════════════════════════════
const DENSIDADES = {
  'ACEITE': 0.91   // kg/L — oliva virgen extra
};

function _densidadDe(articulo) {
  var a = String(articulo || '').trim().toUpperCase();
  for (var k in DENSIDADES) { if (a.indexOf(k) >= 0) return DENSIDADES[k]; }
  return 0;
}

function _normUnidad(u) {
  var s = String(u || '').toLowerCase().trim();
  if (s === 'kgs' || s === 'kilo' || s === 'kilos') return 'kg';
  if (s === 'lt' || s === 'litros' || s === 'litro') return 'l';
  if (s === 'gr' || s === 'grs' || s === 'gramos' || s === 'gramo') return 'g';
  if (s === 'mililitros' || s === 'mililitro' || s === 'cc') return 'ml';
  return s;
}

// Devuelve la UNIDAD en la que está dada de alta la ficha de stock de un lote
// (categoría + artículo + lote). Si no encuentra la ficha, devuelve ''.
// Se usa para convertir correctamente los consumos de los partes: sin este dato,
// la conversión tenía que ADIVINAR que el stock estaba en g/ml, y en los artículos
// cuyo stock está en kg/L se producía un error de x1000.
function _unidadStockDeLote(categoria, articulo, lote) {
  try {
    var sheetStk = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_STOCK);
    if (!sheetStk) return '';
    var h = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
    var kCat = _colIdx(h, 'CATEGORIA'), kArt = _colIdx(h, 'ARTICULO'),
        kLote = _colIdx(h, 'LOTE'),     kUni = _colIdx(h, 'UNIDAD');
    if (kUni < 0) return '';
    var cat = String(categoria || '').trim().toUpperCase();
    var art = String(articulo  || '').trim().toUpperCase();
    var lot = String(lote      || '').trim().toUpperCase();
    var d = sheetStk.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      var rCat  = kCat  >= 0 ? String(d[i][kCat]  || '').trim().toUpperCase() : '';
      var rArt  = kArt  >= 0 ? String(d[i][kArt]  || '').trim().toUpperCase() : '';
      var rLote = kLote >= 0 ? String(d[i][kLote] || '').trim().toUpperCase() : '';
      if (rCat === cat && rArt === art && rLote === lot) {
        return String(d[i][kUni] || '').trim();
      }
    }
    // (2026-09-24) SI ESE LOTE NO ESTÁ EN LA FICHA, VALE LA DEL ARTÍCULO.
    // Un lote que no aparece en el stock (recién dado de alta, mal tecleado, o
    // ya retirado) dejaba la unidad en blanco y el consumo se descontaba sin
    // convertir. Todos los lotes de un mismo artículo están dados de alta en la
    // misma unidad, así que se coge la del artículo. Mejor eso que nada.
    for (var j = 1; j < d.length; j++) {
      var jArt = kArt >= 0 ? String(d[j][kArt] || '').trim().toUpperCase() : '';
      if (jArt === art) {
        var uArt = String(d[j][kUni] || '').trim();
        if (uArt) return uArt;
      }
    }
  } catch (e) {}
  return '';
}

function _consumoEnUnidadStock(consumo, unidadEntrada, unidadStock, articulo) {
  var c = parseFloat(consumo) || 0;
  if (!c) return 0;

  if (unidadStock !== undefined && unidadStock !== null && unidadStock !== '') {
    var uE = _normUnidad(unidadEntrada);
    var uS = _normUnidad(unidadStock);
    // ════════════════════════════════════════════════════════════════════════
    // (2026-09-24) SIN UNIDAD DE ENTRADA, EL CONSUMO SE DESCONTABA EN BRUTO.
    // ────────────────────────────────────────────────────────────────────────
    // EL FALLO: si la app no lograba saber en qué unidad está dada de alta la
    // ficha (porque el lote del parte no aparecía en el stock, o porque la
    // tablet aún no lo tenía cargado al cerrar), mandaba ing.unidad vacío. Con
    // la unidad de entrada en blanco no cuadraba ninguna de las conversiones de
    // abajo y se caía al 'return c' del final: el consumo se escribía tal cual.
    // El 24/09 eso descontó 1200 L de cloruro cálcico en vez de 1,2 L.
    //
    // Las dosis de los partes SIEMPRE se calculan en gramos o mililitros (son
    // dosis por 1000 litros). Así que, sin unidad de entrada, se asume eso, que
    // es lo único que puede ser. Solo se aplica cuando la ficha está en kg o en
    // L —las que necesitan dividir—: si la ficha ya está en g o ml, o en sobres
    // o unidades, el consumo se queda como está, igual que antes.
    // ════════════════════════════════════════════════════════════════════════
    if (!uE) {
      if (uS === 'kg')     uE = 'g';
      else if (uS === 'l') uE = 'ml';
      else return c;
    }
    if (uE === uS) return c;
    // Mismo tipo de magnitud: peso a peso, o volumen a volumen. Sin densidad.
    if (uE === 'g'  && uS === 'kg') return c / 1000;
    if (uE === 'kg' && uS === 'g')  return c * 1000;
    if (uE === 'ml' && uS === 'l')  return c / 1000;
    if (uE === 'l'  && uS === 'ml') return c * 1000;
    // De PESO a VOLUMEN (o al revés): aquí sí interviene la densidad. Con el
    // aceite, 910 g son 1 litro, no 1.000. Si el artículo no está en la tabla
    // de densidades se usa 1, que es la equivalencia de siempre.
    var d = _densidadDe(articulo) || 1;
    if (uE === 'g'  && uS === 'l')  return c / 1000 / d;
    if (uE === 'l'  && uS === 'g')  return c * 1000 * d;
    if (uE === 'ml' && uS === 'kg') return c / 1000 * d;
    if (uE === 'kg' && uS === 'ml') return c * 1000 / d;
    if (uE === 'g'  && uS === 'ml') return c / d;
    if (uE === 'ml' && uS === 'g')  return c * d;
    if (uE === 'kg' && uS === 'l')  return c / d;
    if (uE === 'l'  && uS === 'kg') return c * d;
    return c;
  }

  var u = String(unidadEntrada || '').toLowerCase().trim();
  if (u === 'kg' || u === 'l' || u === 'litros' || u === 'lt' || u === 'kgs') return c / 1000;
  return c;
}

function _aplicarConsumoStock(categoria, articulo, lote, delta, unidadDelta) {
  if (!delta) return;
  var sheetStk = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_STOCK);
  if (!sheetStk) return;
  var headers = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
  var idxCat = _colIdx(headers, 'CATEGORIA');
  var idxArt = _colIdx(headers, 'ARTICULO');
  var idxLote = _colIdx(headers, 'LOTE');
  var idxEnt = _colIdx(headers, 'ENTRADAS');
  var idxConsumo = _colIdx(headers, 'CONSUMO');
  var idxStock = _colIdx(headers, 'STOCK ACTUAL');

  var cat = String(categoria || '').trim().toUpperCase();
  var art = String(articulo || '').trim().toUpperCase();
  var lot = String(lote || '').trim().toUpperCase();

  var data = sheetStk.getDataRange().getValues();
  var fila = -1;
  for (var i = 1; i < data.length; i++) {
    var rCat  = idxCat  >= 0 ? String(data[i][idxCat]  || '').trim().toUpperCase() : '';
    var rArt  = idxArt  >= 0 ? String(data[i][idxArt]  || '').trim().toUpperCase() : '';
    var rLote = idxLote >= 0 ? String(data[i][idxLote] || '').trim().toUpperCase() : '';
    if (rCat === cat && rArt === art && rLote === lot) { fila = i + 1; break; }
  }

  var idxUni = _colIdx(headers, 'UNIDAD');
  if (fila > 0 && unidadDelta && idxUni >= 0) {
    var uStockFila = String(data[fila-1][idxUni] || '').trim();
    delta = _consumoEnUnidadStock(delta, unidadDelta, uStockFila, articulo);
  }

  if (fila > 0) {
    var entradas = idxEnt     >= 0 ? (parseFloat(data[fila-1][idxEnt])     || 0) : 0;
    var consumo  = idxConsumo >= 0 ? (parseFloat(data[fila-1][idxConsumo]) || 0) : 0;
    var nuevoConsumo = consumo + delta;
    if (nuevoConsumo < 0) nuevoConsumo = 0;
    if (idxConsumo >= 0) sheetStk.getRange(fila, idxConsumo+1).setValue(nuevoConsumo);
    if (idxStock   >= 0) sheetStk.getRange(fila, idxStock  +1).setValue(entradas - nuevoConsumo);
  } else if (delta > 0) {
    var nueva = headers.map(function(h) {
      var key = String(h).toUpperCase().trim();
      if (key === 'CATEGORIA')    return categoria || '';
      if (key === 'ARTICULO')     return articulo  || '';
      if (key === 'LOTE')         return lote      || '';
      if (key === 'ENTRADAS')     return 0;
      if (key === 'CONSUMO')      return delta;
      if (key === 'STOCK ACTUAL') return -delta;
      return '';
    });
    sheetStk.appendRow(nueva);
  }
}

// Recalcula el total de ENTRADAS de un lote (categoría+artículo+lote) sumando todas
// sus filas en ENTRADAS MATERIAL AUXILIAR (con las unidades convertidas a la del stock),
// y lo escribe en la columna ENTRADAS de la hoja STOCK. Se usa tras editar una cantidad.
function _recalcularEntradasLoteEnStock(categoria, articulo, lote) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheetEnt = ss.getSheetByName(SHEET_ENTRADAS);
  var sheetStk = ss.getSheetByName(SHEET_STOCK);
  if (!sheetEnt || !sheetStk) return;

  var cat = String(categoria || '').trim().toUpperCase();
  var art = String(articulo  || '').trim().toUpperCase();
  var lot = String(lote      || '').trim().toUpperCase();

  // Unidad del stock de este lote (para convertir las entradas si vienen en otra unidad)
  var hStk = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
  var kCat=_colIdx(hStk,'CATEGORIA'), kArt=_colIdx(hStk,'ARTICULO'), kLote=_colIdx(hStk,'LOTE'),
      kEnt=_colIdx(hStk,'ENTRADAS'), kUni=_colIdx(hStk,'UNIDAD');
  var dStk = sheetStk.getDataRange().getValues();
  var filaStk=-1, uniStock='';
  for (var i=1;i<dStk.length;i++){
    var rCat=kCat>=0?String(dStk[i][kCat]||'').trim().toUpperCase():'';
    var rArt=kArt>=0?String(dStk[i][kArt]||'').trim().toUpperCase():'';
    var rLot=kLote>=0?String(dStk[i][kLote]||'').trim().toUpperCase():'';
    if(rCat===cat && rArt===art && rLot===lot){ filaStk=i+1; uniStock=kUni>=0?String(dStk[i][kUni]||''):''; break; }
  }
  if(filaStk<0) return;

  // Sumar todas las entradas de ese lote (convertidas a la unidad del stock)
  var dEnt = sheetEnt.getDataRange().getValues();
  var hEnt = dEnt[0];
  var eCat=_colIdx(hEnt,'CATEGORIA'), eArt=_colIdx(hEnt,'ARTICULO'), eLote=_colIdx(hEnt,'LOTE'),
      eCant=_colIdx(hEnt,'CANTIDAD'), eUni=_colIdx(hEnt,'UNIDAD');
  var totalEnt=0;
  for(var r=1;r<dEnt.length;r++){
    var xCat=eCat>=0?String(dEnt[r][eCat]||'').trim().toUpperCase():'';
    var xArt=eArt>=0?String(dEnt[r][eArt]||'').trim().toUpperCase():'';
    var xLot=eLote>=0?String(dEnt[r][eLote]||'').trim().toUpperCase():'';
    if(xCat===cat && xArt===art && xLot===lot){
      var cant=eCant>=0?(parseFloat(dEnt[r][eCant])||0):0;
      var uni=eUni>=0?String(dEnt[r][eUni]||''):'';
      // convertir a la unidad del stock si difieren
      if(uniStock && uni) cant=_consumoEnUnidadStock(cant, uni, uniStock, articulo);
      totalEnt+=cant;
    }
  }
  if(kEnt>=0) sheetStk.getRange(filaStk, kEnt+1).setValue(totalEnt);
}

// ══════════════════════════════════════════════════════════════════════════
// LIMPIEZA DE BROZA: quitar el doble descuento histórico (salidas de revisados)
// ──────────────────────────────────────────────────────────────────────────
// El bug del doble descuento generó, para cada consumo, DOS salidas en la hoja
// SALIDAS MATERIAL AUXILIAR: una del parte original (ID PARTE = 'P-...') y otra
// del revisado (ID PARTE = 'PR-...'). Esta función BORRA las salidas de los
// revisados (PR-) y recalcula el stock, dejando el consumo contado UNA sola vez
// (la del original), que es lo correcto.
//
// CÓMO USARLA (una sola vez):
//   1) HAZ UNA COPIA DE SEGURIDAD de la hoja antes (Archivo → Hacer una copia).
//   2) En el editor de Apps Script, selecciona 'limpiarSalidasRevisadas' en el
//      desplegable de funciones y pulsa Ejecutar (▶).
//   3) Mira el registro de ejecución (Ver → Registros) para ver cuántas borró.
//
// SEGURA: solo toca la hoja SALIDAS (que solo alimenta el stock auxiliar) y solo
// borra las filas cuyo ID PARTE empieza por 'PR-'. Las de los originales (P-) se
// conservan. Al final recalcula el stock entero desde las salidas que quedan.
// ══════════════════════════════════════════════════════════════════════════
function limpiarSalidasRevisadas() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheetSal = ss.getSheetByName(SHEET_SALIDAS);
  if (!sheetSal) { Logger.log('No existe la hoja SALIDAS.'); return; }

  var data = sheetSal.getDataRange().getValues();
  if (data.length < 2) { Logger.log('La hoja SALIDAS está vacía.'); return; }

  var headers = data[0];
  var cParte = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).toUpperCase().trim() === 'ID PARTE') { cParte = h; break; }
  }
  if (cParte < 0) { Logger.log('No se encontró la columna ID PARTE.'); return; }

  // Recorrer de abajo hacia arriba para poder borrar filas sin descuadrar índices
  var borradas = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    var idParte = String(data[i][cParte] || '').trim().toUpperCase();
    if (idParte.indexOf('PR-') === 0) {
      sheetSal.deleteRow(i + 1);
      borradas++;
    }
  }

  Logger.log('Salidas de revisados (PR-) borradas: ' + borradas);

  // Recalcular todo el stock desde las salidas que quedan (solo originales)
  recomputarConsumoStock();
  Logger.log('Stock recalculado. Limpieza completada.');

  return 'Limpieza OK. Borradas ' + borradas + ' salidas duplicadas (PR-). Stock recalculado.';
}

function recomputarConsumoStock() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheetStk = ss.getSheetByName(SHEET_STOCK);
  var sheetSal = ss.getSheetByName(SHEET_SALIDAS);
  if (!sheetStk) return;

  // (2026-09-10) UNA SOLA LECTURA de la hoja STOCK. Antes se leía dos veces
  // seguidas (una para las unidades y otra para el recálculo) sin que nada la
  // cambiara entre medias: son los mismos datos.
  var dStk = sheetStk.getDataRange().getValues();
  if (dStk.length < 1) return;
  var hS = dStk[0];
  var sCat = _colIdx(hS, 'CATEGORIA'), sArt = _colIdx(hS, 'ARTICULO'), sLote = _colIdx(hS, 'LOTE');
  var sEnt = _colIdx(hS, 'ENTRADAS'), sCons = _colIdx(hS, 'CONSUMO'), sStk = _colIdx(hS, 'STOCK ACTUAL');

  // ── LAS SALIDAS SE CONVIERTEN A LA UNIDAD DE CADA FICHA  (2026-08-15) ──
  // Aquí se sumaban las cantidades EN CRUDO, sin mirar la unidad. Las salidas de
  // envasado se guardan en GRAMOS (10 g por cuña) y la ficha del aceite está en
  // LITROS: 9.360 g se sumaban como 9.360 L. Por eso el lote L1G130428 salía con
  // 64.440 L consumidos de una entrada de 675 L, y el stock en -63.765.
  //
  // El descuento del momento (_aplicarConsumoStock) sí convertía bien; era este
  // recálculo el que lo deshacía. Y se ejecuta cada vez que se edita o borra una
  // entrada, así que bastaba con tocar una entrada para corromper el stock.
  //
  // Ahora cada salida se pasa a la unidad de SU ficha antes de sumarla, con la
  // misma función que usa el descuento normal.
  var uniStock = {};
  var sUni = _colIdx(hS, 'UNIDAD');
  for (var u = 1; u < dStk.length; u++) {
    var ku = [
      sCat  >= 0 ? String(dStk[u][sCat]  || '').trim().toUpperCase() : '',
      sArt  >= 0 ? String(dStk[u][sArt]  || '').trim().toUpperCase() : '',
      sLote >= 0 ? String(dStk[u][sLote] || '').trim().toUpperCase() : ''
    ].join('|');
    uniStock[ku] = sUni >= 0 ? String(dStk[u][sUni] || '').trim() : '';
  }

  var consumos = {};
  if (sheetSal) {
    var dSal = sheetSal.getDataRange().getValues();
    if (dSal.length >= 2) {
      var hSal = dSal[0];
      var xCat = _colIdx(hSal, 'CATEGORIA'), xArt = _colIdx(hSal, 'ARTICULO'),
          xLote = _colIdx(hSal, 'LOTE'), xCant = _colIdx(hSal, 'CANTIDAD'),
          xUni = _colIdx(hSal, 'UNIDAD');
      for (var i = 1; i < dSal.length; i++) {
        var k = [
          xCat  >= 0 ? String(dSal[i][xCat]  || '').trim().toUpperCase() : '',
          xArt  >= 0 ? String(dSal[i][xArt]  || '').trim().toUpperCase() : '',
          xLote >= 0 ? String(dSal[i][xLote] || '').trim().toUpperCase() : ''
        ].join('|');
        var cantSal = xCant >= 0 ? (parseFloat(dSal[i][xCant]) || 0) : 0;
        var uniSal  = xUni  >= 0 ? String(dSal[i][xUni] || '').trim() : '';
        // Si la salida trae unidad y la ficha también, se convierte. Si falta
        // alguna de las dos, se suma tal cual (como antes) para no inventar.
        if (uniSal && uniStock[k]) cantSal = _consumoEnUnidadStock(cantSal, uniSal, uniStock[k], xArt >= 0 ? dSal[i][xArt] : '');
        consumos[k] = (consumos[k] || 0) + cantSal;
      }
    }
  }

  // ── ESCRITURA EN BLOQUE  (2026-09-10) ──
  // Antes se escribía CELDA A CELDA: dos escrituras por cada lote del stock
  // (CONSUMO y STOCK ACTUAL). Con cientos de lotes eran cientos de llamadas a la
  // hoja, y todo ese rato con el candado de escritura echado: los registros de
  // los operarios se quedaban esperando. Ahora se calculan las dos columnas en
  // memoria y se escriben de UNA vez cada una. Mismos valores, mismas filas.
  var n = dStk.length - 1;
  if (n < 1) return;
  var colCons = [], colStk = [];
  for (var r = 1; r < dStk.length; r++) {
    var key = [
      sCat  >= 0 ? String(dStk[r][sCat]  || '').trim().toUpperCase() : '',
      sArt  >= 0 ? String(dStk[r][sArt]  || '').trim().toUpperCase() : '',
      sLote >= 0 ? String(dStk[r][sLote] || '').trim().toUpperCase() : ''
    ].join('|');
    var cons = consumos[key] || 0;
    var ent  = sEnt >= 0 ? (parseFloat(dStk[r][sEnt]) || 0) : 0;
    colCons.push([cons]);
    colStk.push([ent - cons]);
  }
  if (sCons >= 0) sheetStk.getRange(2, sCons + 1, n, 1).setValues(colCons);
  if (sStk  >= 0) sheetStk.getRange(2, sStk  + 1, n, 1).setValues(colStk);
}

function leerIngredientesParte(idParte) {
  var vacio = {auxiliares: [], fermentos: [], cuajo: null};
  if (!idParte) return vacio;
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SALIDAS);
  if (!sheet) return vacio;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return vacio;
  var headers = data[0];
  var cCat = _colIdx(headers, 'CATEGORIA');
  var cArt = _colIdx(headers, 'ARTICULO');
  var cProv = _colIdx(headers, 'PROVEEDOR');
  var cLote = _colIdx(headers, 'LOTE');
  var cCant = _colIdx(headers, 'CANTIDAD');
  var cUni = _colIdx(headers, 'UNIDAD');
  var cParte = _colIdx(headers, 'ID PARTE');
  if (cParte < 0) return vacio;
  var res = {auxiliares: [], fermentos: [], cuajo: null, cuajos_extra: []};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][cParte] || '').trim() !== idParte) continue;
    var ing = {
      nombre:        cArt  >= 0 ? data[i][cArt]  : '',
      consumo_total: cCant >= 0 ? (parseFloat(data[i][cCant]) || 0) : 0,
      lote:          cLote >= 0 ? data[i][cLote] : '',
      proveedor:     cProv >= 0 ? data[i][cProv] : '',
      unidad:        cUni  >= 0 ? data[i][cUni]  : ''
    };
    var cat = cCat >= 0 ? String(data[i][cCat] || '').toUpperCase().trim() : '';
    if      (cat === 'AUXILIAR FABRICACION') res.auxiliares.push(ing);
    else if (cat === 'FERMENTO') res.fermentos.push(ing);
    else if (cat === 'CUAJO') {
      // El cuajo puede venir repartido en dos lotes (v2.6.319): el primero va en
      // 'cuajo' y el resto en 'cuajos_extra', igual que lo manda la app.
      if (!res.cuajo) res.cuajo = ing;
      else res.cuajos_extra.push(ing);
    }
  }
  return res;
}

// ══════════════════════════════════════════════
// OPERARIOS Y PERMISOS  (hoja LISTADO OPERARIOS)
// ══════════════════════════════════════════════

function _normTxt(h) {
  return String(h == null ? '' : h)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ªº]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

function _boolCol(v) {
  var s = _normTxt(v);
  return (v === true || s === 'TRUE' || s === '1' || s === 'SI' || s === 'X' || s === 'VERDADERO');
}

function leerOperarios() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_OPERARIOS);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var col = {};
  for (var i = 0; i < headers.length; i++) { col[_normTxt(headers[i])] = i; }
  function g(row, name)  { var i = col[name]; return (i === undefined) ? '' : row[i]; }
  function gb(row, name) { var i = col[name]; return (i === undefined) ? false : _boolCol(row[i]); }
  var res = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var nombre = String(g(row, 'NOMBRE') || '').trim();
    if (!nombre) continue;
    var rol = String(g(row, 'ROL') || '').toUpperCase().trim();
    var rolSep = ' ' + rol.replace(/[\/,;|\.\-]+/g,' ').replace(/\s+/g,' ').trim() + ' ';
    var esAdminRol = rolSep.indexOf(' ADMIN ') >= 0;
    res.push({
      n:    nombre,
      pin:  String(g(row, 'PIN') || '').trim(),
      rol:  rol,
      stock: esAdminRol,
      plan:  gb(row, 'ACCESO PLAN DE TRABAJO'),
      scan:  gb(row, 'ACCESO SCANEO RAPIDO'),
      partes: gb(row, 'ACCESO PARTES'),
      planalmacen: gb(row, 'ACCESO PLAN ALMACEN'),
      p: {
        capa1:      gb(row, 'ACCESO 1 CAPA')      ? 1 : 0,
        volteo:     gb(row, 'ACCESO VOLTEO')      ? 1 : 0,
        movimiento: gb(row, 'ACCESO MOVIMIENTO')  ? 1 : 0,
        capa2:      gb(row, 'ACCESO 2 CAPA')      ? 1 : 0,
        pintura:    gb(row, 'ACCESO PINTURA')     ? 1 : 0,
        envasado:   gb(row, 'ACCESO ENVASADO')    ? 1 : 0
      }
    });
  }
  return res;
}

// ══════════════════════════════════════════════
// RECETAS
// ══════════════════════════════════════════════

function leerRecetas() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_RECETAS);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var recetasMap = {};
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    headers.forEach(function(h, j){ obj[h] = data[i][j]; });
    var rid = obj['ID'];
    if (!recetasMap[rid]) {
      recetasMap[rid] = { id: rid, tipo: obj['TIPO'], variedad: obj['VARIEDAD'], auxiliares: [], fermentos: [], cuajo: null };
    }
    var tipoP = (obj['TIPO PRODUCTO'] || '').toString().toUpperCase();
    var ing = {nombre: obj['PRODUCTO'], dosis_ml_1000L: parseFloat(obj['DOSIS ML 1000L']) || 0};
    if      (tipoP === 'AUXILIAR FABRICACION') recetasMap[rid].auxiliares.push(ing);
    else if (tipoP === 'FERMENTO') recetasMap[rid].fermentos.push(ing);
    else if (tipoP === 'CUAJO')    recetasMap[rid].cuajo = ing;
  }
  return Object.values(recetasMap);
}

function gestionarRecetas(payload) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_RECETAS);
  var id = String(payload['id'] || '').trim();
  if (payload['_DELETE']) {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).trim() === id) sheet.deleteRow(i + 1);
    }
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }
  if (id) {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).trim() === id) sheet.deleteRow(i + 1);
    }
  }
  var tipo     = payload['tipo']     || '';
  var variedad = payload['variedad'] || '';
  function insertarIng(nombre, tipoP, dosis) { sheet.appendRow([id, tipo, variedad, nombre, tipoP, dosis]); }
  (payload['auxiliares'] || []).forEach(function(a){ insertarIng(a.nombre, 'AUXILIAR FABRICACION', a.dosis_ml_1000L); });
  (payload['fermentos']  || []).forEach(function(f){ insertarIng(f.nombre, 'FERMENTO', f.dosis_ml_1000L); });
  if (payload['cuajo']) insertarIng(payload['cuajo'].nombre, 'CUAJO', payload['cuajo'].dosis_ml_1000L);
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}

function leerHojaCompleta(nombreHoja) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(nombreHoja);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i){ obj[h] = row[i]; });
    return obj;
  });
}

function getMaterialAuxiliar() {
  return {
    stock:    leerHojaCompleta(SHEET_STOCK),
    entradas: leerHojaCompleta(SHEET_ENTRADAS),
    salidas:  leerHojaCompleta(SHEET_SALIDAS)
  };
}

// ══════════════════════════════════════════════
// ENTRADAS MATERIAL AUXILIAR (+ actualización STOCK)
// ══════════════════════════════════════════════

function gestionarEntradas(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheetEnt = ss.getSheetByName(SHEET_ENTRADAS);
  var sheetStk = ss.getSheetByName(SHEET_STOCK);
  if (!sheetEnt) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'No existe ENTRADAS'})).setMimeType(ContentService.MimeType.JSON);

  var headersEnt = sheetEnt.getRange(1, 1, 1, sheetEnt.getLastColumn()).getValues()[0];

  // ─── ELIMINAR una entrada existente ───
  // Borra la fila de ENTRADAS por su ID y recalcula el stock del lote (entradas
  // totales + consumo + stock actual). Para corregir entradas mal metidas
  // (duplicadas, lote/artículo equivocado, etc.) que no se arreglan editando.
  if (payload['_DELETE']) {
    var idDel = String(payload.id || payload['ID ENTRADA'] || '').trim();
    if (!idDel) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Falta ID de entrada'})).setMimeType(ContentService.MimeType.JSON);
    var dDel = sheetEnt.getDataRange().getValues();
    var cIdDel = -1;
    for (var hd = 0; hd < headersEnt.length; hd++) {
      if (String(headersEnt[hd]).toUpperCase().trim() === 'ID ENTRADA') { cIdDel = hd; break; }
    }
    if (cIdDel < 0) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'No hay columna ID ENTRADA'})).setMimeType(ContentService.MimeType.JSON);
    // Guardar cat/art/lote de esa entrada ANTES de borrarla (para recalcular su stock)
    var cCatD=_colIdx(headersEnt,'CATEGORIA'), cArtD=_colIdx(headersEnt,'ARTICULO'), cLoteD=_colIdx(headersEnt,'LOTE');
    var catD='', artD='', loteD='', filaDel=-1;
    for (var rd = 1; rd < dDel.length; rd++) {
      if (String(dDel[rd][cIdDel]).trim() === idDel) {
        catD  = cCatD>=0?String(dDel[rd][cCatD]||''):'';
        artD  = cArtD>=0?String(dDel[rd][cArtD]||''):'';
        loteD = cLoteD>=0?String(dDel[rd][cLoteD]||''):'';
        filaDel = rd + 1;
        break;
      }
    }
    if (filaDel < 0) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Entrada no encontrada'})).setMimeType(ContentService.MimeType.JSON);
    sheetEnt.deleteRow(filaDel);
    // Recalcular las entradas totales del lote en STOCK y el stock actual
    _recalcularEntradasLoteEnStock(catD, artD, loteD);
    recomputarConsumoStock();
    return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'entrada_eliminada'})).setMimeType(ContentService.MimeType.JSON);
  }

  // ─── EDICIÓN de una entrada existente (solo campos NO críticos) ───
  // NO se tocan LOTE ni ARTICULO (romperían la vinculación con las salidas).
  // Aquí: caducidad, albarán, observaciones, cantidad, unidad y el control de
  // recepción (estado, etiqueta, camión, temperatura, acciones, firma).
  if (payload['_UPDATE']) {
    var idBuscar = String(payload.id || payload['ID ENTRADA'] || '').trim();
    if (!idBuscar) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Falta ID de entrada'})).setMimeType(ContentService.MimeType.JSON);
    var dataEnt = sheetEnt.getDataRange().getValues();
    var cId = -1;
    for (var h = 0; h < headersEnt.length; h++) {
      if (String(headersEnt[h]).toUpperCase().trim() === 'ID ENTRADA') { cId = h; break; }
    }
    if (cId < 0) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'No hay columna ID ENTRADA'})).setMimeType(ContentService.MimeType.JSON);
    var filaEnt = -1;
    for (var r = 1; r < dataEnt.length; r++) {
      if (String(dataEnt[r][cId]).trim() === idBuscar) { filaEnt = r + 1; break; }
    }
    if (filaEnt < 0) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Entrada no encontrada'})).setMimeType(ContentService.MimeType.JSON);

    // Mapa de campos EDITABLES → valor entrante
    // La CANTIDAD ahora TAMBIÉN es editable (para corregir errores de peso/unidad,
    // ej. se puso 2.3 g en vez de 2300 g). Al cambiarla, se recalcula el stock del lote.
    // LOTE y ARTICULO siguen SIN poder cambiarse (romperían la vinculación con salidas).
    var editables = {
      'CADUCIDAD':            payload.caducidad,
      'ALBARAN':              payload.albaran,
      'OBSERVACIONES':        payload.obs,
      'OBSERVACION':          payload.obs,
      'OBS':                  payload.obs,
      'ESTADO':               payload.estado,
      'ETIQUETA':             payload.etiqueta,
      'CONDICIONES CAMION':   payload.camion,
      'TEMP CAMION':          payload.temp,
      'ACCIONES CORRECTORAS': payload.acciones,
      'FIRMA':                payload.firma,
      'FECHA ENTRADA':        payload.fentrada,
      'PROVEEDOR':            payload.proveedor,
      'CANTIDAD':             payload.cantidad,
      'UNIDAD':               payload.unidad
    };
    for (var c = 0; c < headersEnt.length; c++) {
      var key = String(headersEnt[c]).toUpperCase().trim();
      if (editables.hasOwnProperty(key) && editables[key] !== undefined) {
        // Caducidad y Fecha entrada como TEXTO (evitan el desfase de zona horaria)
        if (key === 'CADUCIDAD' || key === 'FECHA ENTRADA') {
          _escribirCaducidadTexto(sheetEnt, filaEnt, c, editables[key]);
        } else if (key === 'CANTIDAD') {
          // (2026-09-25) Número, nunca texto. Ver _escribirNumero().
          // Y si no viene un número válido (casilla vacía porque la pantalla no
          // la pudo pintar, dato raro...), NO SE TOCA LA CELDA. Borrar la
          // cantidad de una entrada por un formulario que llegó vacío sería
          // peor que no hacer nada: se perdería el dato bueno sin avisar.
          _escribirNumero(sheetEnt, filaEnt, c, editables[key]);
        } else {
          sheetEnt.getRange(filaEnt, c + 1).setValue(editables[key]);
        }
      }
    }

    // Datos del lote de esta entrada (para propagar los cambios a la ficha de STOCK)
    var _catU = String(payload.categoria || dataEnt[filaEnt-1][_colIdx(headersEnt,'CATEGORIA')] || '').trim();
    var _artU = String(payload.articulo  || dataEnt[filaEnt-1][_colIdx(headersEnt,'ARTICULO')]  || '').trim();
    var _lotU = String(payload.lote      || dataEnt[filaEnt-1][_colIdx(headersEnt,'LOTE')]      || '').trim();

    // Propagar CADUCIDAD, UNIDAD y PROVEEDOR a la ficha de STOCK de ese lote.
    // Antes solo se escribían en ENTRADAS, así que si corregías una caducidad, la
    // hoja de STOCK se quedaba con la vieja y el parte seguía mostrando la mala.
    if (sheetStk && _lotU) {
      try {
        var _hS = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
        var _sCat=_colIdx(_hS,'CATEGORIA'), _sArt=_colIdx(_hS,'ARTICULO'), _sLote=_colIdx(_hS,'LOTE'),
            _sCad=_colIdx(_hS,'CADUCIDAD'), _sUni=_colIdx(_hS,'UNIDAD'), _sProv=_colIdx(_hS,'PROVEEDOR');
        var _dS = sheetStk.getDataRange().getValues();
        var _fS = -1;
        for (var _i = 1; _i < _dS.length; _i++) {
          var _rc = _sCat >=0 ? String(_dS[_i][_sCat] ||'').trim().toUpperCase() : '';
          var _ra = _sArt >=0 ? String(_dS[_i][_sArt] ||'').trim().toUpperCase() : '';
          var _rl = _sLote>=0 ? String(_dS[_i][_sLote]||'').trim().toUpperCase() : '';
          if (_rc === _catU.toUpperCase() && _ra === _artU.toUpperCase() && _rl === _lotU.toUpperCase()) { _fS = _i + 1; break; }
        }
        if (_fS > 0) {
          if (_sCad  >= 0 && payload.caducidad !== undefined) _escribirCaducidadTexto(sheetStk, _fS, _sCad, payload.caducidad);
          if (_sUni  >= 0 && payload.unidad    !== undefined && payload.unidad    !== '') sheetStk.getRange(_fS, _sUni +1).setValue(payload.unidad);
          if (_sProv >= 0 && payload.proveedor !== undefined && payload.proveedor !== '') sheetStk.getRange(_fS, _sProv+1).setValue(payload.proveedor);
        }
      } catch (e) {}
    }

    // Si se cambió la CANTIDAD, recalcular las ENTRADAS totales de ese lote en STOCK
    // y luego el consumo/stock actual. Así el stock queda cuadrado tras la corrección.
    if (payload.cantidad !== undefined && payload.cantidad !== null && payload.cantidad !== '') {
      _recalcularEntradasLoteEnStock(_catU, _artU, _lotU);
      recomputarConsumoStock();
    }
    // (2026-09-25) Si la UNIDAD cambia (p.ej. de "unidades" a "L"), el stock de ese
    // lote hay que recalcularlo también: los consumos de los partes se convierten
    // usando esa unidad, y con la vieja estaban mal. Es lo que dejó 1200 L de
    // cloruro/cuajo descontados en vez de 1,2.
    if (payload.unidad !== undefined && payload.unidad !== null && String(payload.unidad).trim() !== '') {
      recomputarConsumoStock();
    }
    return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'entrada_actualizada', fila:filaEnt})).setMimeType(ContentService.MimeType.JSON);
  }

  var valoresPorCabecera = {
    'ID ENTRADA': payload.id        || '',
    'FECHA':      payload.fecha     || '',
    'ALBARAN':    payload.albaran   || '',
    'PROVEEDOR':  payload.proveedor || '',
    'CATEGORIA':  payload.categoria || '',
    'ARTICULO':   payload.articulo  || '',
    'LOTE':       payload.lote      || '',
    'CANTIDAD':   (_numeroSheets(payload.cantidad) === null ? 0 : _numeroSheets(payload.cantidad)),
    'UNIDAD':     payload.unidad    || '',
    'CADUCIDAD':  payload.caducidad || '',
    'OBSERVACIONES': payload.obs    || '',
    'OBSERVACION':   payload.obs    || '',
    'OBS':           payload.obs    || '',
    'OPERARIO':   payload.operario  || '',
    'MOTIVO':     payload.obs       || '',
    'ESTADO':               payload.estado   || '',
    'ETIQUETA':             payload.etiqueta || '',
    'CONDICIONES CAMION':   payload.camion   || '',
    'TEMP CAMION':          payload.temp     || '',
    'ACCIONES CORRECTORAS': payload.acciones || '',
    'FIRMA':                payload.firma    || '',
    'FECHA ENTRADA':        payload.fentrada || ''
  };
  var fila = headersEnt.map(function(h) {
    var key = String(h).toUpperCase().trim();
    return valoresPorCabecera[key] !== undefined ? valoresPorCabecera[key] : '';
  });
  sheetEnt.appendRow(fila);

  // (2026-08-12) La fila recién insertada se localiza por su ID ENTRADA, no con
  // getLastRow(): si otra escritura mete una fila entre medias, la caducidad y la
  // fecha de entrada se escribían en la fila equivocada.
  SpreadsheetApp.flush();
  var _cIdEnt = _colIdx(headersEnt, 'ID ENTRADA');
  var _filaNuevaEnt = (_cIdEnt >= 0)
      ? _filaPorValor(sheetEnt, _cIdEnt, payload.id || '')
      : sheetEnt.getLastRow();
  if (_filaNuevaEnt < 0) _filaNuevaEnt = sheetEnt.getLastRow();

  // Caducidad de la ENTRADA recién insertada: guardarla como TEXTO (evita desfase)
  var idxCadEnt = -1;
  for (var ce = 0; ce < headersEnt.length; ce++) {
    if (String(headersEnt[ce]).toUpperCase().trim() === 'CADUCIDAD') { idxCadEnt = ce; break; }
  }
  if (idxCadEnt >= 0 && payload.caducidad) _escribirCaducidadTexto(sheetEnt, _filaNuevaEnt, idxCadEnt, payload.caducidad);
  // FECHA ENTRADA (día real de recepción): guardarla como TEXTO para que Google
  // no la interprete como fecha y no reste un día por zona horaria (mismo truco
  // que la caducidad). El campo llega en formato ISO (yyyy-mm-dd) desde la app.
  var idxFentEnt = -1;
  for (var fe = 0; fe < headersEnt.length; fe++) {
    if (String(headersEnt[fe]).toUpperCase().trim() === 'FECHA ENTRADA') { idxFentEnt = fe; break; }
  }
  if (idxFentEnt >= 0 && payload.fentrada) _escribirCaducidadTexto(sheetEnt, _filaNuevaEnt, idxFentEnt, payload.fentrada);

  if (sheetStk) {
    var headersStk = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
    var idxCat=-1,idxArt=-1,idxProv=-1,idxLote=-1,idxEnt=-1,idxConsumo=-1,idxStock=-1,idxAlerta=-1,idxUnidad=-1,idxCad=-1;
    for (var k = 0; k < headersStk.length; k++) {
      var h = String(headersStk[k]).toUpperCase().trim();
      if      (h==='CATEGORIA')    idxCat    =k;
      else if (h==='ARTICULO')     idxArt    =k;
      else if (h==='PROVEEDOR')    idxProv   =k;
      else if (h==='LOTE')         idxLote   =k;
      else if (h==='ENTRADAS')     idxEnt    =k;
      else if (h==='CONSUMO')      idxConsumo=k;
      else if (h==='STOCK ACTUAL') idxStock  =k;
      else if (h==='ALERTA MINIMO')idxAlerta =k;
      else if (h==='UNIDAD')       idxUnidad =k;
      else if (h==='CADUCIDAD')    idxCad    =k;
    }
    var dataStk = sheetStk.getDataRange().getValues();
    var filaStock = -1;
    for (var i = 1; i < dataStk.length; i++) {
      var mismaCat  = idxCat  < 0 || String(dataStk[i][idxCat]).trim()  === String(payload.categoria||'').trim();
      var mismoArt  = idxArt  < 0 || String(dataStk[i][idxArt]).trim()  === String(payload.articulo||'').trim();
      var mismoLote = idxLote < 0 || String(dataStk[i][idxLote]).trim() === String(payload.lote||'').trim();
      if (mismaCat && mismoArt && mismoLote) { filaStock = i + 1; break; }
    }
    var cantNueva = parseFloat(payload.cantidad) || 0;
    if (filaStock > 0) {
      var entradasActuales = idxEnt     >= 0 ? (parseFloat(dataStk[filaStock-1][idxEnt])     || 0) : 0;
      var consumoActual    = idxConsumo >= 0 ? (parseFloat(dataStk[filaStock-1][idxConsumo]) || 0) : 0;
      var nuevasEntradas   = entradasActuales + cantNueva;
      if (idxEnt    >= 0) sheetStk.getRange(filaStock, idxEnt    +1).setValue(nuevasEntradas);
      if (idxStock  >= 0) sheetStk.getRange(filaStock, idxStock  +1).setValue(nuevasEntradas - consumoActual);
      if (idxUnidad >= 0 && payload.unidad)    sheetStk.getRange(filaStock, idxUnidad+1).setValue(payload.unidad);
      if (idxCad    >= 0 && payload.caducidad) _escribirCaducidadTexto(sheetStk, filaStock, idxCad, payload.caducidad);
      if (idxProv   >= 0 && payload.proveedor) sheetStk.getRange(filaStock, idxProv  +1).setValue(payload.proveedor);
    } else {
      var nuevaFila = headersStk.map(function(h){
        var key = String(h).toUpperCase().trim();
        if (key==='CATEGORIA')     return payload.categoria || '';
        if (key==='ARTICULO')      return payload.articulo  || '';
        if (key==='PROVEEDOR')     return payload.proveedor || '';
        if (key==='LOTE')          return payload.lote      || '';
        if (key==='ENTRADAS')      return cantNueva;
        if (key==='CONSUMO')       return 0;
        if (key==='STOCK ACTUAL')  return cantNueva;
        if (key==='ALERTA MINIMO') return '';
        if (key==='UNIDAD')        return payload.unidad    || '';
        if (key==='CADUCIDAD')     return '';
        return '';
      });
      sheetStk.appendRow(nuevaFila);
      // Caducidad de la nueva fila de STOCK como TEXTO (evita desfase).
      // (2026-08-12) Se localiza la fila por su LOTE en vez de con getLastRow().
      if (idxCad >= 0 && payload.caducidad) {
        SpreadsheetApp.flush();
        var _fStkNueva = (idxLote >= 0)
            ? _filaPorValor(sheetStk, idxLote, payload.lote || '')
            : sheetStk.getLastRow();
        if (_fStkNueva < 0) _fStkNueva = sheetStk.getLastRow();
        _escribirCaducidadTexto(sheetStk, _fStkNueva, idxCad, payload.caducidad);
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ok:true, id: payload.id})).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════
// STOCK MATERIAL AUXILIAR (UPDATE / DELETE)
// ══════════════════════════════════════════════

function gestionarStock(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheetStk = ss.getSheetByName(SHEET_STOCK);
  if (!sheetStk) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'No existe STOCK'})).setMimeType(ContentService.MimeType.JSON);

  var headers = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
  var idxCat=-1, idxArt=-1, idxProv=-1, idxLote=-1, idxEnt=-1, idxConsumo=-1, idxStock=-1, idxAlerta=-1, idxUnidad=-1, idxCad=-1;
  for (var k = 0; k < headers.length; k++) {
    var h = String(headers[k]).toUpperCase().trim();
    if      (h==='CATEGORIA')    idxCat    =k;
    else if (h==='ARTICULO')     idxArt    =k;
    else if (h==='PROVEEDOR')    idxProv   =k;
    else if (h==='LOTE')         idxLote   =k;
    else if (h==='ENTRADAS')     idxEnt    =k;
    else if (h==='CONSUMO')      idxConsumo=k;
    else if (h==='STOCK ACTUAL') idxStock  =k;
    else if (h==='ALERTA MINIMO')idxAlerta =k;
    else if (h==='UNIDAD')       idxUnidad =k;
    else if (h==='CADUCIDAD')    idxCad    =k;
  }

  var oCat  = String(payload._categoria_orig || payload.categoria  || '').trim().toUpperCase();
  var oArt  = String(payload._articulo_orig  || payload.articulo   || '').trim().toUpperCase();
  var oLote = String(payload._lote_orig      || payload.lote       || '').trim().toUpperCase();

  var data = sheetStk.getDataRange().getValues();
  var fila = -1;
  for (var i = 1; i < data.length; i++) {
    var rCat  = idxCat  >= 0 ? String(data[i][idxCat] ||'').trim().toUpperCase() : '';
    var rArt  = idxArt  >= 0 ? String(data[i][idxArt] ||'').trim().toUpperCase() : '';
    var rLote = idxLote >= 0 ? String(data[i][idxLote]||'').trim().toUpperCase() : '';
    if (rCat === oCat && rArt === oArt && rLote === oLote) {
      fila = i + 1; break;
    }
  }
  if (fila < 0) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Fila no encontrada en STOCK (cat='+oCat+' art='+oArt+' lote='+oLote+')'})).setMimeType(ContentService.MimeType.JSON);

  if (payload['_DELETE']) {
    sheetStk.deleteRow(fila);
    var borradasEnt = 0;
    try {
      var sheetEnt = ss.getSheetByName(SHEET_ENTRADAS);
      if (sheetEnt) {
        var hE = sheetEnt.getRange(1, 1, 1, sheetEnt.getLastColumn()).getValues()[0];
        var eCat=-1,eArt=-1,eLote=-1;
        for (var k2 = 0; k2 < hE.length; k2++) {
          var hh = String(hE[k2]).toUpperCase().trim();
          if      (hh==='CATEGORIA') eCat =k2;
          else if (hh==='ARTICULO')  eArt =k2;
          else if (hh==='LOTE')      eLote=k2;
        }
        var dE = sheetEnt.getDataRange().getValues();
        for (var j = dE.length - 1; j >= 1; j--) {
          var jCat  = eCat  >= 0 ? String(dE[j][eCat] ||'').trim().toUpperCase() : '';
          var jArt  = eArt  >= 0 ? String(dE[j][eArt] ||'').trim().toUpperCase() : '';
          var jLote = eLote >= 0 ? String(dE[j][eLote]||'').trim().toUpperCase() : '';
          if (jCat === oCat && jArt === oArt && jLote === oLote) {
            sheetEnt.deleteRow(j + 1);
            borradasEnt++;
          }
        }
      }
    } catch (e) {}
    return ContentService.createTextOutput(JSON.stringify({ok:true, action:'DELETE', fila:fila, entradasBorradas:borradasEnt})).setMimeType(ContentService.MimeType.JSON);
  }

  if (payload['_UPDATE']) {
    if (idxCat    >= 0 && payload.categoria    !== undefined) sheetStk.getRange(fila, idxCat   +1).setValue(payload.categoria);
    if (idxArt    >= 0 && payload.articulo     !== undefined) sheetStk.getRange(fila, idxArt   +1).setValue(payload.articulo);
    if (idxProv   >= 0 && payload.proveedor    !== undefined) sheetStk.getRange(fila, idxProv  +1).setValue(payload.proveedor);
    if (idxLote   >= 0 && payload.lote         !== undefined) sheetStk.getRange(fila, idxLote  +1).setValue(payload.lote);
    if (idxStock  >= 0 && payload.stockActual  !== undefined) sheetStk.getRange(fila, idxStock +1).setValue(parseFloat(payload.stockActual)||0);
    if (idxAlerta >= 0 && payload.alertaMinimo !== undefined) sheetStk.getRange(fila, idxAlerta+1).setValue(parseFloat(payload.alertaMinimo)||0);
    if (idxUnidad >= 0 && payload.unidad       !== undefined) sheetStk.getRange(fila, idxUnidad+1).setValue(payload.unidad);
    if (idxCad    >= 0 && payload.caducidad    !== undefined) _escribirCaducidadTexto(sheetStk, fila, idxCad, payload.caducidad);

    var actualizadasEnt = 0;
    try {
      var sheetEnt2 = ss.getSheetByName(SHEET_ENTRADAS);
      if (sheetEnt2) {
        var hE2 = sheetEnt2.getRange(1, 1, 1, sheetEnt2.getLastColumn()).getValues()[0];
        var e2Cat=-1,e2Art=-1,e2Prov=-1,e2Lote=-1,e2Uni=-1,e2Cad=-1;
        for (var k3 = 0; k3 < hE2.length; k3++) {
          var hh2 = String(hE2[k3]).toUpperCase().trim();
          if      (hh2==='CATEGORIA') e2Cat =k3;
          else if (hh2==='ARTICULO')  e2Art =k3;
          else if (hh2==='PROVEEDOR') e2Prov=k3;
          else if (hh2==='LOTE')      e2Lote=k3;
          else if (hh2==='UNIDAD')    e2Uni =k3;
          else if (hh2==='CADUCIDAD') e2Cad =k3;
        }
        var dE2 = sheetEnt2.getDataRange().getValues();
        for (var jj = 1; jj < dE2.length; jj++) {
          var jjCat  = e2Cat  >= 0 ? String(dE2[jj][e2Cat] ||'').trim().toUpperCase() : '';
          var jjArt  = e2Art  >= 0 ? String(dE2[jj][e2Art] ||'').trim().toUpperCase() : '';
          var jjLote = e2Lote >= 0 ? String(dE2[jj][e2Lote]||'').trim().toUpperCase() : '';
          if (jjCat === oCat && jjArt === oArt && jjLote === oLote) {
            if (e2Cat  >= 0 && payload.categoria  !== undefined) sheetEnt2.getRange(jj+1, e2Cat +1).setValue(payload.categoria);
            if (e2Art  >= 0 && payload.articulo   !== undefined) sheetEnt2.getRange(jj+1, e2Art +1).setValue(payload.articulo);
            if (e2Prov >= 0 && payload.proveedor  !== undefined) sheetEnt2.getRange(jj+1, e2Prov+1).setValue(payload.proveedor);
            if (e2Lote >= 0 && payload.lote       !== undefined) sheetEnt2.getRange(jj+1, e2Lote+1).setValue(payload.lote);
            if (e2Uni  >= 0 && payload.unidad     !== undefined) sheetEnt2.getRange(jj+1, e2Uni +1).setValue(payload.unidad);
            if (e2Cad  >= 0 && payload.caducidad  !== undefined) _escribirCaducidadTexto(sheetEnt2, jj+1, e2Cad, payload.caducidad);
            actualizadasEnt++;
          }
        }
      }
    } catch (e) {}

    return ContentService.createTextOutput(JSON.stringify({ok:true, action:'UPDATE', fila:fila, entradasActualizadas:actualizadasEnt})).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Falta _UPDATE o _DELETE'})).setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────────────────────────────
// SALIDAS DE ENVASADO
// ──────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════
// DEVOLVER AL STOCK AL BORRAR UN ENVASADO / CAMBIO DE BOBINA   (2026-07-28)
// ──────────────────────────────────────────────────────────────────────────
// Cuando se borra un registro de REGISTRO TOTAL que había consumido material
// auxiliar (un envasado con aceite/trufa, o un cambio de bobina), hasta ahora
// solo se borraba la fila: el descuento del stock se quedaba puesto para
// siempre y había que corregirlo a mano.
//
// OJO CON LAS UNIDADES. Las salidas de envasado se guardan en la hoja con la
// cantidad TAL CUAL la manda la app (p.ej. 1500 g de aceite), mientras que el
// descuento del stock se hizo ya convertido a la unidad de la ficha (1,5 kg).
// Por eso aquí se le pasa la UNIDAD de la fila a _aplicarConsumoStock: hace la
// conversión exacta a la inversa. Sin esto, devolver 1500 g a una ficha en kg
// dejaría el stock disparado x1000.
//
// NO toca las salidas de los partes de fabricación: esas las gestiona
// _borrarSalidasParte, que funciona distinto (guarda la cantidad ya convertida).
// Devuelve cuántas filas de salida ha revertido.
// ══════════════════════════════════════════════════════════════════════════
function _borrarSalidasEnvasado(idEnvasado, devolverStock) {
  var id = String(idEnvasado || '').trim();
  if (!id) return 0;
  var revertir = (devolverStock !== false);
  var sheetSal = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SALIDAS);
  if (!sheetSal) return 0;
  var data = sheetSal.getDataRange().getValues();
  if (data.length < 2) return 0;
  var headers = data[0];
  var cCat   = _colIdx(headers, 'CATEGORIA');
  var cArt   = _colIdx(headers, 'ARTICULO');
  var cLote  = _colIdx(headers, 'LOTE');
  var cCant  = _colIdx(headers, 'CANTIDAD');
  var cUni   = _colIdx(headers, 'UNIDAD');
  var cMot   = _colIdx(headers, 'MOTIVO');
  var cParte = _colIdx(headers, 'ID PARTE');
  if (cParte < 0) return 0;

  var n = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][cParte] || '').trim() !== id) continue;
    // Candado: si por lo que sea la fila es de un parte, ni tocarla.
    var mot = cMot >= 0 ? String(data[i][cMot] || '').toUpperCase() : '';
    if (mot.indexOf('PARTE') >= 0) continue;
    if (revertir) {
      var cat  = cCat  >= 0 ? data[i][cCat]  : '';
      var art  = cArt  >= 0 ? data[i][cArt]  : '';
      var lote = cLote >= 0 ? data[i][cLote] : '';
      var uni  = cUni  >= 0 ? data[i][cUni]  : '';
      var cant = cCant >= 0 ? (parseFloat(data[i][cCant]) || 0) : 0;
      if (cant) _aplicarConsumoStock(cat, art, lote, -cant, uni);
    }
    sheetSal.deleteRow(i + 1);
    n++;
  }
  return n;
}

function gestionarSalidasEnvasado(payload) {
  var sheetSal = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SALIDAS);
  if (!sheetSal) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'No existe la hoja SALIDAS MATERIAL AUXILIAR'})).setMimeType(ContentService.MimeType.JSON);

  var lista = payload.materiales || [];
  if (!Array.isArray(lista) || lista.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ok:true, registradas:0})).setMimeType(ContentService.MimeType.JSON);
  }

  var idEnvasado = String(payload.idEnvasado || '').trim();
  var operario   = String(payload.operario || '').trim();
  var fecha      = payload.fecha || new Date();

  var headers = sheetSal.getRange(1, 1, 1, sheetSal.getLastColumn()).getValues()[0];
  var cId    = _colIdx(headers, 'ID SALIDA');
  var cFecha = _colIdx(headers, 'FECHA');
  var cOp    = _colIdx(headers, 'OPERARIO');
  var cCat   = _colIdx(headers, 'CATEGORIA');
  var cArt   = _colIdx(headers, 'ARTICULO');
  var cProv  = _colIdx(headers, 'PROVEEDOR');
  var cLote  = _colIdx(headers, 'LOTE');
  var cCant  = _colIdx(headers, 'CANTIDAD');
  var cMot   = _colIdx(headers, 'MOTIVO');
  var cUni   = _colIdx(headers, 'UNIDAD');
  var cParte = _colIdx(headers, 'ID PARTE');

  var ts = new Date().getTime();
  var n = 0;
  lista.forEach(function(item, k){
    if (!item || !item.articulo) return;
    var fila = [];
    for (var c = 0; c < headers.length; c++) fila.push('');
    if (cId    >= 0) fila[cId]    = 'S-' + ts + '-' + k;
    if (cFecha >= 0) fila[cFecha] = fecha;
    if (cOp    >= 0) fila[cOp]    = operario;
    if (cCat   >= 0) fila[cCat]   = item.categoria || 'CONDIMENTOS';
    if (cArt   >= 0) fila[cArt]   = item.articulo;
    if (cProv  >= 0) fila[cProv]  = item.proveedor || '';
    if (cLote  >= 0) fila[cLote]  = item.lote || '';
    if (cCant  >= 0) fila[cCant]  = parseFloat(item.cantidad) || 0;
    if (cMot   >= 0) fila[cMot]   = payload.motivo || 'CONSUMO ENVASADO';
    if (cUni   >= 0) fila[cUni]   = item.unidad || '';
    if (cParte >= 0) fila[cParte] = idEnvasado;
    sheetSal.appendRow(fila);
    _aplicarConsumoStock(item.categoria || 'CONDIMENTOS', item.articulo, item.lote || '', parseFloat(item.cantidad) || 0, item.unidad);
    n++;
  });

  return ContentService.createTextOutput(JSON.stringify({ok:true, registradas:n})).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════
// Fase B — Autocreación de columnas en REGISTRO TOTAL
// ══════════════════════════════════════════════════════════════════════════
function _asegurarColumnasRegistroTotal(sheet, headers, payload) {
  if (!payload || typeof payload !== 'object') return headers;
  var nuevasCols = [];
  Object.keys(payload).forEach(function(k){
    if (!k || k.charAt(0) === '_') return;
    if (headers.indexOf(k) >= 0) return;
    if (k === 'CONFORME VACÍO Y SELLADO' || k === 'SI SE PORCIONA EL QUESO') return;
    nuevasCols.push(k);
  });
  if (!nuevasCols.length) return headers;
  var startCol = headers.length + 1;
  sheet.getRange(1, startCol, 1, nuevasCols.length).setValues([nuevasCols]);
  return headers.concat(nuevasCols);
}

// ══════════════════════════════════════════════════════════════════════════
// Fase B — Endpoint para registrar un nuevo CLIENTE de contraetiquetas.
// ══════════════════════════════════════════════════════════════════════════
function gestionarClienteNuevo(payload) {
  var nombre = String(payload.nombre || '').trim().toUpperCase();
  var operario = String(payload.operario || '').trim();
  if (!nombre) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Falta nombre'})).setMimeType(ContentService.MimeType.JSON);
  }
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_CLIENTES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CLIENTES);
    sheet.getRange(1, 1, 1, 4).setValues([['NOMBRE','ACTIVO','FECHA ALTA','CREADO POR']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var iN = headers.indexOf('NOMBRE');
  if (iN >= 0) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][iN]||'').trim().toUpperCase() === nombre) {
        return ContentService.createTextOutput(JSON.stringify({ok:true, duplicado:true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  sheet.appendRow([nombre, 'SI', new Date(), operario]);
  return ContentService.createTextOutput(JSON.stringify({ok:true, creado:nombre})).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════
// AVISO POR CORREO: pedido de expediciones completado
// ══════════════════════════════════════════════════════════════════════════
function gestionarAvisoPedido(payload) {
  try {
    var destino = CORREO_AVISO_PEDIDOS;
    var pedido  = String(payload.pedido  || '').trim();
    var cliente = String(payload.cliente || '').trim();

    var asunto = 'Entrada de un nuevo pedido de expediciones';
    var cuerpo = 'Se ha completado y enviado un nuevo pedido de expediciones.\n\n';
    if (pedido)  cuerpo += 'Pedido: ' + pedido + '\n';
    if (cliente) cuerpo += 'Cliente: ' + cliente + '\n';
    cuerpo += '\nYa puedes descargarlo.';

    MailApp.sendEmail(destino, asunto, cuerpo);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function probarAvisoCorreo() {
  gestionarAvisoPedido({ pedido: 'PRUEBA-123', cliente: 'CLIENTE DE PRUEBA' });
}

// ══════════════════════════════════════════════════════════════════════════
// AVISO POR CORREO: cambio de lote en un parte de fabricación
// ══════════════════════════════════════════════════════════════════════════
function gestionarAvisoCambioLote(payload) {
  try {
    var destino   = CORREO_AVISO_CAMBIO_LOTE;
    var producto  = String(payload.producto    || '').trim();
    var categoria = String(payload.categoria   || '').trim();
    var loteAnt   = String(payload.lote_anterior || '').trim();
    var loteNuevo = String(payload.lote_nuevo  || '').trim();
    var operario  = String(payload.operario    || '').trim();
    var cuba      = String(payload.cuba        || '').trim();
    var fecha     = String(payload.fecha       || '').trim();

    var asunto = 'Cambio de lote en partes de fabricación' + (producto ? ' · ' + producto : '');
    var cuerpo = 'El quesero ha cambiado manualmente el lote de un producto en un parte de fabricación.\n\n';
    if (producto)  cuerpo += 'Producto: ' + producto + (categoria ? ' (' + categoria + ')' : '') + '\n';
    if (loteAnt)   cuerpo += 'Lote anterior (el que el sistema daba por activo): ' + loteAnt + '\n';
    if (loteNuevo) cuerpo += 'Lote nuevo seleccionado: ' + loteNuevo + '\n';
    if (operario)  cuerpo += 'Quesero: ' + operario + '\n';
    if (cuba)      cuerpo += 'Cuba: ' + cuba + '\n';
    if (fecha)     cuerpo += 'Fecha: ' + fecha + '\n';
    cuerpo += '\nMotivo habitual: el lote anterior se ha agotado físicamente antes de lo que indica el stock '
            + '(pequeños excesos de gramaje acumulados). Conviene hablar con el quesero y reajustar el stock '
            + 'del lote anterior si procede.';

    MailApp.sendEmail(destino, asunto, cuerpo);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// GRÁFICA DE PASTEURIZACIÓN (PDF en Google Drive)
// ──────────────────────────────────────────────────────────────────────────
// La app pide ?tipo=grafica&fecha=YYYY-MM-DD y este endpoint busca en la carpeta
// de Drive "Graficas Pasteurizacion" el/los PDF de ese día.
//
// Nombre esperado de los archivos: dd.mm.aaaa.pdf  (ej. 18.07.2026.pdf)
// La búsqueda es TOLERANTE: acepta puntos de más (18..07.2026), espacios, y
// detecta una posible segunda gráfica del día con letra tras el día (13B, 06B).
//
// Devuelve una lista de gráficas: [{nombre, url, sufijo}], donde 'url' es el
// enlace para ver el PDF en el navegador. Si no hay ninguna, lista vacía.
// ══════════════════════════════════════════════════════════════════════════

// Normaliza una fecha (YYYY-MM-DD, dd/mm/aaaa, Date...) a {d:'18', m:'07', a:'2026'}
function _fechaPartes(v) {
  if (v === null || v === undefined || v === '') return null;
  var s;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return null;
    s = Utilities.formatDate(v, 'Europe/Madrid', 'yyyy-MM-dd');
  } else {
    s = String(v).trim();
  }
  // ISO: 2026-07-18
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return { a: iso[1], m: ('0'+iso[2]).slice(-2), d: ('0'+iso[3]).slice(-2) };
  // dd/mm/aaaa
  var dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return { d: ('0'+dmy[1]).slice(-2), m: ('0'+dmy[2]).slice(-2), a: dmy[3] };
  // dd.mm.aaaa
  var dmp = s.match(/^(\d{1,2})\.+(\d{1,2})\.+(\d{4})/);
  if (dmp) return { d: ('0'+dmp[1]).slice(-2), m: ('0'+dmp[2]).slice(-2), a: dmp[3] };
  return null;
}

// Comprueba si un nombre de archivo corresponde al día pedido.
// Devuelve null si no coincide, o el "sufijo" (ej. 'B' o '') si coincide.
// ══════════════════════════════════════════════════════════════════════════
// (2026-10-02) BUSCAR TAMBIÉN DENTRO DE LAS SUBCARPETAS
// ──────────────────────────────────────────────────────────────────────────
// Joaquín empezó a ordenar las gráficas por mes: carpetas 07.2026, 10.2026...
// dentro de "Gráficas Pasteurización". Pero getFiles() solo devuelve lo que
// cuelga DIRECTAMENTE de la carpeta, no lo de dentro de las subcarpetas. Así
// que en cuanto movió la gráfica convertida a 10.2026, el buscador dejó de
// encontrarla y la aplicación se cayó al PDF de siempre.
//
// Esto recorre la carpeta y todas sus subcarpetas, llamando a fn con cada
// archivo. Si fn devuelve true se corta la búsqueda. El tope de 5 niveles es
// un seguro: si alguien hace un lío de carpetas, no se queda dando vueltas.
function _recorrerArchivos(carpeta, fn, nivel) {
  nivel = nivel || 0;
  try {
    var it = carpeta.getFiles();
    while (it.hasNext()) { if (fn(it.next()) === true) return true; }
    if (nivel >= 5) return false;
    var sub = carpeta.getFolders();
    while (sub.hasNext()) {
      if (_recorrerArchivos(sub.next(), fn, nivel + 1) === true) return true;
    }
  } catch (err) {}
  return false;
}

// (2026-09-30) Limpia lo que añaden Chrome y Windows cuando te descargas o
// copias el mismo archivo dos veces: "30.09.2026 (1)", "30.09.2026 - copia".
// Sin esto el archivo se sube a Drive y el buscador lo ignora en silencio.
function _limpiaNombreDescarga(base) {
  return String(base || '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*-\s*copia\s*$/i, '')
    .replace(/\s*copy\s*$/i, '')
    .trim();
}

function _nombreCoincideDia(nombre, fp) {
  if (!nombre || !fp) return null;
  var base = _limpiaNombreDescarga(String(nombre).replace(/\.pdf$/i, '').trim());
  // Empieza por el día (2 díg), opcional letra (B), luego mes y año, con puntos
  // (uno o varios) o espacios entre medias. Ej: "18.07.2026", "13B..07.2026"
  var re = new RegExp('^' + fp.d + '([A-Za-z]?)[\\.\\s]+' + fp.m + '[\\.\\s]+' + fp.a + '$');
  var m = base.match(re);
  if (!m) return null;
  return (m[1] || '').toUpperCase();
}

// ══════════════════════════════════════════════════════════════════════════
// DATOS DE PASTEURIZACIÓN DEL DÍA  (2026-08-13)
// ──────────────────────────────────────────────────────────────────────────
// El .xps que genera el SCADA son 68 MB en 639 archivos: Apps Script no puede
// abrirlo (se queda sin memoria). Por eso se convierte antes, en el navegador,
// con la página "convertir-pasteurizacion.html": de esos 68 MB salen ~65 KB con
// una medida cada 20 segundos y los bloques del día ya calculados.
//
// Ese archivo se sube a la MISMA carpeta que los PDF, con el mismo nombre y
// extensión .json:   13.08.2026.pdf   →   13.08.2026.json
//
// Aquí solo se busca y se devuelve tal cual. Si no está, se devuelve null y la
// app enseña el PDF de siempre.
// ══════════════════════════════════════════════════════════════════════════
// (2026-09-30) DOS TRAMPAS QUE NOS COSTARON UNA TARDE:
//
//   1) Chrome, cuando te bajas el mismo archivo dos veces, lo llama
//      "30.09.2026 (1).json". Si eso se sube a Drive, el nombre YA NO CUADRA
//      con el patrón de la fecha y este endpoint lo saltaba SIN DECIR NADA:
//      seguía devolviendo el .json viejo y la gráfica seguía saliendo igual
//      aunque acabaras de convertirla. Ahora se le quita ese "(1)" al nombre
//      antes de comparar, y también el " - copia" que pone Windows.
//
//   2) Si hay VARIOS .json del mismo día (el bueno y el viejo), antes ganaba
//      el primero que devolviera Drive, que es un orden cualquiera. Ahora se
//      recorren todos y se queda el MÁS RECIENTE. La última conversión manda.
function leerPasteurizacion(fechaTxt) {
  try {
    var fp = _fechaPartes(fechaTxt);
    if (!fp) return null;
    var carpeta = DriveApp.getFolderById(CARPETA_GRAFICAS_ID);
    var mejor = null, mejorFecha = 0;
    // (2026-10-02) Recursivo: las gráficas pueden estar en subcarpetas por mes.
    _recorrerArchivos(carpeta, function(f){
      var nom = String(f.getName());
      if (!/\.json$/i.test(nom)) return false;
      var base = _limpiaNombreDescarga(nom.replace(/\.json$/i, ''));
      // Mismo criterio de nombre que los PDF: tolerante con puntos y espacios
      if (_nombreCoincideDia(base + '.pdf', fp) === null) return false;
      var t = 0;
      try { t = f.getLastUpdated().getTime(); } catch (e2) { t = 0; }
      if (!mejor || t > mejorFecha) { mejor = f; mejorFecha = t; }
      return false;   // se miran todas para quedarse con la más reciente
    });
    if (mejor) {
      var txt = mejor.getBlob().getDataAsString('UTF-8');
      var obj = JSON.parse(txt);
      // Para poder comprobar desde la app QUÉ archivo se está leyendo y de
      // cuándo es. Sin esto no hay manera de saber si la gráfica va con la
      // conversión nueva o con una vieja.
      try {
        obj._archivo = mejor.getName();
        obj._subido = Utilities.formatDate(mejor.getLastUpdated(),
                        Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      } catch (e3) {}
      return obj;
    }
    return null;
  } catch (err) {
    return { error: String(err) };
  }
}

function buscarGraficasPasteurizacion(fechaTxt) {
  var res = [];
  try {
    var fp = _fechaPartes(fechaTxt);
    if (!fp) return res;
    var carpeta = DriveApp.getFolderById(CARPETA_GRAFICAS_ID);
    // (2026-10-02) Recursivo, igual que el JSON: los PDF también se archivan por mes.
    _recorrerArchivos(carpeta, function(f){
      if (String(f.getMimeType()) !== 'application/pdf') return false;
      var sufijo = _nombreCoincideDia(f.getName(), fp);
      if (sufijo === null) return false;
      res.push({
        nombre: f.getName(),
        sufijo: sufijo,
        url: 'https://drive.google.com/file/d/' + f.getId() + '/view'
      });
      return false;
    });
    res.sort(function(a, b){ return (a.sufijo || '').localeCompare(b.sufijo || ''); });
  } catch (err) {
    return [{ error: String(err) }];
  }
  return res;
}

// ══════════════════════════════════════════════════════════════════════════
// DATOS DEL SCADA PARA PARTES (Excel en Google Drive)
// ──────────────────────────────────────────────────────────────────────────
// La app pide ?tipo=scada&fecha=YYYY-MM-DD&cuba=1 y este endpoint busca en la
// carpeta de Drive "SCADA PARTES" el Excel (.xlsx) y devuelve la fila que
// coincide con esa fecha y cuba. SOLO LECTURA: nunca escribe en el Excel.
//
// El Excel lo rellena el electricista (o el SCADA) con las horas y temperaturas
// de cada hito. La app usa estos datos para PRE-RELLENAR campos vacíos del parte
// (nunca pisa lo que el quesero ya ha escrito — esa lógica está en la app).
//
// Estructura esperada del Excel (fila 2 = cabeceras, datos desde fila 4):
//   FECHA · CUBA · Nº CUAJADA · HORA AUXILIARES · TEMP AUXILIARES ·
//   HORA FERMENTOS · TEMP FERMENTOS · HORA CUAJADO · TEMP CUAJADO ·
//   HORA INI RECALENT · TEMP INI RECALENT · HORA FIN RECALENT · TEMP FIN RECALENT ·
//   HORA INI MOLDEO · TEMP INI MOLDEO · HORA FIN MOLDEO
// ══════════════════════════════════════════════════════════════════════════

// ID de la carpeta de Drive "SCADA PARTES" (Drive de app.quesoselhidalgo)
const CARPETA_SCADA_ID = '1yaNT9LNuVULaBziVMLwd-0ZuHyTQQpVP';

// Normaliza una fecha a dd/mm/aaaa (formato del Excel del SCADA)
function _fechaSCADA(v) {
  if (v === null || v === undefined || v === '') return '';
  var toStr = Object.prototype.toString.call(v);
  if (toStr === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, 'Europe/Madrid', 'dd/MM/yyyy');
  }
  var s = String(v).trim();
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return ('0'+iso[3]).slice(-2)+'/'+('0'+iso[2]).slice(-2)+'/'+iso[1];
  var dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return ('0'+dmy[1]).slice(-2)+'/'+('0'+dmy[2]).slice(-2)+'/'+dmy[3];
  return s;
}

// Convierte una hora (Date o texto) a "HH:mm"
function _horaSCADA(v) {
  if (v === null || v === undefined || v === '') return '';
  var toStr = Object.prototype.toString.call(v);
  if (toStr === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    // La hora se lee formateando con Europe/Madrid. IMPORTANTE: la zona horaria
    // del PROYECTO Apps Script debe estar en Europe/Madrid (appsscript.json →
    // "timeZone": "Europe/Madrid"). Con la zona correcta, esto devuelve 07:20.
    return Utilities.formatDate(v, 'Europe/Madrid', 'HH:mm');
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return ('0'+m[1]).slice(-2)+':'+m[2];
  return s;
}

// Valor de temperatura tal cual (número con coma o punto, o texto)
function _valSCADA(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function buscarDatosSCADA(fechaTxt, cubaTxt) {
  try {
    var fechaBuscar = _fechaSCADA(fechaTxt);
    var cubaBuscar = String(cubaTxt || '').trim();
    if (!fechaBuscar || !cubaBuscar) return null;

    var carpeta = DriveApp.getFolderById(CARPETA_SCADA_ID);
    // Buscar cualquier archivo Excel en la carpeta (xlsx). SOLO LECTURA.
    var it = carpeta.getFiles();
    var fileExcel = null;
    while (it.hasNext()) {
      var f = it.next();
      var nom = f.getName().toLowerCase();
      if (nom.slice(-5) === '.xlsx' || nom.slice(-4) === '.xls') { fileExcel = f; break; }
      // También aceptar si ya es Google Sheet
      if (f.getMimeType() === MimeType.GOOGLE_SHEETS) { fileExcel = f; break; }
    }
    if (!fileExcel) return { error: 'No se encontró ninguna hoja en la carpeta SCADA PARTES' };

    // Abrir la hoja (SOLO LECTURA).
    var ss;
    var _tmpId = null;
    if (fileExcel.getMimeType() === MimeType.GOOGLE_SHEETS) {
      // Ya es Google Sheet: se lee directo.
      ss = SpreadsheetApp.openById(fileExcel.getId());
    } else {
      // Es Excel (.xlsx): lo convertimos a Google Sheet TEMPORAL para leerlo, y
      // luego lo borramos. Requiere el Servicio Drive (v2 insert o v3 create).
      var blob = fileExcel.getBlob();
      var tmp = null;
      try {
        if (typeof Drive !== 'undefined' && Drive.Files && typeof Drive.Files.insert === 'function') {
          tmp = Drive.Files.insert({ title: '__tmp_scada__', mimeType: MimeType.GOOGLE_SHEETS }, blob, { convert: true });
        } else if (typeof Drive !== 'undefined' && Drive.Files && typeof Drive.Files.create === 'function') {
          tmp = Drive.Files.create({ name: '__tmp_scada__', mimeType: MimeType.GOOGLE_SHEETS }, blob);
        }
      } catch (e) {
        return { error: 'No se pudo leer el Excel: ' + e + '. Puede que falte activar el Servicio Drive o convertir el archivo a Google Sheets.' };
      }
      if (!tmp || !tmp.id) {
        return { error: 'No se pudo convertir el Excel (Servicio Drive no disponible). Convierte el archivo a Google Sheets.' };
      }
      _tmpId = tmp.id;
      ss = SpreadsheetApp.openById(_tmpId);
    }

    var hoja = ss.getSheets()[0];
    var datos = hoja.getDataRange().getValues();

    // Buscar la fila de cabeceras (la que contiene "FECHA" y "CUBA")
    var filaCab = -1;
    for (var i = 0; i < Math.min(datos.length, 10); i++) {
      var fila = datos[i].map(function(x){ return String(x).toUpperCase().trim(); });
      if (fila.indexOf('FECHA') >= 0 && fila.indexOf('CUBA') >= 0) { filaCab = i; break; }
    }
    if (filaCab < 0) {
      if (_tmpId) { try{ DriveApp.getFileById(_tmpId).setTrashed(true); }catch(e){} }
      return { error: 'No se encontraron las cabeceras FECHA/CUBA en el Excel' };
    }

    var cab = datos[filaCab].map(function(x){ return String(x).toUpperCase().trim(); });
    function col(nombre){ return cab.indexOf(nombre); }
    var cFecha = col('FECHA'), cCuba = col('CUBA');

    // Recorrer filas de datos buscando fecha + cuba
    var encontrada = null;
    for (var r = filaCab + 1; r < datos.length; r++) {
      var f = datos[r];
      if (!f[cFecha]) continue;
      var fFila = _fechaSCADA(f[cFecha]);
      var cFila = String(f[cCuba] || '').trim();
      if (fFila === fechaBuscar && cFila === cubaBuscar) { encontrada = f; break; }
    }

    var resultado = null;
    if (encontrada) {
      function g(nombre, tipo){
        var c = col(nombre);
        if (c < 0) return '';
        var v = encontrada[c];
        if (tipo === 'hora') return _horaSCADA(v);
        return _valSCADA(v);
      }
      resultado = {
        fecha:            _fechaSCADA(encontrada[cFecha]),
        cuba:             String(encontrada[cCuba] || '').trim(),
        cuajada:          g('Nº CUAJADA'),
        hora_aux:         g('HORA AUXILIARES', 'hora'),
        temp_aux:         g('TEMP AUXILIARES'),
        hora_ferm:        g('HORA FERMENTOS', 'hora'),
        temp_ferm:        g('TEMP FERMENTOS'),
        hora_cuajado:     g('HORA CUAJADO', 'hora'),
        temp_cuajado:     g('TEMP CUAJADO'),
        hora_ini_recal:   g('HORA INI RECALENT', 'hora'),
        temp_ini_recal:   g('TEMP INI RECALENT'),
        hora_fin_recal:   g('HORA FIN RECALENT', 'hora'),
        temp_fin_recal:   g('TEMP FIN RECALENT'),
        hora_ini_moldeo:  g('HORA INI MOLDEO', 'hora'),
        temp_ini_moldeo:  g('TEMP INI MOLDEO'),
        hora_fin_moldeo:  g('HORA FIN MOLDEO', 'hora')
      };
    }

    // Borrar la copia temporal si la creamos (limpieza)
    if (_tmpId) {
      try { DriveApp.getFileById(_tmpId).setTrashed(true); } catch(e) {}
    }

    return resultado;  // null si no hay coincidencia
  } catch (err) {
    return { error: String(err) };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL DE SALMUERA — hoja SALADERO   (2026-08-22)
// ──────────────────────────────────────────────────────────────────────────
// Réplica del impreso FOR 08-02 "PARTE DE CONTROL SALMUERA". UNA FILA POR DÍA
// para toda la fábrica (no por saladero). Lo rellena Calidad desde el ordenador.
//
// Diarios: PH, TEMPERATURA, BE y FILTRADOS (número de filtrados de ese día).
// Ocasionales: DORNIC (semanal, se apunta de tarde en tarde), la sal (unos 5
// sacos, con su lote y proveedor —siempre UNIÓN SALINERA—), el ácido láctico
// (existe en el impreso pero casi no se usa) y el cambio de MATERIAL FILTRANTE
// (tierras de diatomeas, cada 4-10 días según la producción que haya).
//
// LA HOJA SE CREA SOLA la primera vez, con sus cabeceras. No hay que prepararla
// a mano en Google Sheets.
//
// LA FECHA SE GUARDA COMO TEXTO (formato @), igual que las caducidades. Si se
// dejara que Google la interprete como fecha, la zona horaria de Madrid la
// desplazaría al día anterior al leerla de vuelta. Mismo problema, misma cura.
//
// CLAVE = FECHA. Guardar dos veces el mismo día ACTUALIZA la fila, no crea otra.
// Así Calidad puede ir completando el día a lo largo de la jornada.
// ══════════════════════════════════════════════════════════════════════════
const SHEET_SALADERO = 'SALADERO';

const COLS_SALADERO = [
  'FECHA','PH','TEMPERATURA','BE','FILTRADOS','DORNIC',
  'SAL CANTIDAD','SAL LOTE','SAL PROVEEDOR',
  'AL CANTIDAD','AL LOTE','AL PROVEEDOR',
  'FILTRANTE LOTE','OBSERVACIONES','FIRMA'
];

// Devuelve la hoja SALADERO, creándola con sus cabeceras si aún no existe.
function _hojaSaladero() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_SALADERO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SALADERO);
    sheet.getRange(1, 1, 1, COLS_SALADERO.length).setValues([COLS_SALADERO]);
    sheet.getRange(1, 1, 1, COLS_SALADERO.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // La columna FECHA, a texto, para que no se convierta en objeto fecha.
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  return sheet;
}

// Lee los días del saladero. Sin parámetros devuelve todo; con 'desde' y/o
// 'hasta' (YYYY-MM-DD) acota el rango, que es lo que hace falta para el resumen
// mensual. Devuelve lo más reciente primero.
function leerSaladero(desde, hasta) {
  var sheet = _hojaSaladero();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var d = _fechaKey(desde), h = _fechaKey(hasta);
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    headers.forEach(function(c, j){ obj[c] = data[i][j]; });
    var f = _fechaKey(obj['FECHA']);
    if (!f) continue;
    if (d && f < d) continue;
    if (h && f > h) continue;
    obj['FECHA'] = f;
    rows.push(obj);
  }
  rows.sort(function(a, b){ return a['FECHA'] < b['FECHA'] ? 1 : -1; });
  return rows;
}

function gestionarSaladero(payload) {
  var sheet = _hojaSaladero();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var fecha = _fechaKey(payload['FECHA'] || payload.fecha || '');
  if (!fecha) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false, error: 'Falta la fecha del día de saladero.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Buscar el día. La clave es la FECHA, no un ID: solo hay un parte por día.
  var idxFecha = headers.indexOf('FECHA');
  if (idxFecha < 0) idxFecha = 0;
  var fila = -1;
  for (var i = 1; i < data.length; i++) {
    if (_fechaKey(data[i][idxFecha]) === fecha) { fila = i + 1; break; }
  }

  // ── BORRAR el día ──
  if (payload['_DELETE']) {
    // Si ya no existe se responde ok:true igualmente. Borrar algo que no está
    // es un éxito, no un fallo: si se respondiera ok:false, la libreta de la app
    // lo reintentaría eternamente sin llegar nunca a buen puerto.
    if (fila > 0) sheet.deleteRow(fila);
    return ContentService.createTextOutput(JSON.stringify({
      ok: true, accion: fila > 0 ? 'borrado' : 'no_existia', fecha: fecha
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── GUARDAR (crea el día o lo actualiza) ──
  // Solo se escriben las columnas que VIENEN en el envío. Así, si Calidad
  // corrige a media tarde solo el pH, no se borra el resto de lo apuntado.
  if (fila > 0) {
    headers.forEach(function(c, col) {
      if (String(c).toUpperCase().trim() === 'FECHA') return;   // la clave no se toca
      if (payload[c] === undefined || String(c).charAt(0) === '_') return;
      sheet.getRange(fila, col + 1).setValue(payload[c]);
    });
    return ContentService.createTextOutput(JSON.stringify({
      ok: true, accion: 'actualizado', fecha: fecha, fila: fila
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var row = headers.map(function(c) {
    if (String(c).toUpperCase().trim() === 'FECHA') return fecha;
    return payload[c] !== undefined ? payload[c] : '';
  });
  sheet.appendRow(row);

  // Verificación por FECHA, igual que en el resto del script: nunca getLastRow().
  SpreadsheetApp.flush();
  var filaNueva = _filaPorValor(sheet, idxFecha, fecha);
  if (filaNueva < 0) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false, error: 'El día no se pudo verificar en la hoja. Se reintentará.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  // La fecha, a texto, para que no se desplace un día por la zona horaria.
  var celda = sheet.getRange(filaNueva, idxFecha + 1);
  celda.setNumberFormat('@');
  celda.setValue(fecha);

  return ContentService.createTextOutput(JSON.stringify({
    ok: true, accion: 'insertado', fecha: fecha, fila: filaNueva
  })).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════
// DATOS DE CUBA DEL SCADA  (2026-08-23)
// ──────────────────────────────────────────────────────────────────────────
// La app pide ?tipo=cuba&fecha=YYYY-MM-DD&cuba=1 y aquí se busca en la carpeta
// de Drive "SCADA CUBAS" el JSON de esa cuba y ese día.
//
// DE DÓNDE SALE ESE JSON: el .xps que genera el SCADA son unos 68 MB repartidos
// en cientos de archivos; Apps Script no puede ni abrirlo. Por eso se convierte
// antes en el navegador, con la página "convertir-cuba.html", que deja un JSON
// de pocos KB. Mismo planteamiento que ya usamos con la pasteurización.
//
// LO IMPORTANTE: ese JSON trae dentro un apartado 'ficha' con las NORMAS DE CASA
// YA APLICADAS (la temperatura final del recalentamiento es la del momento en
// que abren las dos válvulas, el máximo de cada tramo, los cambios de receta...).
// Aquí NO se recalcula nada: las reglas viven en un solo sitio, el conversor.
// Este endpoint solo localiza el archivo y lo devuelve tal cual.
//
// POR QUÉ UNA CARPETA APARTE: no se mezclan con las gráficas de pasteurización
// porque leerPasteurizacion() recorre su carpeta cogiendo cualquier .json cuyo
// nombre cuadre con la fecha, y acabaría abriendo uno de cuba. Y tampoco con
// SCADA PARTES, que está reservada al futuro flujo "en vivo" (los botones de la
// pantalla de la cuba, que mandarían hora y temperatura al momento). Son tres
// cosas distintas con tres ritmos distintos.
//
// NOMBRE ESPERADO:  cubaN-DD.MM.AAAA.json   (ej. cuba1-22.08.2026.json)
// Los del formato "Tabla Control" no dicen de qué cuba son; el conversor la
// pregunta antes de dejar descargar, así que aquí siempre llega con número.
// ══════════════════════════════════════════════════════════════════════════

// ID de la carpeta "SCADA CUBAS" (Drive de app.quesoselhidalgo)
const CARPETA_CUBAS_ID = '1QV5ds9_KJeSJaEwadqnqT9wAXDOHUj2x';

// ¿Es este archivo el de esta cuba y este día?
// Tolerante con lo de siempre: puntos de más, espacios, mayúsculas, y el año
// escrito con dos o con cuatro cifras.
function _nombreCubaCoincide(nombre, fp, cuba) {
  if (!nombre || !fp) return false;
  var base = _limpiaNombreDescarga(String(nombre).replace(/\.json$/i, '').trim());
  var c = String(cuba || '').trim();
  if (!c) return false;
  var re = new RegExp('^cuba\\s*' + c + '\\s*[-_ ]\\s*' +
                      fp.d + '[\\.\\s]+' + fp.m + '[\\.\\s]+(20)?' + fp.a.slice(-2) + '$', 'i');
  return re.test(base);
}

function leerDatosCuba(fechaTxt, cubaTxt) {
  try {
    var fp = _fechaPartes(fechaTxt);        // reutiliza la de las gráficas
    var cuba = String(cubaTxt || '').trim();
    if (!fp)   return { error: 'Fecha no válida: ' + fechaTxt };
    if (!cuba) return { error: 'Falta el número de cuba' };

    var carpeta = DriveApp.getFolderById(CARPETA_CUBAS_ID);
    var encontrados = [];
    // (2026-09-30) Si hay varios del mismo día y cuba, manda EL MÁS RECIENTE.
    // (2026-10-02) Y se buscan también dentro de las subcarpetas por mes.
    var mejor = null, mejorFecha = 0;
    _recorrerArchivos(carpeta, function(f){
      var nom = String(f.getName());
      if (!/\.json$/i.test(nom)) return false;
      if (!_nombreCubaCoincide(nom, fp, cuba)) { encontrados.push(nom); return false; }
      var t = 0;
      try { t = f.getLastUpdated().getTime(); } catch (e2) { t = 0; }
      if (!mejor || t > mejorFecha) { mejor = f; mejorFecha = t; }
      return false;
    });
    if (mejor) {
      // Se devuelve el archivo entero: la ficha para comparar y los puntos por
      // si algún día se quiere dibujar la curva de temperatura de la cuajada.
      var datos = JSON.parse(mejor.getBlob().getDataAsString('UTF-8'));
      try {
        datos._archivo = mejor.getName();
        datos._subido = Utilities.formatDate(mejor.getLastUpdated(),
                          Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      } catch (e3) {}
      return datos;
    }
    // Si no está, se dice QUÉ hay en la carpeta. Sin esto, cuando algo falla
    // por un nombre mal puesto no hay manera de saber qué ha pasado.
    return {
      error: 'No hay datos de la cuba ' + cuba + ' del ' + fp.d + '/' + fp.m + '/' + fp.a +
             '. Convierte el .xps y sube el JSON a la carpeta SCADA CUBAS.',
      buscado: 'cuba' + cuba + '-' + fp.d + '.' + fp.m + '.' + fp.a + '.json',
      hay_en_carpeta: encontrados.slice(0, 20)
    };
  } catch (err) {
    return { error: String(err) };
  }
}
