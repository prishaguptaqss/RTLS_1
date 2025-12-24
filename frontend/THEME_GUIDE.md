# RTLS Application - Theme & Design System Guide

## Overview
This guide documents the comprehensive design system for the RTLS application, based on the Figma design with a dark sidebar and blue accent theme.

---

## Color Palette

### Primary Colors (Blue Accent)
- **Primary**: `#2563EB` - Main blue accent color
- **Primary Dark**: `#1D4ED8` - Darker blue for hover states
- **Primary Light**: `#60A5FA` - Lighter blue for highlights
- **Primary Hover**: `#3B82F6` - Interactive hover state

### Dark Sidebar Theme
- **Sidebar Background**: `#0F172A` - Deep navy/black
- **Sidebar Hover**: `#1E293B` - Subtle hover background
- **Sidebar Active**: `#1E293B` - Active item background
- **Sidebar Border**: `#1E293B` - Border color

### Main Background (Light Gray)
- **Main Background**: `#F8FAFC` - Light gray for main content
- **Card Background**: `#FFFFFF` - White cards
- **Secondary Background**: `#F1F5F9` - Light gray for alternates

### Text Colors
- **Primary Text**: `#0F172A` - Main text color
- **Secondary Text**: `#64748B` - Secondary/helper text
- **Light Text**: `#94A3B8` - Subtle text
- **Muted Text**: `#CBD5E1` - Very light text
- **White Text**: `#FFFFFF` - For dark backgrounds

### Border Colors
- **Border**: `#E2E8F0` - Standard borders
- **Light Border**: `#F1F5F9` - Subtle borders

### Status Colors
#### Success (Green)
- **Success**: `#10B981`
- **Success Background**: `#D1FAE5`
- **Success Text**: `#065F46`

#### Danger (Red)
- **Danger**: `#EF4444`
- **Danger Background**: `#FEE2E2`
- **Danger Text**: `#991B1B`

#### Warning (Orange)
- **Warning**: `#F59E0B`
- **Warning Background**: `#FEF3C7`
- **Warning Text**: `#92400E`

#### Info (Blue)
- **Info**: `#3B82F6`
- **Info Background**: `#DBEAFE`
- **Info Text**: `#1E40AF`

### Badge Colors (Low Opacity Backgrounds)
- **Blue Badge**: `rgba(37, 99, 235, 0.1)` background, `#2563EB` text
- **Green Badge**: `rgba(16, 185, 129, 0.1)` background, `#10B981` text
- **Gray Badge**: `rgba(100, 116, 139, 0.1)` background, `#64748B` text

### Shadows
- **Small**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Medium**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **Large**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`

---

## Typography

### Font Sizes
- **Page Title**: 28px, font-weight: 700
- **Page Subtitle**: 14px, font-weight: 500
- **Card Title**: 18px, font-weight: 700
- **Stat Card Title**: 13px, font-weight: 600, uppercase, letter-spacing: 0.5px
- **Stat Card Value**: 36px, font-weight: 700
- **Table Header**: 11px, font-weight: 700, uppercase, letter-spacing: 1px
- **Table Cell**: 14px, font-weight: 500
- **Button**: 14px, font-weight: 600
- **Badge**: 12px, font-weight: 600, letter-spacing: 0.3px

---

## Component Styles

### 1. Sidebar
**Design**: Dark navy background with blue accents
- Background: `#0F172A`
- Active item: Blue left border (3px) + lighter background
- Text: Light gray (`#CBD5E1`) → White on hover
- Logo: Blue (`#2563EB`), uppercase, bold

```css
.sidebar-link.active {
  background-color: #1E293B;
  color: #2563EB;
  border-left: 3px solid #2563EB;
}
```

### 2. Stat Cards
**Design**: White cards with large blue numbers, circular icons on the right
- Background: White with subtle border
- Shadow: Small shadow, medium on hover
- Layout: Content left, circular icon right
- Number: 36px, bold, blue
- Icon: Circular (56px), light gray background

```css
.stat-card {
  background: white;
  border: 1px solid #F1F5F9;
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
```

### 3. Tables
**Design**: Clean, borderless rows with subtle gray headers
- Header: Light gray background, uppercase, small font
- Rows: No bottom borders, light gray divider
- Hover: Light gray background
- Cells: 18px padding, medium font weight

```css
.table-head {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748B;
}
```

### 4. Badges (Soft Pill Style)
**Design**: Low opacity backgrounds with matching text color
- Border radius: 16px
- Padding: 6px 14px
- Font: 12px, bold, capitalize
- No borders

```css
.badge-blue {
  background: rgba(37, 99, 235, 0.1);
  color: #2563EB;
}
```

### 5. Buttons
**Design**: Rounded, bold, with hover effects

#### Primary Button
```css
.btn-primary {
  background: #2563EB;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-primary:hover {
  background: #3B82F6;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  color: #64748B;
  border: 1px solid #E2E8F0;
}
```

### 6. Forms
**Design**: Clean inputs with blue focus state
- Border: `#E2E8F0`
- Focus: Blue border + light blue shadow
- Border radius: 8px
- Padding: 10px 14px

```css
input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

---

## Layout Guidelines

### Spacing
- **Page Padding**: 32px-40px
- **Card Padding**: 24px
- **Grid Gap**: 24px
- **Element Gap**: 8px-12px (buttons), 16px-20px (sections)

### Border Radius
- **Cards**: 12px
- **Buttons**: 8px
- **Inputs**: 8px
- **Badges**: 16px (pill)
- **Circular Icons**: 50%

### Professional Space Utilization
1. **Full Width Layouts**: Use `max-width: 100%` for all pages
2. **Responsive Grids**: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`
3. **Generous Padding**: 32-40px on main content areas
4. **Clear Visual Hierarchy**: Large titles (28px), clear subtitles (14px)

---

## Implementation Checklist

When creating new components, ensure:
- [ ] Use CSS variables from `index.css`
- [ ] Apply shadow utilities (`--shadow-sm`, `--shadow-md`, `--shadow-lg`)
- [ ] Use border colors (`--border-color`, `--border-light`)
- [ ] Implement hover states with `transform: translateY(-1px)`
- [ ] Use soft pill badges with low opacity backgrounds
- [ ] Apply uppercase + letter-spacing to labels/headers
- [ ] Use blue (`#2563EB`) as the primary accent color
- [ ] Ensure dark sidebar has proper contrast with white text

---

## Quick Reference

### Most Common Classes
```css
/* Buttons */
.btn-primary
.btn-secondary
.btn-danger

/* Badges */
.badge-blue
.badge-green
.status-badge

/* Layout */
.page-header
.page-title
.page-subtitle

/* States */
.empty-state
.loading-state
.error-state
```

### CSS Variables to Use
```css
var(--primary)
var(--bg-card)
var(--bg-main)
var(--text-primary)
var(--text-secondary)
var(--border-light)
var(--shadow-sm)
```

---

## Future Component Guidelines

All future components should:
1. Match the **dark sidebar + blue accent** theme
2. Use **soft pill badges** with low opacity backgrounds
3. Implement **clean, borderless tables**
4. Use **circular icons** in stat cards (positioned right)
5. Apply **professional spacing** (full-width layouts, generous padding)
6. Include **smooth hover animations** (transform + shadow)
7. Use **uppercase headers** with letter-spacing for labels
8. Ensure **high contrast** for accessibility

---

**Last Updated**: December 2024
**Design System Version**: 2.0 (Figma Blue Theme)
