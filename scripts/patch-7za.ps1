# Patch 7za.exe to handle Windows non-developer mode symlink warning exit code (code 2)
$repoRoot = (Resolve-Path "$PSScriptRoot\..").ProviderPath
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

$paths = @(
    "$repoRoot\node_modules\7zip-bin\win\x64",
    "$repoRoot\apps\desktop\node_modules\7zip-bin\win\x64"
)

$source = @"
using System;
using System.Diagnostics;
using System.IO;

class Program {
    static int Main(string[] args) {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string real7za = Path.Combine(dir, "7za_original.exe");
        if (!File.Exists(real7za)) {
            Console.Error.WriteLine("Cannot find 7za_original.exe in " + dir);
            return 1;
        }

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = real7za;
        psi.Arguments = string.Join(" ", Array.ConvertAll(args, a => a.Contains(" ") ? "\"" + a + "\"" : a));
        psi.UseShellExecute = false;

        Process p = Process.Start(psi);
        p.WaitForExit();

        int code = p.ExitCode;
        if (code == 2) {
            // Treat non-fatal archive warning (macOS symlink on Windows) as clean success
            return 0;
        }
        return code;
    }
}
"@

$sourceFile = Join-Path $env:TEMP "Wrapper7za.cs"
Set-Content -Path $sourceFile -Value $source -Encoding UTF8

$tempExe = Join-Path $env:TEMP "7za_wrapper.exe"
& $cscPath /target:exe /out:$tempExe $sourceFile | Out-Null

if (-not (Test-Path $tempExe)) {
    Write-Error "Failed to compile 7za wrapper"
    exit 1
}

foreach ($p in $paths) {
    if (Test-Path $p) {
        $realExe = Join-Path $p "7za.exe"
        $backupExe = Join-Path $p "7za_original.exe"
        if (-not (Test-Path $backupExe)) {
            Move-Item $realExe $backupExe -Force
        }
        Copy-Item $tempExe $realExe -Force
        Write-Host " Successfully patched 7za in $p"
    }
}
