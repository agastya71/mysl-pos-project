# POS Terminal Installation Guide

**Version:** 1.0.0-deployment
**Last Updated:** February 14, 2026
**Estimated Time:** 15-20 minutes per terminal

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [System Requirements](#system-requirements)
4. [Download Installers](#download-installers)
5. [Windows Installation](#windows-installation)
6. [macOS Installation](#macos-installation)
7. [Linux Installation](#linux-installation)
8. [Configuration](#configuration)
9. [First Login](#first-login)
10. [Hardware Setup](#hardware-setup)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers installing the POS Terminal desktop application on Windows, macOS, and Linux. The terminal application:

- Connects to the central POS server via HTTPS
- Provides point-of-sale interface for cashiers
- Supports receipt printers and barcode scanners
- Updates automatically when new versions are released
- Works offline with limited functionality (future feature)

**Architecture:**
```
POS Terminal (Desktop App)
    ↓ HTTPS
POS Server (https://pos.yourcompany.com)
```

---

## Prerequisites

### Required Information

Before starting, gather:

1. **Server URL**
   - Example: `https://pos.yourcompany.com/api/v1`
   - Provided by your system administrator

2. **Login Credentials**
   - Username and password
   - Created by administrator in the system

3. **Terminal Location**
   - Store name and terminal number
   - Example: "Main Store - Terminal 1"

### Network Requirements

- **Internet Connection**: Required for server communication
- **Firewall**: Allow outbound HTTPS (port 443)
- **Bandwidth**: Minimum 1 Mbps (5 Mbps recommended)
- **Latency**: < 100ms to server (for optimal performance)

---

## System Requirements

### Windows

- **OS:** Windows 10 (64-bit) or Windows 11
- **CPU:** Intel i3 or equivalent (2 GHz+)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Disk:** 500 MB free space
- **Display:** 1280x720 minimum, 1920x1080 recommended
- **Peripherals:** USB ports for printer/scanner

### macOS

- **OS:** macOS 11 (Big Sur) or newer
- **CPU:** Intel or Apple Silicon (M1/M2/M3)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Disk:** 500 MB free space
- **Display:** 1280x720 minimum, 1920x1080 recommended
- **Peripherals:** USB ports for printer/scanner

### Linux

- **OS:** Ubuntu 20.04+, Debian 11+, Fedora 35+
- **CPU:** Intel i3 or equivalent (2 GHz+)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Disk:** 500 MB free space
- **Display:** 1280x720 minimum, 1920x1080 recommended
- **Dependencies:** libgtk-3, libnotify, libnss3
- **Peripherals:** USB ports for printer/scanner

---

## Download Installers

### Official Downloads

Download the appropriate installer for your platform from your administrator or the official release page.

**Available Installers:**

| Platform | Installer | Size | Notes |
|----------|-----------|------|-------|
| Windows (64-bit) | `POS-Terminal-Setup-1.0.0.exe` | ~95 MB | NSIS installer |
| Windows (Portable) | `POS-Terminal-Portable-1.0.0.exe` | ~95 MB | No installation required |
| macOS (Intel) | `POS Terminal-1.0.0.dmg` | ~89 MB | For Intel Macs |
| macOS (Apple Silicon) | `POS Terminal-1.0.0-arm64.dmg` | ~85 MB | For M1/M2/M3 Macs |
| Linux (AppImage) | `POS-Terminal-1.0.0.AppImage` | ~95 MB | Universal format |
| Linux (Debian) | `pos-terminal_1.0.0_amd64.deb` | ~90 MB | For Ubuntu/Debian |

### Verify Download Integrity

**Check SHA256 checksum** (optional but recommended):

```bash
# Windows (PowerShell)
Get-FileHash "POS-Terminal-Setup-1.0.0.exe" -Algorithm SHA256

# macOS/Linux
shasum -a 256 "POS Terminal-1.0.0.dmg"
```

Compare the output with `SHA256SUMS.txt` provided with the installers.

---

## Windows Installation

### Method 1: Standard Installation (Recommended)

1. **Run Installer**
   - Double-click `POS-Terminal-Setup-1.0.0.exe`
   - Click "Yes" if prompted by User Account Control

2. **Accept License**
   - Review the MIT License
   - Click "I Agree"

3. **Choose Install Location**
   - Default: `C:\Program Files\POS Terminal`
   - Click "Next"

4. **Select Components**
   - ☑ Desktop Shortcut (recommended)
   - ☑ Start Menu Shortcut
   - Click "Install"

5. **Complete Installation**
   - Wait for installation to complete (~30 seconds)
   - ☑ Launch POS Terminal
   - Click "Finish"

### Method 2: Portable Version

1. **Run Portable Executable**
   - Double-click `POS-Terminal-Portable-1.0.0.exe`
   - No installation required
   - Runs directly from USB drive or local folder

2. **Configuration Persistence**
   - Settings stored in `config.json` next to executable
   - Portable for moving between machines

### Windows Security Warnings

**If you see "Windows protected your PC":**

1. Click "More info"
2. Click "Run anyway"
3. This warning appears because the app is not code-signed yet

---

## macOS Installation

### Installation Steps

1. **Open DMG File**
   - Double-click `POS Terminal-1.0.0.dmg` (Intel)
   - Or `POS Terminal-1.0.0-arm64.dmg` (Apple Silicon)

2. **Drag to Applications**
   - Drag "POS Terminal" icon to Applications folder
   - Wait for copy to complete

3. **Eject DMG**
   - Right-click the mounted volume
   - Click "Eject"

4. **Launch Application**
   - Open Applications folder
   - Double-click "POS Terminal"

### macOS Security Warnings

**If you see "POS Terminal cannot be opened because it is from an unidentified developer":**

**Option A: System Preferences Method**
1. Open System Preferences → Security & Privacy
2. Click "Open Anyway" at the bottom
3. Click "Open" in the confirmation dialog

**Option B: Right-Click Method**
1. Right-click (or Control+click) on "POS Terminal"
2. Click "Open"
3. Click "Open" in the dialog

**Note:** This warning appears because the app is not notarized with Apple yet. This is safe for internal company use.

---

## Linux Installation

### Method 1: AppImage (Universal)

```bash
# Download AppImage
wget https://your-server.com/downloads/POS-Terminal-1.0.0.AppImage

# Make executable
chmod +x POS-Terminal-1.0.0.AppImage

# Run
./POS-Terminal-1.0.0.AppImage
```

**Create Desktop Shortcut:**
```bash
# Create .desktop file
cat > ~/.local/share/applications/pos-terminal.desktop << EOF
[Desktop Entry]
Name=POS Terminal
Exec=/path/to/POS-Terminal-1.0.0.AppImage
Icon=pos-terminal
Type=Application
Categories=Office;Finance;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

### Method 2: Debian/Ubuntu Package

```bash
# Download .deb package
wget https://your-server.com/downloads/pos-terminal_1.0.0_amd64.deb

# Install
sudo dpkg -i pos-terminal_1.0.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch from application menu or terminal
pos-terminal
```

### Install Dependencies (if missing)

**Ubuntu/Debian:**
```bash
sudo apt-get install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libappindicator3-1
```

**Fedora:**
```bash
sudo dnf install -y \
    gtk3 \
    libnotify \
    nss \
    libXScrnSaver \
    libXtst \
    xdg-utils \
    at-spi2-core \
    libappindicator-gtk3
```

---

## Configuration

### First-Time Configuration Wizard

When you launch POS Terminal for the first time, you'll see the configuration wizard:

1. **Server URL**
   - Enter: `https://pos.yourcompany.com/api/v1`
   - Click "Test Connection"
   - ✓ Green checkmark = success
   - ✗ Red X = check URL or network

2. **Save Configuration**
   - Click "Save"
   - Configuration saved to `config.json`

### Manual Configuration (Advanced)

If needed, you can manually edit the configuration:

**Windows:** `%APPDATA%\POS Terminal\config.json`
**macOS:** `~/Library/Application Support/POS Terminal/config.json`
**Linux:** `~/.config/POS Terminal/config.json`

```json
{
  "apiUrl": "https://pos.yourcompany.com/api/v1",
  "terminalId": "",
  "autoUpdate": true,
  "updateCheckInterval": 3600000,
  "environment": "production"
}
```

**Parameters:**
- `apiUrl`: Server API endpoint (required)
- `terminalId`: Auto-assigned on first login (don't modify)
- `autoUpdate`: Enable automatic updates (default: true)
- `updateCheckInterval`: Check for updates every hour (milliseconds)

---

## First Login

### Login Screen

1. **Launch POS Terminal**
   - Application opens to login screen

2. **Enter Credentials**
   - **Username:** Provided by administrator
   - **Password:** Provided by administrator
   - Example: `cashier1` / `initial-password`

3. **Click "Login"**
   - Application connects to server
   - Authenticates user
   - Loads POS interface

### Terminal Assignment

On first login:
- System automatically assigns a Terminal ID
- Format: `TERM-000001`, `TERM-000002`, etc.
- Terminal ID displayed in bottom-right corner
- Location configured by administrator

### Change Password (Recommended)

After first login:
1. Click profile icon (top-right)
2. Select "Change Password"
3. Enter current password
4. Enter new password (min 8 characters)
5. Confirm new password
6. Click "Update"

---

## Hardware Setup

### Receipt Printer

**Supported Printers:**
- ESC/POS compatible thermal printers
- Star Micronics
- Epson TM series

**Connection:**
1. Connect printer via USB
2. Install printer drivers (if needed)
3. In POS Terminal:
   - Settings → Hardware
   - Select printer from dropdown
   - Click "Test Print"
   - Verify receipt prints correctly

### Barcode Scanner

**Supported Scanners:**
- USB HID barcode scanners
- Most commercial barcode scanners

**Setup:**
1. Connect scanner via USB
2. No drivers needed (acts as keyboard)
3. Test by scanning barcode in product search
4. Scanner input should appear in search box

### Cash Drawer

**Connection:**
- Connect to receipt printer (RJ11 cable)
- Cash drawer opens when receipt prints
- Or configure manual open trigger

---

## Troubleshooting

### Cannot Connect to Server

**Error:** "Unable to connect to server" or "Network error"

**Solutions:**

1. **Check Server URL**
   - Verify URL is correct
   - Example: `https://pos.yourcompany.com/api/v1`
   - Must include `/api/v1` at the end

2. **Test Network Connectivity**
   ```bash
   # Windows
   ping pos.yourcompany.com

   # macOS/Linux
   curl -I https://pos.yourcompany.com/health
   ```

3. **Check Firewall**
   - Ensure outbound HTTPS (443) is allowed
   - Add POS Terminal to firewall exceptions

4. **Verify Server is Running**
   - Contact system administrator
   - Check server status

### Login Failed

**Error:** "Invalid username or password"

**Solutions:**
1. Verify credentials with administrator
2. Check Caps Lock is off
3. Try resetting password through administrator
4. Verify user account is active

### Application Won't Start

**Windows:**
```bash
# Check if running
tasklist | findstr "POS Terminal"

# Kill process if stuck
taskkill /F /IM "POS Terminal.exe"
```

**macOS:**
```bash
# Check if running
ps aux | grep "POS Terminal"

# Kill process if stuck
killall "POS Terminal"
```

**Linux:**
```bash
# Check if running
ps aux | grep pos-terminal

# Kill process if stuck
killall pos-terminal
```

### SSL Certificate Error

**Error:** "Certificate verification failed" or "SSL handshake error"

**For self-signed certificates:**
1. Accept the security warning (one-time)
2. Or contact administrator to install certificate authority

### Auto-Update Failed

**Error:** "Update download failed"

**Solutions:**
1. Check internet connection
2. Restart application
3. Manually download and install latest version
4. Disable auto-update temporarily in settings

### Printer Not Detected

**Solutions:**
1. Verify printer is powered on
2. Check USB connection
3. Install printer drivers
4. Restart POS Terminal
5. Try different USB port
6. Check printer settings in operating system

---

## Updates

### Automatic Updates

POS Terminal checks for updates automatically:
- On application startup
- Every hour (default)

**When update available:**
1. Dialog appears: "Update Available - Version X.X.X"
2. Click "Download and Install"
3. Update downloads in background
4. Progress bar shows download status
5. Application restarts automatically
6. New version loads

**To disable auto-updates:**
- Settings → General → Uncheck "Automatic Updates"

### Manual Update

If auto-update fails:
1. Download latest installer
2. Close POS Terminal
3. Run new installer
4. Installation overwrites old version
5. Configuration preserved

---

## Uninstallation

### Windows

**Method 1: Control Panel**
1. Control Panel → Programs → Uninstall a program
2. Find "POS Terminal"
3. Click "Uninstall"
4. Follow prompts

**Method 2: Settings App**
1. Settings → Apps → Apps & features
2. Find "POS Terminal"
3. Click → Uninstall

### macOS

1. Open Applications folder
2. Find "POS Terminal"
3. Drag to Trash
4. Empty Trash
5. Remove configuration (optional):
   ```bash
   rm -rf ~/Library/Application\ Support/POS\ Terminal
   ```

### Linux

**AppImage:** Delete the file

**Debian package:**
```bash
sudo apt-get remove pos-terminal
```

---

## Security Best Practices

1. **Keep Software Updated**
   - Enable automatic updates
   - Install updates promptly

2. **Use Strong Passwords**
   - Minimum 8 characters
   - Include numbers and symbols
   - Change every 90 days

3. **Lock Terminal When Away**
   - Use screen lock feature
   - Or log out if leaving for extended period

4. **Physical Security**
   - Secure cash drawer
   - Lock terminal workstation
   - Restrict physical access

5. **Network Security**
   - Use secure Wi-Fi (WPA2/WPA3)
   - Avoid public Wi-Fi for POS operations
   - Use VPN if connecting remotely

---

## Support

For issues not covered in this guide:
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Admin Guide](ADMIN_GUIDE.md)
- Contact your system administrator
- GitHub Issues: https://github.com/yourcompany/pos-system/issues

---

**Installation complete!** You're ready to use the POS Terminal.

Next: Login and start processing transactions!
