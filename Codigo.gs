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

const COLS = [
  'ID','ID_DISPOSITIVO','FECHA','SECCIÓN','OPERARIO','ID PALET',
  'PESO PALET','SALA VOLTEO','SALA ORIGEN','SALA DESTINO',
  'LOTE QUESO','PRODUCTO','LOTE PRODUCTO','ESCANEAR NUEVO LOTE',
  'TIPO DE QUESO','FORMATO/PESO','Nº DE PIEZAS',
  '¿SE PORCIONA EL QUESO?','CUÑAS POR QUESO','TOTAL UNIDADES (Cuñas)',
  'Nº PIEZAS NO APTAS','CONTRAETIQUETAS N/S','PRIMERA CONTRAETIQUETA',
  'ULTIMA CONTRAETIQUETA','CONFORME VACIO Y SELLADO',
  'TERMOFORMADO (Lote tapa)','TERMOFORMADO (Lote fondo)',
  'MATERIAL ENVASADO CAMPANA. (Lote bolsa)','LOTE MANTECA','LOTE ROMERO',
  'LOTE PIMIENTA','LOTE TRUFA','CANTIDAD TRUFA','¿SE ETIQUETA EL QUESO?',
  'DESCRIPCION ETIQUETA','Nº DE ETIQUETAS','Nº ETIQUETAS NO CONFORMES',
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
    COLS.forEach(function(c, j){ obj[c] = fila[idx[j]]; });
    rows.push(obj);
  }
  var json = JSON.stringify({ok: true, data: rows});
  if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
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
      COLS.forEach(function(c, j){ obj[c] = data[i][idx[j]]; });
      rows.push(obj);
    }
  }
  return rows;
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);

  if (payload['_SHEET'] === 'PARTES')   return gestionarPartes(payload);
  if (payload['_SHEET'] === 'RECETAS')  return gestionarRecetas(payload);
  if (payload['_SHEET'] === 'ENTRADAS') return gestionarEntradas(payload);
  if (payload['_SHEET'] === 'STOCK')    return gestionarStock(payload);
  if (payload['_SHEET'] === 'SALIDAS_ENVASADO') return gestionarSalidasEnvasado(payload);
  if (payload['_SHEET'] === 'CLIENTE_NUEVO') return gestionarClienteNuevo(payload);
  if (payload['_SHEET'] === 'AVISO_PEDIDO') return gestionarAvisoPedido(payload);
  if (payload['_SHEET'] === 'AVISO_CAMBIO_LOTE') return gestionarAvisoCambioLote(payload);

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
    return ContentService.createTextOutput(JSON.stringify({ok: filaEncontrada > -1})).setMimeType(ContentService.MimeType.JSON);
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
  headers = _asegurarColumnasRegistroTotal(sheet, headers, payload);
  if (payload['FECHA'] !== undefined) payload['FECHA'] = _fechaAppSheet(payload['FECHA']);
  var row = headers.map(function(h){ return payload[h] || ''; });
  sheet.appendRow(row);
  var lastRow = sheet.getLastRow();
  var paletCol = headers.indexOf('ID PALET') + 1;
  if (paletCol > 0) {
    sheet.getRange(lastRow, paletCol).setNumberFormat('@');
    sheet.getRange(lastRow, paletCol).setValue("'" + (payload['ID PALET'] || ''));
  }
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
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
  _guardarJsonParte(sheet, sheet.getLastRow(), payload);

  _sincronizarSalidasSiProcede(payload);

  return ContentService.createTextOutput(JSON.stringify({ok:true, accion:'insertado'})).setMimeType(ContentService.MimeType.JSON);
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
  // El CO2 cuenta como consumo si está aplicado y tiene lote + tiempo + caudal
  // (los litros se calculan: tiempo_seg / 3600 * caudal_lh).
  var tieneCo2 = payload.co2 && payload.co2.lote &&
                 (parseFloat(payload.co2.tiempo_seg) > 0) &&
                 (parseFloat(payload.co2.caudal_lh) > 0);
  var tiene = (payload.auxiliares && payload.auxiliares.length) ||
              (payload.fermentos && payload.fermentos.length) ||
              (payload.cuajo && payload.cuajo.nombre) ||
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
  // CO2: consumo en litros = tiempo(seg) / 3600 * caudal(L/h). Dado de alta en
  // stock como artículo "CO2", categoría AUXILIAR FABRICACION, unidad litros.
  // El consumo va directo en litros (sin conversión), por eso unidad 'L' y el
  // cálculo se hace aquí (no es una dosis por receta).
  if (payload.co2 && payload.co2.lote) {
    var co2seg    = parseFloat(payload.co2.tiempo_seg) || 0;
    var co2caudal = parseFloat(payload.co2.caudal_lh)  || 0;
    if (co2seg > 0 && co2caudal > 0) {
      var co2litros = co2seg / 3600 * co2caudal;
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
    // El resto (dosis por receta en g/ml) sí se convierte a la unidad del stock.
    var cant = ing._yaEnUnidadStock ? (parseFloat(ing.consumo_total) || 0)
                                    : _consumoEnUnidadStock(ing.consumo_total, ing.unidad);
    var fila = [];
    for (var c = 0; c < headers.length; c++) fila.push('');
    if (cId    >= 0) fila[cId]    = 'S-' + ts + '-' + k;
    if (cFecha >= 0) fila[cFecha] = fecha;
    if (cOp    >= 0) fila[cOp]    = operario;
    if (cCat   >= 0) fila[cCat]   = item.cat;
    if (cArt   >= 0) fila[cArt]   = ing.nombre;
    if (cProv  >= 0) fila[cProv]  = ing.proveedor || '';
    if (cLote  >= 0) fila[cLote]  = ing.lote || '';
    if (cCant  >= 0) fila[cCant]  = cant;
    if (cMot   >= 0) fila[cMot]   = 'CONSUMO PARTE';
    if (cUni   >= 0) fila[cUni]   = ing.unidad || '';
    if (cParte >= 0) fila[cParte] = idParte;
    sheetSal.appendRow(fila);
    _aplicarConsumoStock(item.cat, ing.nombre, ing.lote || '', cant);
  });
}

