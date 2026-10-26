param([string]$Dir, [string]$Out, [string]$Filtro = "*.png")
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($task, $type) { $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($task)); $t.Wait(-1) | Out-Null; $t.Result }
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$res = @{}
Get-ChildItem -LiteralPath $Dir -Filter $Filtro | Sort-Object Name | ForEach-Object {
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($_.FullName)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bmp = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $r = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
  $linhas = @()
  foreach ($l in $r.Lines) {
    $x0 = 1e9; $y0 = 1e9; $x1 = 0; $y1 = 0
    foreach ($w in $l.Words) { $b = $w.BoundingRect; if ($b.X -lt $x0) { $x0 = $b.X }; if ($b.Y -lt $y0) { $y0 = $b.Y }; if ($b.X + $b.Width -gt $x1) { $x1 = $b.X + $b.Width }; if ($b.Y + $b.Height -gt $y1) { $y1 = $b.Y + $b.Height } }
    $linhas += @{ t = $l.Text; x = [int]$x0; y = [int]$y0; w = [int]($x1 - $x0); h = [int]($y1 - $y0) }
  }
  $stream.Dispose()
  $res[$_.BaseName] = $linhas
}
[System.IO.File]::WriteAllText($Out, ($res | ConvertTo-Json -Depth 5 -Compress), (New-Object System.Text.UTF8Encoding($false)))
"ok " + $res.Count
