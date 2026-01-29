<#
.SYNOPSIS
    Maven Hosts File Ad/Telemetry Blocker
    
.DESCRIPTION
    Adds ad and telemetry blocking entries to the Windows hosts file.
    Can be run standalone or called from MavenNewPC utility.
    
.NOTES
    GitHub: https://github.com/maveninnovationllc/MavenNewPC
    
    When run standalone, execute as Administrator.
    When called from MavenNewPC, runs automatically during System Tweaks.
#>

# Check if already applied
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsMarker = "# === MAVEN AD/TELEMETRY BLOCK"

try {
    $currentHosts = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue
    
    if ($currentHosts -like "*$hostsMarker*") {
        # Already applied - silent exit when called remotely
        if ($MyInvocation.InvocationName -eq '&') {
            # Called via Invoke-Expression, stay silent
        } else {
            Write-Host "Maven hosts block already applied!" -ForegroundColor Yellow
        }
        return
    }
} catch {
    return
}

$hostsEntries = @"

# === MAVEN AD/TELEMETRY BLOCK [SAFE VERSION] ===
# Applied by MavenNewPC Utility - https://github.com/maveninnovationllc/MavenNewPC
# [1] GENERAL AD NETWORKS & TRACKING
0.0.0.0 ad.doubleclick.net
0.0.0.0 doubleclick.net
0.0.0.0 googleadservices.com
0.0.0.0 www.googleadservices.com
0.0.0.0 googlesyndication.com
0.0.0.0 www.googlesyndication.com
0.0.0.0 adservices.google.com
0.0.0.0 google-analytics.com
0.0.0.0 ssl.google-analytics.com
0.0.0.0 analytics.google.com
0.0.0.0 scorecardresearch.com
0.0.0.0 connect.facebook.net
0.0.0.0 creative.ak.fbcdn.net
0.0.0.0 ad.facebook.com
0.0.0.0 gateway.facebook.com
0.0.0.0 adnxs.com
0.0.0.0 ads.yahoo.com
0.0.0.0 ads.bing.com
0.0.0.0 c.amazon-adsystem.com
# [2] MICROSOFT TELEMETRY (PURE DATA COLLECTION)
0.0.0.0 mobile.events.data.microsoft.com
0.0.0.0 functional.events.data.microsoft.com
0.0.0.0 self.events.data.microsoft.com
0.0.0.0 v10.events.data.microsoft.com
0.0.0.0 v20.events.data.microsoft.com
0.0.0.0 watson.events.data.microsoft.com
0.0.0.0 settings-win.data.microsoft.com
0.0.0.0 js.monitor.azure.com
0.0.0.0 browser-intake-datadoghq.com
0.0.0.0 http-intake.logs.datadoghq.com
0.0.0.0 tm-sdk.platinumai.net
# [3] MICROSOFT EDGE SPECIFIC TELEMETRY
0.0.0.0 msedge.api.cdp.microsoft.com
0.0.0.0 msedge.b.tlu.dl.delivery.mp.microsoft.com
0.0.0.0 data-edge.smartscreen.microsoft.com
0.0.0.0 telem-edge.smartscreen.microsoft.com
0.0.0.0 config.edge.skype.com
# [4] BING, MSN & WINDOWS ADS
0.0.0.0 bing.net
0.0.0.0 img-s-msn-com.akamaized.net
0.0.0.0 prod-streaming-video-msn-com.akamaized.net
0.0.0.0 rewards.bing.com
0.0.0.0 staticview.msn.com
0.0.0.0 th.bing.com
0.0.0.0 thaka.bing.com
0.0.0.0 thvnext.bing.com
0.0.0.0 windows.msn.com
# [5] OFFICE 365 TELEMETRY
0.0.0.0 api.addins.omex.office.net
0.0.0.0 appsforoffice.microsoft.com
0.0.0.0 ecs.office.com
0.0.0.0 fa000000110.resources.office.net
0.0.0.0 mrodevicemgr.officeapps.live.com
0.0.0.0 nexusrules.officeapps.live.com
0.0.0.0 ocws.officeapps.live.com
0.0.0.0 odc.officeapps.live.com
0.0.0.0 oneclient.sfx.ms
0.0.0.0 outlook-sdf.office.com
0.0.0.0 send.hsbrowserreports.com
0.0.0.0 staging.to-do.microsoft.com
0.0.0.0 staging.to-do.officeppe.com
0.0.0.0 m365cdn.nel.measure.office.net
0.0.0.0 metadata.templates.cdn.office.net
0.0.0.0 nelreports.net
# [6] AZURE CDN TELEMETRY
0.0.0.0 afdxtest.z01.azurefd.net
0.0.0.0 fp-afd-nocache-ccp.azureedge.net
0.0.0.0 otelrules.svc.static.microsoft
0.0.0.0 otelrules-bzhndjfje8dvh5fd.z01.azurefd.net
0.0.0.0 res-ocdi-stls-prod.edgesuite.net
# === END MAVEN BLOCK ===
"@

try {
    Add-Content -Path $hostsPath -Value $hostsEntries -Force -ErrorAction Stop
    # Flush DNS cache
    $null = ipconfig /flushdns 2>&1
    
    # Only show output if running standalone (not via Invoke-Expression)
    if ($MyInvocation.Line -notlike "*Invoke-Expression*" -and $MyInvocation.InvocationName -ne '&') {
        Write-Host "SUCCESS: Hosts file updated with 65 blocking entries" -ForegroundColor Green
        Write-Host "DNS cache flushed" -ForegroundColor Green
    }
} catch {
    if ($MyInvocation.Line -notlike "*Invoke-Expression*") {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    throw $_
}
