# UI/UX Design Specifications

**Version:** 2.0
**Last Updated:** 2026-01-13

## Overview

This document provides comprehensive UI/UX design specifications for the POS system, including design system guidelines, screen layouts, user workflows, and accessibility requirements. The system consists of three primary interfaces: POS Terminal (desktop), Admin Dashboard (web), and Mobile Count App.

**Related Documents:**
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System overview
- [DATA_MODEL.md](DATA_MODEL.md) - Database schema
- [API_ENDPOINTS.md](API_ENDPOINTS.md) - API specifications
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation roadmap

---

## Table of Contents

- [Design System](#design-system)
  - [Color Palette](#color-palette)
  - [Typography](#typography)
  - [Spacing & Layout](#spacing--layout)
  - [Icons & Imagery](#icons--imagery)
  - [Component Library](#component-library)
- [POS Terminal UI/UX](#pos-terminal-uiux)
- [Admin Dashboard UI/UX](#admin-dashboard-uiux)
- [Mobile Count App UI/UX](#mobile-count-app-uiux)
- [User Workflows](#user-workflows)
- [Accessibility & Responsiveness](#accessibility--responsiveness)

---

## Design System

### Color Palette

#### Brand Colors

```css
/* Primary Colors */
--primary-900: #1a237e;      /* Dark Blue - Primary actions, headers */
--primary-700: #283593;
--primary-500: #3f51b5;      /* Main brand color */
--primary-300: #7986cb;
--primary-100: #c5cae9;      /* Light backgrounds */

/* Secondary Colors */
--secondary-900: #004d40;
--secondary-700: #00695c;
--secondary-500: #009688;    /* Accent color */
--secondary-300: #4db6ac;
--secondary-100: #b2dfdb;

/* Accent Colors */
--accent-orange: #ff6f00;    /* Warnings, highlights */
--accent-teal: #00bcd4;      /* Info, links */
```

#### Semantic Colors

```css
/* Status Colors */
--success-dark: #2e7d32;
--success: #4caf50;          /* Success messages, completed states */
--success-light: #c8e6c9;

--warning-dark: #f57c00;
--warning: #ff9800;          /* Warnings, pending actions */
--warning-light: #ffe0b2;

--error-dark: #c62828;
--error: #f44336;            /* Errors, critical alerts */
--error-light: #ffcdd2;

--info-dark: #1976d2;
--info: #2196f3;             /* Information, tips */
--info-light: #bbdefb;
```

#### Neutral Colors

```css
/* Grays */
--gray-900: #212121;         /* Primary text */
--gray-800: #424242;
--gray-700: #616161;         /* Secondary text */
--gray-600: #757575;
--gray-500: #9e9e9e;         /* Disabled text */
--gray-400: #bdbdbd;
--gray-300: #e0e0e0;         /* Borders */
--gray-200: #eeeeee;         /* Dividers */
--gray-100: #f5f5f5;         /* Backgrounds */
--gray-50: #fafafa;          /* Page background */

/* Special */
--white: #ffffff;
--black: #000000;
```

#### Usage Guidelines

**Primary Blue:**
- Primary buttons and CTAs
- Active navigation items
- Links and interactive elements
- Header backgrounds

**Secondary Teal:**
- Secondary buttons
- Accent highlights
- Progress indicators
- Data visualization

**Semantic Colors:**
- Success: Completed transactions, saved changes, inventory in stock
- Warning: Low stock alerts, pending approvals, reconciliation variances
- Error: Failed transactions, validation errors, critical alerts
- Info: Tips, help text, informational messages

---

### Typography

#### Font Families

```css
/* Primary Font - UI */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
                'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;

/* Monospace Font - Numbers, SKUs, Codes */
--font-mono: 'Roboto Mono', 'SF Mono', Monaco, Consolas,
             'Liberation Mono', 'Courier New', monospace;

/* Receipt Font - Thermal printer simulation */
--font-receipt: 'Courier New', 'Courier', monospace;
```

#### Type Scale

```css
/* Headings */
--text-5xl: 3rem;      /* 48px - Hero headings */
--text-4xl: 2.25rem;   /* 36px - Page titles */
--text-3xl: 1.875rem;  /* 30px - Section headings */
--text-2xl: 1.5rem;    /* 24px - Card headings */
--text-xl: 1.25rem;    /* 20px - Subheadings */

/* Body Text */
--text-lg: 1.125rem;   /* 18px - Large body text */
--text-base: 1rem;     /* 16px - Default body text */
--text-sm: 0.875rem;   /* 14px - Small text, labels */
--text-xs: 0.75rem;    /* 12px - Captions, helper text */

/* Display Text (POS Terminal - Large numbers) */
--text-display: 4rem;  /* 64px - Transaction totals */
```

#### Font Weights

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-black: 900;
```

#### Usage Guidelines

**Headings:**
- H1 (text-4xl, bold): Page titles
- H2 (text-3xl, semibold): Section headings
- H3 (text-2xl, semibold): Card/panel headings
- H4 (text-xl, medium): Subsection headings

**Body Text:**
- Primary content: text-base, normal weight
- Secondary content: text-sm, normal weight
- Captions: text-xs, normal weight
- Numbers/prices: font-mono, medium weight

**POS Terminal:**
- Transaction totals: text-display, bold, font-mono
- Product prices: text-3xl, medium, font-mono
- Item names: text-lg, normal

---

### Spacing & Layout

#### Spacing Scale

```css
/* Spacing units (8px base) */
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

#### Layout Grid

```css
/* Container widths */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;

/* Grid columns */
--grid-cols: 12;
--grid-gap: var(--space-6);
```

#### Border Radius

```css
--radius-none: 0;
--radius-sm: 0.125rem;   /* 2px */
--radius-base: 0.25rem;  /* 4px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-full: 9999px;   /* Fully rounded */
```

#### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
               0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
             0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

---

### Icons & Imagery

#### Icon Library

**Primary Icon Set:** Material Design Icons or Heroicons

**Icon Sizes:**
```css
--icon-xs: 16px;    /* Small inline icons */
--icon-sm: 20px;    /* Default icons */
--icon-md: 24px;    /* Button icons */
--icon-lg: 32px;    /* Feature icons */
--icon-xl: 48px;    /* Large display icons */
```

#### Common Icons

**Navigation:**
- Dashboard: 📊 dashboard
- Products: 📦 inventory_2
- Vendors: 🏢 business
- Transactions: 💳 receipt_long
- Reports: 📈 assessment
- Settings: ⚙️ settings

**Actions:**
- Add: ➕ add_circle
- Edit: ✏️ edit
- Delete: 🗑️ delete
- Save: 💾 save
- Search: 🔍 search
- Filter: 🔽 filter_list
- Print: 🖨️ print
- Export: 📥 download
- Scan: 📱 qr_code_scanner

**Status:**
- Success: ✅ check_circle
- Warning: ⚠️ warning
- Error: ❌ error
- Info: ℹ️ info
- Pending: ⏱️ schedule

**Payment:**
- Cash: 💵 payments
- Card: 💳 credit_card
- Check: 🧾 receipt
- Wallet: 👛 account_balance_wallet

#### Product Images

**Specifications:**
- Format: WebP (primary), JPEG (fallback)
- Dimensions: 800x800px (1:1 ratio)
- Thumbnail: 200x200px
- File size: < 200KB (optimized)
- Background: White or transparent

**Placeholder Images:**
- No image available: Gray box with package icon
- Loading state: Skeleton/shimmer effect

---

### Component Library

#### Buttons

**Primary Button:**
```css
.btn-primary {
  background: var(--primary-500);
  color: var(--white);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-700);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  background: var(--primary-900);
  transform: translateY(1px);
}

.btn-primary:disabled {
  background: var(--gray-300);
  color: var(--gray-500);
  cursor: not-allowed;
}
```

**Button Sizes:**
- Small: `padding: 8px 16px; font-size: 14px;`
- Medium (default): `padding: 12px 24px; font-size: 16px;`
- Large: `padding: 16px 32px; font-size: 18px;`
- Extra Large (POS): `padding: 24px 48px; font-size: 24px;`

**Button Variants:**
- Primary: Solid primary color
- Secondary: Outline with primary color
- Success: Solid green
- Danger: Solid red
- Ghost: Transparent with hover effect
- Link: Text only, no background

#### Input Fields

```css
.input-field {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--gray-900);
  transition: border-color 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.1);
}

.input-field.error {
  border-color: var(--error);
}

.input-field:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}
```

**Input Types:**
- Text input
- Number input (with increment/decrement buttons)
- Search input (with search icon)
- Password input (with show/hide toggle)
- Date/time picker
- Dropdown/Select
- Multi-select with chips
- Textarea
- File upload with drag-and-drop

#### Cards

```css
.card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-base);
  padding: var(--space-6);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  border-bottom: 1px solid var(--gray-200);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}
```

#### Tables

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: var(--gray-50);
  border-bottom: 2px solid var(--gray-300);
}

.table th {
  padding: var(--space-4);
  text-align: left;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--gray-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  padding: var(--space-4);
  border-bottom: 1px solid var(--gray-200);
  color: var(--gray-900);
}

.table tbody tr:hover {
  background: var(--gray-50);
}
```

**Table Features:**
- Sortable columns (with sort indicators)
- Filterable columns
- Row selection (checkboxes)
- Pagination
- Row actions (dropdown menu)
- Expandable rows
- Sticky header

#### Modals/Dialogs

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
}

.modal-body {
  padding: var(--space-6);
}

.modal-footer {
  padding: var(--space-6);
  border-top: 1px solid var(--gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-4);
}
```

**Modal Sizes:**
- Small: 400px max-width
- Medium: 600px max-width (default)
- Large: 800px max-width
- Full screen: 95% viewport width/height

#### Alerts/Notifications

```css
.alert {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.alert-success {
  background: var(--success-light);
  border-left: 4px solid var(--success);
  color: var(--success-dark);
}

.alert-warning {
  background: var(--warning-light);
  border-left: 4px solid var(--warning);
  color: var(--warning-dark);
}

.alert-error {
  background: var(--error-light);
  border-left: 4px solid var(--error);
  color: var(--error-dark);
}

.alert-info {
  background: var(--info-light);
  border-left: 4px solid var(--info);
  color: var(--info-dark);
}
```

**Toast Notifications:**
- Position: Top-right corner
- Duration: 3-5 seconds (auto-dismiss)
- Stackable: Multiple toasts queue vertically
- Actions: Dismiss button, optional action button
- Animation: Slide-in from right, fade-out

#### Loading States

**Spinner:**
```css
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--gray-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Skeleton Loaders:**
- Card skeleton: Animated gray rectangles
- Table skeleton: Rows with pulsing effect
- Text skeleton: Lines with shimmer animation

**Progress Indicators:**
- Linear progress bar
- Circular progress (with percentage)
- Step indicator (multi-step forms)

---

## POS Terminal UI/UX

### Screen Resolution & Layout

**Target Resolution:** 1920x1080 (Full HD)
**Minimum Resolution:** 1366x768

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│  Header (60px)                                      │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│   Product Search │      Transaction Panel          │
│   & Catalog      │      (Shopping Cart)             │
│   (50% width)    │      (50% width)                 │
│                  │                                  │
│                  │                                  │
│                  │                                  │
├──────────────────┴──────────────────────────────────┤
│  Footer/Status Bar (40px)                          │
└─────────────────────────────────────────────────────┘
```

---

### 1. Login Screen

**Layout:**
- Centered modal on branded background
- Logo at top
- Form fields in the middle
- Version info in footer

**Elements:**
```
┌────────────────────────────────┐
│         [Company Logo]         │
│                                │
│  ┌──────────────────────────┐ │
│  │ Username/Email           │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │ Password     [👁️ Show]   │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │ Terminal Selection  [▼]  │ │
│  └──────────────────────────┘ │
│                                │
│  [ ] Remember me               │
│                                │
│     [    LOGIN    ]            │
│                                │
│     Forgot password?           │
│                                │
│  POS System v2.0 | Offline ⚡  │
└────────────────────────────────┘
```

**Features:**
- Auto-focus on username field
- Show/hide password toggle
- Terminal dropdown (auto-detect if only one)
- Remember me checkbox (local storage)
- Offline mode indicator
- Enter key submits form
- Loading state on login button
- Error messages below form

**Validation:**
- Required field indicators
- Real-time validation feedback
- Clear error messages

---

### 2. Main POS Screen

**Header Bar (60px height):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [🏪 Store Name]  Terminal 1    👤 John Doe (Cashier)  [🔓 Logout]│
└──────────────────────────────────────────────────────────────────┘
```

**Left Panel - Product Search & Catalog (50% width):**

```
┌─────────────────────────────────────────────┐
│  🔍 [Search products, SKU, barcode...]      │
│                                             │
│  [Categories ▼] [Sort ▼] [Filter 🔽]       │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │        │
│  │ Laptop │  │ Mouse  │  │Keyboard│        │
│  │$599.99 │  │ $29.99 │  │ $79.99 │        │
│  │ ⭐4.5  │  │ ⭐4.8  │  │ ⭐4.2  │        │
│  │In Stock│  │Low:3   │  │In Stock│        │
│  └────────┘  └────────┘  └────────┘        │
│                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │        │
│  │Monitor │  │Speaker │  │ Webcam │        │
│  └────────┘  └────────┘  └────────┘        │
│                                             │
│  [Load More...]                             │
└─────────────────────────────────────────────┘
```

**Right Panel - Transaction Panel (50% width):**

```
┌─────────────────────────────────────────────┐
│  Transaction #1234                          │
│  Jan 13, 2026 10:30 AM                      │
├─────────────────────────────────────────────┤
│  Shopping Cart (3 items)                    │
│                                             │
│  1. Laptop Computer                   $599  │
│     SKU: ELEC-001 | [+]  2  [-] [🗑️]      │
│     Subtotal: $1,198.00                     │
│                                             │
│  2. Wireless Mouse                     $30  │
│     SKU: ELEC-045 | [+]  1  [-] [🗑️]      │
│     Subtotal: $30.00                        │
│                                             │
│  3. USB Cable                           $9  │
│     SKU: ACC-012  | [+]  1  [-] [🗑️]      │
│     Subtotal: $9.00                         │
│                                             │
├─────────────────────────────────────────────┤
│  Subtotal:                        $1,237.00 │
│  Tax (8.5%):                        $105.15 │
│  ─────────────────────────────────────────  │
│  TOTAL:                           $1,342.15 │
├─────────────────────────────────────────────┤
│  [ CASH 💵 ] [ CARD 💳 ] [ CHECK 🧾 ]      │
│  [ DISCOUNT ] [ VOID ] [ PARK ] [ CLEAR ]   │
└─────────────────────────────────────────────┘
```

**Footer/Status Bar (40px height):**
```
┌──────────────────────────────────────────────────────────────────┐
│ ✅ Online | Last Sync: 10:29 AM | Pending: 0 | Help (F1)        │
└──────────────────────────────────────────────────────────────────┘
```

**Keyboard Shortcuts:**
- F1: Help
- F2: Search (focus search bar)
- F3: Quick scan (barcode input)
- F4: Cash payment
- F5: Card payment
- F6: Discount
- F7: Void transaction
- F8: Park transaction
- F9: Recall parked transaction
- Esc: Clear cart (with confirmation)
- Enter: Checkout (when cart not empty)

---

### 3. Payment Screen

**Layout when payment method selected:**

```
┌─────────────────────────────────────────────┐
│           💳 CARD PAYMENT                   │
│                                             │
│    Total Amount Due: $1,342.15              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │   Waiting for customer...           │   │
│  │                                     │   │
│  │        [Card Reader Icon]           │   │
│  │                                     │   │
│  │   Please tap, insert, or swipe      │   │
│  │   your card on the terminal         │   │
│  │                                     │   │
│  │         [Spinner Animation]         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│     [CANCEL PAYMENT]                        │
└─────────────────────────────────────────────┘
```

**Cash Payment Modal:**

```
┌─────────────────────────────────────────────┐
│           💵 CASH PAYMENT                   │
│                                             │
│  Total Amount:              $1,342.15       │
│                                             │
│  Cash Tendered:                             │
│  ┌────────────────────────────────────┐    │
│  │  $                                 │    │
│  └────────────────────────────────────┘    │
│                                             │
│  Quick Amounts:                             │
│  [ $20 ] [ $50 ] [ $100 ] [ Exact ]        │
│                                             │
│  Change Due:              $0.00             │
│  ═══════════════════════════════════════   │
│                                             │
│     [COMPLETE SALE]   [CANCEL]              │
└─────────────────────────────────────────────┘
```

**Features:**
- Large, easy-to-read numbers (font-mono, 2-3x normal size)
- Auto-calculate change in real-time
- Quick amount buttons for common bills
- Number pad input support
- Validation (can't proceed if tendered < total)
- Print receipt option before completing

---

### 4. Receipt Preview Screen

```
┌─────────────────────────────────────────────┐
│  ✅ Transaction Complete!                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       [Company Logo]                │   │
│  │       Store Name                    │   │
│  │       123 Main Street               │   │
│  │       City, ST 12345                │   │
│  │       Tel: (555) 123-4567           │   │
│  │                                     │   │
│  │  Transaction #1234                  │   │
│  │  Date: Jan 13, 2026 10:30 AM        │   │
│  │  Cashier: John Doe                  │   │
│  │  Terminal: 1                        │   │
│  │  ─────────────────────────────────  │   │
│  │  1x Laptop Computer      $599.00    │   │
│  │  1x Wireless Mouse        $30.00    │   │
│  │  1x USB Cable              $9.00    │   │
│  │  ─────────────────────────────────  │   │
│  │  Subtotal:            $1,237.00     │   │
│  │  Tax (8.5%):            $105.15     │   │
│  │  TOTAL:               $1,342.15     │   │
│  │                                     │   │
│  │  Payment Method: Cash               │   │
│  │  Tendered: $1,400.00                │   │
│  │  Change: $57.85                     │   │
│  │  ─────────────────────────────────  │   │
│  │  Thank you for your purchase!       │   │
│  │  Return policy: 30 days             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [ 🖨️ PRINT ]  [ 📧 EMAIL ]  [ 💾 SAVE ]  │
│                                             │
│  [NEW TRANSACTION]                          │
└─────────────────────────────────────────────┘
```

**Features:**
- Receipt preview exactly as it will print
- Print, email, or save options
- Email modal prompts for customer email
- Auto-return to main screen after 10 seconds
- Option to reprint receipt from transaction history

---

### 5. Offline Mode Indicator

**Visual Feedback:**
- Red banner at top: "⚠️ OFFLINE MODE - Transactions will sync when connection restores"
- Status bar shows: "⚡ Offline | Pending: 5 transactions"
- Subtle orange/red tint on header
- Disable online-only features (live inventory sync, vendor lookup)
- Queue icon shows pending transaction count

**Reconnection:**
- Auto-detect connection restore
- Show syncing progress: "🔄 Syncing 5 transactions..."
- Success toast: "✅ All transactions synced successfully"

---

### 6. Product Search & Barcode Scanning

**Search Bar Features:**
- Auto-focus on page load
- Live search results (debounced, 300ms delay)
- Search by: Name, SKU, barcode, category
- Recent searches dropdown
- Clear button (X icon)

**Barcode Scanner:**
- Dedicated barcode input field (hidden, always focused)
- Beep sound on successful scan
- Visual confirmation (flash green border)
- Auto-add to cart on scan
- Error feedback if product not found

**Product Card (Grid View):**
```
┌────────────────┐
│  [Product Img] │
│                │
├────────────────┤
│ Product Name   │
│ $99.99         │
│ SKU: ABC-123   │
│ ⭐ 4.5 (23)    │
│ ✅ In Stock: 45│
│                │
│ [ADD TO CART]  │
└────────────────┘
```

**Product Card (List View):**
```
┌──────────────────────────────────────────────────┐
│ [IMG] │ Product Name              | $99.99      │
│       │ SKU: ABC-123              | ⭐ 4.5      │
│       │ Category: Electronics     | Stock: 45   │
│       │ [ADD TO CART] [DETAILS]                 │
└──────────────────────────────────────────────────┘
```

---

### 7. Error Handling

**Error Types & Messages:**

**Product Not Found:**
```
┌─────────────────────────────────────┐
│  ❌ Product Not Found               │
│                                     │
│  SKU "ABC-999" was not found       │
│  in the inventory.                  │
│                                     │
│  [SEARCH AGAIN]  [CANCEL]           │
└─────────────────────────────────────┘
```

**Insufficient Stock:**
```
┌─────────────────────────────────────┐
│  ⚠️ Low Stock Warning               │
│                                     │
│  Only 2 units available.            │
│  You're trying to add 5.            │
│                                     │
│  Add available quantity (2)?        │
│                                     │
│  [ADD 2 UNITS]  [CANCEL]            │
└─────────────────────────────────────┘
```

**Payment Failed:**
```
┌─────────────────────────────────────┐
│  ❌ Payment Failed                  │
│                                     │
│  Card was declined.                 │
│  Error: Insufficient funds          │
│                                     │
│  [TRY AGAIN]  [DIFFERENT METHOD]    │
└─────────────────────────────────────┘
```

**Timeout Errors:**
- 30-second timeout for payment processing
- Show spinner with countdown
- Auto-cancel and alert cashier on timeout

---

## Admin Dashboard UI/UX

### Screen Resolution & Layout

**Responsive Breakpoints:**
- Mobile: < 768px (stacked layout)
- Tablet: 768px - 1024px (simplified sidebar)
- Desktop: > 1024px (full layout)

**Layout Structure:**
```
┌───────────────────────────────────────────────────────────┐
│  Header (64px)                                            │
├─────────┬─────────────────────────────────────────────────┤
│         │                                                 │
│ Sidebar │  Main Content Area                              │
│ (240px) │                                                 │
│         │                                                 │
│ Nav     │  Breadcrumbs                                    │
│ Menu    │  ┌─────────────────────────────────────────┐   │
│         │  │  Page Content                           │   │
│         │  │                                         │   │
│         │  │                                         │   │
│         │  └─────────────────────────────────────────┘   │
│         │                                                 │
└─────────┴─────────────────────────────────────────────────┘
```

---

### 1. Dashboard Overview

**Header:**
```
┌──────────────────────────────────────────────────────────────┐
│ [🏪 Store Name]    [🔍 Search...]      🔔 👤 Admin ▼        │
└──────────────────────────────────────────────────────────────┘
```

**Sidebar Navigation:**
```
┌─────────────────────┐
│ 📊 Dashboard        │
├─────────────────────┤
│ 📦 Inventory        │
│   └ Products        │
│   └ Categories      │
│   └ Vendors         │
│   └ Purchase Orders │
│   └ Receiving       │
│   └ Donations       │
│   └ Counts          │
│   └ Reconciliation  │
├─────────────────────┤
│ 💳 Sales            │
│   └ Transactions    │
│   └ Refunds         │
│   └ Reports         │
├─────────────────────┤
│ 💰 Accounting       │
│   └ Accounts Payable│
│   └ Vendor Payments │
│   └ Reconciliation  │
├─────────────────────┤
│ 👥 Users            │
│   └ Employees       │
│   └ Permissions     │
├─────────────────────┤
│ 🖥️ Terminals        │
├─────────────────────┤
│ 📈 Reports          │
├─────────────────────┤
│ ⚙️ Settings         │
└─────────────────────┘
```

**Dashboard Widgets:**

```
┌──────────────────────────────────────────────────────────┐
│  Dashboard Overview                    Jan 13, 2026      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │Today's Sales │ │Transactions  │ │Active        │    │
│  │              │ │              │ │Terminals     │    │
│  │  $12,450.75  │ │     127      │ │      4       │    │
│  │  +15% ↑      │ │  +8% ↑       │ │  Online ✅   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │Low Stock     │ │Pending POs   │ │Variances     │    │
│  │Items         │ │              │ │(This Week)   │    │
│  │      23      │ │       5      │ │      12      │    │
│  │  View ⚠️     │ │  Review →    │ │  Review ⚠️   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Sales Chart (Last 7 Days)                         │  │
│  │                                                   │  │
│  │  [Line Chart showing daily sales]                │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────┐ ┌──────────────────────────┐  │
│  │Recent Transactions  │ │Top Selling Products      │  │
│  │                     │ │                          │  │
│  │ #1234 - $150.00    │ │ 1. Laptop - 45 units    │  │
│  │ #1235 - $75.50     │ │ 2. Mouse - 38 units     │  │
│  │ #1236 - $200.00    │ │ 3. Keyboard - 32 units  │  │
│  │ View All →         │ │ View All →              │  │
│  └─────────────────────┘ └──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Real-time updating widgets
- Clickable widgets navigate to details
- Date range selector (Today, Week, Month, Custom)
- Refresh button for manual update
- Customizable widget layout (drag-and-drop)
- Export dashboard data

---

### 2. Product Management

**Product List View:**

```
┌──────────────────────────────────────────────────────────┐
│  Products                                                │
│  ┌────────────────────┐                                 │
│  │ 🔍 Search products │ [+ Add Product] [Import] [Export]│
│  └────────────────────┘                                 │
│                                                          │
│  Filters: [Category ▼] [Vendor ▼] [Status ▼] [Clear]   │
│                                                          │
│  Showing 50 of 1,247 products                            │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │☐│Img│ Name      │SKU    │Category│Price │Stock│⋮│  ││
│  ├──────────────────────────────────────────────────────┤│
│  │☐│📷 │Laptop     │ELEC-01│Electr. │$599  │ 45  │⋮│  ││
│  │☐│📷 │Mouse      │ELEC-02│Electr. │$30   │ 12⚠️│⋮│  ││
│  │☐│📷 │Keyboard   │ELEC-03│Electr. │$79   │ 67  │⋮│  ││
│  │☐│📷 │Monitor    │ELEC-04│Electr. │$250  │ 0❌ │⋮│  ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ← Prev  Page 1 of 25  Next →                           │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Bulk select (checkbox column)
- Bulk actions: Delete, Export, Change category, Adjust price
- Sortable columns (click header)
- Inline quick edit (double-click cell)
- Row actions menu (⋮): Edit, Duplicate, Delete, View history
- Stock level indicators (color-coded)
- Thumbnail image preview
- Pagination with page size selector

**Add/Edit Product Form:**

```
┌──────────────────────────────────────────────────────────┐
│  Add New Product                          [Save] [Cancel]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐  ┌─────────────────────────────┐   │
│  │                │  │ Product Information         │   │
│  │  [Upload Img]  │  │                             │   │
│  │  Click or      │  │ Product Name *              │   │
│  │  Drag & Drop   │  │ ┌─────────────────────────┐ │   │
│  │                │  │ │                         │ │   │
│  └────────────────┘  │ └─────────────────────────┘ │   │
│                      │                             │   │
│                      │ SKU *       Barcode         │   │
│                      │ ┌─────────┐ ┌─────────────┐ │   │
│                      │ │         │ │             │ │   │
│                      │ └─────────┘ └─────────────┘ │   │
│                      │                             │   │
│                      │ Category *    Vendor *      │   │
│                      │ ┌─────────┐ ┌─────────────┐ │   │
│                      │ │Select ▼ │ │Select ▼     │ │   │
│                      │ └─────────┘ └─────────────┘ │   │
│                      └─────────────────────────────┘   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Pricing                                            │ │
│  │                                                    │ │
│  │ Unit Cost      Base Price     Sale Price          │ │
│  │ ┌──────────┐  ┌──────────┐   ┌──────────┐        │ │
│  │ │ $        │  │ $        │   │ $        │        │ │
│  │ └──────────┘  └──────────┘   └──────────┘        │ │
│  │                                                    │ │
│  │ ☐ On Sale    Sale Start:  ┌──────┐  End: ┌──────┐│ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Inventory                                          │ │
│  │                                                    │ │
│  │ Current Stock   Reorder Point   Reorder Quantity │ │
│  │ ┌──────────┐   ┌──────────┐    ┌──────────┐     │ │
│  │ │          │   │          │    │          │     │ │
│  │ └──────────┘   └──────────┘    └──────────┘     │ │
│  │                                                    │ │
│  │ ☑ Track inventory  ☑ Allow backorders            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Description                                        │ │
│  │ ┌────────────────────────────────────────────────┐ │ │
│  │ │                                                │ │ │
│  │ │                                                │ │ │
│  │ └────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ☑ Active                                                │
│                                                          │
│  [SAVE PRODUCT]  [SAVE & ADD ANOTHER]  [CANCEL]         │
└──────────────────────────────────────────────────────────┘
```

**Validation:**
- Required fields marked with *
- Real-time validation
- Prevent duplicate SKU/Barcode
- Validate price formats
- Image size/format validation
- Auto-generate SKU option

---

### 3. Vendor Management

**Vendor List:**

```
┌──────────────────────────────────────────────────────────┐
│  Vendors & Donors                                        │
│  ┌───────────────────┐                                  │
│  │ 🔍 Search vendors │ [+ Add Vendor] [Import] [Export] │
│  └───────────────────┘                                  │
│                                                          │
│  Filters: [Type ▼] [Status ▼] [Rating ▼] [Clear]       │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │Vendor Name    │Type     │Balance │Total POs│Rating│⋮│││
│  ├──────────────────────────────────────────────────────┤│
│  │Tech Supply Co │Supplier │$5,200  │   12    │⭐⭐⭐⭐⭐│⋮│││
│  │Office Depot   │Supplier │$0      │   8     │⭐⭐⭐⭐ │⋮│││
│  │John Doe       │Donor    │$0      │   0     │⭐⭐⭐⭐⭐│⋮│││
│  │ABC Consign.   │Consign. │$1,800  │   3     │⭐⭐⭐  │⋮│││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ← Prev  Page 1 of 5  Next →                            │
└──────────────────────────────────────────────────────────┘
```

**Vendor Detail View:**

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Vendors                       [Edit] [Delete] │
│                                                          │
│  Tech Supply Company                    ⭐⭐⭐⭐⭐ (12)    │
│  Vendor #: V-00123 | Type: Supplier | Status: Active    │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐│
│  │Balance Due     │  │Total Purchased │  │Total POs    ││
│  │  $5,200.00     │  │   $125,000     │  │     12      ││
│  └────────────────┘  └────────────────┘  └─────────────┘│
│                                                          │
│  📋 Tabs: [Info] [Purchase Orders] [Invoices] [Payments]│
│                    [Products] [Documents] [Notes]        │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Contact Information                                  ││
│  │                                                      ││
│  │ Contact Person: Jane Smith                          ││
│  │ Email: jane@techsupply.com                          ││
│  │ Phone: (555) 123-4567                               ││
│  │ Address: 123 Tech Street, Silicon Valley, CA 94025  ││
│  │                                                      ││
│  │ Payment Terms: Net 30                               ││
│  │ Credit Limit: $10,000                               ││
│  │ Preferred Vendor: ☑                                 ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Recent Purchase Orders                                  │
│  ┌──────────────────────────────────────────────────────┐│
│  │PO #    │Date      │Total    │Status     │Action    │││
│  ├──────────────────────────────────────────────────────┤││
│  │PO-0045│12/15/2025│$2,500.00│Received   │View →    │││
│  │PO-0043│12/01/2025│$1,800.00│Partial    │View →    │││
│  │PO-0040│11/20/2025│$3,200.00│Received   │View →    │││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

### 4. Purchase Order Management

**Create Purchase Order:**

```
┌──────────────────────────────────────────────────────────┐
│  Create Purchase Order                   [Save] [Cancel] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PO Number: PO-0046 (auto)    Date: Jan 13, 2026        │
│                                                          │
│  Vendor *                      Expected Delivery         │
│  ┌──────────────────────────┐ ┌─────────────────────┐   │
│  │ Select Vendor ▼          │ │ Jan 20, 2026        │   │
│  └──────────────────────────┘ └─────────────────────┘   │
│                                                          │
│  Shipping Address              Payment Terms             │
│  ┌──────────────────────────┐ ┌─────────────────────┐   │
│  │ (Auto-filled from vendor)│ │ Net 30              │   │
│  └──────────────────────────┘ └─────────────────────┘   │
│                                                          │
│  Line Items                              [+ Add Item]    │
│  ┌──────────────────────────────────────────────────────┐│
│  │Product     │SKU    │Qty │Unit Cost│Total    │Actions│││
│  ├──────────────────────────────────────────────────────┤││
│  │Laptop      │ELEC-01│ 10 │$500.00  │$5,000.00│[🗑️]  │││
│  │Mouse       │ELEC-02│ 50 │$25.00   │$1,250.00│[🗑️]  │││
│  │            │       │    │         │         │       │││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Notes                                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Subtotal:                              $6,250.00        │
│  Tax:                                     $531.25        │
│  Shipping:                                 $50.00        │
│  ─────────────────────────────────────────────────       │
│  TOTAL:                                 $6,831.25        │
│                                                          │
│  [SAVE AS DRAFT]  [SUBMIT FOR APPROVAL]  [CANCEL]       │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Auto-fill vendor information
- Product search/select with autocomplete
- Inline quantity/price editing
- Real-time total calculation
- Approval workflow (draft → pending → approved)
- Email PO to vendor
- Print PO as PDF
- Clone existing PO

---

### 5. Inventory Receiving

**Receiving Screen:**

```
┌──────────────────────────────────────────────────────────┐
│  Receive Inventory           PO-0046 | Tech Supply Co.  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PO Date: Jan 13, 2026       Expected: Jan 20, 2026     │
│  Actual Delivery: [Jan 18, 2026 ▼]                      │
│                                                          │
│  Items to Receive                                        │
│  ┌──────────────────────────────────────────────────────┐│
│  │Product  │SKU   │Ordered│Received│Accept│Damaged│Notes│││
│  ├──────────────────────────────────────────────────────┤││
│  │Laptop   │ELEC-01│ 10   │ [  ]   │ [  ] │ [  ]  │📝  │││
│  │Mouse    │ELEC-02│ 50   │ [  ]   │ [  ] │ [  ]  │📝  │││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Receiving Notes                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │ All items received in good condition                 ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Attach Documents                                        │
│  ┌──────────────────────────────────────────────────────┐│
│  │ [📎 Upload packing slip, invoice, photos...]        ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Received by: John Doe         Signature: [Draw] [Clear]│
│                                                          │
│  [COMPLETE RECEIVING]  [SAVE AS PARTIAL]  [CANCEL]      │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Compare ordered vs received quantities
- Track damaged/rejected items
- Photo upload for damaged goods
- Digital signature capture
- Partial receiving support
- Auto-update inventory on completion
- Generate packing slip variance report
- Create return/credit memo for discrepancies

---

### 6. Physical Inventory Count

**Count Session List:**

```
┌──────────────────────────────────────────────────────────┐
│  Physical Inventory Counts           [+ New Count]       │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │Count #│Date      │Type  │Status    │Counted│Actions │││
│  ├──────────────────────────────────────────────────────┤││
│  │CNT-012│1/13/2026│Full  │In Progress│45%    │Resume→ │││
│  │CNT-011│1/10/2026│Cycle │Completed │100%   │View →  │││
│  │CNT-010│1/8/2026 │Spot  │Completed │100%   │View →  │││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Create Count Session:**

```
┌──────────────────────────────────────────────────────────┐
│  Create Physical Count Session          [Create] [Cancel]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Count Type *                                            │
│  ○ Full Count (all products)                             │
│  ○ Cycle Count (by category or location)                 │
│  ○ Spot Check (specific items)                           │
│                                                          │
│  Count Date *                                            │
│  ┌────────────────────┐                                  │
│  │ Jan 13, 2026       │                                  │
│  └────────────────────┘                                  │
│                                                          │
│  Assigned Counters *                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [Select employees...] ▼                            │  │
│  │ ✓ John Doe    ✓ Jane Smith    □ Bob Johnson       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Count Options                                           │
│  ☑ Blind count (hide system quantities)                  │
│  ☑ Require recount for variances > 5%                    │
│  ☑ Mobile app enabled                                    │
│  ☐ Freeze inventory during count                         │
│                                                          │
│  Categories (for Cycle Count)                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ □ Electronics  □ Furniture  □ Clothing            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Specific Products (for Spot Check)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [Search and add products...]                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [CREATE COUNT SESSION]  [CANCEL]                        │
└──────────────────────────────────────────────────────────┘
```

**Count Entry Interface:**

```
┌──────────────────────────────────────────────────────────┐
│  Physical Count - CNT-012               Progress: 45%    │
│  Full Count | Started: Jan 13, 10:00 AM | By: John Doe  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🔍 [Search or scan product...]                          │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │Product       │SKU    │System│Counted│Variance│Status │││
│  ├──────────────────────────────────────────────────────┤││
│  │Laptop        │ELEC-01│  45  │ [  ] │   -    │📝    │││
│  │Mouse         │ELEC-02│  12  │  10  │  -2 ⚠️ │✓     │││
│  │Keyboard      │ELEC-03│  67  │  67  │   0    │✓     │││
│  │Monitor       │ELEC-04│  23  │  25  │  +2 ⚠️ │✓     │││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Items Counted: 234 / 520                                │
│  Items with Variance: 12                                 │
│                                                          │
│  [SAVE PROGRESS]  [COMPLETE COUNT]  [PAUSE]              │
└──────────────────────────────────────────────────────────┘
```

---

### 7. Reconciliation & Variance Analysis

**Reconciliation Review:**

```
┌──────────────────────────────────────────────────────────┐
│  Reconciliation Review - CNT-012                         │
│  Full Count | Completed: Jan 13, 2026 3:45 PM           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │Total Items   │ │Items with    │ │Total Cost    │    │
│  │Counted       │ │Variance      │ │Impact        │    │
│  │    520       │ │     12       │ │  -$1,245.00  │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  Filter: [All ▼] [Overages] [Shortages] [>5% variance]  │
│                                                          │
│  Items Requiring Attention                               │
│  ┌──────────────────────────────────────────────────────┐│
│  │Product  │System│Counted│Var│%    │Cost    │Action  │││
│  ├──────────────────────────────────────────────────────┤││
│  │Laptop   │ 45  │ 43    │-2 │-4.4%│-$1,000 │Recount │││
│  │Mouse    │ 12  │ 10    │-2 │-16%⚠│  -$50  │Recount │││
│  │Monitor  │ 23  │ 25    │+2 │+8.7%│ +$400  │Approve │││
│  │Cable    │100  │ 95    │-5 │-5.0%│  -$25  │Approve │││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Manager Notes                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Laptop shortage may be due to unreported damage.    ││
│  │ Will investigate further.                            ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Adjustment Details                                      │
│  Reason Code: [Shrinkage - Theft ▼]                     │
│                                                          │
│  [APPROVE SELECTED]  [REJECT SELECTED]  [REQUEST RECOUNT]│
│  [APPROVE ALL]  [EXPORT REPORT]                          │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Visual variance indicators (color-coded)
- Threshold-based filtering
- Bulk approval/rejection
- Reason code requirement
- Cost impact calculation
- Historical variance trending
- Recount workflow
- Automatic inventory adjustment creation

---

### 8. Reporting Dashboard

**Report Builder:**

```
┌──────────────────────────────────────────────────────────┐
│  Reports                                                 │
│                                                          │
│  Report Type                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Sales   │ │Inventory│ │Financial│ │ Custom  │       │
│  │ 📊     │ │ 📦     │ │ 💰     │ │ ⚙️     │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                          │
│  Quick Reports                                           │
│  • Daily Sales Summary                                   │
│  • Low Stock Report                                      │
│  • Variance Analysis                                     │
│  • Top Selling Products                                  │
│  • Vendor Purchase Summary                               │
│  • Accounts Payable Aging                                │
│                                                          │
│  Custom Report Builder                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Report Name: [Monthly Sales Analysis________]       ││
│  │                                                      ││
│  │ Date Range: [Jan 1, 2026] to [Jan 31, 2026]        ││
│  │                                                      ││
│  │ Data Source:                                        ││
│  │ ☑ Transactions  ☑ Products  □ Vendors              ││
│  │                                                      ││
│  │ Grouping: [By Category ▼]                          ││
│  │                                                      ││
│  │ Filters:                                            ││
│  │ Category: [All ▼]                                   ││
│  │ Terminal: [All ▼]                                   ││
│  │                                                      ││
│  │ Visualization:                                      ││
│  │ ○ Table  ○ Bar Chart  ○ Line Chart  ○ Pie Chart   ││
│  │                                                      ││
│  │ [GENERATE REPORT]  [SAVE TEMPLATE]                 ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Saved Report Templates (3)                              │
│  • Monthly Reconciliation Summary                        │
│  • Quarterly Vendor Performance                          │
│  • Annual Donation Tax Summary                           │
└──────────────────────────────────────────────────────────┘
```

**Report Output:**

```
┌──────────────────────────────────────────────────────────┐
│  Monthly Sales Analysis - January 2026                   │
│  Generated: Jan 13, 2026 4:30 PM                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [Table View] [Chart View] [📥 Export] [🖨️ Print]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Summary                                                 │
│  Total Sales: $125,450.75                                │
│  Total Transactions: 1,247                               │
│  Average Transaction: $100.60                            │
│                                                          │
│  Sales by Category                                       │
│  ┌──────────────────────────────────────────────────────┐│
│  │ [Bar Chart Visualization]                            ││
│  │                                                      ││
│  │  Electronics  ████████████████  $45,000  (36%)      ││
│  │  Furniture    ██████████        $28,500  (23%)      ││
│  │  Clothing     ████████          $22,800  (18%)      ││
│  │  Home Goods   ██████            $17,100  (14%)      ││
│  │  Other        ████              $12,050   (9%)      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Detailed Breakdown                                      │
│  ┌──────────────────────────────────────────────────────┐│
│  │Category    │Units Sold│Revenue   │Profit   │Margin │││
│  ├──────────────────────────────────────────────────────┤││
│  │Electronics │   452    │$45,000.00│$12,500  │27.8%  │││
│  │Furniture   │   123    │$28,500.00│$8,200   │28.8%  │││
│  │Clothing    │   834    │$22,800.00│$9,800   │43.0%  │││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  [📧 Email Report]  [💾 Save Template]  [🔄 Schedule]   │
└──────────────────────────────────────────────────────────┘
```

---

### 9. Settings & Configuration

**Settings Navigation:**

```
┌──────────────────────────────────────────────────────────┐
│  Settings                                                │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🏪 General                                          │ │
│  │    Store information, business hours, contact       │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 💳 Payment                                          │ │
│  │    Payment processors, tax rates, receipt settings  │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 📦 Inventory                                        │ │
│  │    Stock alerts, valuation method, reconciliation   │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🖥️ Terminals                                        │ │
│  │    Terminal settings, hardware, offline mode        │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 👥 Users & Permissions                             │ │
│  │    Roles, permissions, authentication               │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🔔 Notifications                                    │ │
│  │    Email alerts, SMS, push notifications            │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🔐 Security                                         │ │
│  │    Password policy, 2FA, audit logs                 │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🔌 Integrations                                     │ │
│  │    Square, accounting software, email               │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 📄 Documents & Templates                           │ │
│  │    Receipt templates, invoice formats, email        │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🛠️ Advanced                                         │ │
│  │    Database, API, developer settings                │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Example - Inventory Settings:**

```
┌──────────────────────────────────────────────────────────┐
│  Inventory Settings                   [Save Changes]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Stock Management                                        │
│  ┌──────────────────────────────────────────────────────┐│
│  │ ☑ Track inventory quantities                        ││
│  │ ☑ Allow negative stock (backorders)                 ││
│  │ ☑ Reserve stock for pending orders                  ││
│  │                                                      ││
│  │ Low Stock Threshold                                 ││
│  │ ┌─────────┐ units or ┌─────┐ %                     ││
│  │ │    10   │          │     │                       ││
│  │ └─────────┘          └─────┘                       ││
│  │                                                      ││
│  │ Out of Stock Action                                 ││
│  │ ○ Hide from POS                                     ││
│  │ ● Show but don't allow purchase                     ││
│  │ ○ Show and allow backorder                          ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Valuation Method                                        │
│  ┌──────────────────────────────────────────────────────┐│
│  │ ● FIFO (First In, First Out)                        ││
│  │ ○ LIFO (Last In, First Out)                         ││
│  │ ○ Weighted Average Cost                             ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Physical Count Settings                                 │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Default variance threshold: ┌──┐ %                  ││
│  │                             │ 5│                     ││
│  │                             └──┘                     ││
│  │ ☑ Require manager approval for adjustments > $100   ││
│  │ ☑ Mandatory reason codes for adjustments            ││
│  │ ☑ Freeze inventory during full counts               ││
│  │                                                      ││
│  │ Auto-schedule counts:                               ││
│  │ Full Count: [Monthly ▼]  on [1st of month ▼]       ││
│  │ Cycle Count: [Weekly ▼]   on [Monday ▼]            ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  [SAVE CHANGES]  [RESTORE DEFAULTS]                      │
└──────────────────────────────────────────────────────────┘
```

---

## Mobile Count App UI/UX

### Platform & Design

**Target Platforms:**
- iOS 14+
- Android 8.0+
- Responsive web (fallback)

**Screen Sizes:**
- Phone: 375px - 428px width
- Tablet: 768px - 1024px width

---

### 1. Login Screen (Mobile)

```
┌────────────────────┐
│   [Company Logo]   │
│                    │
│  ┌──────────────┐  │
│  │ Username     │  │
│  └──────────────┘  │
│                    │
│  ┌──────────────┐  │
│  │ Password  👁️ │  │
│  └──────────────┘  │
│                    │
│  ┌──────────────┐  │
│  │   LOGIN      │  │
│  └──────────────┘  │
│                    │
│  Version 2.0       │
│  ⚡ Offline Ready  │
└────────────────────┘
```

---

### 2. Count Session Selection

```
┌────────────────────┐
│ ← Physical Counts  │
├────────────────────┤
│                    │
│  Active Sessions   │
│                    │
│  ┌──────────────┐  │
│  │ Full Count   │  │
│  │ CNT-012      │  │
│  │ Started:10am │  │
│  │ Progress: 45%│  │
│  │              │  │
│  │ [RESUME →]   │  │
│  └──────────────┘  │
│                    │
│  ┌──────────────┐  │
│  │ Cycle Count  │  │
│  │ CNT-013      │  │
│  │ Started:11am │  │
│  │ Progress: 12%│  │
│  │              │  │
│  │ [RESUME →]   │  │
│  └──────────────┘  │
│                    │
│  [+ NEW COUNT]     │
└────────────────────┘
```

---

### 3. Barcode Scanning Interface

```
┌────────────────────────┐
│ ← Back    CNT-012  ⋮   │
├────────────────────────┤
│                        │
│  ┌──────────────────┐  │
│  │                  │  │
│  │  [Camera View]   │  │
│  │                  │  │
│  │  [Scan Frame]    │  │
│  │                  │  │
│  │  Scan barcode or │  │
│  │  enter manually  │  │
│  └──────────────────┘  │
│                        │
│  [🔦 Flash]  [🔄 Flip] │
│                        │
│  Or enter SKU:         │
│  ┌──────────────────┐  │
│  │ [Manual Entry__]│  │
│  └──────────────────┘  │
│                        │
│  Items: 45/520        │
│  [Variance: 3 ⚠️]     │
│                        │
│  [VIEW LIST]           │
└────────────────────────┘
```

**Features:**
- Real-time barcode detection
- Auto-focus and tap-to-focus
- Flashlight toggle
- Front/rear camera switch
- Beep on successful scan
- Vibration feedback
- Manual SKU entry fallback
- Offline support with queue

---

### 4. Count Entry (Manual)

```
┌────────────────────────┐
│ ← Back         [Save]  │
├────────────────────────┤
│                        │
│  Product Found         │
│                        │
│  ┌──────────────────┐  │
│  │  [Product Img]   │  │
│  └──────────────────┘  │
│                        │
│  Laptop Computer       │
│  SKU: ELEC-001         │
│                        │
│  System Quantity: 45   │
│  (Hidden in blind count)│
│                        │
│  Physical Count:       │
│  ┌────────────────────┐ │
│  │   [-]  43  [+]    │ │
│  └────────────────────┘ │
│                        │
│  Notes (optional):     │
│  ┌──────────────────┐  │
│  │ Minor damage on  │  │
│  │ 2 units          │  │
│  └──────────────────┘  │
│                        │
│  [📷 Add Photo]        │
│                        │
│  [SAVE & NEXT]         │
│  [SAVE & SCAN]         │
└────────────────────────┘
```

**Features:**
- Large increment/decrement buttons
- Numeric keypad option
- Photo capture for damage
- Voice notes support
- Previous/next product navigation
- Offline mode with sync queue
- Progress indicator

---

### 5. Count List View

```
┌────────────────────────┐
│ ← Back    🔍 ⚙️        │
├────────────────────────┤
│  Progress: 45%         │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░  │
│                        │
│  🔽 Filter: All        │
│                        │
│  ┌──────────────────┐  │
│  │ ✓ Laptop      43 │  │
│  │   vs 45   -2 ⚠️  │  │
│  │   ELEC-001       │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ ✓ Mouse       10 │  │
│  │   vs 12   -2 ⚠️  │  │
│  │   ELEC-002       │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │   Keyboard       │  │
│  │   Not Counted    │  │
│  │   ELEC-003       │  │
│  └──────────────────┘  │
│                        │
│  [📷 SCAN MORE]        │
│  [COMPLETE COUNT]      │
└────────────────────────┘
```

**Filters:**
- All items
- Counted
- Not counted
- With variance
- With photos/notes

---

### 6. Offline Mode Indicator

```
┌────────────────────────┐
│ ⚡ OFFLINE MODE        │
├────────────────────────┤
│                        │
│  Count data is being   │
│  saved locally.        │
│                        │
│  ✓ 45 items counted    │
│  📦 Queued for sync    │
│                        │
│  Data will sync when   │
│  connection restores.  │
│                        │
│  [VIEW QUEUE]          │
└────────────────────────┘
```

**Auto-sync when online:**
- Background sync
- Progress notification
- Success/error feedback
- Retry failed syncs

---

## User Workflows

### Workflow 1: Process a Sale (Cashier)

```
1. Login to POS Terminal
   └→ Enter credentials
   └→ Select terminal
   └→ Click Login

2. Search for Product
   └→ Type product name/SKU
   OR
   └→ Scan barcode (F3)
   OR
   └→ Browse catalog grid

3. Add to Cart
   └→ Click product card
   └→ Adjust quantity (+/-)
   └→ Repeat for multiple items

4. Apply Discount (optional)
   └→ Click [DISCOUNT]
   └→ Enter % or $ amount
   └→ Requires manager approval

5. Proceed to Payment
   └→ Review cart totals
   └→ Select payment method:
      • CASH → Enter tendered → Calculate change → Complete
      • CARD → Wait for terminal → Tap/insert/swipe → Complete
      • CHECK → Enter check # → Complete

6. Complete Transaction
   └→ Receipt auto-printed
   └→ Option to email
   └→ Transaction logged
   └→ Inventory auto-updated

7. Start New Transaction
   └→ Cart auto-clears
   └→ Ready for next customer
```

**Edge Cases:**
- **Out of Stock:** Show warning, allow backorder if enabled
- **Low Stock:** Show count, proceed if sufficient
- **Payment Fails:** Retry or select different method
- **Void Transaction:** Manager approval required (PIN/password)
- **Offline Mode:** Queue transaction, sync when online

---

### Workflow 2: Create Purchase Order (Manager)

```
1. Navigate to Purchase Orders
   └→ Sidebar: Inventory → Purchase Orders

2. Click [+ New Purchase Order]

3. Select Vendor
   └→ Search vendor dropdown
   └→ Auto-fill: Contact, payment terms

4. Set Delivery Details
   └→ Expected delivery date
   └→ Shipping address (default or custom)

5. Add Line Items
   └→ Click [+ Add Item]
   └→ Search product
   └→ Enter quantity
   └→ Enter unit cost
   └→ Auto-calculate line total
   └→ Repeat for all items

6. Add Notes (optional)
   └→ Special instructions
   └→ Internal notes

7. Review Totals
   └→ Subtotal
   └→ Tax (auto-calculated)
   └→ Shipping
   └→ Total

8. Save or Submit
   └→ [SAVE AS DRAFT] → Editable later
   OR
   └→ [SUBMIT FOR APPROVAL] → Notify approver

9. Post-Approval Actions
   └→ Email PO to vendor
   └→ Print PO as PDF
   └→ Track PO status
```

---

### Workflow 3: Receive Inventory (Manager)

```
1. Navigate to Receiving
   └→ Sidebar: Inventory → Receiving

2. Select Pending PO
   └→ List shows "Approved" POs
   └→ Click [RECEIVE] on PO row

3. Verify Delivery Details
   └→ Actual delivery date (auto: today)
   └→ Packing slip number

4. Count Each Item
   └→ For each line item:
      └→ Compare physical count vs ordered
      └→ Enter "Received" quantity
      └→ Mark damaged/rejected units
      └→ Add notes if discrepancy

5. Document Issues
   └→ Take photos of damaged goods
   └→ Upload packing slip
   └→ Note any missing items

6. Add Signature
   └→ Draw digital signature
   └→ Confirms receipt

7. Complete or Partial
   └→ [COMPLETE] if all received
   OR
   └→ [PARTIAL] if some items pending
      └→ PO remains "Partial" status
      └→ Can receive remainder later

8. Auto-Updates
   └→ Inventory quantities updated
   └→ PO marked as "Received" or "Partial"
   └→ Creates AP invoice (if enabled)
   └→ Notifications sent
```

---

### Workflow 4: Physical Inventory Count (Mobile)

```
1. Login to Mobile App
   └→ Enter credentials

2. Select Count Session
   └→ View active sessions
   └→ Click [RESUME] on assigned session
   OR
   └→ [+ NEW COUNT] if authorized

3. Scan or Search Products
   └→ Point camera at barcode
   └→ Auto-scan and show product
   OR
   └→ Manual SKU entry

4. Enter Physical Count
   └→ View product details
   └→ System quantity (if not blind count)
   └→ Use [+/-] or keypad to enter count
   └→ Add notes if needed
   └→ Take photo if damaged

5. Save and Continue
   └→ [SAVE & SCAN] → Ready for next barcode
   OR
   └→ [SAVE & NEXT] → Manual list navigation

6. Track Progress
   └→ View progress % in header
   └→ Filter counted/uncounted
   └→ See variance warnings

7. Complete Count
   └→ Review items with variance
   └→ Click [COMPLETE COUNT]
   └→ Confirm completion

8. Manager Review
   └→ Count moves to "Completed" status
   └→ Manager reviews in dashboard
   └→ Approves/rejects adjustments
```

---

### Workflow 5: Reconcile Inventory (Manager)

```
1. Navigate to Reconciliation
   └→ Sidebar: Inventory → Reconciliation

2. Select Completed Count
   └→ List shows "Completed" counts
   └→ Click count to review

3. Review Summary
   └→ Total items counted
   └→ Items with variance
   └→ Total cost impact

4. Filter Variances
   └→ View all OR
   └→ Filter by threshold (>5%)
   └→ Filter overages/shortages

5. Investigate Discrepancies
   └→ Click on variance item
   └→ View count details
   └→ Check counter notes/photos
   └→ Review transaction history
   └→ Identify cause

6. Take Action per Item
   └→ [APPROVE] → Accept count, adjust inventory
   └→ [RECOUNT] → Flag for recount
   └→ [REJECT] → Keep system quantity
   └→ Add manager notes
   └→ Select reason code (required)

7. Bulk Actions
   └→ Select multiple items (checkbox)
   └→ [APPROVE SELECTED]
   OR
   └→ [APPROVE ALL] → Approve entire count

8. Finalize Reconciliation
   └→ Review all decisions
   └→ Click [FINALIZE]
   └→ Confirm adjustment

9. Auto-Processing
   └→ Creates inventory adjustments
   └→ Updates product quantities
   └→ Logs audit trail
   └→ Generates reconciliation report
   └→ Sends notifications
```

---

## Accessibility & Responsiveness

### WCAG 2.1 AA Compliance

#### 1. Perceivable

**Color Contrast:**
```css
/* Minimum contrast ratios */
--text-on-background: 4.5:1 (normal text)
--large-text-on-background: 3:1 (18pt+ or 14pt+ bold)

/* Examples */
--gray-900-on-white: 16.8:1 ✓
--primary-500-on-white: 4.93:1 ✓
--gray-500-on-white: 4.52:1 ✓
```

**Visual Alternatives:**
- Icons always paired with text labels
- Color not sole indicator (use icons + text)
- Charts include patterns in addition to colors
- Form errors: red border + error icon + text message

**Text Resizing:**
- Support up to 200% zoom without loss of functionality
- Relative units (rem, em) instead of px
- Reflow content at different viewport sizes
- No horizontal scrolling at 320px width (mobile)

---

#### 2. Operable

**Keyboard Navigation:**
```javascript
// Tab order
1. Skip to main content link
2. Header navigation
3. Main content (logical order)
4. Form fields (top to bottom)
5. Buttons and links
6. Footer

// Keyboard shortcuts
Tab → Next focusable element
Shift + Tab → Previous element
Enter/Space → Activate button/link
Escape → Close modal/dropdown
Arrow keys → Navigate lists/menus
Home/End → First/last item
```

**Focus Indicators:**
```css
:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Custom focus ring */
.custom-focus:focus {
  box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.3);
}
```

**Touch Targets:**
- Minimum size: 44x44px
- Adequate spacing between clickable elements
- Large buttons on POS terminal (touch-friendly)
- Swipe gestures have alternatives (buttons)

---

#### 3. Understandable

**Clear Labels:**
```html
<!-- Form labels always present -->
<label for="product-name">Product Name *</label>
<input id="product-name" type="text" required>

<!-- Button text descriptive -->
<button>Save Product</button> <!-- ✓ -->
<button>Submit</button> <!-- ✗ Less clear -->

<!-- Error messages specific -->
<span class="error">
  Product name must be at least 3 characters
</span>
```

**Consistent Navigation:**
- Sidebar menu always in same position
- Breadcrumbs for deep navigation
- Consistent button placement (Save right, Cancel left)
- Predictable interactions

**Error Prevention:**
- Confirmation dialogs for destructive actions
- Validation before submission
- Undo capabilities where possible
- Clear error messages with recovery steps

---

#### 4. Robust

**Semantic HTML:**
```html
<!-- Use semantic elements -->
<header>...</header>
<nav>...</nav>
<main>...</main>
<aside>...</aside>
<footer>...</footer>

<!-- Proper heading hierarchy -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>

<!-- ARIA labels when needed -->
<button aria-label="Close dialog">×</button>
<input type="search" aria-label="Search products">
```

**Screen Reader Support:**
```html
<!-- Live regions for updates -->
<div role="alert" aria-live="assertive">
  Transaction completed successfully!
</div>

<div role="status" aria-live="polite">
  Loading products...
</div>

<!-- Skip navigation -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<!-- Table accessibility -->
<table>
  <caption>Product Inventory</caption>
  <thead>
    <tr>
      <th scope="col">Product</th>
      <th scope="col">Stock</th>
    </tr>
  </thead>
</table>
```

---

### Responsive Design

#### Breakpoints

```css
/* Mobile first approach */

/* Small phones */
@media (min-width: 320px) {
  /* Base styles */
}

/* Phones */
@media (min-width: 480px) {
  /* Larger phone adjustments */
}

/* Tablets (portrait) */
@media (min-width: 768px) {
  /* 2-column layouts */
  /* Simplified sidebar */
}

/* Tablets (landscape) / Small laptops */
@media (min-width: 1024px) {
  /* 3-column layouts */
  /* Full sidebar */
}

/* Desktops */
@media (min-width: 1280px) {
  /* Full desktop experience */
}

/* Large screens */
@media (min-width: 1536px) {
  /* Max-width containers */
  /* More whitespace */
}
```

#### Mobile Adaptations

**Admin Dashboard Mobile:**
```
┌──────────────────┐
│ ☰  Dashboard  🔔 │  ← Hamburger menu, notifications
├──────────────────┤
│                  │
│  Stacked Cards   │  ← Vertical layout
│  ┌────────────┐  │
│  │ Today's    │  │
│  │ Sales      │  │
│  │ $12,450.75 │  │
│  └────────────┘  │
│                  │
│  ┌────────────┐  │
│  │ Trans.     │  │
│  │ 127        │  │
│  └────────────┘  │
│                  │
│  ┌────────────┐  │
│  │ Chart      │  │
│  │ [───]      │  │
│  └────────────┘  │
└──────────────────┘
```

**Table Responsiveness:**
```
Desktop: Full table with all columns
Tablet: Hide less important columns
Mobile: Card-based layout (stack rows as cards)
```

**Touch Optimizations:**
- Larger tap targets (minimum 44x44px)
- Swipe gestures (swipe row to reveal actions)
- Pull-to-refresh
- Bottom navigation bars (thumb-friendly)
- Avoid hover-only interactions

---

### Performance Considerations

**Loading Performance:**
- Lazy load images
- Code splitting (route-based)
- Tree shaking unused code
- Minimize bundle size
- CDN for static assets

**Perceived Performance:**
- Skeleton screens during load
- Optimistic UI updates
- Progressive enhancement
- Instant feedback on user actions

**Offline Performance:**
- Service worker caching
- IndexedDB for offline data
- Queue actions for sync
- Clear offline indicators

---

## Design Tokens Export

For developers, all design system values are available as:
- CSS variables (web)
- JavaScript constants (React/Vue)
- JSON file (programmatic access)
- Figma design file (designers)

**CSS Variables:**
```css
:root {
  /* All design tokens as CSS custom properties */
  --primary-500: #3f51b5;
  --space-4: 1rem;
  --text-base: 1rem;
  /* ... */
}
```

**JavaScript:**
```javascript
// tokens.js
export const colors = {
  primary: {
    500: '#3f51b5',
    700: '#283593',
    // ...
  },
  // ...
};

export const spacing = {
  4: '1rem',
  6: '1.5rem',
  // ...
};
```

---

## Document History

| Version | Date       | Changes                                                     |
|---------|------------|-------------------------------------------------------------|
| 2.0     | 2026-01-13 | Initial UI/UX design specifications for POS system v2.0     |

---

**Document Owner:** Design & Development Team
**Review Frequency:** Quarterly or with major feature releases
**Next Review:** 2026-04-13

**For Questions or Feedback:**
Contact the UX team or submit design suggestions via the project repository.
