// ══════════════════════════════════════════════════════════════════════════
// (2026-10-22) AVISO POR CORREO: TIERNO AGOTADO EN LA CÁMARA DE FRÍO
// ──────────────────────────────────────────────────────────────────────────
// Joaquín mira cada mañana el plan de pedidos para ver si de alguna referencia
// de tierno no queda ningún palé en la cámara de frío. Quiere que, en cuanto
// pase, le llegue un correo a su cuenta y le salte en el móvil.
//
// Cada media hora (enganchado al activador del SCADA, que va cada 10 min) se
// recalcula lo mismo que la pantalla «Disponibilidad de tiernos» de la app:
//   · Referencias: las de PED_TIERNOS_REFS de index.html (copiadas abajo).
//   · Un palé cuenta si su variedad (lo que va tras * en el ID) lleva TIERNO,
//     su tipo y formato coinciden, y su sala actual es 6.CAMARA FRIO.
//   · Sala actual = la ÚLTIMA sala apuntada (SALA DESTINO, o SALA VOLTEO en un
//     volteo), por fecha; si es VENTA, el palé ha salido. Es la regla v417 de
//     la app, la que ve todo el mundo.
// Avisa solo de lo que no está NI en cámara NI en proceso, y lo repite cada 24 h
// hasta que se fabrique (ver revisarTiernosCamara).
// ══════════════════════════════════════════════════════════════════════════
var CORREO_AVISO_TIERNOS = 'Joaquin@quesoselhidalgo.com';

var TIERNOS_REFS_SRV = [
  {n:'OVEJA · 3 KG',   tipo:'OVEJA',  fmt:'3 KG'},
  {n:'OVEJA · 2 KG',   tipo:'OVEJA',  fmt:'2 KG'},
  {n:'OVEJA · 1 KG',   tipo:'OVEJA',  fmt:'1 KG'},
  {n:'MEZCLA · 3 KG',  tipo:'MEZCLA', fmt:'3 KG'},
  {n:'MEZCLA · BARRA', tipo:'MEZCLA', fmt:'BARRA'},
  {n:'CABRA · 1 KG',   tipo:'CABRA',  fmt:'1 KG'}
];
var TIERNOS_SALA_FRIO = '6.CAMARA FRIO';
var TIERNOS_SALAS_PROCESO = ['1.SALADERO','2.GOLPE FRIO','3.SECADERO 1','4.SECADERO 2','5.SECADERO 3'];
var TIERNOS_CADA_MIN = 30;

// Lo llama procesarEntradaSCADA en cada vuelta; solo trabaja cada 30 min.
function _avisoTiernosSiToca(){
  var props = PropertiesService.getScriptProperties();
  var ult = parseInt(props.getProperty('TIERNOS_ULT_REVISION') || '0', 10) || 0;
  if(Date.now() - ult < TIERNOS_CADA_MIN*60*1000) return;
  props.setProperty('TIERNOS_ULT_REVISION', String(Date.now()));
  revisarTiernosCamara();
}

// Se puede ejecutar a mano desde el editor para probar (manda correo si toca).
// (2026-10-22, v2) ES UNA ORDEN DE FABRICACIÓN, NO UN AVISO DE STOCK.
// Joaquín: «el aviso es cuando no lo tengo ni siquiera en proceso». Mientras
// haya un palé de esa referencia en cámara O en proceso (ya fabricado, aunque
// aún se esté curando), no se avisa de nada. Cuando no hay en ningún sitio:
//   · correo en cuanto se detecta (la revisión va cada 30 min),
//   · y otro cada 24 h mientras siga igual,
//   · hasta que aparezca un palé en proceso o en cámara: ahí se olvida.
var TIERNOS_REPETIR_H = 24;
function revisarTiernosCamara(){
  var props = PropertiesService.getScriptProperties();
  var est = _tiernosEstado();
  var avisos = {};   // ref → ms del último correo mientras le falta
  try{ avisos = JSON.parse(props.getProperty('TIERNOS_AVISOS') || '{}'); }catch(e){ avisos = {}; }
  var ahora = Date.now(), toca = [];
  est.forEach(function(x){
    var falta = (x.camara === 0 && x.proceso.length === 0);
    if(!falta){ delete avisos[x.ref.n]; return; }                 // ya está fabricado o en cámara
    var ult = avisos[x.ref.n] || 0;
    if(!ult || ahora - ult >= TIERNOS_REPETIR_H*3600*1000 - 15*60*1000){
      toca.push(x);
      avisos[x.ref.n] = ahora;
    }
  });
  if(toca.length) _tiernosMandarCorreo(toca, est, avisos);
  props.setProperty('TIERNOS_AVISOS', JSON.stringify(avisos));
  return est.map(function(x){ return x.ref.n + ': ' + x.camara + ' en cámara, ' + x.proceso.length + ' en proceso'; }).join('\n');
}

