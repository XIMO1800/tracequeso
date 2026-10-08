/******************************************************************************
 * ConversorSCADA.gs — CONVERSIÓN AUTOMÁTICA DE LOS .xps DEL SCADA
 * ----------------------------------------------------------------------------
 * Hace en el servidor lo mismo que convertir-pasteurizacion.html (v1.5) y
 * convertir-cuba.html (v2.1). Las normas de lectura NO se han reescrito: el
 * código de dentro de SCADA_PAST y SCADA_CUBA está COPIADO LITERALMENTE de esos
 * dos conversores. Lo único cambiado es lo que en el navegador era pantalla
 * (avisos, botones, descarga): aquí las funciones devuelven el resultado.
 * Si un día se cambia una norma en un conversor, hay que cambiarla aquí igual.
 *
 * Fichero NUEVO: se pega entero, no sustituye a nada. Cada conversor va dentro
 * de su propia caja (function(){...})() para que sus nombres (num, extraer,
 * construir...) no choquen con los de Codigo.gs ni entre sí.
 *
 * 2026-10-07 · Lo usa la recepción automática de abajo (recibirXpsScada y
 * procesarEntradaSCADA). probarConversorSCADA() sigue sirviendo para probar.
 ******************************************************************************/

// ═════════════════════════════════════════════════════════════════════════════
// PASTEURIZACIÓN — copia literal de convertir-pasteurizacion.html v1.5
// ═════════════════════════════════════════════════════════════════════════════
var SCADA_PAST = (function(){
function num(v){ var x=parseFloat(String(v).replace(',','.')); return isNaN(x)?0:x; }

var RE_TXT = /UnicodeString="([^"]*)"/g;
var RE_HORA = /^\d{2}\/\d{2}\/\d{2} \d{1,2}:\d{2}:\d{2}$/;

