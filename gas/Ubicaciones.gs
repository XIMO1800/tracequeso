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

// (01/11, API 15) El mismo palé puede llegar escrito de varias formas: con o
// sin el lote corto tras «!», con más o menos espacios. Para la ubicación es
// el mismo palé: se compara por esta clave (dígitos sin espacios + variedad),
// igual que normPaleKey/matchPaleId de la app. Antes se trataban como palés
// distintos y un palé podía salir en dos huecos a la vez (CF2-F17, 01/11).
function _ubicClave(id) {
  var s = String(id || '').trim();
  var base = s.split('!')[0];
  var dig = base.split('*')[0].replace(/\s/g, '');
  var v = base.indexOf('*') >= 0 ? base.substring(base.indexOf('*') + 1).trim() : '';
  return dig + (v ? '*' + v : '');
}

// Ubicación vigente de cada palé: { clave: {id, codigo, zona, fila, pie, altura, fecha(ms), quien} }
// Los palés cuya última fila es BAJA no aparecen. El id es el último con el que se escribió.
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
    var k = _ubicClave(id);
    if (String(r[8]) === 'BAJA') { delete out[k]; continue; }
    out[k] = {
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
// POST {_SHEET:'UBICACION', accion:'mover', pales:[{id, zona, fila, pie, altura}], forzar?, _QUIEN, sesion}
//   Varios palés a la vez, todo o nada (si un destino está ocupado por otro, no hace nada).
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
      var id = String(p.id || '').trim(), k = _ubicClave(id);
      if (!id || nuevos[k]) return;
      nuevos[k] = true;
      var pie = Number(p.pie) || 0, alt = Number(p.altura) || 0;
      var cod = _ubicCodigo(zona, fila, pie, alt);
      // La app manda la fila entera después de cada escaneo: solo se apunta lo
      // que cambia, para no llenar el histórico de filas repetidas.
      if (vigentes[k] && vigentes[k].codigo === cod) return;
      filas.push([ahora, quien, id, cod, zona, fila, pie, alt, 'ALTA', sesion]);
    });
    // Los que estaban en esta fila y ya no vienen: BAJA
    Object.keys(vigentes).forEach(function(k) {
      var u = vigentes[k];
      if (u.zona === zona && u.fila === fila && !nuevos[k]) {
        filas.push([ahora, quien, u.id, u.codigo, u.zona, u.fila, u.pie, u.altura, 'BAJA', sesion]);
      }
    });
  } else if (accion === 'poner') {
    // (01/11) Un palé suelto en un hueco concreto (regularizar o recolocar desde
    // «Buscar palet», el cuadre de la oficina…). Si el hueco lo tiene otro palé,
    // no se toca salvo que venga forzar:true; entonces ese otro se da de BAJA.
    var zp = String(payload.zona || '').trim().toUpperCase(), fp = Number(payload.fila) || 0;
    var pp = Number(payload.pie) || 0, ap = Number(payload.altura) || 0, idp = String(payload.id || '').trim();
    // (02/11, API 16) Zonas sin huecos: CF-PICKING, CF-PUERTA… (fila/pie/altura 0;
    // caben los que sean, no hay «ocupado»).
    var esp = /^C[MF]-[A-Z]+$/.test(zp);
    if (esp) { fp = 0; pp = 0; ap = 0; }
    if (!idp || (!esp && (!/^C[MF]\d$/.test(zp) || fp < 1 || fp > 17 || pp < 1 || ap < 1))) {
      return _ubicRespuesta({ok: false, error: 'Datos de ubicación no válidos'});
    }
    var codp = esp ? zp : _ubicCodigo(zp, fp, pp, ap), otro = null, kp = _ubicClave(idp);
    if (!esp) Object.keys(vigentes).forEach(function(k) { if (k !== kp && vigentes[k].codigo === codp) otro = vigentes[k]; });
    if (otro && !payload.forzar) return _ubicRespuesta({ok: false, ocupado: otro.id, codigo: codp});
    if (otro) filas.push([ahora, quien, otro.id, otro.codigo, otro.zona, otro.fila, otro.pie, otro.altura, 'BAJA', sesion]);
    if (!(vigentes[kp] && vigentes[kp].codigo === codp)) filas.push([ahora, quien, idp, codp, zp, fp, pp, ap, 'ALTA', sesion]);
  } else if (accion === 'mover') {
    // (01/11) Varios palés a la vez a huecos concretos (oficina, «Mover entre
    // filas»). Todo o nada: si algún hueco de destino lo tiene un palé que NO se
    // mueve, se devuelve la lista de choques y no se toca nada (salvo forzar).
    var lst = payload.pales || [], mov = {}, destinos = {}, malos = [];
    lst.forEach(function(p){ mov[_ubicClave(p.id)] = true; });
    var ocup = {};
    Object.keys(vigentes).forEach(function(k){ if (!mov[k]) ocup[vigentes[k].codigo] = vigentes[k].id; });
    var nuevas = [];
    lst.forEach(function(p){
      var id = String(p.id || '').trim(), z = String(p.zona || '').trim().toUpperCase(), f = Number(p.fila) || 0, pi = Number(p.pie) || 0, a = Number(p.altura) || 0;
      if (!id || !/^C[MF]\d$/.test(z) || f < 1 || f > 17 || pi < 1 || a < 1) { malos.push(id || '?'); return; }
      var cod = _ubicCodigo(z, f, pi, a);
      if (destinos[cod]) { malos.push(cod + ' (repetido)'); return; }
      destinos[cod] = id;
      nuevas.push({id: id, z: z, f: f, p: pi, a: a, cod: cod});
    });
    if (malos.length) return _ubicRespuesta({ok: false, error: 'Datos no válidos: ' + malos.join(', ')});
    var choques = Object.keys(destinos).filter(function(cod){ return ocup[cod]; });
    if (choques.length && !payload.forzar) return _ubicRespuesta({ok: false, ocupados: choques.map(function(c){ return {codigo: c, id: ocup[c]}; })});
    choques.forEach(function(cod){ var u = vigentes[_ubicClave(ocup[cod])]; filas.push([ahora, quien, u.id, u.codigo, u.zona, u.fila, u.pie, u.altura, 'BAJA', sesion]); });
    nuevas.forEach(function(n){
      var kn = _ubicClave(n.id);
      if (vigentes[kn] && vigentes[kn].codigo === n.cod) return;
      filas.push([ahora, quien, n.id, n.cod, n.z, n.f, n.p, n.a, 'ALTA', sesion]);
    });
  } else if (accion === 'baja') {
    (payload.ids || []).forEach(function(id) {
      id = String(id || '').trim();
      var u = vigentes[_ubicClave(id)];
      if (u) filas.push([ahora, quien, u.id, u.codigo, u.zona, u.fila, u.pie, u.altura, 'BAJA', sesion]);
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