function _tiernosMandarCorreo(faltan, est){
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy HH:mm');
  var asunto = 'AVISO TraceQueso · Fabricar tierno: ' + faltan.map(function(x){ return x.ref.n; }).join(', ');
  var L = [];
  L.push('Aviso de TraceQueso · ' + hoy);
  L.push('');
  L.push('De estas referencias de tierno no queda ningún palé en la Cámara de Frío y tampoco hay ninguno en proceso (saladero, golpe de frío ni secaderos):');
  L.push('');
  faltan.forEach(function(x){ L.push('   ▶ ' + x.ref.n); });
  L.push('');
  L.push('Este aviso se repetirá cada 24 horas hasta que se fabrique: en cuanto haya un palé de la referencia en proceso o en cámara, deja de llegar.');
  L.push('');
  L.push('Situación de todos los tiernos ahora mismo:');
  est.forEach(function(x){
    var txt = '  · ' + x.ref.n + ': ' + x.camara + ' en cámara';
    if(x.proceso.length){
      var fs = x.proceso.map(function(p){ return p.fab; }).filter(Boolean).sort();
      txt += ', ' + x.proceso.length + ' en proceso' + (fs.length ? ' (fabricado el ' + fs[fs.length-1] + ')' : '');
    }
    L.push(txt);
  });
  L.push('');
  L.push('Ojo: el aviso es tan bueno como los registros. Si un palé sale de la cámara y no se registra el movimiento, la app sigue contándolo.');
  MailApp.sendEmail(CORREO_AVISO_TIERNOS, asunto, L.join('\n'));
}

function _tiernosSalaTxt(s){
  return String(s||'').replace(/^\d+\./, '').replace('CAMARA', 'Cámara').toLowerCase().replace(/^./, function(c){ return c.toUpperCase(); });
}

// ── Cálculo: misma lógica que procesarDatos + _pedEstadoTiernos de index.html ──
function _tiernosEstado(){
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var last = sh.getLastRow();
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h){ return String(h||'').trim().toUpperCase(); });
  function col(nombre){
    var i = cab.indexOf(nombre);
    if(i < 0 || last < 2) return [];
    return sh.getRange(2, i+1, last-1, 1).getValues().map(function(r){ return r[0]; });
  }
  var cId = col('ID PALET'), cSec = col('SECCIÓN'), cFecha = col('FECHA'), cTipo = col('TIPO DE QUESO'),
      cFmt = col('FORMATO/PESO'), cSd = col('SALA DESTINO'), cSv = col('SALA VOLTEO'), cSo = col('SALA ORIGEN');
  var TQ = {'1':'MEZCLA','2':'OVEJA','3':'D.O. PAST.','4':'D.O. CRUDA','5':'CABRA','6':'OVEJA CRUDA','7':'FINOS','8':'MESNERA'};
  var FM = {'1':'1 KG','2':'2 KG','3':'3 KG','4':'BARRA','5':'SUPERMINIS'};
  var map = {};
  for(var r = 0; r < cId.length; r++){
    var pid = String(cId[r]||'').trim();
    if(!pid || !/^\d{6}[\d ]/.test(pid)) continue;
    var base = pid.replace(/\s/g,'').split('!')[0];
    var dig = base.split('*')[0];
    var vari = base.indexOf('*') >= 0 ? base.substring(base.indexOf('*')+1).trim() : '';
    if(vari.toUpperCase().indexOf('TIERNO') < 0) continue;              // solo tiernos
    var key = dig + '*' + vari;
    var sec = String(cSec[r]||'').trim().toUpperCase();
    var f = _tiernosFecha(cFecha[r]);
    var t = f ? f.getTime() : 0;
    if(!map[key]) map[key] = {id: pid, tipo: '', fmt: '', sala: '', salaT: -1, primera: null, primeraEsp: null};
    var p = map[key];
    var tq = _tiernosTipo(cTipo[r]);
    if(tq) p.tipo = tq;
    if(!p.fmt){
      var fmtId = _tiernosFmtId(pid, FM);
      p.fmt = fmtId || String(cFmt[r]||'').trim().toUpperCase();
    }
    var sd = _tiernosSala(cSd[r]), sv = _tiernosSala(cSv[r]);
    var sx = sd || (sec === 'VOLTEO' ? sv : '');
    if(sx && t >= p.salaT){ p.sala = sx; p.salaT = t; }
    if(f){
      if(!p.primera || t < p.primera.getTime()) p.primera = f;
      // Fecha de fabricación como en la app: 1ª capa o salida del saladero, menos un día.
      var esPrim = (sec === '1ª CAPA' || sec.replace(/[^A-Z0-9]/g,'').indexOf('1ACAPA') === 0 ||
                    (sec === 'MOVIMIENTO' && _tiernosSala(cSo[r]) === '1.SALADERO'));
      if(esPrim && (!p.primeraEsp || t < p.primeraEsp.getTime())) p.primeraEsp = f;
    }
    if(!p.tipo) p.tipo = TQ[dig.charAt(0)] || '';
  }
  var hoy = new Date();
  var pales = Object.keys(map).map(function(k){
    var p = map[k];
    var fabD = p.primeraEsp || p.primera;
    var fab = null, dias = null;
    if(fabD){
      var d = new Date(fabD.getTime()); d.setDate(d.getDate()-1);
      fab = Utilities.formatDate(d, 'Europe/Madrid', 'dd/MM/yyyy');
      dias = Math.max(0, Math.floor((hoy - d) / 86400000));
    }
    var sala = (p.sala === '9.VENTA') ? '' : p.sala;
    return {id: p.id, tipo: p.tipo, fmt: p.fmt, sala: sala, fab: fab, dias: dias};
  });
  return TIERNOS_REFS_SRV.map(function(ref){
    var mismos = pales.filter(function(p){ return p.tipo === ref.tipo && p.fmt === ref.fmt; });
    return {
      ref: ref,
      camara: mismos.filter(function(p){ return p.sala === TIERNOS_SALA_FRIO; }).length,
      proceso: mismos.filter(function(p){ return TIERNOS_SALAS_PROCESO.indexOf(p.sala) >= 0; })
    };
  });
}

