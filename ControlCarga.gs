/******************************************************************************
 * ControlCarga.gs — CONTROL CARGA VEHÍCULOS AUTOVENTAS   ·   FOR PR 08-10(1)
 * ----------------------------------------------------------------------------
 * Joaquín rellena este registro de calidad en la app de pedidos/autoventa
 * (ximo1800.github.io/albaran, pestaña «5 · Control carga» de cada cuadre).
 * Calidad NO debe entrar en esa app: lo consulta y lo imprime desde TraceQueso.
 *
 * Este fichero es SOLO LECTURA. No escribe NADA en PEDIDOS TIENDA, ni una
 * celda. Si alguna vez hace falta escribir ahí, que se haga desde la app de
 * pedidos, que es su dueña; aquí no.
 *
 * Las dos hojas viven en la misma cuenta de Google (app producción), así que
 * openById funciona sin más. Al desplegar, la primera vez pedirá autorizar el
 * acceso a hojas de cálculo si el proyecto no lo tenía.
 *
 * Fichero NUEVO: se pega entero, no sustituye a Codigo.gs. Lo único que hay
 * que tocar en Codigo.gs es un bloque dentro de doGet (va aparte).
 *
 * 2026-10-07
 ******************************************************************************/

var PEDIDOS_TIENDA_ID = '1ectBsJ9eVZNDOOT7vDzSt7YoWey_og6zvESPQ7KBy9c';
var HOJA_AUTOVENTA    = 'AUTOVENTA';

