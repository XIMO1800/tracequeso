# ==========================================================================
#  DIAGNOSTICO DEL PC DEL SCADA  (TraceQueso, 15/10/2026)
# --------------------------------------------------------------------------
#  SOLO MIRA. No cambia nada, no instala nada, no toca el WinCC ni el autómata
#  y no manda nada a internet. Se puede lanzar con la fábrica en marcha.
#
#  Sirve para saber por qué camino se pueden sacar los datos del SCADA mientras
#  se fabrica (sin esperar al informe de las 15:00):
#    - ¿Está instalado el servidor OPC del WinCC?
#    - ¿Qué autómatas hay y en qué dirección (IP) están?
#    - ¿Qué programas de Siemens y de SQL hay instalados?
#    - ¿Hay una copia del proyecto de TIA Portal en este PC?
#
#  Deja el resultado en C:\TraceQueso\diagnostico-scada.txt y lo abre.
#  Escrito para PowerShell 2.0 (el de Windows 7).
# ==========================================================================

$ErrorActionPreference = 'SilentlyContinue'
try { (Get-Process -Id $PID).PriorityClass = 'BelowNormal' } catch {}

$DIR = 'C:\TraceQueso'
if (-not (Test-Path $DIR)) { New-Item -ItemType Directory -Force -Path $DIR | Out-Null }
$OUT = Join-Path $DIR 'diagnostico-scada.txt'
$lineas = New-Object System.Collections.ArrayList

function T($t)  { [void]$lineas.Add('') ; [void]$lineas.Add('==== ' + $t + ' ====') }
function L($t)  { [void]$lineas.Add([string]$t) }

L ('Diagnostico del PC del SCADA - ' + (Get-Date).ToString('dd/MM/yyyy HH:mm:ss'))

# ---- 1. Equipo -----------------------------------------------------------
T '1. EQUIPO'
$os = Get-WmiObject Win32_OperatingSystem
L ('Nombre del PC: ' + $env:COMPUTERNAME)
L ('Windows: ' + $os.Caption + ' ' + $os.CSDVersion + ' (' + $os.OSArchitecture + ')')
L ('PowerShell: ' + $PSVersionTable.PSVersion)

# ---- 2. Programas instalados (Siemens, SQL, OPC) -------------------------
T '2. PROGRAMAS DE SIEMENS / SQL / OPC INSTALADOS'
$claves = @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
            'HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*')
$progs = @()
foreach ($c in $claves) {
  $progs += Get-ItemProperty $c | Where-Object {
    $_.DisplayName -match 'Siemens|SIMATIC|WinCC|STEP ?7|TIA|SQL|OPC|Automation License|PLCSIM|NetPro|S7'
  } | ForEach-Object { $_.DisplayName + '  |  ' + $_.DisplayVersion }
}
$progs | Sort-Object -Unique | ForEach-Object { L $_ }
if (-not $progs) { L '(no se ha encontrado ninguno)' }

# ---- 3. Servicios --------------------------------------------------------
T '3. SERVICIOS (SQL, WinCC, OPC, Siemens)'
Get-WmiObject Win32_Service | Where-Object {
  $_.Name -match 'SQL|WinCC|CCAgent|OPC|Siemens|S7|Simatic|HMI|Alm|PNIO|Sim' -or
  $_.DisplayName -match 'SQL|WinCC|OPC|Siemens|SIMATIC|S7'
} | Sort-Object Name | ForEach-Object {
  L ($_.Name + '  |  ' + $_.DisplayName + '  |  ' + $_.State + '  |  ' + $_.StartMode)
}

# ---- 4. Servidores OPC registrados ---------------------------------------
T '4. SERVIDORES OPC REGISTRADOS (nombres que contienen OPC)'
$hkcr = 'Registry::HKEY_CLASSES_ROOT'
$opc = @(Get-ChildItem $hkcr | Where-Object { $_.PSChildName -match 'OPC' } | ForEach-Object { $_.PSChildName })
if ($opc.Count) { $opc | ForEach-Object { L $_ } } else { L '(ninguno)' }

# ---- 5. Programas en marcha ----------------------------------------------
T '5. PROGRAMAS EN MARCHA (Siemens / SQL / OPC)'
Get-Process | Where-Object {
  $_.ProcessName -match 'HmiRT|WinCC|RTIL|sqlservr|OPC|Simatic|s7|CCAgent|Alm|PdlRt|Sm|Tag|Hmi'
} | Sort-Object ProcessName | ForEach-Object {
  L ($_.ProcessName + '  |  ' + $_.Path)
}

# ---- 6. Red y autómatas ----------------------------------------------------
T '6. TARJETAS DE RED (ipconfig)'
ipconfig /all | ForEach-Object { L $_ }

T '7. CONEXIONES CON LOS AUTOMATAS (puerto 102 = protocolo S7 de Siemens)'
$c102 = @(netstat -an | Where-Object { $_ -match ':102\s' })
if ($c102.Count) { $c102 | ForEach-Object { L $_ } } else { L '(ninguna conexion por el puerto 102 en este momento)' }

T '8. EQUIPOS VISTOS EN LA RED (arp -a)'
arp -a | ForEach-Object { L $_ }

T '9. PUERTOS QUE ESCUCHA ESTE PC'
netstat -an | Where-Object { $_ -match 'LISTENING|ESCUCHANDO' } | ForEach-Object { L $_ }

# ---- 7. Proyecto de TIA Portal -------------------------------------------
T '10. PROYECTOS DE TIA PORTAL O DEL RUNTIME EN ESTE PC'
$sitios = @('C:\Users', 'C:\Program Files\Siemens', 'C:\Program Files (x86)\Siemens', 'C:\ProgramData\Siemens', 'C:\SCADA', 'C:\SCADA_DATOS', 'C:\SCADA25', 'C:\IDE')
foreach ($u in @('D:\', 'E:\')) { if (Test-Path $u) { $sitios += $u } }
$enc = 0
foreach ($s in $sitios) {
  if (-not (Test-Path $s)) { continue }
  Get-ChildItem $s -Recurse -Include *.ap11,*.ap12,*.ap13,*.ap14,*.fwc,*.fwx,*.zap12,*.zap13 |
    Select-Object -First 40 | ForEach-Object {
      $enc++
      L ($_.FullName + '  |  ' + $_.LastWriteTime.ToString('dd/MM/yyyy') + '  |  ' + [math]::Round($_.Length/1MB,1) + ' MB')
    }
}
if (-not $enc) { L '(no se ha encontrado ningun proyecto)' }

T '11. QUE HAY EN LAS CARPETAS SCADA, SCADA_DATOS, SCADA25, IDE Y D:\ (primer nivel)'
foreach ($c in @('C:\SCADA', 'C:\SCADA_DATOS', 'C:\SCADA25', 'C:\IDE', 'D:\')) {
  if (-not (Test-Path $c)) { continue }
  L ('--- ' + $c)
  Get-ChildItem $c | Select-Object -First 60 | ForEach-Object {
    $tam = ''; if (-not $_.PSIsContainer) { $tam = [math]::Round($_.Length/1KB,0).ToString() + ' KB' }
    L ('   ' + $_.Name + '  |  ' + $_.LastWriteTime.ToString('dd/MM/yyyy') + '  ' + $tam)
  }
}

T 'CARPETAS COMPARTIDAS'
net share | ForEach-Object { L $_ }

T 'FIN'
L 'Este archivo no contiene contrasenas. Mandaselo a Claude tal cual.'

$lineas | Out-File -FilePath $OUT -Encoding UTF8
Start-Process notepad.exe $OUT
