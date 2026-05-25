# Expense Tracker - Premium Dashboard UI Style Guide

## 🎨 Modern Design System

This document outlines the enhanced premium dashboard design with smooth animations, glassmorphism effects, and fintech-style components.

---

## 📊 Color & Theme System

### CSS Variables

All colors are theme-aware and automatically adapt to the selected theme (light, dark, blue, green).

```css
/* Primary Colors */
--accent: #4F7CFF (main interactive color)
--accent-hover: #3F6FF0

/* Surface Colors */
--bg: Background color
--card: Card background
--surface: Elevated surface
--text: Primary text
--text-muted: Secondary text

/* Status Colors */
--success: #10b981 (green)
--warning: #fbbf24 (yellow)
--danger: #ef4444 (red)
```

### Using Themes
Themes are applied via `data-theme` attribute:
- `[data-theme="light"]` - Clean, airy workspace
- `[data-theme="dark"]` - Premium fintech terminal
- `[data-theme="blue"]` - Futuristic finance UI
- `[data-theme="green"]` - Emerald wealth dashboard

---

## ✨ Animation System

### Keyframe Animations

#### Entrance Animations
```css
.animate-in           /* fadeInUp - smooth fade with upward motion */
.animate-scale        /* scaleIn - scale from 0.92 to 1 */
.animate-bounce       /* bounceIn - playful entrance with scale bounce */
```

#### Continuous Animations
```css
.animate-float        /* Floating motion (3s loop) */
.float-animation      /* Alternative: 3-8px vertical float */
.pulse-animation      /* Soft opacity pulse */
```

#### Interactive Animations
```css
spin                  /* 360° rotation (0.8s) */
glowPulse            /* Box-shadow intensity pulse */
shimmer              /* Loading shimmer effect */
checkmarkBounce      /* Success indicator animation */
slideDown            /* Smooth dropdown entrance */
```

### Using Animations

```jsx
// In React component
<div className="card card--summary animate-in">
  <h3>My Card</h3>
</div>

// Multiple animations
<div className="animate-in animate-float">
  Floating card
</div>

// Staggered animations (add delay in CSS)
.card:nth-child(1) { animation-delay: 0s; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
```

---

## 🎯 Component Styling

### Cards

#### Basic Card
```jsx
<article className="card">
  <h3>Card Title</h3>
  <p>Card content</p>
</article>
```

Features:
- Glassmorphism with backdrop blur (18px)
- Hover lift effect (-4px)
- Floating glow on right corner
- Smooth shadow transitions

#### Summary Card
```jsx
<article className="card card--summary">
  <div className="card__icon card__icon--balance">💰</div>
  <h4 className="card-label">Balance</h4>
  <p className="card-value">₹12,450</p>
</article>
```

Features:
- Animated entrance (fadeInUp)
- Hover lift (-6px) with border glow
- Trend line at bottom
- Icon container with colored background

#### Highlight Card
```jsx
<article className="card card--summary card--highlight">
  <h3>Featured Card</h3>
</article>
```

Features:
- Gradient background (indigo to blue)
- White text
- Enhanced shadow effects
- Premium appearance

### Buttons

#### Primary Button
```jsx
<button className="btn btn--primary">Add Expense</button>
```

Features:
- Gradient background
- Hover lift (-2px)
- Shine effect on hover
- Enhanced shadow

#### Icon Button
```jsx
<button className="header-action">⚙️</button>
```

Features:
- 44x44px square
- Subtle border
- Scale effect (1.05) on hover
- Smooth transitions

#### Ghost Button
```jsx
<button className="btn btn--ghost">Learn More</button>
```

Features:
- Transparent background
- Colored border
- Hover fill animation

---

## 🎪 Loading & Empty States

### Loading Skeleton

```jsx
<div className="skeleton skeleton-card"></div>
<div className="skeleton skeleton-title" style={{ width: "75%" }}></div>
<div className="skeleton skeleton-text"></div>
```

Features:
- Shimmer animation (2s loop)
- Gradient background
- Adjustable width/height

### Loading Spinner

```jsx
<span className="loading-spinner"></span>
```

Features:
- CSS-only spinner
- Smooth 0.8s rotation
- No JavaScript required

### Loading Dots

```jsx
<div className="loading-dots">
  <span className="loading-dot"></span>
  <span className="loading-dot"></span>
  <span className="loading-dot"></span>
</div>
```

Features:
- Staggered pulse animation
- Clean and minimal
- Responsive sizing

### Empty State

```jsx
<div className="empty-state-container">
  <div className="empty-state-icon">📭</div>
  <h3 className="empty-state-title">No expenses yet</h3>
  <p className="empty-state-text">Create your first expense to get started</p>
  <button className="btn btn--primary">Add Expense</button>
</div>
```

Features:
- Centered layout
- Floating icon animation
- Clear call-to-action

---

## 🎯 Form Elements

### Input Focus States

All inputs enhance on focus:
```jsx
<input 
  className="expense-input"
  type="text"
  placeholder="Expense name"
/>
```

On focus:
- Border changes to accent color
- Glow box-shadow appears
- Element lifts slightly (-1px)
- Smooth transitions

### Date Input

```jsx
<input 
  className="date-input"
  type="date"
/>
```

Features:
- Rounded borders (16px)
- Soft background
- Enhanced focus state
- Smooth color transitions

### Input Group (with prefix)

```jsx
<div className="input-group">
  <span className="input-prefix">₹</span>
  <input type="number" placeholder="Amount" />
</div>
```

Features:
- Integrated prefix/suffix
- Single focus state for group
- Proper alignment

---

## 📱 Responsive Design

### Mobile-First Approach

