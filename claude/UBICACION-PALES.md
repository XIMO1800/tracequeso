# Ubicación de palés — móvil y escritorio (lo que hay que saber en cualquier conversación)

Actualizado 01/11/2026. Este documento es el punto de encuentro: la conversación que toque la ubicación de palés lo lee antes de empezar y lo actualiza al terminar (aquí, en el repositorio: `claude/UBICACION-PALES.md`).

**Acuerdo (01/11/2026):** la ubicación de palés la lleva UNA sola conversación, la de ubicación, tanto en el móvil (index.html) como en la oficina (oficina.html). La conversación de la oficina ya no la toca.

## Dónde está cada cosa
- **Móvil (index.html, bloque «UBICACIONES DE PALÉS EN CÁMARAS», desde v500).** Aquí se ubica: se escanea dentro del movimiento o desde «Ubicar / buscar». También tiene «Ver cámara», el plano del stock y el botón de ubicación en «Buscar palet».
- **Escritorio (oficina.html, bloque «(v39) UBICACIÓN DE PALÉS EN CÁMARAS», menú Producción → Ubicación de palés).** Aquí solo se mira:
  - plano de cada cámara;
  - buscar un palé;
  - cuadre con el stock;
  - hojas por fila para imprimir.
- **Datos:** la hoja UBICACIONES (gas/Ubicaciones.gs). GET `?tipo=ubicaciones` devuelve la ubicación vigente de cada palé. La escritura la hace solo el móvil (`_SHEET:'UBICACION'`).
- **Versión de la oficina:** está en `var VER = 'vNN'` de oficina.html; hay que subirla en cada cambio.

## Plano de las cámaras (DUPLICADO en los dos ficheros)
La geometría está copiada en los dos ficheros:

| Pieza | Móvil (index.html) | Escritorio (oficina.html) |
|---|---|---|
| Zonas | `UBIC_ZONAS` | `UB_ZONAS` |
| Palés que caben por pie | `ubicMaxPales` | `ubMax` |
| Planos | `UBIC_PLANOS` | `UB_PLANOS` |
| Picking | `UBIC_ESPECIAL` | `UB_ESPECIAL` |
| Pasillo | `UBIC_PASILLO` | `UB_PASILLO` |

**Si cambia una zona, un pie, las alturas, el picking o los pasillos, hay que cambiarlo EN LOS DOS.**

Orden de las cámaras en pantalla: Maduración a la izquierda, Frío a la derecha.

## Reglas de presentación decididas por Joaquín (valen para móvil y escritorio)
- **Cada palé, como en el papel:** arriba, en grande, el **lote corto** si es manchego D.O., o la **fecha de fabricación** (dd/mm/aa) si es oveja, mezcla o resto. Debajo, las piezas **entre paréntesis y sin la palabra «pzas»**: «26147» y debajo «(108)», bien legibles.
- **Total de piezas** por pie, por fila, por zona y de la cámara. En el plano general, el total de cada fila va junto a la zona, en el lado del pasillo; pinchándolo se abre la fila.
- **Rango de cada fila:** de qué fecha a qué fecha va y, en el manchego, de qué lote corto a cuál (con sus fechas). Va uno por tipo de queso si la fila está mezclada. Sale bajo el total de la fila y en la hoja impresa.
- **Ubicación vigente:** si los registros sacan el palé de la cámara (la sala del último registro que mueve el palé: movimiento, volteo, 1ª capa, venta) o se vende, el hueco queda libre. Se respetan 6 horas de margen tras ubicarlo.
- **Fila vista desde la puerta:** pie 1 junto al pasillo; A1 arriba, A4 en el suelo.
- **Pendiente:** cómo dibujar un pie con más de 4 palés pequeños (por ejemplo 30 + 40 piezas que ocupan lo de uno). Hoy sale una línea A5 más con cada palé del mismo alto. Idea: casillas de alto proporcional a lo que ocupa cada palé.

## Escritorio: qué hace cada pestaña (oficina v43)
Arriba hay una tira de cifras pinchables: ubicados en Frío y en Maduración, piezas ubicadas, en cámara sin ubicar y ubicados que ya no están.

1. **Plano.** Cabe entero en la pantalla, porque el tamaño se calcula por el alto, y la página baja sola hasta el plano. Al pinchar un pie se ve su lista y la fila entera; pinchando el total de una fila, se abre esa fila.
2. **Buscar palé.** Muestra el código, la fila con el palé marcado y el plano con su pie resaltado. Si no está ubicado, dice en qué sala lo ponen los registros.
3. **Cuadre con el stock.** Dos listas: «en cámara sin ubicar» y «ubicados que ya no están».
4. **Hojas por fila.** A4 apaisado, como la hoja de papel, con totales por pie y rango.
