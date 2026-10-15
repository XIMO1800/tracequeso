# Variables del SCADA (WinCC RT Professional V12) — sacadas del SQL el 15/10/2026

Proyecto en marcha: base `CC_HMI_O133_26_07_24_18_37_48` (cargado el 24/07/2026). Canal `CCS7PLUSCHANNEL` (S7-1200/1500, acceso simbólico).

Conexiones:
- **HMI_8 → 192.168.1.13**: cubas (CUBA_AUTO_DB1/2/3), recetas y pasteurizador.
- **HMI_7 → 192.168.1.11**: depósitos de leche, agitadores, frío, suero, CIP.

Las direcciones son simbólicas (`8A0E000A.xxxx.LID` = DB10 en modo optimizado): no sirven para leer el autómata con herramientas de direcciones absolutas. Para leerlas en directo, el camino es el servidor OPC del WinCC (hoy desactivado: error 429).

| Variable | Tipo | Conexión |
|---|---|---|
| `P-BombaAguaCaliente` | bit | HMI_8 (.13) |
| `P-BombaLeche` | bit | HMI_8 (.13) |
| `P-BombaLeche2` | bit | HMI_8 (.13) |
| `P-ControlVálvulaMotorizada` | entero 16 | HMI_8 (.13) |
| `P-EV.DesviadoraLeche` | bit | HMI_8 (.13) |
| `P-Motorizada.HMI` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_AlarmaDesviadoraHMI` | bit | HMI_8 (.13) |
| `PASTEURIZADOR_DB_Frec.BombaLeche` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_Frec.BombaLeche2` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_MarchaBombaLeche` | bit | HMI_8 (.13) |
| `PASTEURIZADOR_DB_Presión1` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_Presión2` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_TemperaturaDesviadora` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_TemperaturaEntrada` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_TemperaturaMotorizada` | real | HMI_8 (.13) |
| `PASTEURIZADOR_DB_TemperaturaSalida` | real | HMI_8 (.13) |
| `Pasteurizar` | bit | HMI_8 (.13) |
| `Agitador_Deposito_2` | bit | HMI_7 (.11) |
| `Agitador_Deposito_3` | bit | HMI_7 (.11) |
| `Agitador_Deposito_1` | bit | HMI_7 (.11) |
| `Agitador_Deposito_4` | bit | HMI_7 (.11) |
| `Automatico_Agitador_3` | bit | HMI_7 (.11) |
| `Automatico_Agitador_4` | bit | HMI_7 (.11) |
| `Automatico_Agitador_2` | bit | HMI_7 (.11) |
| `Automatico_Agitador_1` | bit | HMI_7 (.11) |
| `Bomba_Arrastre` | bit | HMI_7 (.11) |
| `Manual_Bomba_Arrastre` | bit | HMI_7 (.11) |
| `Manual_Agitador_1` | bit | HMI_7 (.11) |
| `Manual_Agitador_2` | bit | HMI_7 (.11) |
| `Manual_Agitador_3` | bit | HMI_7 (.11) |
| `Manual_Agitador_4` | bit | HMI_7 (.11) |
| `Manual_Frio_3` | bit | HMI_7 (.11) |
| `Manual_Frio_2` | bit | HMI_7 (.11) |
| `Manual_Frio_1` | bit | HMI_7 (.11) |
| `Valvula_Refrigeracion_1` | bit | HMI_7 (.11) |
| `Valvula_Refrigeracion_2` | bit | HMI_7 (.11) |
| `Valvula_Refrigeracion_3` | bit | HMI_7 (.11) |
| `Tem_Actual_Deposito_1` | real | HMI_7 (.11) |
| `Tem_Actual_Deposito_2` | real | HMI_7 (.11) |
| `Tem_Actual_Deposito_3` | real | HMI_7 (.11) |
| `Tem_Actual_Deposito_4` | real | HMI_7 (.11) |
| `Nivel_Maximo_1` | bit | HMI_7 (.11) |
| `Nivel_Maximo_2` | bit | HMI_7 (.11) |
| `Nivel_Maximo_3` | bit | HMI_7 (.11) |
| `Nivel_Maximo_4` | bit | HMI_7 (.11) |
| `Automatico_Frio_1` | bit | HMI_7 (.11) |
| `Automatico_Frio_2` | bit | HMI_7 (.11) |
| `Automatico_Frio_3` | bit | HMI_7 (.11) |
| `Orden_Limpieza_CIP` | bit | HMI_7 (.11) |
| `Hidronivel_Arrastre` | bit | HMI_7 (.11) |
| `KM_Agitador_1` | bit | HMI_7 (.11) |
| `KM_Agitador_2` | bit | HMI_7 (.11) |
| `KM_Agitador_3` | bit | HMI_7 (.11) |
| `KM_Agitador_4` | bit | HMI_7 (.11) |
| `KTA_Agitador_1` | bit | HMI_7 (.11) |
| `KTA_Agitador_2` | bit | HMI_7 (.11) |
| `KTA_Agitador_3` | bit | HMI_7 (.11) |
| `KTA_Agitador_4` | bit | HMI_7 (.11) |
| `KTA_Arrastre` | bit | HMI_7 (.11) |
| `Orden_Marcha_CIP` | bit | HMI_7 (.11) |
| `EV_Vaciado_Deposito_1` | bit | HMI_7 (.11) |
| `EV_Vaciado_Deposito_2` | bit | HMI_7 (.11) |
| `EV_Vaciado_Deposito_3` | bit | HMI_7 (.11) |
| `EV_Vaciado_Deposito_4` | bit | HMI_7 (.11) |
| `EV_Arrastre` | bit | HMI_7 (.11) |
| `CUBA_AUTO_DB1_LirasLlenado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_TardaLlenado` | entero 32 (tiempo) | HMI_8 (.13) |
| `C3Ev2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_FREC.LIRAS` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónCuajado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónCorte1` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónCorte2` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónCorte3` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónCorte4` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteCuajado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteCorte1` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteCorte2` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteCorte3` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteCorte4` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_TardaCalentamiento` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_TardaBatido` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_TardaVaciado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_Vapor` | bit | HMI_8 (.13) |
| `C1GiroCorte` | bit | HMI_8 (.13) |
| `C1GiroBatir` | bit | HMI_8 (.13) |
| `C1Ev1` | bit | HMI_8 (.13) |
| `C1Ev2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_LirasCuajado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_LirasCorte1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_LirasCorte2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_LirasCorte3` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_LirasCorte4` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_TiempoCicloBatirCB.IN` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_MarchaVaciado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_COAGULADO.HMI` | bit | HMI_8 (.13) |
| `C1SegPuerta` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_PARADA.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_SUERO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_PARADASUERO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_TIEMPOPALASUERO.IN` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_CONTINUAR.HMI` | bit | HMI_8 (.13) |
| `RECETA2_QUESO.RECETA` | entero 16 | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónCuajado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónCorte1` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónCorte2` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónCorte3` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónCorte4` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónCoagulado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteCoagulado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_DuraciónParada` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RestanteParada` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_TardaLlenado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_TardaCalentamiento` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_TardaBatido` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_TardaVaciado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteCuajado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteCorte1` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteCorte2` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteCorte3` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteCorte4` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónCoagulado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteCoagulado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_COAGULADO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_DuraciónParada` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_RestanteParada` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB2_PARADA.HMI` | bit | HMI_8 (.13) |
| `C2SegPuerta` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_LirasLlenado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_LirasCuajado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_LirasCorte1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_LirasCorte2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_LirasCorte3` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_LirasCorte4` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_Vapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_TiempoCicloBatirCB.IN` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_MarchaVaciado` | bit | HMI_8 (.13) |
| `C3EvVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_FREC.LIRAS` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB2_SUERO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_PARADASUERO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_TIEMPOPALASUERO.Q` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_CONTINUAR.HMI` | bit | HMI_8 (.13) |
| `Bomba_Suero` | bit | HMI_7 (.11) |
| `KM_Agitador_Suero` | bit | HMI_7 (.11) |
| `KM_Bomba_Suero` | bit | HMI_7 (.11) |
| `CUBA_AUTO_DB1_MarchaCuajado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_RESETTiempos` | bit | HMI_8 (.13) |
| `EV_Llenado_Suero` | bit | HMI_7 (.11) |
| `EV_Limpieza_Suero` | bit | HMI_7 (.11) |
| `C1Luz` | bit | HMI_8 (.13) |
| `C2Luz` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_MarchaCuajado` | bit | HMI_8 (.13) |
| `C2Ev1` | bit | HMI_8 (.13) |
| `C2Ev2` | bit | HMI_8 (.13) |
| `C2GiroCorte` | bit | HMI_8 (.13) |
| `C2GiroBatir` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_Temp.Registro` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_Temp.Registro` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_V1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_V2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_ManVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_AutoVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_ManCorte` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_ManBatir` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_Temp.1/2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_ManV1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_ManV2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_FREC.LIRASMANUAL` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB2_AutoVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_ManVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_Temp.1/2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_ManV1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_ManV2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_ManBatir` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_ManCorte` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB2_FREC.LIRASMANUAL` | real | HMI_8 (.13) |
| `CONTROLDEPOSITOS_DB_Reg.Temp.1` | bit | HMI_7 (.11) |
| `CONTROLDEPOSITOS_DB_Reg.Temp.2` | bit | HMI_7 (.11) |
| `CONTROLDEPOSITOS_DB_Reg.Temp.3` | bit | HMI_7 (.11) |
| `CUBA_AUTO_DB1_FREC.LIRASREAL` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB2_FREC.LIRASREAL` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB1_Temp.Cuba` | real | HMI_8 (.13) |
| `C3Ev1` | bit | HMI_8 (.13) |
| `PASTEURIZADOR_DB_TemperaturaGEA` | real | HMI_8 (.13) |
| `KM_Agitador_5` | bit | HMI_7 (.11) |
| `KTA_Agitador_5` | bit | HMI_7 (.11) |
| `Manual_Agitador_5` | bit | HMI_7 (.11) |
| `Manual_Frio_4` | bit | HMI_7 (.11) |
| `Manual_Frio_5` | bit | HMI_7 (.11) |
| `Nivel_Maximo_5` | bit | HMI_7 (.11) |
| `Tem_Actual_Deposito_5` | real | HMI_7 (.11) |
| `Valvula_Refrigeracion_4` | bit | HMI_7 (.11) |
| `Valvula_Refrigeracion_5` | bit | HMI_7 (.11) |
| `Agitador_Deposito_5` | bit | HMI_7 (.11) |
| `Automatico_Agitador_5` | bit | HMI_7 (.11) |
| `Automatico_Frio_4` | bit | HMI_7 (.11) |
| `Automatico_Frio_5` | bit | HMI_7 (.11) |
| `CONTROLDEPOSITOS_DB_Reg.Temp.4` | bit | HMI_7 (.11) |
| `CONTROLDEPOSITOS_DB_Reg.Temp.5` | bit | HMI_7 (.11) |
| `EV_Vaciado_Deposito_5` | bit | HMI_7 (.11) |
| `KM_Agitador_Suero_2` | bit | HMI_7 (.11) |
| `RECETA1_QUESO.RECETA` | entero 16 | HMI_8 (.13) |
| `CUBA_AUTO_DB3_LirasLlenado` | bit | HMI_8 (.13) |
| `C3GiroBatir` | bit | HMI_8 (.13) |
| `C3GiroCorte` | bit | HMI_8 (.13) |
| `C3Luz` | bit | HMI_8 (.13) |
| `C3SegPuerta` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_AutoVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_COAGULADO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_CONTINUAR.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónCoagulado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónCorte1` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónCorte2` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónCorte3` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónCorte4` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónCuajado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_DuraciónParada` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_FREC.LIRAS` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB3_FREC.LIRASMANUAL` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB3_FREC.LIRASREAL` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB3_LirasCorte1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_LirasCorte2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_LirasCorte3` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_LirasCorte4` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_LirasCuajado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_ManBatir` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_ManCorte` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_ManV1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_ManV2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_ManVapor` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_MarchaCuajado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_MarchaVaciado` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_PARADA.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_PARADASUERO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteCorte1` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteCorte2` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteCorte3` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteCorte4` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteCuajado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteParada` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_SUERO.HMI` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_TardaBatido` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_TardaCalentamiento` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_TardaLlenado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_TardaVaciado` | entero 32 (tiempo) | HMI_8 (.13) |
| `CUBA_AUTO_DB3_Temp.1/2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_Temp.Registro` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_TiempoCicloBatirCB.IN` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_TIEMPOPALASUERO.Q` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_V1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_V2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_Vapor` | bit | HMI_8 (.13) |
| `RECETA3_QUESO.RECETA` | entero 16 | HMI_8 (.13) |
| `CUBA_AUTO_DB2_Temp.Cuba` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB3_Temp.Cuba` | real | HMI_8 (.13) |
| `CUBA_AUTO_DB1_V1` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB1_V2` | bit | HMI_8 (.13) |
| `CUBA_AUTO_DB3_RestanteCoagulado` | entero 32 (tiempo) | HMI_8 (.13) |
| `RECETA1_QUESO.NOMBRE` | texto | HMI_8 (.13) |
| `RECETA2_QUESO.NOMBRE` | texto | HMI_8 (.13) |
| `RECETA3_QUESO.NOMBRE` | texto | HMI_8 (.13) |
| `PASTEURIZADOR_DB_ESTADO.PAST` | entero 16 | HMI_8 (.13) |
| `REGISTRO_DB_Registro` | bit | HMI_7 (.11) |

## Variables que se guardan en el histórico (Tag Logging)

| Archivo | Nombre en el archivo | Variable de origen |
|---|---|---|
| PASTEURIZACIÓN | Presión1 | `PASTEURIZADOR_DB_Presión1` |
| PASTEURIZACIÓN | Presión2 | `PASTEURIZADOR_DB_Presión2` |
| PASTEURIZACIÓN | TªPasteurización | `PASTEURIZADOR_DB_TemperaturaMotorizada` |
| PASTEURIZACIÓN | TªDesvío | `PASTEURIZADOR_DB_TemperaturaDesviadora` |
| PASTEURIZACIÓN | TªAguaCaliente | `PASTEURIZADOR_DB_TemperaturaEntrada` |
| PASTEURIZACIÓN | TªHaciaCuba | `PASTEURIZADOR_DB_TemperaturaSalida` |
| DEPÓSITOS | TªDEP.1 | `Tem_Actual_Deposito_1` |
| DEPÓSITOS | TªDEP.2 | `Tem_Actual_Deposito_2` |
| DEPÓSITOS | TªDEP.3 | `Tem_Actual_Deposito_3` |
| DEPÓSITOS | TªDEP.4 | `Tem_Actual_Deposito_4` |
| CUBA2 | TIEMPO_LLENADO | `CUBA_AUTO_DB2_TardaLlenado` |
| CUBA2 | TIEMPO_CUAJADO | `CUBA_AUTO_DB2_RestanteCuajado` |
| CUBA2 | TIEMPO_CORTE1 | `CUBA_AUTO_DB2_RestanteCorte1` |
| CUBA2 | TIEMPO_CORTE2 | `CUBA_AUTO_DB2_RestanteCorte2` |
| CUBA2 | TIEMPO_CORTE3 | `CUBA_AUTO_DB2_RestanteCorte3` |
| CUBA2 | TIEMPO_CORTE4 | `CUBA_AUTO_DB2_RestanteCorte4` |
| CUBA2 | TIEMPO_CALENTAMIENTO | `CUBA_AUTO_DB2_TardaCalentamiento` |
| CUBA2 | TIEMPO_BATIDO | `CUBA_AUTO_DB2_TardaBatido` |
| CUBA2 | TIEMPO_VACIADO | `CUBA_AUTO_DB2_TardaVaciado` |
| CUBA2 | TIEMPO_COAGULADO | `CUBA_AUTO_DB2_RestanteCoagulado` |
| CUBA2 | TEMPERATURA | `CUBA_AUTO_DB2_Temp.Cuba` |
| CUBA2 | TIEMPO_PARADA | `CUBA_AUTO_DB2_RestanteParada` |
| CUBA2 | FREC.LIRAS | `CUBA_AUTO_DB2_FREC.LIRASREAL` |
| CUBA2 | EV.VAPOR | `CUBA_AUTO_DB2_Vapor` |
| PASTEURIZACIÓN | FrecBombaLeche1 | `PASTEURIZADOR_DB_Frec.BombaLeche` |
| CUBA2 | EV.Vaciado2 | `CUBA_AUTO_DB2_V2` |
| DEPÓSITOS | EV.DEP.1 | `Valvula_Refrigeracion_1` |
| DEPÓSITOS | EV.DEP.2 | `Valvula_Refrigeracion_2` |
| DEPÓSITOS | EV.DEP.3 | `Valvula_Refrigeracion_3` |
| PASTEURIZACIÓN | TªBactofugadora | `PASTEURIZADOR_DB_TemperaturaGEA` |
| CUBA2 | RECETA | `RECETA2_QUESO.RECETA` |
| DEPÓSITOS | TªDEP.5 | `Tem_Actual_Deposito_5` |
| DEPÓSITOS | EV.DEP.4 | `Valvula_Refrigeracion_4` |
| DEPÓSITOS | EV.DEP.5 | `Valvula_Refrigeracion_5` |
| CUBA1 | EV.Vaciado1 | `CUBA_AUTO_DB1_V1` |
| CUBA1 | EV.Vaciado2 | `CUBA_AUTO_DB1_V2` |
| CUBA1 | EV.VAPOR | `CUBA_AUTO_DB1_Vapor` |
| CUBA1 | FREC.LIRAS | `CUBA_AUTO_DB1_FREC.LIRASREAL` |
| CUBA1 | RECETA | `RECETA1_QUESO.RECETA` |
| CUBA1 | TEMPERATURA | `CUBA_AUTO_DB1_Temp.Cuba` |
| CUBA1 | TIEMPO_BATIDO | `CUBA_AUTO_DB1_TardaBatido` |
| CUBA1 | TIEMPO_CALENTAMIENTO | `CUBA_AUTO_DB1_TardaCalentamiento` |
| CUBA1 | TIEMPO_COAGULADO | `CUBA_AUTO_DB1_RestanteCoagulado` |
| CUBA1 | TIEMPO_CORTE1 | `CUBA_AUTO_DB1_RestanteCorte1` |
| CUBA1 | TIEMPO_CORTE2 | `CUBA_AUTO_DB1_RestanteCorte2` |
| CUBA1 | TIEMPO_CORTE3 | `CUBA_AUTO_DB1_RestanteCorte3` |
| CUBA1 | TIEMPO_CORTE4 | `CUBA_AUTO_DB1_RestanteCorte4` |
| CUBA1 | TIEMPO_CUAJADO | `CUBA_AUTO_DB1_RestanteCuajado` |
| CUBA1 | TIEMPO_LLENADO | `CUBA_AUTO_DB1_TardaLlenado` |
| PASTEURIZACIÓN | FrecBombaLeche2 | `PASTEURIZADOR_DB_Frec.BombaLeche2` |
| PASTEURIZACIÓN | Estado | `PASTEURIZADOR_DB_ESTADO.PAST` |
| CUBA1 | TIEMPO_PARADA | `CUBA_AUTO_DB1_RestanteParada` |
| CUBA1 | TIEMPO_VACIADO | `CUBA_AUTO_DB1_TardaVaciado` |
| CUBA3 | TIEMPO_LLENADO | `CUBA_AUTO_DB3_TardaLlenado` |
| CUBA3 | TIEMPO_CUAJADO | `CUBA_AUTO_DB3_RestanteCuajado` |
| CUBA3 | TIEMPO_CORTE1 | `CUBA_AUTO_DB3_RestanteCorte1` |
| CUBA3 | TIEMPO_CORTE2 | `CUBA_AUTO_DB3_RestanteCorte2` |
| CUBA3 | TIEMPO_CORTE3 | `CUBA_AUTO_DB3_RestanteCorte3` |
| CUBA3 | TIEMPO_CORTE4 | `CUBA_AUTO_DB3_RestanteCorte4` |
| CUBA3 | TIEMPO_CALENTAMIENTO | `CUBA_AUTO_DB3_TardaCalentamiento` |
| CUBA3 | TIEMPO_BATIDO | `CUBA_AUTO_DB3_TardaBatido` |
| CUBA3 | TIEMPO_VACIADO | `CUBA_AUTO_DB3_TardaVaciado` |
| CUBA3 | TIEMPO_COAGULADO | `CUBA_AUTO_DB3_RestanteCoagulado` |
| CUBA3 | TEMPERATURA | `CUBA_AUTO_DB3_Temp.Cuba` |
| CUBA3 | TIEMPO_PARADA | `CUBA_AUTO_DB3_RestanteParada` |
| CUBA3 | FREC.LIRAS | `CUBA_AUTO_DB3_FREC.LIRASREAL` |
| CUBA3 | EV.VAPOR | `CUBA_AUTO_DB3_Vapor` |
| CUBA3 | EV.Vaciado1 | `CUBA_AUTO_DB3_V1` |
| CUBA3 | EV.Vaciado2 | `CUBA_AUTO_DB3_V2` |
| CUBA3 | RECETA | `RECETA3_QUESO.RECETA` |
| CUBA2 | EV.Vaciado1 | `CUBA_AUTO_DB2_V1` |
