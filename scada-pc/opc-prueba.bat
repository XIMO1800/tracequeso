@echo off
rem Prueba OPC: SOLO LEE. No escribe nada en el SCADA ni en los automatas.
rem Se lanza con el WScript de 32 bits porque el componente OPC es de 32 bits.
echo Preguntando al SCADA por OPC (solo lectura). Puede tardar 1-2 minutos...
"%SystemRoot%\SysWOW64\cscript.exe" //nologo "%~dp0opc-prueba.vbs"