function _tiernosSala(s){
  if(!s) return '';
  s = String(s).trim().toUpperCase();
  if(s.indexOf('SALADERO') >= 0) return '1.SALADERO';
  if(s.indexOf('GOLPE') >= 0) return '2.GOLPE FRIO';
  if(s.indexOf('SECADERO 1') >= 0) return '3.SECADERO 1';
  if(s.indexOf('SECADERO 2') >= 0) return '4.SECADERO 2';
  if(s.indexOf('SECADERO 3') >= 0) return '5.SECADERO 3';
  if(s.indexOf('MADURACION') >= 0 || s.indexOf('MADURACIÓN') >= 0) return '7.CAMARA MADURACION';
  if(s.indexOf('FABRICA') >= 0 || s.indexOf('FÁBRICA') >= 0) return '8.FABRICA VIEJA';
  if(s.indexOf('CAMARA') >= 0 || s.indexOf('CÁMARA') >= 0 || s.indexOf('FRIO') >= 0 || s.indexOf('FRÍO') >= 0) return '6.CAMARA FRIO';
  if(s.indexOf('VENTA') >= 0) return '9.VENTA';
  return s;
}

function _tiernosTipo(t){
  if(!t) return '';
  t = String(t).trim().toUpperCase();
  var c = t.replace(/[\.\s\-]/g,'');
  if(c === 'DOPAST' || c === 'DOPASTEURIZADO') return 'D.O. PAST.';
  if(c === 'DOCRUDA') return 'D.O. CRUDA';
  return t;
}

// Formato desde el ID (mismo criterio que parsearId de la app).
function _tiernosFmtId(id, FM){
  var base = String(id).split('*')[0];
  var fmtD;
  if(base.charAt(6) === ' '){
    fmtD = base.length >= 13 ? base.charAt(9) : base.charAt(8);
  } else {
    fmtD = base.replace(/\s/g,'').replace(/\D/g,'').charAt(8);
  }
  return FM[fmtD] || '';
}

function _tiernosFecha(v){
  if(v === null || v === undefined || v === '') return null;
  if(Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? null : v;
  if(typeof v === 'number' && v > 25569 && v < 60000) return new Date(Math.round((v-25569)*86400000));
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if(m) return new Date(+m[3], +m[2]-1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  var d = new Date(s);
  return isNaN(d) ? null : d;
}
