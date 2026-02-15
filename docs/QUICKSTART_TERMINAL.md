# POS Terminal - Quick Start Guide

**Version:** 1.0.2 | **Time:** 15 minutes | **Difficulty:** Easy

---

## Prerequisites

✓ Server deployed and accessible
✓ Computer with Windows 10+, macOS 11+, or Ubuntu 20.04+
✓ Network connectivity to server
✓ User credentials (provided by administrator)

---

## Installation (4 Steps)

### 1. Download Installer

Visit: https://github.com/agastya71/mysl-pos-project/releases/latest

**Choose your platform:**

| Platform | Download |
|----------|----------|
| **Windows** | POS Terminal-Setup-1.0.2.exe (140 MB) |
| **macOS Intel** | POS Terminal-1.0.2.dmg (89 MB) |
| **macOS Apple Silicon** | POS Terminal-1.0.2-arm64.dmg (85 MB) |
| **Linux** | POS Terminal-1.0.2.AppImage (79 MB) or pos-client_1.0.2_amd64.deb (80 MB) |

### 2. Install Application

**Windows:**
```powershell
# Run installer (right-click → Run as administrator)
.\POS-Terminal-Setup-1.0.2.exe

# Follow wizard:
# - Accept license
# - Choose install location (default: C:\Program Files\POS Terminal)
# - Create desktop shortcut: Yes
# - Click Install
```

**macOS:**
```bash
# Mount DMG
open POS-Terminal-1.0.2.dmg

# Drag "POS Terminal" to Applications folder
# Eject DMG

# Launch from Applications
open /Applications/POS\ Terminal.app

# If security warning appears:
# System Preferences → Security & Privacy → Open Anyway
```

**Linux (Ubuntu/Debian):**
```bash
# Option A: AppImage (any distro)
chmod +x POS-Terminal-1.0.2.AppImage
./POS-Terminal-1.0.2.AppImage

# Option B: Debian package (Ubuntu/Debian)
sudo dpkg -i pos-client_1.0.2_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed
pos-terminal
```

### 3. Configure Server URL

On first launch:

1. **Enter Server URL:**
   ```
   https://pos-server.yourcompany.com
   ```
   Or use IP address:
   ```
   https://192.168.1.100
   ```