function extraer(xml, filas){
  var txt = [], m;
  RE_TXT.lastIndex = 0;
  while((m = RE_TXT.exec(xml)) !== null){
    txt.push(m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
  }
  // Cada fila son 11 celdas: hora + 10 valores
  var j = 0;
  while(j < txt.length){
    if(RE_HORA.test(txt[j])){
      if(j+10 < txt.length) filas.push(txt.slice(j, j+11));
      j += 11;
    } else j++;
  }
}

function construir(filas){
  function seg(t){ var p=t.split(' ')[1].split(':'); return (+p[0])*3600+(+p[1])*60+(+p[2]); }

  // ── (v1.2) ¿DEJÓ DE GRABAR EL SCADA? ──
  // Mismo control que en el conversor de cubas. El 26 de agosto el registro se
  // cortó a media mañana y el archivo siguió repitiendo la misma línea hasta la
  // noche: parecía un día completo y solo tenía la primera hornada.
  var congelado = null;
  (function(){
    var ini=0, mejorIni=0, mejorLen=0;
    function _clave(f){ return f.slice(1).join('|'); }
    for(var i=1;i<filas.length;i++){
      if(_clave(filas[i]) !== _clave(filas[i-1])){
        if(i-ini > mejorLen){ mejorLen=i-ini; mejorIni=ini; }
        ini=i;
      }
    }
    if(filas.length-ini > mejorLen){ mejorLen=filas.length-ini; mejorIni=ini; }
    if(mejorLen >= 120){
      congelado = {desde: seg(filas[mejorIni][0]), filas: mejorLen,
                   minutos: Math.round(mejorLen*5/60)};
    }
  })();
  // columnas: 0 TIEMPO · 1 Tª Past · 2 Desvío · 3 Bacto · 4 Hacia cuba · 5 Agua
  //           6 Presión1 · 7 Presión2 · 8 FrecB1 · 9 FrecB2 · 10 Estado
  var puntos = [];
  for(var i=0;i<filas.length;i+=20){
    var f = filas[i];
    puntos.push({t:seg(f[0]), past:num(f[1]), desvio:num(f[2]), bacto:num(f[3]),
                 cuba:num(f[4]), agua:num(f[5]), est:String(f[10]).trim()});
  }

  // Bloques por estado (1 sin bactofugadora · 2 con · 3 limpieza)
  var bl=[], est=null, i0=0;
  for(var k=0;k<filas.length;k++){
    var e = String(filas[k][10]).trim();
    if(e !== est){ if(est!==null) bl.push([est,i0,k-1]); est=e; i0=k; }
  }
  bl.push([est,i0,filas.length-1]);

  // (v1.3) UN PARPADEO DEL ESTADO NO PARTE LA LIMPIEZA.
  // El 11/09 el SCADA marcó limpieza (estado 3) de 10:35 a 11:58, pero durante
  // el aclarado entre la sosa y el ácido el estado cambió unos segundos. Eso
  // partía la limpieza en dos, cada trozo empezaba su cuenta y los dos lavados
  // salían como SOSA (Joaquín, 11/09: "se da sosa y ácido, no dos veces sosa").
  // Si el parpadeo cae en mitad de un lavado, además, lo parte en dos trozos y
  // aparece un lavado de más. Ahora, un cambio de estado de menos de 3 minutos
  // entre dos tramos de limpieza se funde con ellos: es la misma limpieza.
  (function(){
    var r=[];
    for(var q=0;q<bl.length;q++){
      var b=bl[q];
      var dur=seg(filas[b[2]][0])-seg(filas[b[1]][0]);
      if(b[0]!=='3' && dur<180 && r.length && r[r.length-1][0]==='3'
         && q+1<bl.length && bl[q+1][0]==='3'){
        r[r.length-1][2]=bl[q+1][2];   // la limpieza de antes llega hasta el final de la de después
        q++;                            // la de después ya queda dentro
        continue;
      }
      r.push(b.slice());
    }
    bl=r;
  })();

  function media(a,b,col,minimo){
    var v=[], x;
    for(var k=a;k<=b;k++){ x=num(filas[k][col]); if(x>(minimo||0)) v.push(x); }
    if(!v.length) return 0;
    return Math.round(v.reduce(function(p,q){return p+q;},0)/v.length*10)/10;
  }

  // (v1.5) ¿CUÁNDO VUELVE A EMPEZAR EL LAVADO DESPUÉS DE VACIAR?
  // Al vaciar y volver a llenar, la sonda de la bactofugadora se va abajo y luego
  // sube sola y sin parar hasta los 80 y pico. El lavado nuevo empieza en ese
  // punto más bajo: es el momento en que el circuito ya está lleno otra vez y
  // empieza a calentar. Se busca dentro de los 15 minutos siguientes al vaciado.
  function reinicioLavado(k0, kMax){
    var mejor=k0, minV=1e9, lim=seg(filas[k0][0])+900;
    for(var k=k0;k<=kMax && seg(filas[k][0])<=lim;k++){
      var v=num(filas[k][3]);
      if(v < minV){ minV=v; mejor=k; }
    }
    return mejor;
  }

  var anotaciones = [], agua = [];
  // (v1.3) LOS LAVADOS SE CUENTAN SEGUIDOS. El nombre sale del orden: el 1.º
  // calentón es SOSA y el 2.º ÁCIDO. La cuenta ya no vuelve a empezar en cada
  // tramo de limpieza, sino solo cuando se pasteuriza leche: así, aunque entre
  // la sosa y el ácido haya una parada larga de verdad, el ácido sigue siendo
  // ÁCIDO, y la limpieza de la mañana y la de después de fabricar empiezan cada
  // una por su sosa.
  var nLavado = 0;
  bl.forEach(function(b){
    var e=b[0], a=b[1], z=b[2];
    var mins = (seg(filas[z][0]) - seg(filas[a][0]))/60;
    if(e === '3'){
      if(mins < 15) return;                 // un paso fugaz por lavado no es limpieza
      // Sosa y ácido: dos tramos de agua caliente con el aclarado frío en medio
      var tr=[], ini=null, prev=null;
      for(var k=a;k<=z;k++){
        var cal = num(filas[k][5]) > 65;
        if(cal && ini===null) ini=k;
        if(!cal && ini!==null){ tr.push([ini,prev]); ini=null; }
        if(cal) prev=k;
      }
      if(ini!==null) tr.push([ini,prev]);
      // (v1.3) Un bache frío de menos de 2 minutos dentro de un lavado no es el
      // aclarado entre sosa y ácido (ese dura varios minutos: 7,5 el 11/09): los
      // dos trozos son el mismo lavado y se juntan. Si no, un lavado salía partido
      // en dos y aparecía uno de más.
      //
      // (v1.4) PERO CORTO NO QUIERE DECIR BACHE. El 22/09 Jorge pasó de la sosa
      // al ácido en 1 min 50 s: vació y volvió a llenar sin parar. Como duró
      // menos de 2 minutos, se tomó por un bache y la sosa y el ácido salieron
      // juntos como "SOSA · 82 min". Lo que distingue un cambio de lavado no es
      // lo que dura, es que el circuito SE ENFRÍA: ese día el agua bajó de 90 °C
      // a 41,5 °C. Un bache de verdad apenas asoma por debajo de los 65 °C.
      // Ahora solo se juntan los trozos si el hueco es corto Y el agua no baja
      // de 55 °C en ningún momento.
      var trJ=[];
      tr.forEach(function(t){
        var u=trJ[trJ.length-1];
        var corto = u && (seg(filas[t[0]][0])-seg(filas[u[1]][0]) < 120);
        var minAgua = 999;
        if(corto){
          for(var kk=u[1]; kk<=t[0]; kk++){ var ag=num(filas[kk][5]); if(ag<minAgua) minAgua=ag; }
        }
        if(corto && minAgua > 55) u[1]=t[1];
        else trJ.push([t[0],t[1]]);
      });
      tr = trJ;

      // (v1.5) EL LAVADO ACABA CUANDO SE VACÍA EL CIRCUITO, NO CUANDO SE ENFRÍA.
      // El 29/09 Jorge aclaró SIN CERRAR EL VAPOR (Joaquín: "ha aclarado, pero no
      // ha cerrado la llave de vapor"). El agua no bajó de 79 °C en ningún momento,
      // así que ni la regla del agua fría ni la de v1.4 podían partir nada: la sosa
      // y el ácido salían pegados en un solo "SOSA · 74 min".
      //
      // Lo que sí se ve igual los dos días —el 22/09 que aclaró en frío y el 29/09
      // que aclaró en caliente— es el VACIADO: cuando abre para tirar el agua, la
      // sonda de salida a cuba (col 4) se va de golpe de sus 42-44 °C de siempre
      // hasta 84 °C durante 20-30 segundos, porque le pasa el agua del lavado por
      // delante. Eso pasa exactamente dos veces al día y siempre dentro de la
      // limpieza: 22/09 a las 08:24:53 y 09:12:27 · 29/09 a las 10:42:53 y 11:21:16.
      // Ni una sola vez más en 15.000 medidas. Es la marca más fiable que hay.
      var trV=[];
      tr.forEach(function(t){
        var cortes=[];
        for(var k=t[0]; k<=t[1]; k++){
          // Dos medidas seguidas por encima de 78: un dato suelto no vale.
          if(num(filas[k][4])>78 && k+1<=t[1] && num(filas[k+1][4])>78){
            var kf=k; while(kf<=t[1] && num(filas[kf][4])>70) kf++;
            cortes.push([k, kf-1]);
            k=kf;
          }
        }
        if(!cortes.length){ trV.push([t[0],t[1]]); return; }
        var desde=t[0];
        cortes.forEach(function(c){
          trV.push([desde, c[0]]);                  // el lavado termina al vaciar
          desde = reinicioLavado(c[1], t[1]);       // el siguiente, al volver a llenar
        });
        if(desde < t[1]) trV.push([desde, t[1]]);
      });
      tr = trV;

      tr = tr.filter(function(t){ return (seg(filas[t[1]][0])-seg(filas[t[0]][0]))/60 >= 8; });
      var nom = ['SOSA','ÁCIDO','LAVADO 3'];
      tr.forEach(function(t, ix){
        var an = {tipo:'limpieza', nombre: nom[nLavado+ix] || 'LAVADO',
          t1:seg(filas[t[0]][0]), t2:seg(filas[t[1]][0]),
          mins: Math.round((seg(filas[t[1]][0])-seg(filas[t[0]][0]))/60),
          temp: media(t[0],t[1],5,50)};
        // (v1.5) EL ACLARADO ENTRE UN LAVADO Y EL SIGUIENTE.
        // Si el agua NO se enfría es que el aclarado se hizo con el vapor abierto:
        // se aclaró en caliente y no hay manera de saber por el tacto de la tubería
        // si quedaba sosa dentro. El 22/09, bien hecho, el agua bajó a 41,5 °C;
        // el 29/09, con el vapor abierto, no bajó de 79,5 °C. El límite son 60 °C:
        // si algún día hay que apretar o aflojar, es este número.
        if(ix > 0){
          var kA = tr[ix-1][1], mA = 999;
          for(var kk=kA; kk<=t[0]; kk++){ var ag=num(filas[kk][5]); if(ag<mA) mA=ag; }
          an.aclarado = Math.round((seg(filas[t[0]][0]) - seg(filas[kA][0]))/60*10)/10;
          an.aclaradoTemp = Math.round(mA*10)/10;
          if(mA > 60) an.aclaradoCaliente = true;
        }
        anotaciones.push(an);
      });
      nLavado += tr.length;
    } else if(e === '2'){
      // Solo hay LECHE con la bactofugadora en marcha Y entrando a temperatura de
      // leche: entra a 4 °C y sale de la bacto sobre 50. Si pasa agua, se va a 60.
      // (v1.2) EL BLOQUE EMPIEZA CUANDO ENTRA LA LECHE, NO CUANDO ARRANCA LA MÁQUINA.
      // Antes bastaba con que el pasteurizador pasara de 70 °C, pero el agua de
      // arranque ya va a 74-80: se colaba dentro del recuadro y los minutos salían
      // de más. El 18/08 eran 0,9 min en la primera hornada y 3,5 en la segunda,
      // y por eso las dos daban caudales distintos (14.937 y 13.685 L/h) siendo
      // la misma máquina. Cortando por la entrada de leche: 15.118 y 14.961.
      //
      // La señal que manda es HACIA CUBA (col 4): el agua va a 41-43 y la leche a
      // 28-29, sin zona intermedia. La sonda de la bactofugadora sola NO vale: al
      // arrancar el día está fría (33 °C) y ya cumpliría "menos de 56" antes de
      // que entre una gota de leche. Se piden las tres a la vez y sostenidas dos
      // minutos, para que un dato suelto no abra el bloque.
      function esLeche(k){
        return num(filas[k][1])>70 && num(filas[k][3])>0 && num(filas[k][3])<=56
                                   && num(filas[k][4])>0 && num(filas[k][4])<=34;
      }
      var prod = [], ini3=null;
      for(var k2=a;k2<=z;k2++){
        if(esLeche(k2)){ if(ini3===null) ini3=k2; }
        else {
          if(ini3!==null && seg(filas[k2-1][0])-seg(filas[ini3][0]) >= 120)
            for(var k5=ini3;k5<k2;k5++) prod.push(k5);
          ini3=null;
        }
      }
      if(ini3!==null && seg(filas[z][0])-seg(filas[ini3][0]) >= 120)
        for(var k6=ini3;k6<=z;k6++) prod.push(k6);
      if(!prod.length) return;
      var dur = (seg(filas[prod[prod.length-1]][0]) - seg(filas[prod[0]][0]))/60;
      if(dur < 5) return;
      var bac = media(prod[0], prod[prod.length-1], 3, 0);
      if(bac > 56) return;                  // es agua de arrastre, no leche
      var lec = media(prod[0], prod[prod.length-1], 1, 0);
      var ag  = media(prod[0], prod[prod.length-1], 5, 0);
      anotaciones.push({tipo:'pasteurizacion', t1:seg(filas[prod[0]][0]),
        t2:seg(filas[prod[prod.length-1]][0]), mins:Math.round(dur),
        leche:lec, agua:ag, salto:Math.round((ag-lec)*100)/100,
        bacto:bac, cuba: media(prod[0], prod[prod.length-1], 4, 0)});
      nLavado = 0;                          // (v1.3) tras pasteurizar, la próxima limpieza empieza por sosa
    } else if(mins >= 5){
      agua.push({t1:seg(filas[a][0]), t2:seg(filas[z][0])});
    }
  });

  // Envíos de agua a la cuba: la sonda de salida sube y el equipo está caliente.
  // NO se filtra por estado: los lavados de cuajada van sin bactofugadora.
  // UN PARÓN ROMPE EL BLOQUE. El 14/08 el equipo estuvo 10 minutos parado entre
  // el final de una pasteurización y el lavado de cuajada. Como la condición se
  // cumplía antes y después, los dos tramos salían pegados en un solo envío de
  // 21,6 min: el arrastre del final de la pasteurización y el lavado de verdad.
  // Y luego la gráfica lo descartaba por durar más de 20 minutos.
  var envios=[], ini2=null, prev2=null, ultFila=null;
  function cerrarEnvio(){
    if(ini2!==null && prev2!==null && seg(filas[prev2][0])-seg(filas[ini2][0]) >= 90)
      envios.push({t1:seg(filas[ini2][0]), t2:seg(filas[prev2][0]),
                   mins: Math.round((seg(filas[prev2][0])-seg(filas[ini2][0]))/60*10)/10,
                   temp: media(ini2,prev2,4,0)});
    ini2=null;
  }
  for(var k3=0;k3<filas.length;k3++){
    // Si entre esta medida y la anterior hay más de un minuto, es que el equipo
    // estuvo parado: lo que venga después es otra cosa, no la continuación.
    if(ultFila!==null && seg(filas[k3][0])-seg(filas[ultFila][0]) > 60) cerrarEnvio();
    ultFila = k3;
    var manda = num(filas[k3][4])>35 && num(filas[k3][1])>60;
    if(manda && ini2===null) ini2=k3;
    if(manda) prev2=k3;
    if(!manda && ini2!==null) cerrarEnvio();
  }
  cerrarEnvio();

  // ══ PASTEURIZANDO SIN BACTOFUGADORA ══
  // El estado 1 es "sin bactofugadora". Normalmente ahí solo pasa agua, pero si
  // hay LECHE (pasteurizador por encima de 70 y la sonda de la bactofugadora en
  // temperatura de leche, por debajo de 56) significa que se estuvo pasteurizando
  // con la bactofugadora parada. Eso hay que verlo en la gráfica.
  var sinBacto=[], iniSB=null, prevSB=null;
  for(var k4=0;k4<filas.length;k4++){
    var f4=filas[k4];
    var hayLeche = num(f4[1])>70 && num(f4[3])>0 && num(f4[3])<56;
    var apagada  = String(f4[10]).trim()==='1' && hayLeche;
    if(apagada && iniSB===null) iniSB=k4;
    if(!apagada && iniSB!==null){
      if(seg(filas[prevSB][0])-seg(filas[iniSB][0]) >= 120)
        sinBacto.push({t1:seg(filas[iniSB][0]), t2:seg(filas[prevSB][0]),
                       mins:Math.round((seg(filas[prevSB][0])-seg(filas[iniSB][0]))/60)});
      iniSB=null;
    }
    if(apagada) prevSB=k4;
  }
  if(iniSB!==null && seg(filas[prevSB][0])-seg(filas[iniSB][0]) >= 120)
    sinBacto.push({t1:seg(filas[iniSB][0]), t2:seg(filas[prevSB][0]),
                   mins:Math.round((seg(filas[prevSB][0])-seg(filas[iniSB][0]))/60)});

  // Un tramo sólo es "pasteurizando sin bactofugadora" (aviso serio, en rojo) si
  // lo que pasa es LECHE. La leche va a la cuba a temperatura de cuajado (unos
  // 29 °C); el agua de un lavado va a 41-43. Si el tramo coincide con un envío de
  // agua, es un lavado: se marca 'agua' y la gráfica lo cuenta como información
  // —lavó sin bactofugadora— en vez de como alarma. Que también interesa saberlo,
  // porque unas veces la cuajada se lava con la bactofugadora y otras no.
  sinBacto.forEach(function(b){
    for(var q=0;q<envios.length;q++)
      if(b.t1 < envios[q].t2 && b.t2 > envios[q].t1){ b.agua=true; return; }
  });

  // La fecha se saca de la primera medida: "13/08/26 5:16:18" → 2026-08-13
  var f0 = filas[0][0].split(' ')[0].split('/');
  return {
    congelado: congelado,
    fecha: '20'+f0[2]+'-'+f0[1]+'-'+f0[0],
    medidas: filas.length,
    puntos: puntos, anotaciones: anotaciones, agua: agua, envios: envios,
    sinBacto: sinBacto
  };
}

  return { extraer: extraer, construir: construir };
})();

