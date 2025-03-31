# Open Factory Assistant Setup Script for Windows
# This script helps set up the environment for the Open Factory Assistant project

Write-Host "Welcome to Open Factory Assistant Setup " -ForegroundColor Green
Write-Host "This script will help you configure your environment." -ForegroundColor Green
Write-Host ""

# Function to prompt for configuration values
function Get-UserConfig {
    param (
        [string]$prompt,
        [string]$default
    )
    $input = Read-Host "$prompt (default: $default)"
    if ([string]::IsNullOrWhiteSpace($input)) {
        return $default
    }
    return $input
}

# Create environment files if they don't exist
$repoRoot = Resolve-Path ".."
$components = @("backend", "frontend", "scanner")
foreach ($component in $components) {
    $componentPath = Join-Path $repoRoot $component
    
    # Create component directory if it doesn't exist
    if (!(Test-Path $componentPath)) {
        New-Item -ItemType Directory -Path $componentPath -Force | Out-Null
        Write-Host "Created directory for $component" -ForegroundColor Green
    }
    
    $envFile = Join-Path $componentPath ".env"
    $envExampleFile = Join-Path $componentPath ".env.example"
    
    # Create empty .env file if .env.example doesn't exist
    if (!(Test-Path $envExampleFile)) {
        New-Item -ItemType File -Path $envFile -Force | Out-Null
        Write-Host "Created empty .env file for $component" -ForegroundColor Green
    }
    # Copy .env.example to .env if it exists and .env doesn't
    elseif (!(Test-Path $envFile)) {
        Copy-Item $envExampleFile $envFile
        Write-Host "Created .env file from example for $component" -ForegroundColor Green
    }
}

# Check Python installation
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " Python is not installed! Please install Python and try again." -ForegroundColor Red
    exit 1
}
Write-Host " Found Python: $pythonVersion" -ForegroundColor Green

# Check Node.js installation
Write-Host "`nChecking Node.js installation ..." -ForegroundColor Cyan
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " Node.js is not installed! Please install Node.js and try again." -ForegroundColor Red
    exit 1
}
Write-Host " Found Node.js: $nodeVersion" -ForegroundColor Green

# Check npm installation
$npmVersion = npm --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " npm is not installed! Please install npm and try again." -ForegroundColor Red
    exit 1
}
Write-Host " Found npm: $npmVersion" -ForegroundColor Green

# Setup Python virtual environment
Write-Host "`nSetting up Python virtual environment ..." -ForegroundColor Cyan
$venvName = Get-UserConfig "Enter virtual environment name" "venv"
$venvPath = Join-Path $repoRoot $venvName

if (Test-Path $venvPath) {
    Write-Host "Virtual environment '$venvName' already exists." -ForegroundColor Yellow
} else {
    python -m venv $venvPath
    Write-Host "Created virtual environment: $venvName" -ForegroundColor Green
}

# Activate virtual environment and install requirements
Write-Host "`nInstalling Python requirements..." -ForegroundColor Cyan
$activateScript = Join-Path $venvPath "Scripts\activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
    $requirementsFile = Join-Path $repoRoot "backend\requirements.txt"
    if (Test-Path $requirementsFile) {
        pip install -r $requirementsFile
        Write-Host " Installed Python requirements" -ForegroundColor Green
    } else {
        Write-Host " Could not find requirements.txt" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host " Could not activate virtual environment" -ForegroundColor Red
    exit 1
}