2. **Test Connection:**
   - Click "Test Connection" button
   - Should show green checkmark ✓
   - If red X, see [Troubleshooting](#troubleshooting) below

3. **Save Configuration:**
   - Click "Save"

### 4. Login

1. **Enter Credentials:**
   - Username: (provided by administrator, e.g., `cashier1`)
   - Password: (provided by administrator)

2. **Login:**
   - Click "Login" button
   - Terminal automatically registers with server
   - Terminal ID assigned (e.g., TERM-000001)
   - Terminal ID shown in bottom-right corner

✅ **Terminal is ready!**

---

## First Transaction (Test)

### Test the POS System:

1. **Search for Product:**
   - Type product name or SKU in search box
   - Press Enter or click Search

2. **Add to Cart:**
   - Click product card
   - Adjust quantity if needed
   - Click "Add to Cart"

3. **Checkout:**
   - Click "Checkout" button
   - Select payment method: "Cash"
   - Enter amount received (e.g., $20.00)
   - Click "Complete Payment"
   - Verify change shown correctly

4. **Receipt:**
   - Receipt preview shown
   - Click "Print" (if printer connected)
   - Click "New Transaction" to start next transaction

✅ **Transaction completed successfully!**

---

## Terminal Information

| Item | Value |
|------|-------|
| **Server URL** | https://pos-server.yourcompany.com |
| **Terminal ID** | Auto-assigned on first login (e.g., TERM-000001) |
| **Config File** | Windows: `%APPDATA%\pos-terminal\config.json` |
|  | macOS: `~/Library/Application Support/pos-terminal/config.json` |
|  | Linux: `~/.config/pos-terminal/config.json` |
| **Logs** | Same directory as config, in `logs/` folder |

---

## Common Tasks

### Change Server URL

1. Click Settings icon (⚙️) in top-right
2. Go to "Server Configuration"
3. Enter new URL
4. Test Connection
5. Save

### Logout

1. Click user icon in top-right
2. Select "Logout"

### Update Terminal (When Available)

Automatic updates (when implemented):
- Terminal checks for updates on startup
- Notification shown when update available
- Click "Update" to download and install
- Terminal restarts with new version

Manual update (current):
- Download new installer
- Close terminal application
- Run new installer
- Launch application

---

## Troubleshooting

### Cannot Connect to Server

**Red X on "Test Connection"**

1. **Verify URL format:**
   - ✓ Correct: `https://pos-server.yourcompany.com`
   - ✓ Correct: `https://192.168.1.100`
   - ✗ Wrong: `http://...` (must be https)
   - ✗ Wrong: Missing `https://`
   - ✗ Wrong: Including port `:3000`

2. **Test connectivity from command line:**
   ```bash
   # Windows
   ping pos-server.yourcompany.com
   curl https://pos-server.yourcompany.com/health

   # macOS/Linux
   ping pos-server.yourcompany.com
   curl -k https://pos-server.yourcompany.com/health
   ```

3. **Check firewall:**
   - Ensure outbound port 443 (HTTPS) allowed
   - Temporarily disable firewall to test

4. **Accept SSL certificate (if self-signed):**
   - Browser warning is normal for self-signed certificates
   - Click "Advanced" → "Accept and Continue"
   - Or import certificate to OS trust store

### Login Fails

**"Invalid username or password"**

1. Verify credentials with administrator
2. Check username is case-sensitive
3. Verify user account is active
4. Try default admin account: admin/admin123 (if testing)

### Application Crashes

1. **Check system resources:**
   - Close other applications
   - Ensure 4GB+ RAM available
   - Restart computer

2. **Reset configuration:**
   ```bash
   # Windows
   del %APPDATA%\pos-terminal\config.json

   # macOS
   rm ~/Library/Application\ Support/pos-terminal/config.json

   # Linux
   rm ~/.config/pos-terminal/config.json
   ```
   Then restart application and reconfigure.

3. **Reinstall application:**
   - Uninstall current version
   - Download fresh installer
   - Install and configure

### Transaction Fails

1. **Check network connectivity:**
   - Ensure stable connection to server
   - Verify with: `ping pos-server.yourcompany.com`

2. **Check product stock:**
   - May have insufficient inventory
   - Contact administrator to adjust stock

3. **Retry transaction:**
   - Clear cart
   - Start new transaction
   - If persists, contact administrator

---

## Hardware Setup (Optional)

### Receipt Printer

1. **Connect Printer:**
   - USB or network connection
   - Install printer drivers

2. **Configure in Terminal:**
   - Settings → Printer Configuration
   - Select printer from list
   - Test print

### Barcode Scanner

1. **Connect Scanner:**
   - USB connection (keyboard wedge mode)
   - No configuration needed
   - Scanner types barcode into search field

2. **Test:**
   - Focus cursor in product search box
   - Scan barcode
   - Product should appear in search results

### Cash Drawer

- Usually connects to receipt printer
- Opens automatically after cash payment
- Check printer documentation for wiring

### Customer Display

- Not yet implemented
- Planned for future release

---

## Best Practices

### Daily Operations

- [ ] Login at start of shift
- [ ] Verify terminal connected (check server icon)
- [ ] Test transaction at shift start
- [ ] Logout at end of shift

### Security

- [ ] Never share login credentials
- [ ] Lock terminal when leaving (Windows+L / Ctrl+Alt+Delete)
- [ ] Logout if away for extended period
- [ ] Report suspicious activity to administrator

### Maintenance

- [ ] Keep terminal application updated
- [ ] Restart terminal weekly
- [ ] Clear browser cache monthly (if using web version)
- [ ] Report issues to administrator immediately

---

## Next Steps

1. **Learn POS Features:** See [USER_GUIDE.md](USER_GUIDE.md)
2. **Hardware Setup:** Connect printer, scanner, cash drawer
3. **Practice:** Run test transactions with training data
4. **Go Live:** Begin processing real customer transactions

---

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Search Products | F3 or Ctrl+F | ⌘F |
| Checkout | F9 | ⌘Enter |
| Clear Cart | F10 | ⌘Delete |
| Logout | Ctrl+Q | ⌘Q |
| Settings | Ctrl+, | ⌘, |

---

## Documentation

- **Detailed Guide:** [DEPLOYMENT_TERMINAL.md](DEPLOYMENT_TERMINAL.md)
- **User Guide:** [USER_GUIDE.md](USER_GUIDE.md)
- **Admin Guide:** [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Support

**Terminal Issues:**
1. Check this guide
2. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. Contact your administrator
4. Report bugs: https://github.com/agastya71/mysl-pos-project/issues

**Server Issues:**
- Contact your system administrator
- See [DEPLOYMENT_SERVER.md](DEPLOYMENT_SERVER.md)

---

**Support:** https://github.com/agastya71/mysl-pos-project/issues
