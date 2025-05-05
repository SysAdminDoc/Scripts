
Write-Host "--------------------------------------" -ForegroundColor Cyan
Write-Host "Import Wi-Fi Profile" -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan

# Add Wi-Fi profile
# Define paths# Define Wi-Fi profile path in TEMP folder
$tempPath = $env:TEMP
$wifiProfilePath = Join-Path $tempPath "Wi-Fi-Maven_Imaging.xml"

# Define XML content
$xmlContent = @"
<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
    <name>Maven_Imaging</name>
    <SSIDConfig>
        <SSID>
            <hex>4D6176656E5F496D6167696E67</hex>
            <name>DR Tech</name>
        </SSID>
    </SSIDConfig>
    <connectionType>ESS</connectionType>
    <connectionMode>auto</connectionMode>
    <MSM>
        <security>
            <authEncryption>
                <authentication>WPA2PSK</authentication>
                <encryption>AES</encryption>
                <useOneX>false</useOneX>
            </authEncryption>
            <sharedKey>
                <keyType>passPhrase</keyType>
                <protected>false</protected>
                <keyMaterial>123456789</keyMaterial>
            </sharedKey>
        </security>
    </MSM>
    <MacRandomization xmlns="http://www.microsoft.com/networking/WLAN/profile/v3">
        <enableRandomization>false</enableRandomization>
        <randomizationSeed>1760936803</randomizationSeed>
    </MacRandomization>
</WLANProfile>
"@

# Create the XML file
$xmlContent | Out-File -FilePath $wifiProfilePath -Encoding UTF8 -Force

# Import the Wi-Fi profile
if (Test-Path $wifiProfilePath) {
    netsh wlan add profile filename="$wifiProfilePath" user=all | Out-Null
    Remove-Item -Path $wifiProfilePath -Force
}
