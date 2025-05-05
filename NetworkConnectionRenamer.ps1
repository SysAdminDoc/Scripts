# ==========================================================================================
# Rename Network Adapters based on IP assignment
# ==========================================================================================
# --- Rename Adapters ---
try {
    Write-Output "Detecting active hardware network adapters..."
    Write-Log "Detecting active, physical, non-virtual, non-loopback network adapters..." -blockName "Block_NetworkConfig" -Level DEBUG
    # Get physical, non-virtual, non-loopback adapters that are 'Up' and not common virtual/tunnel interfaces
    $adapters = Get-NetAdapter -Physical -ErrorAction Stop | Where-Object {
        $_.Status -eq "Up" -and
        $_.InterfaceDescription -notmatch "(?i)(Loopback|isatap|teredo|Bluetooth|Virtual|VPN|WAN Miniport|Mobile Broadband|Hyper-V|VMware|VirtualBox)"
        # Added more virtual adapter patterns to exclude
    }

    if ($adapters.Count -eq 0) {
        Write-Warning "No suitable active physical network adapters found to configure."
        Write-Log "No active physical network adapters found matching criteria." -blockName "Block_NetworkConfig" -Level WARN
    } else {
        Write-Output "Found $($adapters.Count) potentially relevant active adapter(s): $($adapters.Name -join ', ')"
        Write-Log "Found $($adapters.Count) adapters: $($adapters.Name -join ', ')" -blockName "Block_NetworkConfig" -Level INFO

        # Gather IP configuration details to identify INTERNET and XRAY adapters
        Write-Output "Analyzing adapter IP configurations..."
        Write-Log "Gathering IPConfiguration for identified adapters..." -blockName "Block_NetworkConfig" -Level DEBUG
        $adapterInfo = foreach ($adapter in $adapters) {
            $ipConfig = Get-NetIPConfiguration -InterfaceIndex $adapter.InterfaceIndex -ErrorAction SilentlyContinue
            [PSCustomObject]@{
                Name             = $adapter.Name
                InterfaceIndex   = $adapter.InterfaceIndex
                InterfaceAlias   = $adapter.InterfaceAlias # Use InterfaceAlias for Rename-NetAdapter target
                MediaType        = $adapter.MediaType
                Status           = $adapter.Status
                HasGateway       = ($null -ne $ipConfig.IPv4DefaultGateway)
                HasIpAddress     = ($null -ne $ipConfig.IPv4Address)
                # Removed CurrentDNS as it's not used after DNS section removal
            }
        }
        # Log detailed info for debugging
        Write-Log "Adapter Info Gathered: $($adapterInfo | ConvertTo-Json -Depth 2)" -blockName "Block_NetworkConfig" -Level DEBUG

        # --- Logic for Identifying INTERNET and XRAY Adapters ---
        Write-Log "Identifying INTERNET (has gateway) and XRAY (has IP, no gateway) adapters..." -blockName "Block_NetworkConfig" -Level DEBUG
        # Assumption: INTERNET adapter is the primary one with a default gateway. Prioritize Ethernet.
        $internetAdapter = $adapterInfo | Where-Object { $_.HasGateway } | Sort-Object { $_.MediaType -eq 'Ethernet' } -Descending | Select-Object -First 1
        # Assumption: XRAY adapter is a secondary NIC without a gateway but with an IP. Prioritize Ethernet. Exclude the one identified as INTERNET.
        $xrayAdapter = $adapterInfo | Where-Object { -not $_.HasGateway -and $_.HasIpAddress -and ($internetAdapter -eq $null -or $_.InterfaceIndex -ne $internetAdapter.InterfaceIndex) } | Sort-Object { $_.MediaType -eq 'Ethernet' } -Descending | Select-Object -First 1

        # Rename INTERNET adapter
        Set-Progress -percent 46 -message "Configuring network adapters: Renaming INTERNET adapter..."
        if ($internetAdapter) {
            if ($internetAdapter.InterfaceAlias -ne "INTERNET") {
                Write-Output "Attempting to rename adapter '$($internetAdapter.InterfaceAlias)' (Index $($internetAdapter.InterfaceIndex)) to 'INTERNET'..."
                try {
                    Rename-NetAdapter -InterfaceAlias $internetAdapter.InterfaceAlias -NewName "INTERNET" -ErrorAction Stop -Confirm:$false
                    Write-Log "Renamed adapter '$($internetAdapter.InterfaceAlias)' (Idx $($internetAdapter.InterfaceIndex)) to 'INTERNET'." -blockName "Block_NetworkConfig"
                    Write-Output "[+] Adapter '$($internetAdapter.InterfaceAlias)' successfully renamed to 'INTERNET'."
                    # Update the variable's alias property in case it's needed later by other parts of a larger script
                    $internetAdapter.InterfaceAlias = "INTERNET"
                } catch {
                    Write-Warning "Failed to rename potential INTERNET adapter '$($internetAdapter.InterfaceAlias)': $($_.Exception.Message)"
                    Write-Log "Failed to rename INTERNET adapter '$($internetAdapter.InterfaceAlias)' (Idx $($internetAdapter.InterfaceIndex)): $($_.Exception.Message)" -blockName "Block_NetworkConfig" -Level ERROR
                }
            } else {
                Write-Output "Adapter '$($internetAdapter.InterfaceAlias)' is already named 'INTERNET'. Skipping rename."
                Write-Log "Adapter '$($internetAdapter.InterfaceAlias)' (Idx $($internetAdapter.InterfaceIndex)) already named INTERNET." -blockName "Block_NetworkConfig"
            }
        } else {
            Write-Warning "Could not identify a primary INTERNET adapter (adapter with a default gateway)."
            Write-Log "Primary INTERNET adapter (with gateway) not found." -blockName "Block_NetworkConfig" -Level WARN
        }

        # Rename XRAY adapter
        Set-Progress -percent 47 -message "Configuring network adapters: Renaming XRAY adapter..."
          if ($xrayAdapter) {
              if ($xrayAdapter.InterfaceAlias -ne "XRAY") {
                Write-Output "Attempting to rename adapter '$($xrayAdapter.InterfaceAlias)' (Index $($xrayAdapter.InterfaceIndex)) to 'XRAY'..."
                try {
                    Rename-NetAdapter -InterfaceAlias $xrayAdapter.InterfaceAlias -NewName "XRAY" -ErrorAction Stop -Confirm:$false
                    Write-Log "Renamed adapter '$($xrayAdapter.InterfaceAlias)' (Idx $($xrayAdapter.InterfaceIndex)) to 'XRAY'." -blockName "Block_NetworkConfig"
                    Write-Output "[+] Adapter '$($xrayAdapter.InterfaceAlias)' successfully renamed to 'XRAY'."
                    # Update the variable's alias property
                    $xrayAdapter.InterfaceAlias = "XRAY"
                } catch {
                    Write-Warning "Failed to rename potential XRAY adapter '$($xrayAdapter.InterfaceAlias)': $($_.Exception.Message)"
                    Write-Log "Failed to rename XRAY adapter '$($xrayAdapter.InterfaceAlias)' (Idx $($xrayAdapter.InterfaceIndex)): $($_.Exception.Message)" -blockName "Block_NetworkConfig" -Level ERROR
                }
            } else {
                 Write-Output "Adapter '$($xrayAdapter.InterfaceAlias)' is already named 'XRAY'. Skipping rename."
                 Write-Log "Adapter '$($xrayAdapter.InterfaceAlias)' (Idx $($xrayAdapter.InterfaceIndex)) already named XRAY." -blockName "Block_NetworkConfig"
            }
        } else {
            # It's common not to have a secondary "XRAY" adapter as defined here. This is not necessarily an error.
            Write-Output "INFO: Could not identify a secondary XRAY adapter (adapter with IP, no gateway, not INTERNET adapter)."
            Write-Log "Secondary XRAY adapter (IP, no gateway, distinct from INTERNET) not found." -blockName "Block_NetworkConfig" -Level INFO
        }
    }
} catch {
    Write-Warning "An error occurred during adapter detection or renaming phase: $($_.Exception.Message)"
    Write-Log "Error during adapter detection/renaming phase: $($_.Exception.Message)" -blockName "Block_NetworkConfig" -Level ERROR
}

