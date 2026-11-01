// ═══════════════════════════════════════════════════════════════════════════
// UBICACIONES DE PALÉS EN CÁMARAS (01/11/2026)
// ───────────────────────────────────────────────────────────────────────────
// Hoja UBICACIONES: histórico de dónde se ha colocado cada palé. Nunca se borra
// nada: cada vez que se coloca un palé se añade una fila ALTA, y cuando un palé
// deja de estar en una fila (porque se ha vuelto a rellenar esa fila sin él) se
// añade una fila BAJA. La ubicación vigente de un palé es su ÚLTIMA fila.
//
// Código de ubicación: ZONA-FILA-PIE-ALTURA, p. ej. CM4-F03-P7-A1
//   Zona: CM1..CM4 (Cámara de Maduración), CF1..CF2 (Cámara de Frío)
//   Fila: F01 (puerta) .. F17 (fondo, ventiladores)
//   Pie:  P1 = pegado al pasillo
//   Altura: A1 = la de arriba
//
// El plano de las cámaras (cuántos pies y alturas tiene cada fila) vive en la
// app (index.html, bloque UBICACIONES). Aquí solo se guarda y se lee.
// ═══════════════════════════════════════════════════════════════════════════

var SHEET_UBIC = 'UBICACIONES';
var UBIC_COLS = ['FECHA', 'QUIEN', 'ID PALET', 'CODIGO', 'ZONA', 'FILA', 'PIE', 'ALTURA', 'ACCION', 'SESION'];

function _hojaUbicaciones() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_UBIC);
  if (!sh) {
    sh = ss.insertSheet(SHEET_UBIC);
    sh.getRange(1, 1, 1, UBIC_COLS.length).setValues([UBIC_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function _ubicCodigo(zona, fila, pie, altura) {
  var f = ('0' + fila).slice(-2);
  return zona + '-F' + f + '-P' + pie + '-A' + altura;
}

// Ubicación vigente de cada palé: { id: {id, codigo, zona, fila, pie, altura, fecha(ms), quien} }
// Los palés cuya última fila es BAJA no aparecen.
function _ubicacionesVigentes() {
  var sh = _hojaUbicaciones();
  var n = sh.getLastRow();
  var out = {};
  if (n < 2) return out;
  var datos = sh.getRange(2, 1, n - 1, UBIC_COLS.length).getValues();
  for (var i = 0; i < datos.length; i++) {
    var r = datos[i];
    var id = String(r[2] || '').trim();
    if (!id) continue;
    if (String(r[8]) === 'BAJA') { delete out[id]; continue; }
    out[id] = {
      id: id,
      codigo: String(r[3] || ''),
      zona: String(r[4] || ''),
      fila: Number(r[5]) || 0,
      pie: Number(r[6]) || 0,
      altura: Number(r[7]) || 0,
      fecha: (r[0] instanceof Date) ? r[0].getTime() : 0,
      quien: String(r[1] || '')
    };
  }
  return out;
}

// GET ?tipo=ubicaciones → lista de ubicaciones vigentes
function leerUbicaciones() {
  var v = _ubicacionesVigentes();
  return Object.keys(v).map(function(k) { return v[k]; });
}

// POST {_SHEET:'UBICACION', accion:'fila', zona, fila, pales:[{id, pie, altura}], _QUIEN, sesion}
//   Rellena una fila entera: los palés de la lista quedan ahí (ALTA) y los que
//   estaban en esa fila y no vienen en la lista se dan de BAJA.
// POST {_SHEET:'UBICACION', accion:'poner', id, zona, fila, pie, altura, forzar?, _QUIEN}
//   Pone UN palé en un hueco concreto (si está ocupado, solo con forzar).
// POST {_SHEET:'UBICACION', accion:'baja', ids:[...], _QUIEN}
//   Quita la ubicación de esos palés (sin ponerlos en otro sitio).
function gestionarUbicacion(payload) {
  var sh = _hojaUbicaciones();
  var ahora = new Date();
  var quien = String(payload._QUIEN || '');
  var sesion = String(payload.sesion || '');
  var accion = String(payload.accion || '');
  var filas = [];
  var vigentes = _ubicacionesVigentes();

  if (accion === 'fila') {
    var zona = String(payload.zona || '').trim().toUpperCase();
    var fila = Number(payload.fila) || 0;
    if (!/^C[MF]\d$/.test(zona) || fila < 1 || fila > 17) {
      return _ubicRespuesta({ok: false, error: 'Zona o fila no válida'});
    }
    var pales = payload.pales || [];
    var nuevos = {};
    pales.forEach(function(p) {
      var id = String(p.id || '').trim();
      if (!id || nuevos[id]) return;
      nuevos[id] = true;
      var pie = Number(p.pie) || 0, alt = Number(p.altura) || 0;
      var cod = _ubicCodigo(zona, fila, pie, alt);
      // La app manda la fila entera después de cada escaneo: solo se apunta lo
      // que cambia, para no llenar el histórico de filas repetidas.
      if (vigentes[id] && vigentes[id].codigo === cod) return;
      filas.push([ahora, quien, id, cod, zona, fila, pie, alt, 'ALTA', sesion]);
    });
    // Los que estaban en esta fila y ya no vienen: BAJA
    Object.keys(vigentes).forEach(function(id) {
      var u = vigentes[id];
      if (u.zona === zona && u.fila === fila && !nuevos[id]) {
        filas.push([ahora, quien, id, u.codigo, u.zona, u.fila, u.pie, u.altura, 'BAJA', sesion]);
      }
    });
  } else if (accion === 'poner') {
    // (01/11) Un palé suelto en un hueco concreto (regularizar o recolocar desde
    // «Buscar palet», el cuadre de la oficina…). Si el hueco lo tiene otro palé,
    // no se toca salvo que venga forzar:true; entonces ese otro se da de BAJA.
    var zp = String(payload.zona || '').trim().toUpperCase(), fp = Number(payload.fila) || 0;
    var pp = Number(payload.pie) || 0, ap = Number(payload.altura) || 0, idp = String(payload.id || '').trim();
    if (!idp || !/^C[MF]\d$/.test(zp) || fp < 1 || fp > 17 || pp < 1 || ap < 1) {
      return _ubicRespuesta({ok: false, error: 'Datos de ubicación no válidos'});
    }
    var codp = _ubicCodigo(zp, fp, pp, ap), otro = null;
    Object.keys(vigentes).forEach(function(id) { if (id !== idp && vigentes[id].codigo === codp) otro = vigentes[id]; });
    if (otro && !payload.forzar) return _ubicRespuesta({ok: false, ocupado: otro.id, codigo: codp});
    if (otro) filas.push([ahora, quien, otro.id, otro.codigo, otro.zona, otro.fila, otro.pie, otro.altura, 'BAJA', sesion]);
    if (!(vigentes[idp] && vigentes[idp].codigo === codp)) filas.push([ahora, quien, idp, codp, zp, fp, pp, ap, 'ALTA', sesion]);
  } else if (accion === 'baja') {
    (payload.ids || []).forEach(function(id) {
      id = String(id || '').trim();
      var u = vigentes[id];
      if (u) filas.push([ahora, quien, id, u.codigo, u.zona, u.fila, u.pie, u.altura, 'BAJA', sesion]);
    });
  } else {
    return _ubicRespuesta({ok: false, error: 'Acción desconocida: ' + accion});
  }

  if (filas.length) {
    sh.getRange(sh.getLastRow() + 1, 1, filas.length, UBIC_COLS.length).setValues(filas);
  }
  return _ubicRespuesta({ok: true, accion: accion, filasEscritas: filas.length});
}

function _ubicRespuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