# Configure Backend
Write-Host "`nConfiguring Backend ..." -ForegroundColor Cyan
$localip = Get-UserConfig "Enter local IP address" "localhost"
$backendPort = Get-UserConfig "Enter backend port" "8000"
$secretKey = -join ((65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
$certKey = Get-UserConfig "Enter certificate key file name" "localhost-key.pem"
$certCert = Get-UserConfig "Enter certificate cert file name" "localhost.pem"

$corsOrigins = "https://localhost:3001,https://localhost:3000,https://$localip`:3001,https://$localip`:3000"

$backendEnv = @"
BACKEND_PORT=$backendPort
SECRET_KEY=$secretKey
ACCESS_TOKEN_EXPIRE_MINUTES=600
HOST=$localip
ADDITIONAL_HOSTS=$localip
CORS_ORIGINS=$corsOrigins
CERT_KEY=$certKey
CERT_CERT=$certCert
"@

$backendPath = Join-Path $repoRoot "backend"
$backendEnvPath = Join-Path $backendPath ".env"
Set-Content $backendEnvPath $backendEnv

# Configure Frontend
Write-Host "`nConfiguring Frontend ..." -ForegroundColor Cyan

$frontendEnv = @"
VITE_API_URL=https://$localip`:$backendPort
SSL_KEY=$certKey`.pem
SSL_CERT=$certCert`.pem
"@

$frontendPath = Join-Path $repoRoot "frontend"
$frontendEnvPath = Join-Path $frontendPath ".env"
Set-Content $frontendEnvPath $frontendEnv

# Configure Scanner
Write-Host "`nConfiguring Scanner ..." -ForegroundColor Cyan

$scannerEnv = @"
VITE_API_URL=https://$localip`:$backendPort
SSL_KEY=$certKey`.pem
SSL_CERT=$certCert`.pem
"@

$scannerPath = Join-Path $repoRoot "scanner"
$scannerEnvPath = Join-Path $scannerPath ".env"
Set-Content $scannerEnvPath $scannerEnv

Write-Host "`nConfiguration complete! " -ForegroundColor Green

# Function to handle npm installation
function Install-NpmDependencies {
    param (
        [string]$componentName,
        [string]$componentPath
    )
    Write-Host "`nChecking $componentName dependencies..." -ForegroundColor Cyan
    
    # Check if package.json exists
    $packageJson = Join-Path $componentPath "package.json"
    if (!(Test-Path $packageJson)) {
        Write-Host " Could not find package.json in $componentName directory!" -ForegroundColor Red
        return $false
    }

    # Try to install dependencies
    Write-Host "Installing $componentName dependencies..." -ForegroundColor Cyan
    Push-Location $componentPath
    $installOutput = npm install --force 2>&1
    $npmExitCode = $LASTEXITCODE
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Failed to install $componentName dependencies:" -ForegroundColor Red
        Write-Host $installOutput -ForegroundColor Red
        return $false
    }
    
    Write-Host " Successfully installed $componentName dependencies" -ForegroundColor Green
    return $true
}

# Function to start a new terminal window with a command
function Start-NewTerminal {
    param (
        [string]$title,
        [string]$command,
        [string]$workingDir
    )
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workingDir'; Write-Host 'Starting $title...' -ForegroundColor Cyan; $command"
}

# Function to wait for backend to be ready
function Wait-ForBackend {
    param (
        [string]$url,
        [int]$timeoutSeconds = 60
    )
    Write-Host "`nWaiting for backend to start..." -ForegroundColor Cyan
    $start = Get-Date
    $ready = $false

    # Parse the port from the URL
    $uri = [System.Uri]$url
    $port = $uri.Port
    $computerName = $uri.Host
    if ($computerName -eq 'localhost') {
        $computerName = '127.0.0.1'
    }

    while (-not $ready -and ((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
        try {
            $result = Test-NetConnection -ComputerName $computerName -Port $port -WarningAction SilentlyContinue
            if ($result.TcpTestSucceeded) {
                $ready = $true
                Write-Host " Backend port is open and responding!" -ForegroundColor Green
                # Give it a moment to fully initialize
                Start-Sleep -Seconds 2
            }
        } catch {
            Write-Host " Waiting for backend port $port to open..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }

    if (-not $ready) {
        Write-Host " Backend did not start within $timeoutSeconds seconds!" -ForegroundColor Red
        return $false
    }
    return $true
}

# Function to create initial user
function New-InitialUser {
    param (
        [string]$backendUrl
    )
    Write-Host "`nLet's create your initial user " -ForegroundColor Cyan
    $username = Read-Host "Enter username"
    $email = Read-Host "Enter email"
    $password = Read-Host "Enter password" -AsSecureString
    $password2 = Read-Host "Confirm password" -AsSecureString

    $passwordText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    $password2Text = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password2))

    if ($passwordText -ne $password2Text) {
        Write-Host " Passwords do not match!" -ForegroundColor Red
        return $false
    }

    $body = @{
        username = $username
        email = $email
        password = $passwordText
    } | ConvertTo-Json

    # Configure SSL/TLS to accept all certificates
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    Add-Type @"
    using System.Net;
    using System.Security.Cryptography.X509Certificates;
    public class TrustAllCertsPolicy : ICertificatePolicy {
        public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) {
            return true;
        }
    }
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy

    try {
        $response = Invoke-WebRequest -Uri "$backendUrl/users/register" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
        if ($response.StatusCode -eq 201 -or $response.StatusCode -eq 200) {
            Write-Host " User created successfully!" -ForegroundColor Green
            Write-Host "You can now log in with your username and password." -ForegroundColor Green
            return $true
        } else {
            Write-Host " Unexpected status code: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host " Failed to create user: $($errorDetails.detail)" -ForegroundColor Red
        } else {
            Write-Host " Failed to create user: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
    return $false
}

# Ask if user wants to start the services
$startServices = Read-Host "`nWould you like to start all services now? (y/n)"
if ($startServices -eq 'y') {
    $repoRoot = Resolve-Path ".."
    $success = $true
    
    # Install Frontend dependencies
    if (!(Install-NpmDependencies "Frontend" (Join-Path $repoRoot "frontend"))) {
        Write-Host " Frontend dependencies installation failed. Services may not start correctly." -ForegroundColor Yellow
        $success = $false
    }
    
    # Install Scanner dependencies
    if (!(Install-NpmDependencies "Scanner" (Join-Path $repoRoot "scanner"))) {
        Write-Host " Scanner dependencies installation failed. Services may not start correctly." -ForegroundColor Yellow
        $success = $false
    }
    
    if (!$success) {
        $continue = Read-Host "Some installations failed. Would you like to continue starting the services anyway? (y/n)"
        if ($continue -ne 'y') {
            Write-Host "Setup aborted. Please fix the installation issues and try again." -ForegroundColor Red
            exit 1
        }
    }
    
    # Start Backend
    Start-NewTerminal -title "Backend" -command ". '$activateScript'; python run.py" -workingDir (Join-Path $repoRoot "backend")
    
    # Wait for backend to start and create initial user
    $backendUrl = "https://$localip`:$backendPort"
    if (Wait-ForBackend -url "$backendUrl/docs") {
        $createUser = Read-Host "`nWould you like to create a user now? (y/n)"
        if ($createUser -eq 'y') {
            while (!(New-InitialUser -backendUrl $backendUrl)) {
                $retry = Read-Host "Would you like to try creating a user again? (y/n)"
                if ($retry -ne 'y') {
                    break
                }
            }
        }
    } else {
        Write-Host " Could not verify backend is running. Skipping user creation." -ForegroundColor Yellow
    }
    
    # Start Frontend
    Start-NewTerminal -title "Frontend" -command "npm run dev:host" -workingDir (Join-Path $repoRoot "frontend")
    
    # Start Scanner
    Start-NewTerminal -title "Scanner" -command "npm run dev:host" -workingDir (Join-Path $repoRoot "scanner")
    
    Write-Host "All services have been started in separate windows! " -ForegroundColor Green
}

Write-Host "`nSetup complete!  Thank you for using Open Factory Assistant!" -ForegroundColor Green
