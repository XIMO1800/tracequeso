' probar-guardar-xps.vbs - TraceQueso
' Prueba a mano: ejecuta guardar-xps.ps1 una vez, apuntando ademas todas las
' ventanas abiertas, y avisa cuando ha terminado.
Set sh = CreateObject("WScript.Shell")
d = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & d & "\guardar-xps.ps1"" ver", 0, True
MsgBox "Prueba terminada. Abre guardar-xps.log y manda foto.", 64, "TraceQueso"
