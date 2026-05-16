<<<<<<< HEAD
#Requires -Version 5.1
param()

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$script:Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:EmbedDir = Join-Path $script:Root 'runtime\python-embed'
$script:EmbedPython = Join-Path $script:EmbedDir 'python.exe'
$script:EmbedVersion = '3.12.8'
$script:ServerProcess = $null

function Get-EmbedArchTag {
    $pa = [System.Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE')
    if ($pa -eq 'ARM64') { return 'arm64' }
    return 'amd64'
}

function Get-PythonInfo {
    if (Test-Path -LiteralPath $script:EmbedPython) {
        return @{ Exe = $script:EmbedPython; Args = @('-m', 'http.server'); Source = 'plugin runtime\python-embed' }
    }
    $py = Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if ($py) {
        return @{ Exe = $py; Args = @('-m', 'http.server'); Source = "system PATH: $py" }
    }
    $pylauncher = Get-Command py -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if ($pylauncher) {
        return @{ Exe = $pylauncher; Args = @('-3', '-m', 'http.server'); Source = 'Python Launcher (py -3)' }
    }
    return $null
}

function Test-PythonHttpServer {
    param([hashtable]$Info)
    $out = [IO.Path]::GetTempFileName()
    $err = [IO.Path]::GetTempFileName()
    try {
        $argLine = ($Info.Args + @('0')) -join ' '
        $p = Start-Process -FilePath $Info.Exe -ArgumentList $argLine -WorkingDirectory $script:Root `
            -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
        Start-Sleep -Milliseconds 500
        if (-not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            return $true
        }
    } catch { }
    finally {
        Remove-Item -LiteralPath $out, $err -Force -ErrorAction SilentlyContinue
    }
    return $false
}

function Repair-EmbedPth {
    $pthFiles = Get-ChildItem -LiteralPath $script:EmbedDir -Filter '*.pth' -File -ErrorAction SilentlyContinue
    foreach ($f in $pthFiles) {
        $raw = [System.IO.File]::ReadAllText($f.FullName)
        $patched = [regex]::Replace($raw, '(?m)^\s*#\s*import\s+site\s*$', 'import site')
        if ($patched -notmatch '(?m)^import\s+site\s*$') {
            $patched = $patched.TrimEnd() + "`r`nimport site`r`n"
        }
        [System.IO.File]::WriteAllText($f.FullName, $patched, [System.Text.UTF8Encoding]::new($false))
    }
}

function Save-EmbedZip {
    param([string]$ZipPath)
    Expand-Archive -LiteralPath $ZipPath -DestinationPath $script:EmbedDir -Force
    Repair-EmbedPth
}

function Invoke-DownloadEmbed {
    param([System.Windows.Forms.RichTextBox]$Log, [System.Windows.Forms.ProgressBar]$Bar)

    $arch = Get-EmbedArchTag
    $ver = $script:EmbedVersion
    $url = "https://www.python.org/ftp/python/$ver/python-$ver-embed-$arch.zip"
    $zip = Join-Path $script:Root "runtime\python-$ver-embed-$arch.zip"

    $append = { param($t) $Log.AppendText("$t`r`n"); $Log.ScrollToCaret() }

    & $append "Download: $url"
    New-Item -ItemType Directory -Path (Split-Path $script:EmbedDir) -Force -ErrorAction SilentlyContinue | Out-Null

    if (Test-Path -LiteralPath $script:EmbedDir) {
        Remove-Item -LiteralPath $script:EmbedDir -Recurse -Force -ErrorAction Stop
    }
    New-Item -ItemType Directory -Path $script:EmbedDir -Force | Out-Null

    $Bar.Style = [System.Windows.Forms.ProgressBarStyle]::Marquee
    $Bar.Visible = $true
    [System.Windows.Forms.Application]::DoEvents()

    $wc = $null
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $zip)
        & $append 'Saved zip, extracting...'
        Save-EmbedZip -ZipPath $zip
        Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
        & $append 'Extract OK (import site enabled).'
    } catch {
        & $append ('Download failed: ' + $_.Exception.Message)
        $msg = "Download/extract failed.`n`n" + $_.Exception.Message + "`n`nInstall Python 3, or run 启动本地服务-命令行.bat for Node."
        [void][System.Windows.Forms.MessageBox]::Show(
            $msg,
            'OBS Lyrics',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
    } finally {
        if ($null -ne $wc) { $wc.Dispose() }
        $Bar.Style = [System.Windows.Forms.ProgressBarStyle]::Blocks
        $Bar.Visible = $false
    }
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'OBS Lyrics - Local Server'
$form.Size = New-Object System.Drawing.Size(560, 560)
$form.MinimumSize = New-Object System.Drawing.Size(560, 560)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(12, 12)
$lblStatus.Size = New-Object System.Drawing.Size(520, 44)
$lblStatus.AutoSize = $false
$form.Controls.Add($lblStatus)

$numPort = New-Object System.Windows.Forms.NumericUpDown
$numPort.AutoSize = $true
$numPort.Location = New-Object System.Drawing.Point(12, 60)
$numPort.Width = 108
$numPort.TextAlign = [System.Windows.Forms.HorizontalAlignment]::Center
$numPort.ThousandsSeparator = $false
$numPort.Minimum = 1024
$numPort.Maximum = 65535
$numPort.Value = 8765
$form.Controls.Add($numPort)

$btnDetect = New-Object System.Windows.Forms.Button
$btnDetect.Location = New-Object System.Drawing.Point(170, 58)
$btnDetect.Size = New-Object System.Drawing.Size(120, 28)
$btnDetect.Text = 'Re-detect'
$form.Controls.Add($btnDetect)

$btnDownload = New-Object System.Windows.Forms.Button
$btnDownload.Location = New-Object System.Drawing.Point(300, 58)
$btnDownload.Size = New-Object System.Drawing.Size(200, 28)
$btnDownload.Text = 'Download portable Python'
$form.Controls.Add($btnDownload)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Location = New-Object System.Drawing.Point(12, 100)
$btnStart.Size = New-Object System.Drawing.Size(120, 32)
$btnStart.Text = 'Start server'
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Location = New-Object System.Drawing.Point(142, 100)
$btnStop.Size = New-Object System.Drawing.Size(120, 32)
$btnStop.Text = 'Stop server'
$btnStop.Enabled = $false
$form.Controls.Add($btnStop)

$btnOpenCtl = New-Object System.Windows.Forms.Button
$btnOpenCtl.Location = New-Object System.Drawing.Point(272, 100)
$btnOpenCtl.Size = New-Object System.Drawing.Size(120, 32)
$btnOpenCtl.Text = 'Open control'
$form.Controls.Add($btnOpenCtl)

$btnOpenDisp = New-Object System.Windows.Forms.Button
$btnOpenDisp.Location = New-Object System.Drawing.Point(402, 100)
$btnOpenDisp.Size = New-Object System.Drawing.Size(130, 32)
$btnOpenDisp.Text = 'Open display'
$form.Controls.Add($btnOpenDisp)

$btnCopyDisp = New-Object System.Windows.Forms.Button
$btnCopyDisp.Location = New-Object System.Drawing.Point(12, 140)
$btnCopyDisp.Size = New-Object System.Drawing.Size(160, 28)
$btnCopyDisp.Text = 'Copy display URL'
$form.Controls.Add($btnCopyDisp)

$rtf = New-Object System.Windows.Forms.RichTextBox
$rtf.Location = New-Object System.Drawing.Point(12, 178)
$rtf.Size = New-Object System.Drawing.Size(520, 220)
$rtf.ReadOnly = $true
$rtf.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$rtf.DetectUrls = $true
$form.Controls.Add($rtf)

$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(12, 408)
$bar.Size = New-Object System.Drawing.Size(520, 18)
$bar.Visible = $false
$form.Controls.Add($bar)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Location = New-Object System.Drawing.Point(12, 432)
$lblHint.Size = New-Object System.Drawing.Size(520, 34)
$lblHint.Text = "OBS Browser Source URL: http://127.0.0.1:PORT/display.html`nClosing this window will stop the background server."
$lblHint.AutoSize = $false
$form.Controls.Add($lblHint)

$lblCopyright = New-Object System.Windows.Forms.Label
$lblCopyright.Location = New-Object System.Drawing.Point(12, 500)
$lblCopyright.Size = New-Object System.Drawing.Size(520, 20)
$lblCopyright.Text = "Copyright (c) AllEasy. All rights reserved."
$lblCopyright.AutoSize = $false
$lblCopyright.ForeColor = [System.Drawing.Color]::DimGray
$form.Controls.Add($lblCopyright)

function Get-BaseUrl { return ('http://127.0.0.1:{0}' -f [int]$numPort.Value) }

function Update-UiState {
    param(
        [string]$OverrideMessage = '',
        [System.Drawing.Color]$OverrideColor = [System.Drawing.Color]::Empty
    )

    $info = Get-PythonInfo
    $running = $null -ne $script:ServerProcess -and -not $script:ServerProcess.HasExited

    if ($OverrideMessage) {
        $lblStatus.Text = $OverrideMessage
        $lblStatus.ForeColor = if ($OverrideColor -ne [System.Drawing.Color]::Empty) {
            $OverrideColor
        } else {
            [System.Drawing.Color]::DarkSlateGray
        }
    } elseif ($info) {
        $lblStatus.Text = "Environment: $($info.Source)`nExecutable: $($info.Exe)"
        $lblStatus.ForeColor = [System.Drawing.Color]::DarkGreen
    } else {
        $lblStatus.Text = "Python not found.`nClick 'Download portable Python' (internet required) or install Python 3 manually."
        $lblStatus.ForeColor = [System.Drawing.Color]::DarkOrange
    }

    $btnDownload.Enabled = $true
    if ($running) {
        $btnStop.Enabled = $true
        $btnStart.Enabled = $false
    } else {
        $btnStop.Enabled = $false
        $btnStart.Enabled = ($null -ne $info)
    }
}

function Append-Log([string]$t) {
    $rtf.AppendText("$t`r`n")
    $rtf.ScrollToCaret()
}

function Invoke-Detect {
    $info = Get-PythonInfo
    if (-not $info) {
        Update-UiState
        Append-Log ('[{0}] Python / py not found' -f (Get-Date -Format 'HH:mm:ss'))
        return
    }
    Append-Log ('[{0}] Detected: {1}' -f (Get-Date -Format 'HH:mm:ss'), $info.Source)
    if (Test-PythonHttpServer -Info $info) {
        Update-UiState
        Append-Log ('[{0}] -m http.server available' -f (Get-Date -Format 'HH:mm:ss'))
    } else {
        Update-UiState -OverrideMessage ("Found: $($info.Source)`nBut http.server test failed. Try portable Python download or repair local Python.") `
            -OverrideColor ([System.Drawing.Color]::Firebrick)
        Append-Log ('[{0}] Warning: http.server smoke test failed' -f (Get-Date -Format 'HH:mm:ss'))
    }
}

$btnDetect.Add_Click({ Invoke-Detect })

$btnDownload.Add_Click({
    $btnDownload.Enabled = $false
    $btnStart.Enabled = $false
    [System.Windows.Forms.Application]::DoEvents()
    try {
        Invoke-DownloadEmbed -Log $rtf -Bar $bar
    } finally {
        Invoke-Detect
        $btnDownload.Enabled = $true
    }
})

$btnStart.Add_Click({
    $info = Get-PythonInfo
    if (-not $info) {
        [System.Windows.Forms.MessageBox]::Show('No usable Python found. Download portable Python first or install Python 3.', 'OBS Lyrics') | Out-Null
        return
    }
    $port = [int]$numPort.Value
    $args = $info.Args + @([string]$port)
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $info.Exe
        $psi.Arguments = ($args | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' '
        $psi.WorkingDirectory = $script:Root
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $script:ServerProcess = [System.Diagnostics.Process]::Start($psi)
        Append-Log ('[{0}] Started PID={1} on port {2}' -f (Get-Date -Format 'HH:mm:ss'), $script:ServerProcess.Id, $port)
        Update-UiState
    } catch {
        Append-Log ('[{0}] Start failed: {1}' -f (Get-Date -Format 'HH:mm:ss'), $_.Exception.Message)
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Start failed') | Out-Null
    }
})

$btnStop.Add_Click({
    if ($script:ServerProcess -and -not $script:ServerProcess.HasExited) {
        try {
            Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction Stop
            Append-Log ('[{0}] Server stopped' -f (Get-Date -Format 'HH:mm:ss'))
        } catch {
            Append-Log ('[{0}] Stop error: {1}' -f (Get-Date -Format 'HH:mm:ss'), $_.Exception.Message)
        }
    }
    $script:ServerProcess = $null
    Update-UiState
})

$openUrl = {
    param($path)
    $u = (Get-BaseUrl) + $path
    Start-Process $u
}

$btnOpenCtl.Add_Click({ & $openUrl '/control.html' })
$btnOpenDisp.Add_Click({ & $openUrl '/display.html' })

$btnCopyDisp.Add_Click({
    $u = (Get-BaseUrl) + '/display.html'
    [System.Windows.Forms.Clipboard]::SetText($u)
    Append-Log ('[{0}] Copied: {1}' -f (Get-Date -Format 'HH:mm:ss'), $u)
})

$form.Add_FormClosing({
    param($sender, $e)
    if ($script:ServerProcess -and -not $script:ServerProcess.HasExited) {
        try { Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction SilentlyContinue } catch { }
    }
})

$form.Add_Shown({ Invoke-Detect })

[System.Windows.Forms.Application]::Run($form)
=======
#Requires -Version 5.1
param()

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$script:Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:EmbedDir = Join-Path $script:Root 'runtime\python-embed'
$script:EmbedPython = Join-Path $script:EmbedDir 'python.exe'
$script:EmbedVersion = '3.12.8'
$script:ServerProcess = $null

function Get-EmbedArchTag {
    $pa = [System.Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE')
    if ($pa -eq 'ARM64') { return 'arm64' }
    return 'amd64'
}

function Get-PythonInfo {
    if (Test-Path -LiteralPath $script:EmbedPython) {
        return @{ Exe = $script:EmbedPython; Args = @('-m', 'http.server'); Source = 'plugin runtime\python-embed' }
    }
    $py = Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if ($py) {
        return @{ Exe = $py; Args = @('-m', 'http.server'); Source = "system PATH: $py" }
    }
    $pylauncher = Get-Command py -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if ($pylauncher) {
        return @{ Exe = $pylauncher; Args = @('-3', '-m', 'http.server'); Source = 'Python Launcher (py -3)' }
    }
    return $null
}

function Test-PythonHttpServer {
    param([hashtable]$Info)
    $out = [IO.Path]::GetTempFileName()
    $err = [IO.Path]::GetTempFileName()
    try {
        $argLine = ($Info.Args + @('0')) -join ' '
        $p = Start-Process -FilePath $Info.Exe -ArgumentList $argLine -WorkingDirectory $script:Root `
            -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
        Start-Sleep -Milliseconds 500
        if (-not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            return $true
        }
    } catch { }
    finally {
        Remove-Item -LiteralPath $out, $err -Force -ErrorAction SilentlyContinue
    }
    return $false
}

function Repair-EmbedPth {
    $pthFiles = Get-ChildItem -LiteralPath $script:EmbedDir -Filter '*.pth' -File -ErrorAction SilentlyContinue
    foreach ($f in $pthFiles) {
        $raw = [System.IO.File]::ReadAllText($f.FullName)
        $patched = [regex]::Replace($raw, '(?m)^\s*#\s*import\s+site\s*$', 'import site')
        if ($patched -notmatch '(?m)^import\s+site\s*$') {
            $patched = $patched.TrimEnd() + "`r`nimport site`r`n"
        }
        [System.IO.File]::WriteAllText($f.FullName, $patched, [System.Text.UTF8Encoding]::new($false))
    }
}

function Save-EmbedZip {
    param([string]$ZipPath)
    Expand-Archive -LiteralPath $ZipPath -DestinationPath $script:EmbedDir -Force
    Repair-EmbedPth
}

function Invoke-DownloadEmbed {
    param([System.Windows.Forms.RichTextBox]$Log, [System.Windows.Forms.ProgressBar]$Bar)

    $arch = Get-EmbedArchTag
    $ver = $script:EmbedVersion
    $url = "https://www.python.org/ftp/python/$ver/python-$ver-embed-$arch.zip"
    $zip = Join-Path $script:Root "runtime\python-$ver-embed-$arch.zip"

    $append = { param($t) $Log.AppendText("$t`r`n"); $Log.ScrollToCaret() }

    & $append "Download: $url"
    New-Item -ItemType Directory -Path (Split-Path $script:EmbedDir) -Force -ErrorAction SilentlyContinue | Out-Null

    if (Test-Path -LiteralPath $script:EmbedDir) {
        Remove-Item -LiteralPath $script:EmbedDir -Recurse -Force -ErrorAction Stop
    }
    New-Item -ItemType Directory -Path $script:EmbedDir -Force | Out-Null

    $Bar.Style = [System.Windows.Forms.ProgressBarStyle]::Marquee
    $Bar.Visible = $true
    [System.Windows.Forms.Application]::DoEvents()

    $wc = $null
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $zip)
        & $append 'Saved zip, extracting...'
        Save-EmbedZip -ZipPath $zip
        Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
        & $append 'Extract OK (import site enabled).'
    } catch {
        & $append ('Download failed: ' + $_.Exception.Message)
        $msg = "Download/extract failed.`n`n" + $_.Exception.Message + "`n`nInstall Python 3, or run 启动本地服务-命令行.bat for Node."
        [void][System.Windows.Forms.MessageBox]::Show(
            $msg,
            'OBS Lyrics',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
    } finally {
        if ($null -ne $wc) { $wc.Dispose() }
        $Bar.Style = [System.Windows.Forms.ProgressBarStyle]::Blocks
        $Bar.Visible = $false
    }
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'OBS Lyrics - Local Server'
$form.Size = New-Object System.Drawing.Size(560, 560)
$form.MinimumSize = New-Object System.Drawing.Size(560, 560)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(12, 12)
$lblStatus.Size = New-Object System.Drawing.Size(520, 44)
$lblStatus.AutoSize = $false
$form.Controls.Add($lblStatus)

$numPort = New-Object System.Windows.Forms.NumericUpDown
$numPort.AutoSize = $true
$numPort.Location = New-Object System.Drawing.Point(12, 60)
$numPort.Width = 108
$numPort.TextAlign = [System.Windows.Forms.HorizontalAlignment]::Center
$numPort.ThousandsSeparator = $false
$numPort.Minimum = 1024
$numPort.Maximum = 65535
$numPort.Value = 8765
$form.Controls.Add($numPort)

$btnDetect = New-Object System.Windows.Forms.Button
$btnDetect.Location = New-Object System.Drawing.Point(170, 58)
$btnDetect.Size = New-Object System.Drawing.Size(120, 28)
$btnDetect.Text = 'Re-detect'
$form.Controls.Add($btnDetect)

$btnDownload = New-Object System.Windows.Forms.Button
$btnDownload.Location = New-Object System.Drawing.Point(300, 58)
$btnDownload.Size = New-Object System.Drawing.Size(200, 28)
$btnDownload.Text = 'Download portable Python'
$form.Controls.Add($btnDownload)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Location = New-Object System.Drawing.Point(12, 100)
$btnStart.Size = New-Object System.Drawing.Size(120, 32)
$btnStart.Text = 'Start server'
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Location = New-Object System.Drawing.Point(142, 100)
$btnStop.Size = New-Object System.Drawing.Size(120, 32)
$btnStop.Text = 'Stop server'
$btnStop.Enabled = $false
$form.Controls.Add($btnStop)

$btnOpenCtl = New-Object System.Windows.Forms.Button
$btnOpenCtl.Location = New-Object System.Drawing.Point(272, 100)
$btnOpenCtl.Size = New-Object System.Drawing.Size(120, 32)
$btnOpenCtl.Text = 'Open control'
$form.Controls.Add($btnOpenCtl)

$btnOpenDisp = New-Object System.Windows.Forms.Button
$btnOpenDisp.Location = New-Object System.Drawing.Point(402, 100)
$btnOpenDisp.Size = New-Object System.Drawing.Size(130, 32)
$btnOpenDisp.Text = 'Open display'
$form.Controls.Add($btnOpenDisp)

$btnCopyDisp = New-Object System.Windows.Forms.Button
$btnCopyDisp.Location = New-Object System.Drawing.Point(12, 140)
$btnCopyDisp.Size = New-Object System.Drawing.Size(160, 28)
$btnCopyDisp.Text = 'Copy display URL'
$form.Controls.Add($btnCopyDisp)

$rtf = New-Object System.Windows.Forms.RichTextBox
$rtf.Location = New-Object System.Drawing.Point(12, 178)
$rtf.Size = New-Object System.Drawing.Size(520, 220)
$rtf.ReadOnly = $true
$rtf.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$rtf.DetectUrls = $true
$form.Controls.Add($rtf)

$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(12, 408)
$bar.Size = New-Object System.Drawing.Size(520, 18)
$bar.Visible = $false
$form.Controls.Add($bar)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Location = New-Object System.Drawing.Point(12, 432)
$lblHint.Size = New-Object System.Drawing.Size(520, 34)
$lblHint.Text = "OBS Browser Source URL: http://127.0.0.1:PORT/display.html`nClosing this window will stop the background server."
$lblHint.AutoSize = $false
$form.Controls.Add($lblHint)

$lblCopyright = New-Object System.Windows.Forms.Label
$lblCopyright.Location = New-Object System.Drawing.Point(12, 500)
$lblCopyright.Size = New-Object System.Drawing.Size(520, 20)
$lblCopyright.Text = "Copyright (c) AllEasy. All rights reserved."
$lblCopyright.AutoSize = $false
$lblCopyright.ForeColor = [System.Drawing.Color]::DimGray
$form.Controls.Add($lblCopyright)

function Get-BaseUrl { return ('http://127.0.0.1:{0}' -f [int]$numPort.Value) }

function Update-UiState {
    param(
        [string]$OverrideMessage = '',
        [System.Drawing.Color]$OverrideColor = [System.Drawing.Color]::Empty
    )

    $info = Get-PythonInfo
    $running = $null -ne $script:ServerProcess -and -not $script:ServerProcess.HasExited

    if ($OverrideMessage) {
        $lblStatus.Text = $OverrideMessage
        $lblStatus.ForeColor = if ($OverrideColor -ne [System.Drawing.Color]::Empty) {
            $OverrideColor
        } else {
            [System.Drawing.Color]::DarkSlateGray
        }
    } elseif ($info) {
        $lblStatus.Text = "Environment: $($info.Source)`nExecutable: $($info.Exe)"
        $lblStatus.ForeColor = [System.Drawing.Color]::DarkGreen
    } else {
        $lblStatus.Text = "Python not found.`nClick 'Download portable Python' (internet required) or install Python 3 manually."
        $lblStatus.ForeColor = [System.Drawing.Color]::DarkOrange
    }

    $btnDownload.Enabled = $true
    if ($running) {
        $btnStop.Enabled = $true
        $btnStart.Enabled = $false
    } else {
        $btnStop.Enabled = $false
        $btnStart.Enabled = ($null -ne $info)
    }
}

function Append-Log([string]$t) {
    $rtf.AppendText("$t`r`n")
    $rtf.ScrollToCaret()
}

function Invoke-Detect {
    $info = Get-PythonInfo
    if (-not $info) {
        Update-UiState
        Append-Log ('[{0}] Python / py not found' -f (Get-Date -Format 'HH:mm:ss'))
        return
    }
    Append-Log ('[{0}] Detected: {1}' -f (Get-Date -Format 'HH:mm:ss'), $info.Source)
    if (Test-PythonHttpServer -Info $info) {
        Update-UiState
        Append-Log ('[{0}] -m http.server available' -f (Get-Date -Format 'HH:mm:ss'))
    } else {
        Update-UiState -OverrideMessage ("Found: $($info.Source)`nBut http.server test failed. Try portable Python download or repair local Python.") `
            -OverrideColor ([System.Drawing.Color]::Firebrick)
        Append-Log ('[{0}] Warning: http.server smoke test failed' -f (Get-Date -Format 'HH:mm:ss'))
    }
}

$btnDetect.Add_Click({ Invoke-Detect })

$btnDownload.Add_Click({
    $btnDownload.Enabled = $false
    $btnStart.Enabled = $false
    [System.Windows.Forms.Application]::DoEvents()
    try {
        Invoke-DownloadEmbed -Log $rtf -Bar $bar
    } finally {
        Invoke-Detect
        $btnDownload.Enabled = $true
    }
})

$btnStart.Add_Click({
    $info = Get-PythonInfo
    if (-not $info) {
        [System.Windows.Forms.MessageBox]::Show('No usable Python found. Download portable Python first or install Python 3.', 'OBS Lyrics') | Out-Null
        return
    }
    $port = [int]$numPort.Value
    $args = $info.Args + @([string]$port)
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $info.Exe
        $psi.Arguments = ($args | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' '
        $psi.WorkingDirectory = $script:Root
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $script:ServerProcess = [System.Diagnostics.Process]::Start($psi)
        Append-Log ('[{0}] Started PID={1} on port {2}' -f (Get-Date -Format 'HH:mm:ss'), $script:ServerProcess.Id, $port)
        Update-UiState
    } catch {
        Append-Log ('[{0}] Start failed: {1}' -f (Get-Date -Format 'HH:mm:ss'), $_.Exception.Message)
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Start failed') | Out-Null
    }
})

$btnStop.Add_Click({
    if ($script:ServerProcess -and -not $script:ServerProcess.HasExited) {
        try {
            Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction Stop
            Append-Log ('[{0}] Server stopped' -f (Get-Date -Format 'HH:mm:ss'))
        } catch {
            Append-Log ('[{0}] Stop error: {1}' -f (Get-Date -Format 'HH:mm:ss'), $_.Exception.Message)
        }
    }
    $script:ServerProcess = $null
    Update-UiState
})

$openUrl = {
    param($path)
    $u = (Get-BaseUrl) + $path
    Start-Process $u
}

$btnOpenCtl.Add_Click({ & $openUrl '/control.html' })
$btnOpenDisp.Add_Click({ & $openUrl '/display.html' })

$btnCopyDisp.Add_Click({
    $u = (Get-BaseUrl) + '/display.html'
    [System.Windows.Forms.Clipboard]::SetText($u)
    Append-Log ('[{0}] Copied: {1}' -f (Get-Date -Format 'HH:mm:ss'), $u)
})

$form.Add_FormClosing({
    param($sender, $e)
    if ($script:ServerProcess -and -not $script:ServerProcess.HasExited) {
        try { Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction SilentlyContinue } catch { }
    }
})

$form.Add_Shown({ Invoke-Detect })

[System.Windows.Forms.Application]::Run($form)
>>>>>>> ce06bf7e3ef514af1e39fdb9769e4f30278f895d