// ─────────────────────────────────────────────────────────────────────────────
// ¿PUEDE VERLO?
// Misma tolerancia que en la app con los roles compuestos ('ADMIN/QUESERO',
// 'CALIDAD, QUESERO'): se busca la palabra suelta, no la cadena exacta.
//
// AVISO HONESTO: esto es una puerta, no una cerradura. La aplicación web se
// publica como anónima, así que el rol llega como parámetro y cualquiera que
// conozca la URL podría escribir rol=ADMIN. Lo que de verdad protege es que la
// URL no es pública y que esta acción NO ESCRIBE. Sirve para que nadie entre
// por descuido desde la propia app, no para parar a quien quiera colarse.
// ─────────────────────────────────────────────────────────────────────────────
function _ccPuede(rol) {
  var limpio = String(rol || '').toUpperCase()
                 .replace(/[\/,;|\.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  var p = ' ' + limpio + ' ';
  return p.indexOf(' ADMIN ') >= 0 || p.indexOf(' CALIDAD ') >= 0;
}

// Cualquier fecha → 'aaaa-mm-dd'. Acepta texto ISO, texto dd/mm/aaaa y objeto
// Date (Sheets convierte sola una celda 2026-10-06 en fecha de verdad, y
// entonces lo que llega aquí NO es una cadena).
function _ccFechaISO(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

// Número tolerante: admite coma decimal y devuelve null si no hay nada.
// OJO: el 0 es un valor válido (una temperatura de 0 ºC existe), por eso se
// distingue null de 0 en todo el fichero y nunca se usa "if (!valor)".
function _ccNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = String(v).trim().replace(',', '.');
  if (!s) return null;
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTURA DE LOS CONTROLES
// Cada fila de AUTOVENTA es un cuadre, y DATOS es un JSON con todo él. Lo que
// interesa aquí es DATOS.control, que es el registro de calidad.
//
// Se considera control VÁLIDO cuando existe DATOS.control y además tiene la
// temperatura o la matrícula rellenas, o el cuadre está cerrado. Sin esa
// condición saldrían cuadres recién abiertos con la ficha en blanco.
// ─────────────────────────────────────────────────────────────────────────────
function leerControlesCarga(desde, hasta) {
  try {
    var dIni = _ccFechaISO(desde), dFin = _ccFechaISO(hasta);

    var libro = SpreadsheetApp.openById(PEDIDOS_TIENDA_ID);
    var sh = libro.getSheetByName(HOJA_AUTOVENTA);
    if (!sh) return { error: 'No se encuentra la hoja ' + HOJA_AUTOVENTA + ' en PEDIDOS TIENDA.' };

    var v = sh.getDataRange().getValues();
    if (v.length < 2) return { controles: [], total: 0, desde: dIni, hasta: dFin };

    var cab = v[0].map(function (c) { return String(c || '').trim().toUpperCase(); });
    var iID  = cab.indexOf('ID');
    var iVEN = cab.indexOf('VENDEDOR');
    var iFEC = cab.indexOf('FECHA');
    var iEST = cab.indexOf('ESTADO');
    var iDAT = cab.indexOf('DATOS');
    if (iDAT < 0) return { error: 'La hoja AUTOVENTA no tiene columna DATOS.' };

    var out = [], malos = 0;

    for (var r = 1; r < v.length; r++) {
      var id = String(iID >= 0 ? v[r][iID] : v[r][0] || '').trim();
      if (!id) continue;
      if (id.toUpperCase() === 'CONFIG') continue;   // fila de configuración

      var crudo = v[r][iDAT];
      if (!crudo) continue;

      var d = null;
      try { d = JSON.parse(String(crudo)); } catch (eJson) { malos++; continue; }
      if (!d || !d.control) continue;

      var c = d.control;
      var estado = String((iEST >= 0 ? v[r][iEST] : '') || d.estado || '')
                     .trim().toLowerCase();
      var mat  = String(c.mat || '').trim();
      var temp = _ccNum(c.temp);

      if (temp === null && !mat && estado !== 'cerrado') continue;

      // La fecha del control manda; si falta, la del cuadre.
      var fecha = _ccFechaISO(c.fecha) ||
                  _ccFechaISO(iFEC >= 0 ? v[r][iFEC] : '') ||
                  _ccFechaISO(d.fecha);
      if (!fecha) continue;
      if (dIni && fecha < dIni) continue;
      if (dFin && fecha > dFin) continue;

      // Lo escrito a mano manda sobre lo calculado por la app.
      var bultos = _ccNum(c.bultos); if (bultos === null) bultos = _ccNum(c.bultosAuto);
      var kilos  = _ccNum(c.kilos);  if (kilos  === null) kilos  = _ccNum(c.kilosAuto);

      out.push({
        id:      id,
        fecha:   fecha,
        trans:   String(c.trans || d.vendedor || (iVEN >= 0 ? v[r][iVEN] : '') || '').trim(),
        mat:     mat,
        bultos:  bultos,
        kilos:   kilos,
        temp:    temp,
        conf:    (c.conf === undefined || c.conf === null) ? true : !!c.conf,
        obs:     String(c.obs || '').trim(),
        por:     String(c.por || '').trim(),
        firma:   String(c.firma || ''),
        firmado: c.firmado || null,
        estado:  estado
      });
    }

    out.sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return String(a.trans).localeCompare(String(b.trans));
    });

    var res = { controles: out, total: out.length, desde: dIni, hasta: dFin };
    // Si alguna fila trae un DATOS que no es JSON válido se dice, en vez de
    // tragárselo en silencio: así se sabe que falta algo y por qué.
    if (malos) res.filas_ilegibles = malos;
    return res;

  } catch (err) {
    return { error: String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA DESDE EL EDITOR
// Ejecutar esta función una vez tras pegar el fichero: autoriza el acceso y
// deja en el registro lo que se ve, sin tener que tocar la app.
// ─────────────────────────────────────────────────────────────────────────────
function probarControlesCarga() {
  var hoy = new Date();
  var hace60 = new Date(hoy.getTime() - 60 * 24 * 3600 * 1000);
  var desde = Utilities.formatDate(hace60, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var hasta = Utilities.formatDate(hoy,    Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var r = leerControlesCarga(desde, hasta);
  Logger.log('Del ' + desde + ' al ' + hasta);
  if (r.error) { Logger.log('ERROR: ' + r.error); return; }
  Logger.log('Controles encontrados: ' + r.total);
  if (r.filas_ilegibles) Logger.log('Filas con DATOS ilegible: ' + r.filas_ilegibles);
  (r.controles || []).forEach(function (c) {
    Logger.log(c.fecha + ' · ' + c.trans + ' · ' + c.mat +
               ' · bultos ' + c.bultos + ' · kilos ' + c.kilos +
               ' · ' + c.temp + ' ºC · conforme ' + (c.conf ? 'SÍ' : 'NO') +
               ' · por ' + c.por + (c.firma ? ' · firmado' : ''));
  });
}
