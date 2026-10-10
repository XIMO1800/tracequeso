# =============================================================================
#  guardar-xps.ps1  -  TraceQueso / PC del SCADA (FABRICACION-PC, Windows 7)
# -----------------------------------------------------------------------------
#  Los informes de WinCC salen por la impresora "Microsoft XPS Document Writer"
#  y cada uno abre un "Guardar el archivo como". Este programa hace lo que hace
#  Joaquin a mano:
#    1. Guarda cada "Guardar como" en C:\TraceQueso\entrada, con fecha y hora
#       en el nombre (desde fuera no se sabe de que informe es: el dialogo es de
#       la impresora de Windows, no de WinCC).
#    2. ABRE el XPS guardado y lee la primera pagina: "Control Cuba 1/2/3",
#       "Control Pasteurizacion" con tabla (info) o sin tabla (grafica), y la
#       fecha en que se saco el informe.
#    3. Lo mueve a Documentos\SCADA\AAAA\<CUBA1|...>\MM-AAAA\DD.MM.AAAA.xps
#       (si ya existe, DDb, DDc...). Lo que no reconoce va a SIN CLASIFICAR.
#
#  MODO PRUEBA: no toca NINGUN "Guardar como". Apunta en guardar-xps.log los
#  que ve y, ademas, revisa los XPS que Joaquin guarda a mano y apunta si el
#  programa los habria puesto en la misma carpeta y con el mismo nombre.
#  Cuando coincida siempre, se cambia a MODO REAL (linea de abajo).
#
#  SEGURIDAD (es el PC que maneja la fabrica): no simula el teclado; actua
#  sobre la propia ventana de Guardar. Solo si es de tipo XPS. Nunca sobrescribe.
#
#  Lo lanza cada minuto la tarea "TraceQueso Guardar XPS" (lanzar-guardar-xps.vbs).
#  probar-guardar-xps.vbs lo lanza una vez a mano y apunta todo.
#  2026-10-10
# =============================================================================

$MODO = 'PRUEBA'          # 'PRUEBA' = solo apunta  |  'REAL' = guarda y coloca

$DIR      = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LOG      = Join-Path $DIR 'guardar-xps.log'
$FICH_VIS = Join-Path $DIR 'guardar-xps.vistos'
$ENTRADA  = Join-Path $DIR 'entrada'
$BASE     = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'SCADA'
$TITULO   = 'Guardar el archivo como'
$VER      = ($args -contains 'ver')
$ENSAYO   = ($args -contains 'ensayo')   # guarda de verdad, pero en SCADA\AAAA\ENSAYO (no se envia a Drive)
if ($ENSAYO) { $MODO = 'REAL' }

function Log([string]$t) {
  $l = (Get-Date).ToString('dd/MM/yyyy HH:mm:ss') + '  ' + $t
  Add-Content -Path $LOG -Value $l -Encoding UTF8
}

$mtx = New-Object System.Threading.Mutex($false, 'Global\TraceQuesoGuardarXps')
$tengo = $false
try { $tengo = $mtx.WaitOne(0) } catch { $tengo = $true }
if (-not $tengo) { exit }