# --- Disable IPv6 ---
# Note: Progress percentage adjusted from original script due to removal of DNS step
Set-Progress -percent 48 -message "Configuring network adapters: Disabling IPv6..."
Write-Output "Disabling IPv6 components..."
try {
    # Method 1: Disable IPv6 component binding on active adapters
    # This provides an immediate effect for the current session without requiring a reboot.
    Write-Output "--> Disabling IPv6 binding on active adapters..."
    $activeAdapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}
    if ($activeAdapters) {
        $bindingDisabledCount = 0
        foreach ($adapter in $activeAdapters) {
             Write-Log "Checking IPv6 binding for adapter: $($adapter.Name) (Idx $($adapter.InterfaceIndex))" -blockName "Block_NetworkConfig" -Level DEBUG
             # Check if binding exists and is enabled
             $ipv6Binding = Get-NetAdapterBinding -InterfaceDescription $adapter.InterfaceDescription -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
             if ($ipv6Binding -and $ipv6Binding.Enabled) {
                 Write-Output "  Disabling IPv6 binding on: $($adapter.Name)"
                 try {
                     Disable-NetAdapterBinding -InterfaceDescription $adapter.InterfaceDescription -ComponentID ms_tcpip6 -PassThru -ErrorAction Stop | Out-Null
                     Write-Log "Disabled IPv6 binding on adapter: $($adapter.Name)" -blockName "Block_NetworkConfig"
                     $bindingDisabledCount++
                 } catch {
                     Write-Warning "Failed to disable IPv6 binding on '$($adapter.Name)': $($_.Exception.Message)"
                     Write-Log "Failed to disable IPv6 binding on '$($adapter.Name)': $($_.Exception.Message)" -blockName "Block_NetworkConfig" -Level ERROR
                 }
             } elseif ($ipv6Binding -and -not $ipv6Binding.Enabled) {
                  Write-Log "IPv6 binding already disabled on adapter: $($adapter.Name)" -blockName "Block_NetworkConfig" -Level DEBUG
             } else {
                  # Binding might not exist for some adapters (e.g., virtual internal switches)
                  Write-Log "IPv6 binding (ms_tcpip6) not found or applicable for adapter: $($adapter.Name)" -blockName "Block_NetworkConfig" -Level DEBUG
             }
        }
        Write-Output "  [+] IPv6 component binding disabled on $bindingDisabledCount adapter(s)."
    } else {
        Write-Output "  No active adapters found to check IPv6 bindings."
        Write-Log "No active adapters found for IPv6 binding check." -blockName "Block_NetworkConfig"
    }

    # Method 2: Set registry key to disable IPv6 components globally
    # This is the more persistent method, recommended by Microsoft, but requires a reboot for full effect.
    Write-Output "--> Setting registry key to disable IPv6 globally (requires reboot)..."
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
    # Value 0xFF disables all IPv6 components including tunnels and loopback.
    # Ensure Set-RegistryValue function is available or replace with direct Set-ItemProperty call.
    # Example using direct call:
    # if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
    # Set-ItemProperty -Path $regPath -Name "DisabledComponents" -Value 0xFF -Type DWord -Force
    Set-RegistryValue -Path $regPath -Name "DisabledComponents" -Value 0xFF -Type DWord -BlockName "Block_NetworkConfig" # Assumes helper function exists
    Write-Log "Set global IPv6 DisabledComponents registry value to 0xFF (requires reboot)." -blockName "Block_NetworkConfig"
    Write-Output "  [+] Global IPv6 disable registry key set (requires reboot for full effect)."

} catch {
    Write-Warning "An error occurred while disabling IPv6 components: $($_.Exception.Message)"
    Write-Log "Error disabling IPv6: $($_.Exception.Message)" -blockName "Block_NetworkConfig" -Level ERROR
}
