$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

$configPath = Join-Path $PSScriptRoot ".env.kiwoom.local"

if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw "Config file not found: $configPath"
}

$config = @{}

foreach ($line in Get-Content -LiteralPath $configPath) {
    $trimmedLine = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmedLine) -or $trimmedLine.StartsWith("#")) {
        continue
    }

    $parts = $trimmedLine.Split(@("="), 2, [System.StringSplitOptions]::None)
    if ($parts.Count -ne 2) {
        throw "Invalid config line in ${configPath}: $line"
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    $config[$name] = $value
}

$kiwoomAppKey = $config["KIWOOM_APP_KEY"]
$kiwoomSecretKey = $config["KIWOOM_SECRET_KEY"]
$kiwoomEnvironment = $config["KIWOOM_ENV"]
$kiwoomStockCodes = $config["KIWOOM_STOCK_CODES"]
$kiwoomWsSeconds = $config["KIWOOM_WS_SECONDS"]

if ([string]::IsNullOrWhiteSpace($kiwoomAppKey)) {
    throw "KIWOOM_APP_KEY is required in $configPath"
}

if ([string]::IsNullOrWhiteSpace($kiwoomSecretKey)) {
    throw "KIWOOM_SECRET_KEY is required in $configPath"
}

if ([string]::IsNullOrWhiteSpace($kiwoomEnvironment)) {
    $kiwoomEnvironment = "real"
}

if ($kiwoomEnvironment -notin @("real", "mock")) {
    throw "KIWOOM_ENV must be real or mock in $configPath"
}

if ([string]::IsNullOrWhiteSpace($kiwoomStockCodes)) {
    $kiwoomStockCodes = "005930"
}

if ([string]::IsNullOrWhiteSpace($kiwoomWsSeconds)) {
    $kiwoomWsSeconds = "20"
}

try {
    $env:KIWOOM_APP_KEY = $kiwoomAppKey
    $env:KIWOOM_SECRET_KEY = $kiwoomSecretKey
    $env:KIWOOM_ENV = $kiwoomEnvironment
    $env:KIWOOM_STOCK_CODES = $kiwoomStockCodes
    $env:KIWOOM_WS_SECONDS = $kiwoomWsSeconds

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $nodeOutput = @(node "$PSScriptRoot\kiwoom-api-smoke-test.mjs" 2>&1)
        $nodeExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    $normalizedNodeOutput = @($nodeOutput | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) {
            $_.Exception.Message
        }
        else {
            $_.ToString()
        }
    })

    foreach ($outputLine in $normalizedNodeOutput) {
        Write-Host $outputLine
    }

    if ($nodeExitCode -ne 0) {
        $nodeErrorText = $normalizedNodeOutput -join [Environment]::NewLine
        throw "Kiwoom API test failed.$([Environment]::NewLine)$nodeErrorText"
    }
}
finally {
    Remove-Item Env:KIWOOM_APP_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:KIWOOM_SECRET_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:KIWOOM_ENV -ErrorAction SilentlyContinue
    Remove-Item Env:KIWOOM_STOCK_CODES -ErrorAction SilentlyContinue
    Remove-Item Env:KIWOOM_WS_SECONDS -ErrorAction SilentlyContinue

    $kiwoomAppKey = $null
    $kiwoomSecretKey = $null
}