// ═════════════════════════════════════════════════════════════════════════════
// CUBAS — copia literal de convertir-cuba.html v2.1
// ═════════════════════════════════════════════════════════════════════════════
var SCADA_CUBA = (function(){
function _nombreJson(cuba, fecha){
  var d, m, a, t = String(fecha||'').trim();
  var mm;
  if((mm = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))){        // 2026-08-21
    a = mm[1]; m = mm[2]; d = mm[3];
  } else if((mm = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))){  // 21/08/26 ó 21/08/2026
    d = mm[1]; m = mm[2]; a = mm[3].length===2 ? ('20'+mm[3]) : mm[3];
  } else {
    return 'cuba' + (cuba||'') + '-fecha-desconocida.json';
  }
  d = ('0'+d).slice(-2);  m = ('0'+m).slice(-2);
  return 'cuba' + (cuba||'') + '-' + d + '.' + m + '.' + a + '.json';
}
function num(v){ var x=parseFloat(String(v).replace(',','.')); return isNaN(x)?0:x; }

var CABECERA = '';

var RE_TXT = /UnicodeString="([^"]*)"/g;
var RE_HORA = /^\d{2}\/\d{2}\/\d{2} \d{1,2}:\d{2}:\d{2}$/;

function extraer(xml, filas){
  var txt = [], m;
  RE_TXT.lastIndex = 0;
  while((m = RE_TXT.exec(xml)) !== null){
    txt.push(m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
  }
  // El número de cuba va en el título de la primera página: "Control Cuba 1"
  if(!CABECERA){
    for(var q=0;q<txt.length && q<6;q++){
      if(/Control\s+Cuba/i.test(txt[q])){ CABECERA = txt[q]; break; }
    }
  }
  // Cada fila son 18 celdas: hora + 17 valores
  var j = 0;
  while(j < txt.length){
    if(RE_HORA.test(txt[j])){
      if(j+17 < txt.length) filas.push(txt.slice(j, j+18));
      j += 18;
    } else j++;
  }
}

// columnas: 0 TIEMPO · 1 Q · 2 TEMP · 3 LLENA · 4 CUAJA · 5 COAG · 6 CO1 · 7 PARA
//           8 CO2 · 9 CO3 · 10 CO4 · 11 CAL · 12 BAT · 13 VAC · 14 FRE · 15 VAP · 16 V1 · 17 V2
var FASES = [
  {col:3,  clave:'llenado',         nombre:'Llenado'},
  {col:4,  clave:'cuajado',         nombre:'Cuajado'},
  {col:5,  clave:'coagulacion',     nombre:'Coagulación'},
  {col:6,  clave:'corte1',          nombre:'Corte 1'},
  {col:7,  clave:'parada',          nombre:'Parada'},
  {col:8,  clave:'corte2',          nombre:'Corte 2'},
  {col:9,  clave:'corte3',          nombre:'Corte 3'},
  {col:10, clave:'corte4',          nombre:'Corte 4'},
  {col:11, clave:'recalentamiento', nombre:'Recalentamiento'},
  {col:12, clave:'batido',          nombre:'Batido'},
  {col:13, clave:'vaciado',         nombre:'Vaciado'}
];

function construir(filas){
  function seg(t){ var p=t.split(' ')[1].split(':'); return (+p[0])*3600+(+p[1])*60+(+p[2]); }

  // ── LOS CRONÓMETROS ──
  // Cada columna cuenta segundos mientras su fase está en marcha. Se buscan los
  // tramos en los que el número SUBE: ahí empieza y acaba la fase. Cuando deja de
  // subir es que ha terminado (el contador se queda con su último valor hasta el
  // final del día, y por eso no vale mirar dónde deja de ser cero).
  function tramos(col){
    var out=[], ini=null, ult=null, prev=null;
    for(var k=0;k<filas.length;k++){
      var v=num(filas[k][col]);
      if(prev===null || v<prev){                 // arranca, o reinicia otra vez
        if(ini!==null && ult!==null && prev>0) out.push([ini,ult,prev]);
        ini = v>0 ? k : null; ult = v>0 ? k : null;
      } else if(v>prev){
        if(ini===null) ini=k;
        ult=k;
      }
      prev=v;
    }
    if(ini!==null && ult!==null && prev>0) out.push([ini,ult,prev]);
    return out;
  }

  var hitos=[];
  FASES.forEach(function(f){
    tramos(f.col).forEach(function(t){
      hitos.push({clave:f.clave, nombre:f.nombre,
        t1:seg(filas[t[0]][0]), t2:seg(filas[t[1]][0]),
        segs:Math.round(t[2]), mins:Math.round(t[2]/60*10)/10,
        ti:num(filas[t[0]][2]), tf:num(filas[t[1]][2])});
    });
  });
  hitos.sort(function(a,b){ return a.t1-b.t1; });

  // ── EL ACLARADO DE PRIMERA HORA ──
  // Antes de empezar se aclaran las tres cubas a la vez. Eso arranca el contador
  // de vaciado y aparece como un vaciado más, pero no lo es: va antes del llenado.
  var tLlen = null;
  hitos.forEach(function(h){ if(h.clave==='llenado' && tLlen===null) tLlen=h.t1; });
  hitos.forEach(function(h){
    if(h.clave==='vaciado' && tLlen!==null && h.t2 <= tLlen){ h.clave='aclarado'; h.nombre='Aclarado inicial'; }
  });

  // ══════════════════════════════════════════════════════════════════════
  // PARADAS DEL AGITADOR DURANTE EL LLENADO  (v2.0)
  // ──────────────────────────────────────────────────────────────────────
  // La columna FRE es la frecuencia del agitador. El dato dice que se paró,
  // no QUÉ se echó: sirve para contrastar, no para afirmar.
  //
  // LO QUE FALLABA HASTA LA v1.9: solo se contaban las paradas que llegaban a
  // CERO y duraban 20 SEGUNDOS O MÁS. Con eso se perdía justo la más
  // interesante — la del cloruro. Echar el cubo es levantar la tapa, volcar y
  // cerrar: cinco o seis segundos. En la cuba 1 del 01/09 esa parada existe a
  // las 05:41 (12 hercios y un cero, 10 segundos) y no se veía; la comparativa
  // daba por bueno el arranque del llenado como hora del cloruro, y el quesero
  // había apuntado 05:36, imposible porque el llenado empezó a las 05:39.
  //
  // LA REGLA NUEVA, con la lógica del proceso detrás (Joaquín, 01/09):
  //   · DEL LLENADO AL CUAJO la lira gira SIEMPRE en el mismo sentido, así que
  //     CUALQUIER bajada de frecuencia es una parada real, aunque dure una sola
  //     muestra (5 s) y aunque no llegue a cero. Se cuentan todas.
  //   · DESPUÉS DEL CUAJO no: el autómata invierte el giro cada pocos minutos
  //     para deshacer las bolas de la cuajada, y eso baja los hercios sin que
  //     nadie pare nada. Ahí solo se cuentan las paradas de 20 s o más, que sí
  //     pueden significar algo.
  //
  // (v2.1) Y AHÍ, ADEMÁS, LA FRECUENCIA TIENE QUE SER CERO. Lo de "por debajo
  // del crucero" vale del llenado al cuajo, donde la lira va a una sola
  // velocidad; después del cuajo NO, porque la receta alterna calentar y batir
  // y cada modo tiene su frecuencia (el 12/09: 26 Hz batiendo, 25 calentando).
  // Como el crucero salía 26, todo el recalentamiento quedaba "por debajo" y se
  // escribían paradas de 11 min 40 s, 5 min 30 s… con el agitador girando a 25
  // Hz de principio a fin (cuba 3 del 12/09; Joaquín: "yo no veo paradas ahí").
  // Después del cuajo, parada es lo que de verdad lo es: FREC a 0.
  //
  // Qué es "bajada": por debajo del nivel de crucero del tramo, que se calcula
  // del propio archivo (el valor de frecuencia más repetido). El 01/09 era 16.
  // Así no hay que dar por supuesto ningún número: si mañana se trabaja a otra
  // frecuencia, el detector se adapta solo.
  // ══════════════════════════════════════════════════════════════════════
  var tCuaj = null;
  hitos.forEach(function(h){ if(h.clave==='cuajado' && tCuaj===null) tCuaj=h.t1; });

  function _crucero(desde, hasta){
    var cuenta={}, mejor=0, mejorN=0;
    for(var i=0;i<filas.length;i++){
      var t=seg(filas[i][0]);
      if(t<desde || t>hasta) continue;
      var v=num(filas[i][14]);
      if(v<=0) continue;
      cuenta[v]=(cuenta[v]||0)+1;
      if(cuenta[v]>mejorN){ mejorN=cuenta[v]; mejor=v; }
    }
    return mejor;
  }
  // Recorre un tramo y devuelve sus bajadas.
  // (v2.1) 'soloCero': del llenado al cuajo se cuenta cualquier bajada por
  // debajo del crucero; después del cuajo, solo la frecuencia a 0.
  function _bajadas(desde, hasta, minSegs, soloCero){
    var res=[], cru=soloCero ? 1 : _crucero(desde, hasta);
    if(!cru) return res;
    var ini=null, prev=null;
    for(var i=0;i<filas.length;i++){
      var t=seg(filas[i][0]);
      if(t<desde || t>hasta) continue;
      var f=num(filas[i][14]);
      if(soloCero ? (f===0) : (f<cru)){
        if(ini===null) ini=i;
        prev=i;
      } else if(ini!==null){
        var dur=seg(filas[prev][0])-seg(filas[ini][0])+5;
        if(dur>=minSegs){
          var hz=[];
          for(var k=ini;k<=prev;k++) hz.push(num(filas[k][14]));
          res.push({t1:seg(filas[ini][0]), t2:seg(filas[prev][0]), segs:dur,
                    temp:num(filas[ini][2]), hz:hz, zona:'llenado'});
        }
        ini=null;
      }
    }
    if(ini!==null && prev!==null){
      var dur2=seg(filas[prev][0])-seg(filas[ini][0])+5;
      if(dur2>=minSegs){
        var hz2=[];
        for(var k2=ini;k2<=prev;k2++) hz2.push(num(filas[k2][14]));
        res.push({t1:seg(filas[ini][0]), t2:seg(filas[prev][0]), segs:dur2,
                  temp:num(filas[ini][2]), hz:hz2, zona:'llenado'});
      }
    }
    return res;
  }

  // (v2.0) POR CUAJADA, NO SOLO LA PRIMERA. Una cuba hace dos o tres cuajadas
  // al día; mirando solo el primer llenado y el primer cuajo, las siguientes se
  // quedaban sin ninguna parada (el 01/09, la segunda cuajada salía con cero).
  var paradas=[];
  var _llens=[], _cuajs=[], _vacs=[];
  hitos.forEach(function(h){
    if(h.clave==='llenado') _llens.push(h.t1);
    if(h.clave==='cuajado') _cuajs.push(h.t1);
    if(h.clave==='vaciado' || h.clave==='moldeo') _vacs.push(h.t1);
  });
  _cuajs.forEach(function(tc){
    // El llenado que precede a este cuajo
    var tl=null;
    _llens.forEach(function(x){ if(x<tc && (tl===null || x>tl)) tl=x; });
    if(tl===null) return;
    // Del llenado al cuajo: TODAS, aunque duren una sola muestra.
    _bajadas(tl, tc, 1, false).forEach(function(p){ paradas.push(p); });
    // Tras el cuajo y hasta el vaciado: solo las de 20 s o más (las cortas son
    // el cambio de giro del autómata) y nunca de más de 15 minutos, que a esas
    // alturas ya no es una parada sino la cuba terminada.
    var tv=null;
    _vacs.forEach(function(x){ if(x>tc && (tv===null || x<tv)) tv=x; });
    var tope = tv || seg(filas[filas.length-1][0]);
    _bajadas(tc+1, tope, 20, true).forEach(function(p){
      if(p.segs > 15*60) return;
      p.zona='post-cuajo'; paradas.push(p);
    });
  });
  paradas.sort(function(a,b){ return a.t1-b.t1; });

  // Una medida cada 20 segundos para poder dibujar la curva de temperatura
  var puntos=[];
  for(var i=0;i<filas.length;i+=4){
    puntos.push({t:seg(filas[i][0]), temp:num(filas[i][2]), fre:num(filas[i][14])});
  }


  // ══════════════════════════════════════════════════════════════════════
  // LA RECETA Y SUS CAMBIOS  (v1.6)
  // ──────────────────────────────────────────────────────────────────────
  // La columna Q (o REC) es el número de receta. Interesa por dos motivos: para
  // saber a qué temperatura DEBERÍA recalentar, y para cazar el caso del 21 de
  // agosto, cuando se arrancó en receta 1 y alguien la cambió a la 4 a media
  // cuajada sin devolverla. Sin este dato, aquel día parecía normal.
  // ══════════════════════════════════════════════════════════════════════
  var RECETAS = {1:'OVEJA', 2:'CABRA', 3:'MEZCLA NEGRO', 4:'PRUEBA', 5:'MESNERA', 6:'MEZCLA TOSTADO'};
  // Temperatura objetivo del recalentamiento, en °C, por receta. (v1.6)
  // Dadas por Ximo el 23/08/2026. Sirven para el chivato de "minutos por encima":
  // sin ellas no se puede saber si una punta de temperatura es normal o no, y el
  // mismo número significa cosas opuestas según la receta (39,3 °C es un problema
  // grave en oveja y un día corriente en mezcla tostado).
  var OBJETIVO_RECAL = {1:36, 2:37, 3:37, 4:38, 5:38, 6:40};

  var recetas=[], prevQ=null;
  for(var r1=0;r1<filas.length;r1++){
    var q = String(filas[r1][1]||'').trim();
    if(q !== prevQ && q !== ''){
      recetas.push({t:seg(filas[r1][0]), q:parseInt(q,10)||null, nombre:RECETAS[parseInt(q,10)]||('receta '+q)});
      prevQ = q;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // LAS DOS VÁLVULAS DE VACIADO  (v1.6)
  // ──────────────────────────────────────────────────────────────────────
  // V1 y V2 son las válvulas de salida. Las DOS abiertas = se está llenando la
  // llenadora. Ese instante es la referencia de dos normas de casa:
  //   · la temperatura final del recalentamiento que apunta el quesero;
  //   · el inicio del moldeo, unos 4-5 min después en oveja (más en mezcla).
  // Una sola abierta, antes de eso, es el desuerado: se saca ~1/3 de cuba.
  // ══════════════════════════════════════════════════════════════════════
  var valvulas=[], pv1=0, pv2=0;
  for(var r2=0;r2<filas.length;r2++){
    var v1=num(filas[r2][16]), v2=num(filas[r2][17]), tt=seg(filas[r2][0]);
    if((v1>0)!==(pv1>0) || (v2>0)!==(pv2>0)){
      valvulas.push({t:tt, v1:v1>0?1:0, v2:v2>0?1:0, temp:num(filas[r2][2])});
    }
    pv1=v1; pv2=v2;
  }
  // (v1.6) El barrido de válvulas, ahora POR CUAJADA. Antes se hacía una sola vez
  // para todo el archivo, lo que valía mientras se diera por hecho que un día era
  // una cuajada. Un .xps trae el día entero de una cuba, y una cuba puede hacer
  // dos o tres, así que hay que acotar la búsqueda a la ventana de cada una.
  //
  // SOLO A PARTIR DEL CUAJO: a primera hora se aclaran las tres cubas y eso abre
  // las dos válvulas; si se coge esa, la "apertura" sale antes que el llenado.
  function valvulasDe(tCuajo, wFin){
    var ap=null, des=null, q1=0, q2=0;
    for(var r=0;r<filas.length;r++){
      var a=num(filas[r][16]), b=num(filas[r][17]), t=seg(filas[r][0]);
      if(t<=tCuajo || t>=wFin){ q1=a; q2=b; continue; }
      if(a>0 && b>0 && ap===null) ap={t:t, temp:num(filas[r][2])};
      if(((a>0)!==(b>0)) && ap===null && des===null) des={t1:t};
      if(des && !des.t2 && a>0 && b>0) des.t2=t;
      q1=a; q2=b;
    }
    return {apertura:ap, desuerado:des};
  }

  // ══════════════════════════════════════════════════════════════════════
  // LA FICHA: LAS NORMAS YA APLICADAS  (v1.6)
  // ──────────────────────────────────────────────────────────────────────
  // Aquí se traduce el SCADA al lenguaje del parte de fabricación, siguiendo las
  // normas de casa recogidas en NORMAS-SCADA.md. La idea es que las reglas vivan
  // en UN SOLO SITIO —este— y que ni el backend ni la app tengan que volver a
  // deducirlas. Ellos solo comparan números ya calculados.
  //
  // OJO CON DOS COSAS, que son las que hacen falsos rojos si se olvidan:
  //   1) La temperatura final del recalentamiento NO es la del fin del contador
  //      CAL: el autómata corta el vapor antes contando con la inercia. Es la del
  //      instante en que abren las dos válvulas.
  //   2) El fin del batido del parte NO es el fin del contador BAT: el quesero
  //      cuenta hasta el primer corte de la llenadora, unos minutos después de
  //      abrir las válvulas. Aquí se da la apertura como referencia y se deja el
  //      cálculo del moldeo al que compare, que sí sabe la receta y el formato.
  // ══════════════════════════════════════════════════════════════════════
  function hito(clave){ var h=null; hitos.forEach(function(x){ if(x.clave===clave && !h) h=x; }); return h; }
  function tempEn(t){
    var mejor=null;
    for(var z=0;z<filas.length;z++){
      var d=Math.abs(seg(filas[z][0])-t);
      if(mejor===null || d<mejor.d) mejor={d:d, v:num(filas[z][2])};
      if(d>600 && mejor.d<10) break;
    }
    return mejor ? mejor.v : null;
  }
  // Máximo de temperatura entre dos instantes, y cuánto tiempo pasó por encima
  // de un umbral. El máximo es el chivato de verdad: el 21 de agosto la punta
  // fueron 39,3 °C y el parte, cumpliendo la norma, marcaba 36,9.
  function tramoTemp(t1, t2, umbral){
    var mx=null, hmx=null, segsArriba=0;
    for(var z=0;z<filas.length;z++){
      var t=seg(filas[z][0]);
      if(t<t1 || t>t2) continue;
      var v=num(filas[z][2]);
      if(mx===null || v>mx){ mx=v; hmx=t; }
      if(umbral!==undefined && v>=umbral) segsArriba+=5;
    }
    return {max:mx, hora_max:hmx, segs_por_encima:segsArriba};
  }

  // ── LAS CUAJADAS DEL DÍA (v1.6) ──
  // Un .xps es el día entero de UNA cuba física, y esa cuba puede hacer varias
  // cuajadas. Antes se cogía la primera de cada contador y se tiraba el resto:
  // el día 21 la cuba física 1 hizo oveja por la mañana y cabra más tarde, y la
  // cabra sencillamente no existía en el JSON. De ahí que ningún parte cuadrara.
  //
  // Cada arranque del contador CUAJA es una cuajada. La ventana de cada una va
  // desde su llenado hasta el llenado de la siguiente.
  var arrCuaj = hitos.filter(function(h){ return h.clave==='cuajado'; })
                     .sort(function(a,b){ return a.t1-b.t1; });
  var arrLlen = hitos.filter(function(h){ return h.clave==='llenado'; })
                     .sort(function(a,b){ return a.t1-b.t1; });
  var ventanas = arrCuaj.map(function(c, i){
    var lle = null;
    arrLlen.forEach(function(l){ if(l.t1 < c.t1) lle = l; });   // el último antes del cuajo
    var ini = lle ? lle.t1 : Math.max(0, c.t1 - 5400);
    return {cuaj:c, llen:lle, ini:ini, fin:Infinity};
  });
  ventanas.forEach(function(v, i){
    if(i+1 < ventanas.length) v.fin = ventanas[i+1].ini;
  });
  if(!ventanas.length) ventanas = [{cuaj:null, llen:null, ini:0, fin:Infinity}];

  function fichaDeVentana(w){
  // Dentro de la ventana, "el primero de cada contador" vuelve a ser correcto.
  function hito(clave){
    var h=null;
    hitos.forEach(function(x){
      if(x.clave===clave && !h && x.t1>=w.ini && x.t1<w.fin) h=x;
    });
    return h;
  }
  var hLlen=hito('llenado'), hCuaj=hito('cuajado'), hCoag=hito('coagulacion');
  var hCo1=hito('corte1'), hCal=hito('recalentamiento'), hBat=hito('batido');
  var _v = hCuaj ? valvulasDe(hCuaj.t1, w.fin) : {apertura:null, desuerado:null};
  var aperturaDos = _v.apertura, desuerado = _v.desuerado;

  // Receta con la que se cuajó: la vigente en el momento del cuajo, no la de
  // arranque. Es la que manda para saber a qué temperatura debía recalentar.
  var recetaCuajo = null;
  recetas.forEach(function(rr){ if(hCuaj && rr.t <= hCuaj.t1) recetaCuajo = rr; });
  // Los cambios de receta que avisar son los de ESTA cuajada, no los del día:
  // pasar de oveja a cabra entre una hornada y la siguiente es lo normal.
  var cambiosVentana = recetas.filter(function(rr){ return rr.t>=w.ini && rr.t<w.fin; });
  var objetivo = recetaCuajo && OBJETIVO_RECAL[recetaCuajo.q] !== undefined
               ? OBJETIVO_RECAL[recetaCuajo.q] : null;

  // Las adiciones que dejan parada de agitador: fermentos y cuajo sí, cloruro no.
  var pFerm = null;
  paradas.forEach(function(pp){ if(!pFerm && pp.t1>=w.ini && pp.t1<w.fin) pFerm=pp; });

  // El aclarado inicial que precede a esta cuajada (solo lo tiene la primera)
  var _hAcl = null;
  hitos.forEach(function(h){
    if(h.clave==='aclarado' && h.t1 < (w.llen ? w.llen.t1 : w.ini) && h.t1 >= (w.ini - 3600)) _hAcl = h;
  });

  var recalMax = (hCal && aperturaDos)
    ? tramoTemp(hCal.t1, aperturaDos.t, objetivo !== null ? objetivo + 1 : undefined)
    : null;

  var ficha = {
    receta:          recetaCuajo ? recetaCuajo.nombre : null,
    receta_num:      recetaCuajo ? recetaCuajo.q : null,
    receta_cambios:  cambiosVentana.length > 1 ? cambiosVentana : null,   // si cambió a media cuajada
    objetivo_recal:  objetivo,

    // Auxiliares: el cloruro entra al arrancar el llenado y NO deja parada.
    hora_aux:        hLlen ? hLlen.t1 : null,
    temp_aux:        hLlen ? hLlen.ti : null,

    // Fermentos: primera parada larga del agitador tras el inicio del llenado.
    hora_ferm:       pFerm ? pFerm.t1 : null,
    temp_ferm:       pFerm ? pFerm.temp : null,

    hora_cuajado:    hCuaj ? hCuaj.t1 : null,
    temp_cuajado:    hCuaj ? hCuaj.ti : null,
    // COAGULACIÓN TOTAL = contador CUAJA, no COAG.  (v1.6, norma dada por Ximo)
    // En la cuba, al pulsar cuajado el autómata agita 3 minutos repartiendo el
    // cuajo y se para solo; después la cuajada reposa con las liras quietas.
    // COAG solo cuenta el reposo (de ahí que COAG = CUAJA − 3 siempre), pero en
    // casa la coagulación total se cuenta DESDE QUE SE ECHA EL CUAJO, así que
    // incluye esos 3 minutos de reparto. El parte ponía 20 y COAG daba 17.
    coagulacion_min: hCuaj ? hCuaj.mins : (hCoag ? hCoag.mins + 3 : null),
    coagulacion_reposo_min: hCoag ? hCoag.mins : null,   // informativo
    hora_corte:      hCo1 ? hCo1.t1 : null,

    hora_ini_recal:  hCal ? hCal.t1 : null,
    temp_ini_recal:  hCal ? hCal.ti : null,
    // NORMA: la final es la de la apertura de las dos válvulas, no la del contador.
    hora_fin_recal:  hCal ? hCal.t2 : null,
    temp_fin_recal:  aperturaDos ? aperturaDos.temp : null,
    temp_fin_contador: hCal ? hCal.tf : null,   // solo informativo, para ver la inercia

    hora_ini_batido: hCal ? hCal.t2 : null,
    batido_min:      hBat ? hBat.mins : null,

    desuerado_ini:   desuerado ? desuerado.t1 : null,
    desuerado_min:   (desuerado && desuerado.t2) ? Math.round((desuerado.t2-desuerado.t1)/60*10)/10 : null,

    // Referencia del moldeo: el quesero cuenta desde el primer corte de la
    // llenadora, unos minutos DESPUÉS de esta apertura.
    apertura_valvulas: aperturaDos ? aperturaDos.t : null,
    temp_apertura:     aperturaDos ? aperturaDos.temp : null,

    // EL CHIVATO. Máximo alcanzado entre el inicio del recalentamiento y el
    // vaciado, y cuánto tiempo estuvo más de un grado por encima del objetivo.
    max_recalentamiento:  recalMax ? recalMax.max : null,
    hora_max:             recalMax ? recalMax.hora_max : null,
    min_por_encima:       recalMax ? Math.round(recalMax.segs_por_encima/60*10)/10 : null,

    // (v2.0) LA HORA DEL LLENADO Y LAS PARADAS, DENTRO DE LA FICHA.
    // Estaban solo en la raíz del JSON, y la comparativa las busca aquí: por eso
    // la app no enseñaba ni el arranque del llenado ni las paradas del agitador
    // por mucho que estuvieran en el archivo. Cada cuajada se queda con LAS
    // SUYAS, las que caen dentro de su ventana.
    hora_llenado:    hLlen ? hLlen.t1 : null,
    paradas:         paradas.filter(function(pp){ return pp.t1>=w.ini && pp.t1<=w.fin; }),

    // (v2.0) EL ACLARADO INICIAL. Antes de la primera cuajada del día se aclara
    // la cuba con las válvulas abiertas; el SCADA lo registra como vaciado y el
    // conversor ya lo distingue. Dato pedido por Joaquín: saber a qué hora
    // empezó y a qué temperatura, y cuánto duró hasta arrancar el llenado.
    hora_aclarado:      _hAcl ? _hAcl.t1 : null,
    hora_aclarado_fin:  _hAcl ? _hAcl.t2 : null,
    temp_aclarado:      _hAcl ? _hAcl.ti : null,
    min_aclarado:       _hAcl ? Math.round((_hAcl.t2-_hAcl.t1)/60*10)/10 : null
  };
  return ficha;
  }   // ← fin de fichaDeVentana

  // Una ficha por cuajada, en orden de reloj.
  var FICHAS = ventanas.map(fichaDeVentana);
  var ficha  = FICHAS[0] || null;   // compatibilidad con lo anterior

  var mc = String(CABECERA||'').match(/Cuba\s*(\d+)/i);
  var f0 = filas[0][0].split(' ')[0];   // (v1.6) fecha entera, sin trocear
  var _p = f0.split('/');               // el informe la trae como DD/MM/AA
  var RESULTADO = {
    // (v2.0) SELLO DE VERSIÓN. La app lo enseña bajo el título de cada cuba
    // para saber con qué conversor se hizo el archivo: sin él, no había forma
    // de distinguir un JSON viejo de uno nuevo y se perdía media tarde.
    conversor: '2.1',
    fecha: '20'+_p[2]+'-'+_p[1]+'-'+_p[0],
    cuba: mc ? parseInt(mc[1]) : null,
    medidas: filas.length,
    hitos: hitos, paradas: paradas, puntos: puntos,
    recetas: recetas, valvulas: valvulas,
    ficha: ficha,           // la primera cuajada (se mantiene por compatibilidad)
    fichas: FICHAS          // (v1.6) TODAS las cuajadas del día en esta cuba
  };

  // (v1.6) NOMBRE ÚNICO. Antes se construía de dos maneras distintas según el
  // archivo dijera la cuba o hubiera que preguntarla: salía 'cuba1-22.08.2026'
  // en un caso y 'cuba1-26.08.22' en el otro. Con dos formatos, el backend no
  // los encontraría. Ahora lo hace una sola función, para los dos caminos.
  return { resultado: RESULTADO, nombre: _nombreJson(RESULTADO.cuba, f0) };
}

  function convertir(paginas){
    CABECERA = '';
    var filas = [];
    paginas(function(xml){ extraer(xml, filas); });
    if(!filas.length) throw new Error('No se han encontrado medidas dentro del archivo.');
    var diaFinal = filas[filas.length-1][0].split(' ')[0];
    var antes = filas.length;
    filas = filas.filter(function(f){ return f[0].split(' ')[0] === diaFinal; });
    if(antes !== filas.length){
      Logger.log('Descartadas '+(antes-filas.length)+' filas de días anteriores.');
    }
    if(!filas.length) throw new Error('No quedan medidas después de separar por día.');
    if(!filas.length) throw new Error('No quedan medidas después de separar por día.');
    return construir(filas);
  }
  return { convertir: convertir };
})();

// ═════════════════════════════════════════════════════════════════════════════
// LECTURA DEL .xps EN EL SERVIDOR
// Un .xps es un ZIP. Las páginas se recorren en orden natural (1, 2, 3… no
// 1, 10, 100) y se entregan UNA A UNA a quien las lee: el de pasteurización
// trae 95 MB de texto y no conviene tenerlos todos a la vez en memoria.
//
// (07/10) NO SE USA Utilities.unzip. Con estos .xps falla siempre ("Could not
// unzip"): las imágenes de dentro van guardadas SIN comprimir y con un
// "descriptor de datos" al final, una combinación que el descompresor de
// Google no admite, y por culpa de esas pocas rechaza el archivo entero.
// Así que el ZIP se lee a mano: se busca el índice que hay al final del
// archivo, se localizan SOLO las páginas de datos y cada una se descomprime
// por separado con Utilities.ungzip, envolviéndola en una cabecera gzip.
// Las imágenes ni se tocan.
// ═════════════════════════════════════════════════════════════════════════════
function _zipU8(b, i){ return b[i] & 0xff; }
function _zipU16(b, i){ return _zipU8(b,i) | (_zipU8(b,i+1) << 8); }
function _zipU32(b, i){ return _zipU8(b,i) + _zipU8(b,i+1)*256 + _zipU8(b,i+2)*65536 + _zipU8(b,i+3)*16777216; }
function _zipByte(n){ n = n & 0xff; return n > 127 ? n - 256 : n; }   // byte con signo, como los quiere Apps Script

// Índice del ZIP: nombre, método, tamaños, CRC y dónde empieza cada entrada.
function _zipIndice(bytes){
  var fin = -1;
  for(var i = bytes.length - 22; i >= 0 && i >= bytes.length - 65557; i--){
    if(_zipU32(bytes, i) === 0x06054b50){ fin = i; break; }
  }
  if(fin < 0) throw new Error('El archivo no parece un .xps completo (no tiene índice ZIP).');
  var n = _zipU16(bytes, fin+10), p = _zipU32(bytes, fin+16), out = [];
  for(var k = 0; k < n; k++){
    if(_zipU32(bytes, p) !== 0x02014b50) throw new Error('Índice ZIP dañado.');
    var lNom = _zipU16(bytes, p+28), lExt = _zipU16(bytes, p+30), lCom = _zipU16(bytes, p+32);
    var nom = '';
    for(var c = 0; c < lNom; c++) nom += String.fromCharCode(_zipU8(bytes, p+46+c));
    out.push({ nombre: nom, metodo: _zipU16(bytes, p+10), crc: _zipU32(bytes, p+16),
               comp: _zipU32(bytes, p+20), tam: _zipU32(bytes, p+24), local: _zipU32(bytes, p+42) });
    p += 46 + lNom + lExt + lCom;
  }
  return out;
}

// Texto de una entrada. Los tamaños se toman del índice, no de la cabecera
// local, que en estos archivos viene a cero (por el descriptor de datos).
function _zipTexto(bytes, e){
  var l = e.local;
  if(_zipU32(bytes, l) !== 0x04034b50) throw new Error('Entrada ZIP dañada: '+e.nombre);
  var ini = l + 30 + _zipU16(bytes, l+26) + _zipU16(bytes, l+28);
  var datos = bytes.slice(ini, ini + e.comp);
  if(e.metodo === 0) return Utilities.newBlob(datos).getDataAsString('UTF-8');
  if(e.metodo !== 8) throw new Error('Compresión no admitida ('+e.metodo+') en '+e.nombre);
  var cab = [0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 0xff].map(_zipByte);
  var pie = [e.crc, e.crc>>>8, e.crc>>>16, e.crc>>>24, e.tam, e.tam>>>8, e.tam>>>16, e.tam>>>24].map(_zipByte);
  var gz = Utilities.newBlob(cab.concat(datos, pie), 'application/x-gzip');
  return Utilities.ungzip(gz).getDataAsString('UTF-8');
}

function _scadaPaginas(blobXps){
  var bytes = blobXps.getBytes();
  var pags = [];
  _zipIndice(bytes).forEach(function(e){
    var m = e.nombre.match(/Documents\/1\/Pages\/(\d+)\.fpage$/i);
    if(m) pags.push({n: parseInt(m[1],10), e: e});
  });
  pags.sort(function(a,b){ return a.n - b.n; });
  return {
    total: pags.length,
    primera: pags.length ? _zipTexto(bytes, pags[0].e) : '',
    recorrer: function(fn){
      for(var i=0;i<pags.length;i++) fn(_zipTexto(bytes, pags[i].e));
    }
  };
}

// Qué informe es, mirando la cabecera de la primera página.
function _scadaTipo(primeraXml, nPaginas){
  if(/UnicodeString="Control Cuba\s*\d/i.test(primeraXml)) return 'cuba';
  if(/UnicodeString="Control Pasteuri/i.test(primeraXml)) return nPaginas > 1 ? 'pasto_info' : 'pasto_grafico';
  return 'desconocido';
}

// Convierte un .xps. Devuelve {tipo, nombre, resultado} o lanza un error.
function scadaConvertirXps(blobXps, carpetaOrigen){
  var x = _scadaPaginas(blobXps);
  if(!x.total) throw new Error('Este .xps no tiene páginas de datos.');
  var tipo = _scadaTipo(x.primera, x.total);
  // Lo que viene de PASTO GRAFICO es el gráfico aunque un día tuviera más
  // de una página: no se intenta leer como datos.
  if(/GRAF/i.test(String(carpetaOrigen||''))) tipo = 'pasto_grafico';
  // (07/10) El export de la ventana "Tabla Control" no lleva "Control Cuba N"
  // en la cabecera (lleva la ruta del proyecto de WinCC). El conversor del
  // navegador pregunta entonces la cuba con unos botones; aquí la dice la
  // carpeta de donde viene (CUBA1, CUBA2, CUBA3). Si no trae medidas de cuba,
  // la lectura falla igual y el archivo va a ERRORES: no se inventa nada.
  if(tipo === 'desconocido' && /^CUBA\s*\d$/i.test(String(carpetaOrigen||'').trim())) tipo = 'cuba';
  if(tipo === 'cuba'){
    var c = SCADA_CUBA.convertir(x.recorrer);
    return { tipo: 'cuba', nombre: c.nombre, resultado: c.resultado };
  }
  if(tipo === 'pasto_info'){
    var filas = [];
    x.recorrer(function(xml){ SCADA_PAST.extraer(xml, filas); });
    if(!filas.length) throw new Error('No se han encontrado medidas dentro del archivo.');
    var r = SCADA_PAST.construir(filas);
    var f = r.fecha.split('-');                       // 2026-10-07 → 07.10.2026.json
    return { tipo: 'pasto_info', nombre: f[2]+'.'+f[1]+'.'+f[0]+'.json', resultado: r };
  }
  return { tipo: tipo, nombre: null, resultado: null };
}

// ═════════════════════════════════════════════════════════════════════════════
// PRUEBA DESDE EL EDITOR
// 1) En Drive, crear la carpeta PRUEBA XPS y dejar dentro los .xps del día.
// 2) Ejecutar esta función. Por cada .xps deja al lado un .json con el
//    resultado (prefijo PRUEBA-) y escribe en el registro cuánto ha tardado.
// No toca NINGUNA carpeta de la aplicación: solo lee y escribe en PRUEBA XPS.
// ═════════════════════════════════════════════════════════════════════════════
function probarConversorSCADA(){
  var it = DriveApp.getFoldersByName('PRUEBA XPS');
  if(!it.hasNext()){ Logger.log('ERROR: no encuentro la carpeta PRUEBA XPS en Drive.'); return; }
  var carpeta = it.next();
  var files = carpeta.getFiles(), n = 0, t00 = Date.now();
  while(files.hasNext()){
    var f = files.next();
    if(!/\.xps$/i.test(f.getName())) continue;
    n++;
    var t0 = Date.now();
    try{
      var r = scadaConvertirXps(f.getBlob());
      var seg = ((Date.now()-t0)/1000).toFixed(1);
      if(!r.resultado){
        Logger.log(f.getName()+' ('+Math.round(f.getSize()/1024)+' KB) → '+r.tipo+' · sin datos que convertir · '+seg+' s');
        continue;
      }
      var json = JSON.stringify(r.resultado);
      carpeta.createFile('PRUEBA-'+r.nombre, json, 'application/json');
      Logger.log(f.getName()+' ('+Math.round(f.getSize()/1024)+' KB) → '+r.tipo+' · '+r.resultado.medidas+
                 ' medidas · '+r.nombre+' ('+Math.round(json.length/1024)+' KB) · '+seg+' s');
    }catch(e){
      Logger.log(f.getName()+' → ERROR tras '+((Date.now()-t0)/1000).toFixed(1)+' s: '+e);
    }
  }
  Logger.log('Total: '+n+' archivo(s) en '+((Date.now()-t00)/1000).toFixed(1)+' s');
}


// ═════════════════════════════════════════════════════════════════════════════
// RECEPCIÓN AUTOMÁTICA DESDE EL PC DEL SCADA  (2026-10-07)
// ─────────────────────────────────────────────────────────────────────────────
// Dos pasos separados a propósito:
//
//   1) recibirXpsScada (la llama doPost): el script del PC manda un .xps y
//      aquí SOLO se guarda en la carpeta SCADA ENTRADA de Drive. Es rápido y
//      no puede fallar por la conversión.
//   2) procesarEntradaSCADA (cada 10 minutos, sola): convierte lo que haya en
//      SCADA ENTRADA, deja el .json en su carpeta de la app —la del mes que
//      toque, como las ordena Joaquín— y archiva el .xps en PROCESADOS.
//      Si algo no se puede convertir va a ERRORES con el motivo escrito en la
//      descripción del archivo. Nunca se borra un .xps.
//
// (2026-10-08) Y EL PDF DE LA GRÁFICA. Joaquín sigue generando a mano el PDF de
// PASTO GRAFICO (lo que enseña la app y se imprime para Calidad). El PC lo manda
// igual que los .xps y aquí se coloca tal cual en Gráficas Pasteurización, en la
// carpeta de su mes, con su nombre (08.10.2026.pdf). Si ya hay uno con ese nombre
// —porque se subió a mano— no se duplica.
//
// La clave: el PC manda una contraseña que solo conocen él y este proyecto.
// NO está escrita en el código (el repositorio es público): la genera
// instalarSCADA() y queda guardada en las propiedades del proyecto.
// ═════════════════════════════════════════════════════════════════════════════

function _scadaProp(k, v){
  var p = PropertiesService.getScriptProperties();
  if(v === undefined) return p.getProperty(k);
  p.setProperty(k, v); return v;
}

function _scadaJson(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Subcarpeta por nombre; si no existe, se crea.
function _scadaSub(padre, nombre){
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function _scadaCarpetaEntrada(){
  var id = _scadaProp('SCADA_ENTRADA_ID');
  if(id){ try{ return DriveApp.getFolderById(id); }catch(e){} }
  var it = DriveApp.getFoldersByName('SCADA ENTRADA');
  var f = it.hasNext() ? it.next() : DriveApp.createFolder('SCADA ENTRADA');
  _scadaProp('SCADA_ENTRADA_ID', f.getId());
  return f;
}

// ¿Ya está este archivo, con el mismo tamaño, en entrada o en los archivados?
function _scadaYaRecibido(entrada, nombre, tam){
  var donde = [entrada, _scadaSub(entrada, 'PROCESADOS'), _scadaSub(entrada, 'ERRORES')];
  for(var i=0;i<donde.length;i++){
    var it = donde[i].getFilesByName(nombre);
    while(it.hasNext()){ if(it.next().getSize() === tam) return true; }
  }
  return false;
}

// La llama doPost con { _SHEET:'SCADA_XPS', clave, carpeta, nombre, datos(base64) }
function recibirXpsScada(p){
  try{
    var clave = _scadaProp('SCADA_CLAVE');
    if(!clave || String(p.clave||'') !== clave) return _scadaJson({ ok:false, error:'Clave no válida' });
    var carpeta = String(p.carpeta||'').replace(/[^A-Za-z0-9 ]/g,'').trim().toUpperCase();
    var nombre  = String(p.nombre||'').replace(/[\\\/:*?"<>|]/g,'').trim();
    var esPdf = /\.pdf$/i.test(nombre);
    if(!carpeta || !(/\.xps$/i.test(nombre) || (esPdf && /GRAF/.test(carpeta))))
      return _scadaJson({ ok:false, error:'Faltan carpeta o nombre' });
    var bytes = Utilities.base64Decode(String(p.datos||''));
    if(!bytes.length) return _scadaJson({ ok:false, error:'Archivo vacío' });
    var final = carpeta + '__' + nombre;               // CUBA1__07.10.2026.xps
    var entrada = _scadaCarpetaEntrada();
    if(_scadaYaRecibido(entrada, final, bytes.length)) return _scadaJson({ ok:true, repetido:true, archivo:final });
    var f = entrada.createFile(Utilities.newBlob(bytes, esPdf ? 'application/pdf' : 'application/vnd.ms-xpsdocument', final));
    f.setDescription('Recibido del PC del SCADA el ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
    return _scadaJson({ ok:true, archivo:final, bytes:bytes.length });
  }catch(err){
    return _scadaJson({ ok:false, error:String(err) });
  }
}

// Escribe el .json en su sitio. Si ya hay uno con ese nombre en esa carpeta,
// se sobrescribe (la última conversión manda, como en el buscador).
function _scadaGuardarJson(carpeta, nombre, texto){
  var it = carpeta.getFilesByName(nombre);
  if(it.hasNext()){ it.next().setContent(texto); return; }
  carpeta.createFile(nombre, texto, 'application/json');
}

function procesarEntradaSCADA(){
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;                     // ya hay otra vuelta en marcha
  var t00 = Date.now();
  try{
    var entrada = _scadaCarpetaEntrada();
    var proc = _scadaSub(entrada, 'PROCESADOS'), errs = _scadaSub(entrada, 'ERRORES');
    var files = entrada.getFiles();
    while(files.hasNext()){
      if(Date.now() - t00 > 4.5*60*1000) break;       // margen: el resto, en la próxima vuelta
      var f = files.next();
      var nom = f.getName();
      var partes = nom.split('__');
      var origen = partes.length > 1 ? partes[0] : '';
      var original = partes.length > 1 ? partes.slice(1).join('__') : nom;
      // (2026-10-08) El PDF de la gráfica: a Gráficas Pasteurización, a su mes.
      if(/\.pdf$/i.test(nom)){
        try{
          var mes = _mesDeNombre(original);
          if(!mes) throw new Error('El nombre del PDF no lleva una fecha reconocible.');
          var graf = DriveApp.getFolderById(CARPETA_GRAFICAS_ID);
          var base = _limpiaNombreDescarga(original.replace(/\.pdf$/i, ''));
          var yaEsta = false;
          _recorrerArchivos(graf, function(g){
            var n = String(g.getName());
            if(!/\.pdf$/i.test(n)) return false;
            if(_limpiaNombreDescarga(n.replace(/\.pdf$/i, '')) === base){ yaEsta = true; return true; }
            return false;
          });
          if(yaEsta){
            f.moveTo(proc);
            Logger.log(nom+' → ya estaba en Gráficas Pasteurización, no se duplica');
          } else {
            f.setName(original);
            f.moveTo(_scadaSub(graf, mes));
            Logger.log(nom+' → Gráficas Pasteurización/'+mes+'/'+original);
          }
        }catch(eP){
          try{ f.setDescription('ERROR con el PDF: '+eP); }catch(_){}
          f.moveTo(errs);
          Logger.log(nom+' → ERROR: '+eP);
        }
        continue;
      }
      if(!/\.xps$/i.test(nom)) continue;
      var t0 = Date.now();
      try{
        var r = scadaConvertirXps(f.getBlob(), origen);
        if(r.tipo === 'cuba'){
          var res = r.resultado, nombreJ = r.nombre;
          // El export de "Tabla Control" no dice la cuba: entonces vale la carpeta.
          if(!res.cuba){
            var mc = origen.match(/CUBA\s*(\d)/);
            if(!mc) throw new Error('El archivo no dice de qué cuba es y la carpeta tampoco.');
            res.cuba = parseInt(mc[1],10);
            var fc = res.fecha.split('-');
            nombreJ = 'cuba'+res.cuba+'-'+fc[2]+'.'+fc[1]+'.'+fc[0]+'.json';
          }
          var fe = res.fecha.split('-');
          _scadaGuardarJson(_scadaSub(DriveApp.getFolderById(CARPETA_CUBAS_ID), fe[1]+'.'+fe[0]),
                            nombreJ, JSON.stringify(res));
          Logger.log(nom+' → '+nombreJ+' ('+((Date.now()-t0)/1000).toFixed(1)+' s)');
        } else if(r.tipo === 'pasto_info'){
          // Mismo nombre que el .xps, como hacía el conversor del navegador:
          // así un segundo informe del día ("05b.10.2026") no pisa al primero.
          var fp = r.resultado.fecha.split('-');
          var nombreP = /^\d{2}[A-Za-z]?\.\d{2}\.\d{4}\.xps$/i.test(original)
                        ? original.replace(/\.xps$/i, '.json') : r.nombre;
          _scadaGuardarJson(_scadaSub(DriveApp.getFolderById(CARPETA_GRAFICAS_ID), fp[1]+'.'+fp[0]),
                            nombreP, JSON.stringify(r.resultado));
          Logger.log(nom+' → '+nombreP+' ('+((Date.now()-t0)/1000).toFixed(1)+' s)');
        } else if(r.tipo === 'pasto_grafico'){
          Logger.log(nom+' → gráfico, se archiva (todavía no se convierte)');
        } else {
          throw new Error('No reconozco qué informe es.');
        }
        f.moveTo(proc);
      }catch(e){
        try{ f.setDescription('ERROR al convertir: '+e); }catch(_){}
        f.moveTo(errs);
        Logger.log(nom+' → ERROR: '+e);
      }
    }
  }finally{
    lock.releaseLock();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// INSTALAR — se ejecuta UNA VEZ desde el editor.
// Crea la carpeta SCADA ENTRADA, la clave para el PC del SCADA y la tarea que
// convierte cada 10 minutos. Si ya estaba hecho, no duplica nada: solo vuelve a
// enseñar la clave en el registro.
// ═════════════════════════════════════════════════════════════════════════════
function instalarSCADA(){
  var entrada = _scadaCarpetaEntrada();
  _scadaSub(entrada, 'PROCESADOS'); _scadaSub(entrada, 'ERRORES');
  var clave = _scadaProp('SCADA_CLAVE');
  if(!clave) clave = _scadaProp('SCADA_CLAVE', Utilities.getUuid().replace(/-/g,''));
  Logger.log('Carpeta SCADA ENTRADA lista.');
  // (07/10) El proyecto tiene los permisos fijados en su manifiesto y no
  // incluye el de crear tareas, así que esto puede fallar. No pasa nada: la
  // tarea se crea a mano en Activadores (el reloj de la izquierda).
  try{
    var hay = ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'procesarEntradaSCADA'; });
    if(!hay) ScriptApp.newTrigger('procesarEntradaSCADA').timeBased().everyMinutes(10).create();
    Logger.log('Tarea de conversión cada 10 minutos: ' + (hay ? 'ya estaba' : 'creada'));
  }catch(e){
    Logger.log('La tarea NO se ha podido crear desde aquí: créala a mano en Activadores ' +
               '(procesarEntradaSCADA · basado en tiempo · cada 10 minutos).');
  }
  Logger.log('CLAVE PARA EL PC DEL SCADA: ' + clave);
}
