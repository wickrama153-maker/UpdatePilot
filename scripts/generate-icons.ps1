# Generate high-resolution icons and multi-resolution Windows ICO for UpdatePilot
Add-Type -AssemblyName System.Drawing

$outputDir = Resolve-Path (Join-Path $PSScriptRoot "..\assets")
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

function Draw-UpdatePilotIcon([int]$size) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [float]$size / 256.0

    # Draw rounded dark background badge (squircle)
    $margin = [float](14.0 * $scale)
    $w = [float]($size - 2.0 * $margin)
    $h = [float]($size - 2.0 * $margin)
    $radius = [float](50.0 * $scale)

    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($margin, $margin, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($margin + $w - $radius * 2, $margin, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($margin + $w - $radius * 2, $margin + $h - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc($margin, $margin + $h - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()

    # Fill background with sleek dark navy gradient
    $pt1 = [System.Drawing.PointF]::new(0.0, 0.0)
    $pt2 = [System.Drawing.PointF]::new([float]$size, [float]$size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 11, 17, 32) # #0b1120
    $c2 = [System.Drawing.Color]::FromArgb(255, 30, 41, 59) # #1e293b
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($pt1, $pt2, $c1, $c2)
    $g.FillPath($bgBrush, $path)

    # Subtle cyan border
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 56, 189, 248), [float](3.5 * $scale))
    $g.DrawPath($borderPen, $path)

    # Orbital sync ring (update loop)
    $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 14, 165, 233), [float](7.0 * $scale))
    $ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ringMargin = [float](42.0 * $scale)
    $ringSize = [float]($size - 2.0 * $ringMargin)
    $g.DrawArc($ringPen, $ringMargin, $ringMargin, $ringSize, $ringSize, 125, 260)

    # Pilot delta wing / arrow in the center
    $p1 = [System.Drawing.PointF]::new([float](128.0 * $scale), [float](64.0 * $scale))
    $p2 = [System.Drawing.PointF]::new([float](192.0 * $scale), [float](184.0 * $scale))
    $p3 = [System.Drawing.PointF]::new([float](128.0 * $scale), [float](156.0 * $scale))
    $p4 = [System.Drawing.PointF]::new([float](64.0 * $scale), [float](184.0 * $scale))
    [System.Drawing.PointF[]]$deltaPoints = @($p1, $p2, $p3, $p4)

    $deltaPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $deltaPath.AddPolygon($deltaPoints)

    # Gradient fill for delta wing: bright blue to cyan
    $wPt1 = [System.Drawing.PointF]::new([float](64.0 * $scale), [float](64.0 * $scale))
    $wPt2 = [System.Drawing.PointF]::new([float](192.0 * $scale), [float](184.0 * $scale))
    $wc1 = [System.Drawing.Color]::FromArgb(255, 37, 99, 235) # #2563eb
    $wc2 = [System.Drawing.Color]::FromArgb(255, 6, 182, 212) # #06b6d4
    $wingBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($wPt1, $wPt2, $wc1, $wc2)
    $g.FillPath($wingBrush, $deltaPath)

    # Center ridge: white to sky blue
    $ridgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(240, 255, 255, 255), [float](3.5 * $scale))
    $ridgePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ridgePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($ridgePen, [float](128.0 * $scale), [float](72.0 * $scale), [float](128.0 * $scale), [float](150.0 * $scale))

    # Emerald verified indicator dot
    $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 16, 185, 129)) # #10b981
    $dotX = [float](176.0 * $scale)
    $dotY = [float](68.0 * $scale)
    $dotSize = [float](18.0 * $scale)
    $g.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

    $dotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 52, 211, 153), [float](2.0 * $scale))
    $g.DrawEllipse($dotPen, $dotX, $dotY, $dotSize, $dotSize)

    # Cleanup
    $dotBrush.Dispose()
    $dotPen.Dispose()
    $ridgePen.Dispose()
    $wingBrush.Dispose()
    $deltaPath.Dispose()
    $ringPen.Dispose()
    $borderPen.Dispose()
    $bgBrush.Dispose()
    $path.Dispose()
    $g.Dispose()

    return $bmp
}

# Generate PNGs of standard sizes
$sizes = @(16, 32, 48, 64, 128, 256)
$pngFiles = @{}

foreach ($s in $sizes) {
    $bmp = Draw-UpdatePilotIcon -size $s
    $dest = Join-Path $outputDir "icon-$s.png"
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngFiles[$s] = $dest
    Write-Host "Generated: $dest"
}

# Copy 256x256 as default icon.png
Copy-Item $pngFiles[256] (Join-Path $outputDir "icon.png") -Force

# Create Multi-Resolution Windows ICO
$icoPath = Join-Path $outputDir "icon.ico"
$icoSizes = @(16, 32, 48, 256) # Standard Windows icon sizes required by prompt
$fs = [System.IO.File]::Create($icoPath)
$bw = [System.IO.BinaryWriter]::new($fs)

$count = $icoSizes.Length
# ICONDIR
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type (1 = ICO)
$bw.Write([uint16]$count) # Image count

$pngBytesList = @()
foreach ($s in $icoSizes) {
    $bytes = [System.IO.File]::ReadAllBytes($pngFiles[$s])
    $pngBytesList += ,$bytes
}

$offset = 6 + ($count * 16)

for ($i = 0; $i -lt $count; $i++) {
    $s = $icoSizes[$i]
    $bWidth = if ($s -ge 256) { 0 } else { [byte]$s }
    $bHeight = if ($s -ge 256) { 0 } else { [byte]$s }
    $bytes = $pngBytesList[$i]

    $bw.Write([byte]$bWidth)
    $bw.Write([byte]$bHeight)
    $bw.Write([byte]0) # Color count
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Planes
    $bw.Write([uint16]32) # Bit count
    $bw.Write([uint32]$bytes.Length) # Image bytes
    $bw.Write([uint32]$offset) # Offset

    $offset += $bytes.Length
}

for ($i = 0; $i -lt $count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$fs.Close()

Write-Host "Successfully generated Windows Multi-Resolution ICO: $icoPath"