```css
/* Base styles (mobile) */
.section__title { font-size: 1.1rem; }

/* Tablet and up */
@media (min-width: 640px) {
  .section__title { font-size: 1.2rem; }
}

/* Desktop and up */
@media (min-width: 900px) {
  .section__title { font-size: 1.35rem; }
}
```

### Sidebar on Mobile

```jsx
<button className="menu-toggle">☰</button>
<div className="sidebar-overlay" />
<aside className="sidebar">
  {/* Navigation */}
</aside>
```

Features:
- Hamburger menu on mobile
- Full-screen slide-out sidebar
- Semi-transparent backdrop
- Touch-friendly sizing

---

## 🎨 Hover & Transition Effects

### Hover Utilities

```jsx
// Lift effect (best for cards)
<div className="hover-lift">Lifts on hover</div>

// Glow effect (best for badges)
<div className="hover-glow">Glows on hover</div>

// Scale effect (best for buttons)
<div className="hover-scale">Scales on hover</div>
```

### Transition Speeds

```jsx
// Balanced transition (most common)
<div className="transition-all">Default 0.25s</div>

// Fast transitions (buttons)
<div className="transition-fast">0.15s ease-out</div>

// Slow transitions (complex animations)
<div className="transition-slow">0.35s ease</div>
```

---

## 🎯 Navigation Components

### Sidebar Navigation

```jsx
<nav className="sidebar__nav">
  <a href="#dashboard" className="nav-link is-active">
    📊 Dashboard
  </a>
  <a href="#expenses" className="nav-link">
    💸 Expenses
  </a>
</nav>
```

Features:
- Smooth hover translation (4px)
- Gradient active state
- SVG icon support
- Rounded appearance

### Quick Date Buttons

```jsx
<button className="quick-date-btn active">
  Today
</button>
<button className="quick-date-btn">
  This Week
</button>
```

Features:
- Scale and lift on hover
- Bounce animation on active
- Gradient background when active
- Smooth color transitions

---

## 📊 Data Display

### Recent Item

```jsx
<li className="recent-item">
  <div className="recent-item__name">
    Coffee Shop
    <span className="recent-item__meta">Today 10:30 AM</span>
  </div>
  <span className="recent-item__amount is-debit">-₹450</span>
</li>
```

Features:
- Hover translation (4px right)
- Smooth background transition
- Flex layout for alignment
- Color-coded amounts (credit/debit)

### Sender Item

```jsx
<li className="sender-item">
  <div className="sender-item__name">
    <div className="sender-item__avatar">MJ</div>
    <div className="sender-item__details">
      <strong>Mom</strong>
      <span className="sender-item__meta">2 transactions</span>
    </div>
  </div>
  <span className="sender-item__amount">+₹15,000</span>
</li>
```

Features:
- Animated entrance (fadeInUp)
- Colored avatar background
- Hover lift (-2px)
- Smooth border glow

---

## 🎯 Modal Dialogs

### Modal Structure

```jsx
<div className="modal-overlay is-open">
  <div className="modal">
    <header className="modal__header">
      <h3 className="modal__title">Edit Expense</h3>
      <button className="modal__close">&times;</button>
    </header>
    <div className="modal__body">
      {/* Content */}
    </div>
  </div>
</div>
```

Features:
- Smooth fade-in with scale animation
- Blur backdrop
- Rounded corners (28px)
- Enhanced shadows
- Close button with rotate effect

---

## 💡 Best Practices

### 1. Staggered Animations

For multiple similar elements, add staggered delays:

```jsx
<div className="card animate-in">
  {/* Delay applied through CSS nth-child */}
</div>
```

```css
.card:nth-child(1) { animation-delay: 0s; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
```

### 2. Combining Animations

Use multiple classes for complex animations:

```jsx
<div className="card animate-in hover-lift">
  Premium Card
</div>
```

### 3. Framer Motion Integration

The animation classes are compatible with Framer Motion if needed:

```jsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  className="animate-in"
>
  Animated Content
</motion.div>
```

### 4. Performance Tips

- Use GPU-accelerated properties: `transform`, `opacity`
- Avoid animating: `width`, `height`, `top`, `left`
- Use `will-change` sparingly for heavy animations
- Keep animations under 600ms for responsiveness

### 5. Accessibility

- Respect `prefers-reduced-motion` setting
- Ensure focus states are visible
- Use semantic HTML
- Test keyboard navigation

---

## 📦 Summary of New Utilities

| Class | Effect | Duration |
|-------|--------|----------|
| `.animate-in` | Fade up entrance | 0.5s |
| `.animate-scale` | Scale entrance | 0.4s |
| `.animate-bounce` | Bounce entrance | 0.6s |
| `.animate-float` | Continuous float | 3s |
| `.skeleton` | Shimmer loading | 2s |
| `.loading-spinner` | Rotating spinner | 0.8s |
| `.hover-lift` | Card lift effect | 0.25s |
| `.hover-glow` | Glow effect | 0.25s |
| `.hover-scale` | Scale up effect | 0.25s |
| `.transition-fast` | Fast animation | 0.15s |
| `.transition-slow` | Slow animation | 0.35s |

---

## 🚀 Getting Started

1. **Apply animations** to components using utility classes
2. **Theme colors** automatically adapt to current theme
3. **Hover states** work out of the box
4. **Responsive design** is mobile-first
5. **All animations** are GPU-optimized for performance

## 📝 Notes

- All animations use cubic-bezier easing for smooth motion
- Transitions respect the theme system
- Mobile responsiveness is built-in
- No breaking changes to existing functionality
- Fully backward compatible with existing components

---

**Version**: 1.0  
**Last Updated**: May 2026  
**Status**: Production Ready ✅