function _normUnidad(u) {
  var s = String(u || '').toLowerCase().trim();
  if (s === 'kgs' || s === 'kilo' || s === 'kilos') return 'kg';
  if (s === 'lt' || s === 'litros' || s === 'litro') return 'l';
  if (s === 'gr' || s === 'grs' || s === 'gramos' || s === 'gramo') return 'g';
  if (s === 'mililitros' || s === 'mililitro' || s === 'cc') return 'ml';
  return s;
}

function _consumoEnUnidadStock(consumo, unidadEntrada, unidadStock) {
  var c = parseFloat(consumo) || 0;
  if (!c) return 0;

  if (unidadStock !== undefined && unidadStock !== null && unidadStock !== '') {
    var uE = _normUnidad(unidadEntrada);
    var uS = _normUnidad(unidadStock);
    if (uE === uS) return c;
    if (uE === 'g'  && uS === 'kg') return c / 1000;
    if (uE === 'kg' && uS === 'g')  return c * 1000;
    if (uE === 'ml' && uS === 'l')  return c / 1000;
    if (uE === 'l'  && uS === 'ml') return c * 1000;
    if (uE === 'g'  && uS === 'l')  return c / 1000;
    if (uE === 'l'  && uS === 'g')  return c * 1000;
    if (uE === 'ml' && uS === 'kg') return c / 1000;
    if (uE === 'kg' && uS === 'ml') return c * 1000;
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
    delta = _consumoEnUnidadStock(delta, unidadDelta, uStockFila);
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

function recomputarConsumoStock() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheetStk = ss.getSheetByName(SHEET_STOCK);
  var sheetSal = ss.getSheetByName(SHEET_SALIDAS);
  if (!sheetStk) return;
  var hS = sheetStk.getRange(1, 1, 1, sheetStk.getLastColumn()).getValues()[0];
  var sCat = _colIdx(hS, 'CATEGORIA'), sArt = _colIdx(hS, 'ARTICULO'), sLote = _colIdx(hS, 'LOTE');
  var sEnt = _colIdx(hS, 'ENTRADAS'), sCons = _colIdx(hS, 'CONSUMO'), sStk = _colIdx(hS, 'STOCK ACTUAL');

  var consumos = {};
  if (sheetSal) {
    var dSal = sheetSal.getDataRange().getValues();
    if (dSal.length >= 2) {
      var hSal = dSal[0];
      var xCat = _colIdx(hSal, 'CATEGORIA'), xArt = _colIdx(hSal, 'ARTICULO'),
          xLote = _colIdx(hSal, 'LOTE'), xCant = _colIdx(hSal, 'CANTIDAD');
      for (var i = 1; i < dSal.length; i++) {
        var k = [
          xCat  >= 0 ? String(dSal[i][xCat]  || '').trim().toUpperCase() : '',
          xArt  >= 0 ? String(dSal[i][xArt]  || '').trim().toUpperCase() : '',
          xLote >= 0 ? String(dSal[i][xLote] || '').trim().toUpperCase() : ''
        ].join('|');
        consumos[k] = (consumos[k] || 0) + (xCant >= 0 ? (parseFloat(dSal[i][xCant]) || 0) : 0);
      }
    }
  }

  var dStk = sheetStk.getDataRange().getValues();
  for (var r = 1; r < dStk.length; r++) {
    var key = [
      sCat  >= 0 ? String(dStk[r][sCat]  || '').trim().toUpperCase() : '',
      sArt  >= 0 ? String(dStk[r][sArt]  || '').trim().toUpperCase() : '',
      sLote >= 0 ? String(dStk[r][sLote] || '').trim().toUpperCase() : ''
    ].join('|');
    var cons = consumos[key] || 0;
    var ent  = sEnt >= 0 ? (parseFloat(dStk[r][sEnt]) || 0) : 0;
    if (sCons >= 0) sheetStk.getRange(r + 1, sCons + 1).setValue(cons);
    if (sStk  >= 0) sheetStk.getRange(r + 1, sStk  + 1).setValue(ent - cons);
  }
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
  var res = {auxiliares: [], fermentos: [], cuajo: null};
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
    else if (cat === 'CUAJO')    res.cuajo = ing;
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
  var valoresPorCabecera = {
    'ID ENTRADA': payload.id        || '',
    'FECHA':      payload.fecha     || '',
    'ALBARAN':    payload.albaran   || '',
    'PROVEEDOR':  payload.proveedor || '',
    'CATEGORIA':  payload.categoria || '',
    'ARTICULO':   payload.articulo  || '',
    'LOTE':       payload.lote      || '',
    'CANTIDAD':   payload.cantidad  || 0,
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
    'FIRMA':                payload.firma    || ''
  };
  var fila = headersEnt.map(function(h) {
    var key = String(h).toUpperCase().trim();
    return valoresPorCabecera[key] !== undefined ? valoresPorCabecera[key] : '';
  });
  sheetEnt.appendRow(fila);
  // Caducidad de la ENTRADA recién insertada: guardarla como TEXTO (evita desfase)
  var idxCadEnt = -1;
  for (var ce = 0; ce < headersEnt.length; ce++) {
    if (String(headersEnt[ce]).toUpperCase().trim() === 'CADUCIDAD') { idxCadEnt = ce; break; }
  }
  if (idxCadEnt >= 0 && payload.caducidad) _escribirCaducidadTexto(sheetEnt, sheetEnt.getLastRow(), idxCadEnt, payload.caducidad);

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
      // Caducidad de la nueva fila de STOCK como TEXTO (evita desfase)
      if (idxCad >= 0 && payload.caducidad) _escribirCaducidadTexto(sheetStk, sheetStk.getLastRow(), idxCad, payload.caducidad);
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
function _nombreCoincideDia(nombre, fp) {
  if (!nombre || !fp) return null;
  var base = String(nombre).replace(/\.pdf$/i, '').trim();
  // Empieza por el día (2 díg), opcional letra (B), luego mes y año, con puntos
  // (uno o varios) o espacios entre medias. Ej: "18.07.2026", "13B..07.2026"
  var re = new RegExp('^' + fp.d + '([A-Za-z]?)[\\.\\s]+' + fp.m + '[\\.\\s]+' + fp.a + '$');
  var m = base.match(re);
  if (!m) return null;
  return (m[1] || '').toUpperCase();
}

function buscarGraficasPasteurizacion(fechaTxt) {
  var res = [];
  try {
    var fp = _fechaPartes(fechaTxt);
    if (!fp) return res;
    var carpeta = DriveApp.getFolderById(CARPETA_GRAFICAS_ID);
    var it = carpeta.getFilesByType('application/pdf');
    while (it.hasNext()) {
      var f = it.next();
      var sufijo = _nombreCoincideDia(f.getName(), fp);
      if (sufijo === null) continue;
      res.push({
        nombre: f.getName(),
        sufijo: sufijo,
        url: 'https://drive.google.com/file/d/' + f.getId() + '/view'
      });
    }
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