try {
  [void][Reflection.Assembly]::LoadWithPartialName('UIAutomationClient')
  [void][Reflection.Assembly]::LoadWithPartialName('UIAutomationTypes')
  [void][Reflection.Assembly]::LoadWithPartialName('WindowsBase')
  Add-Type -Namespace TQ -Name W -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
public delegate bool EnumProc(IntPtr h, IntPtr p);
[DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
public delegate bool EnumHijo(IntPtr h, IntPtr p);
[DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr padre, EnumHijo cb, IntPtr p);
[DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr w, string l);
[DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
public static string Clase(IntPtr h) { System.Text.StringBuilder sb = new System.Text.StringBuilder(256); GetClassName(h, sb, 256); return sb.ToString(); }
public static System.Collections.Generic.List<IntPtr> Hijos(IntPtr padre) {
  System.Collections.Generic.List<IntPtr> l = new System.Collections.Generic.List<IntPtr>();
  EnumChildWindows(padre, delegate(IntPtr h, IntPtr p) { l.Add(h); return true; }, IntPtr.Zero);
  return l;
}
// Casilla del nombre: un Edit con numero de control 1001. Boton Guardar: un Button con numero 1.
public static IntPtr Control(IntPtr dlg, string clase, int id) {
  foreach (IntPtr h in Hijos(dlg)) { if (GetDlgCtrlID(h) == id && Clase(h) == clase) return h; }
  return IntPtr.Zero;
}
public static void PonerTexto(IntPtr h, string t) { SendMessage(h, 0x000C, IntPtr.Zero, t); }   // WM_SETTEXT
public static void Pulsar(IntPtr h) { PostMessage(h, 0x00F5, IntPtr.Zero, IntPtr.Zero); }       // BM_CLICK
public static System.Collections.Generic.List<IntPtr> Ventanas() {
  System.Collections.Generic.List<IntPtr> l = new System.Collections.Generic.List<IntPtr>();
  EnumWindows(delegate(IntPtr h, IntPtr p) { if (IsWindowVisible(h)) l.Add(h); return true; }, IntPtr.Zero);
  return l;
}
'@

  $AE = [System.Windows.Automation.AutomationElement]
  $TS = [System.Windows.Automation.TreeScope]

  function TituloDe([IntPtr]$h) {
    $sb = New-Object System.Text.StringBuilder 512
    [void][TQ.W]::GetWindowText($h, $sb, 512)
    return $sb.ToString()
  }

  # ---------- Leer la primera pagina de un XPS ----------
  function TextosXps([string]$ruta) {
    $pk = $null
    try {
      $pk = [System.IO.Packaging.Package]::Open($ruta, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
      $pag = $null
      foreach ($p in $pk.GetParts()) {
        $u = $p.Uri.ToString()
        if ($u -match '/Pages/1\.fpage$') { $pag = $p; break }
      }
      if (-not $pag) { return @() }
      $sr = New-Object System.IO.StreamReader($pag.GetStream())
      $xml = $sr.ReadToEnd(); $sr.Close()
      $t = @()
      foreach ($m in [regex]::Matches($xml, 'UnicodeString="([^"]*)"')) { $t += $m.Groups[1].Value }
      return $t
    } finally { if ($pk) { $pk.Close() } }
  }

  # Devuelve @(tipo, fecha) ; tipo '' si no se reconoce
  function Clasificar([string]$ruta) {
    $t = TextosXps $ruta
    $todo = ($t -join ' | ')
    $tipo = ''
    if ($todo -match 'Control Cuba\s*([123])') { $tipo = 'CUBA' + $matches[1] }
    elseif ($todo -match 'Control Pasteuri') {
      if ($todo -match 'TIEMPO') { $tipo = 'PASTO INFO' } else { $tipo = 'PASTO GRAFICO' }
    }
    elseif ($todo -match 'Temp\. ?Dep|Dep.sito') { $tipo = 'DEPOSITOS' }
    elseif ($todo -match '^Avisos') { $tipo = 'AVISOS' }
    $fecha = $null
    $m = [regex]::Match($todo, '(\d{2})/(\d{2})/(\d{4}) \d{1,2}:\d{2}')
    if ($m.Success) { $fecha = New-Object DateTime ([int]$m.Groups[3].Value), ([int]$m.Groups[2].Value), ([int]$m.Groups[1].Value) }
    # Avisos y Depositos salen de madrugada (7:40) y son del DIA ANTERIOR (asi los nombra Joaquin)
    if ($fecha -and ($tipo -eq 'AVISOS' -or $tipo -eq 'DEPOSITOS')) { $fecha = $fecha.AddDays(-1) }
    $muestra = (@($t | Select-Object -First 3) -join ' | ')
    return @($tipo, $fecha, $muestra)
  }

  function DestinoPara([string]$tipo, $fecha, [string]$excluir) {
    if (-not $fecha) { $fecha = Get-Date }
    if ($ENSAYO) { $tipo = 'ENSAYO\' + $(if ($tipo) { $tipo } else { 'SIN CLASIFICAR' }) }
    if ($tipo -eq '' -or $tipo -eq 'ENSAYO\SIN CLASIFICAR') {
      if ($ENSAYO) { return Join-Path $BASE ($fecha.ToString('yyyy') + '\ENSAYO\SIN CLASIFICAR\' + (Get-Date).ToString('dd.MM.yyyy_HHmmss') + '.xps') }
      return Join-Path $BASE ($fecha.ToString('yyyy') + '\SIN CLASIFICAR\' + (Get-Date).ToString('dd.MM.yyyy_HHmmss') + '.xps')
    }
    $carp = Join-Path $BASE ($fecha.ToString('yyyy') + '\' + $tipo + '\' + $fecha.ToString('MM-yyyy'))
    foreach ($suf in @('', 'b', 'c', 'd', 'e', 'f', 'g', 'h')) {
      $r = Join-Path $carp ($fecha.ToString('dd') + $suf + $fecha.ToString('.MM.yyyy') + '.xps')
      if ($r -eq $excluir) { return $r }
      if (-not (Test-Path $r)) { return $r }
    }
    return Join-Path $carp ($fecha.ToString('dd.MM.yyyy_HHmmss') + '.xps')
  }

  $vistos = @()
  if (Test-Path $FICH_VIS) { $vistos = @(Get-Content $FICH_VIS) }

  # ---------- 1. Los "Guardar el archivo como" abiertos ----------
  $todas = @(); $dlgs = @()
  foreach ($hw in [TQ.W]::Ventanas()) {
    $tt = TituloDe $hw
    if (-not $tt) { continue }
    $todas += $tt
    if ($tt -like ($TITULO + '*')) { $dlgs += $hw }
  }
  if ($VER) { Log ('VENTANAS ABIERTAS: ' + ($todas -join ' | ')) }

  $n = 0
  foreach ($hw in $dlgs) {
    $d = $null
    try { $d = $AE::FromHandle($hw) } catch { Log ('FALLO: no puedo leer el "Guardar como": ' + $_.Exception.Message); continue }
    # Solo los de la impresora XPS
    $esXps = $false
    foreach ($e in $d.FindAll($TS::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
      $nm = $e.Current.Name
      if ($nm -and $nm -match '\*\.xps') { $esXps = $true; break }
    }
    $clave = [string]$hw
    if (-not $esXps) {
      if ($VER -or -not ($vistos -contains $clave)) { Log 'Hay un "Guardar como" que NO es de XPS: no se toca.'; $vistos += $clave }
      continue
    }
    $n++
    $tmp = Join-Path $ENTRADA ((Get-Date).ToString('yyyyMMdd_HHmmss') + '_' + $n + '.xps')

    if ($MODO -ne 'REAL') {
      if ($VER -or -not ($vistos -contains $clave)) { Log ('PRUEBA  veo un "Guardar como" XPS. En modo real lo guardaria en ' + $tmp + ' y luego lo colocaria segun lo que ponga dentro.'); $vistos += $clave }
      continue
    }

    $edit = [TQ.W]::Control($hw, 'Edit', 1001)
    $btn  = [TQ.W]::Control($hw, 'Button', 1)
    if ($edit -eq [IntPtr]::Zero -or $btn -eq [IntPtr]::Zero) {
      $lista = @()
      foreach ($c in [TQ.W]::Hijos($hw)) { $lista += ([TQ.W]::Clase($c) + '#' + [TQ.W]::GetDlgCtrlID($c) + '="' + (TituloDe $c) + '"') }
      Log ('FALLO: no encuentro la casilla del nombre o el boton Guardar. Controles: ' + ($lista -join ' ; '))
      continue
    }
    if (-not (Test-Path $ENTRADA)) { New-Item -ItemType Directory -Force -Path $ENTRADA | Out-Null }
    [TQ.W]::PonerTexto($edit, $tmp)
    Start-Sleep -Milliseconds 500
    [TQ.W]::Pulsar($btn)
    $tam = -1; $igual = 0
    for ($i = 0; $i -lt 120 -and $igual -lt 3; $i++) {
      Start-Sleep -Seconds 1
      if (Test-Path $tmp) { $t2 = (Get-Item $tmp).Length; if ($t2 -gt 0 -and $t2 -eq $tam) { $igual++ } else { $igual = 0 }; $tam = $t2 }
    }
    if (Test-Path $tmp) { Log ('GUARDADO en entrada: ' + $tmp + ' (' + $tam + ' bytes)') }
    else { Log ('AVISO: pulse Guardar pero no aparece ' + $tmp) }
  }

  # ---------- 2. Colocar lo que haya en entrada (modo real) ----------
  if ($MODO -eq 'REAL' -and (Test-Path $ENTRADA)) {
    foreach ($f in @(Get-ChildItem $ENTRADA -Filter *.xps)) {
      # Esperar a que la impresora termine de escribirlo
      if (((Get-Date) - $f.LastWriteTime).TotalSeconds -lt 3) { continue }
      try { $r = Clasificar $f.FullName }
      catch { Log ('Aun no se puede leer ' + $f.Name + ' (se reintenta): ' + $_.Exception.Message); continue }
      $dest = DestinoPara $r[0] $r[1] ''
      $carp = Split-Path -Parent $dest
      if (-not (Test-Path $carp)) { New-Item -ItemType Directory -Force -Path $carp | Out-Null }
      Move-Item -Path $f.FullName -Destination $dest
      $q = $r[0]; if ($q -eq '') { $q = 'SIN CLASIFICAR' }
      Log ('COLOCADO ' + $q + ': ' + $dest + '   [' + $r[2] + ']')
    }
  }

  # ---------- 3. Modo prueba: comparar con lo que Joaquin guarda a mano ----------
  if ($MODO -ne 'REAL') {
    $desde = (Get-Date).AddDays(-3)
    $anio = Join-Path $BASE ((Get-Date).ToString('yyyy'))
    if (Test-Path $anio) {
      foreach ($f in @(Get-ChildItem $anio -Recurse -Filter *.xps | Where-Object { $_.LastWriteTime -gt $desde })) {
        $clave = 'M|' + $f.FullName
        if (-not $VER -and ($vistos -contains $clave)) { continue }
        $vistos += $clave
        try { $r = Clasificar $f.FullName }
        catch { Log ('MANUAL  no puedo leer ' + $f.FullName + ': ' + $_.Exception.Message); continue }
        $dest = DestinoPara $r[0] $r[1] $f.FullName
        $ok = 'NO COINCIDE'
        if ($dest -eq $f.FullName) { $ok = 'COINCIDE' }
        Log ('MANUAL  ' + $ok + ': tu lo guardaste en ' + $f.FullName.Replace($BASE + '\', '') + ' / el programa: ' + $dest.Replace($BASE + '\', '') + '   [' + $r[2] + ']')
      }
    }
  }

  if ($vistos.Count -gt 400) { $vistos = $vistos[($vistos.Count - 400)..($vistos.Count - 1)] }
  if ($vistos.Count -gt 0) { Set-Content -Path $FICH_VIS -Value $vistos -Encoding UTF8 }
}
catch {
  Log ('ERROR: ' + $_.Exception.Message)
}
finally {
  try { $mtx.ReleaseMutex() } catch {}
}
