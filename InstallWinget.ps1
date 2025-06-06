#Requires -RunAsAdministrator

# Set error action preference to continue silently
$ErrorActionPreference = 'SilentlyContinue'

# Function to check if a command exists
function Test-Command {
    param ($Command)
    return Get-Command -Name $Command -ErrorAction SilentlyContinue
}

# Install NuGet package provider silently
try {
    Install-PackageProvider -Name NuGet -Force -Confirm:$false -Scope AllUsers
} catch {
    exit 1
}

# Set PSGallery as trusted repository
Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -Confirm:$false

# Install winget-install script
try {
    Install-Script -Name winget-install -Force -Confirm:$false
} catch {
    exit 1
}

# Run winget-install script silently
try {
    winget-install -Force -AcceptAll
} catch {
    exit 1
}