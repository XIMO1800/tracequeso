@echo off
rem PRUEBA SQL: SOLO LECTURA. Pregunta al SQL del WinCC las variables y conexiones del proyecto.
rem No cambia nada. Resultado en C:\TraceQueso\sql-prueba2.txt
set SQLCMD="C:\Program Files\Microsoft SQL Server\100\Tools\Binn\SQLCMD.EXE"
if not exist %SQLCMD% set SQLCMD="C:\Program Files (x86)\Microsoft SQL Server\100\Tools\Binn\SQLCMD.EXE"
if not exist %SQLCMD% set SQLCMD=sqlcmd
echo Preguntando al SQL del WinCC (solo lectura)...
%SQLCMD% -E -S .\WINCC -W -s " | " -i "%~dp0sql-prueba2.sql" -o "C:\TraceQueso\sql-prueba2.txt"
if errorlevel 1 echo Ha dado error. Mira el archivo sql-prueba2.txt >> "C:\TraceQueso\sql-prueba2.txt"
start notepad "C:\TraceQueso\sql-prueba2.txt"
