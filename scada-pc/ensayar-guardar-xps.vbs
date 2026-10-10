' ensayar-guardar-xps.vbs - TraceQueso
' Ensayo REAL: rellena y guarda los 'Guardar como' XPS abiertos, pero los coloca
' en Documentos\SCADA\AAAA\ENSAYO, que el envio a Drive no mira.
Set sh = CreateObject("WScript.Shell")
d = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & d & "\guardar-xps.ps1"" ensayo ver", 0, True
MsgBox "Ensayo terminado. Abre guardar-xps.log y manda foto.", 64, "TraceQueso"
