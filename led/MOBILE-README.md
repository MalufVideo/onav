# Mobile LED Calculator

## Overview

This is a mobile-optimized version of the LED Wall Calculator, specifically designed for iPhone and smartphone screens.

## Files

- **mobile.html** - Main mobile calculator page
- **mobile-styles.css** - Mobile-specific CSS with touch-friendly controls
- **mobile-calculator.js** - Simplified JavaScript logic for mobile

## Features

### Simplified Interface
- **Removed**: 3D visualization (too heavy for mobile)
- **Removed**: Technical details (resolution, power consumption)
- **Kept**: Essential inputs (LED size, mode selection, pricing)

### Touch-Friendly Design
- Large slider controls (40px touch targets)
- Bigger buttons and text
- Vertical stacking layout
- Optimized for iPhone screens (375px - 428px)

### Full Functionality
- LED Principal configuration (width, height)
- Teto/ceiling configuration (optional)
- 2D/3D mode selection
- RXII units adjustment (3D mode only)
- Backup server toggle
- Real-time price calculation
- Quote generation with authentication
- Date selection with Flatpickr
- Integration with Supabase for pricing and proposals

## Usage

### Access the Mobile Calculator

Navigate to: `/led/mobile.html`

Or create a mobile-specific route in your deployment.

### Responsive Design

The calculator automatically adapts to:
- Portrait mode (default)
- Landscape mode (compressed layout)
- Very small screens (< 375px)

### Features Hidden on Mobile

The following technical details are hidden to simplify the interface:
- LED resolution calculations
- Power consumption (max/average)
- Total weight
- Detailed processor specifications

### Features Visible on Mobile

Essential configuration:
- LED width and height sliders
- Module count display
- Mode selector (2D/3D)
- RXII unit selector (3D mode only)
- Complete pricing breakdown
- Total investment display

## Integration

The mobile calculator uses the same backend services:
- `quote-service.js` - Proposal management
- `auth.js` - Authentication
- `discount-calculator.js` - Multi-day pricing
- Supabase - Database and auth

## Customization

### Colors
Edit CSS variables in `mobile-styles.css`:
```css
:root {
  --accent-color: #fbbf24;
  --accent-strong: #f97316;
  /* ... */
}
```

### Slider Ranges
Edit HTML attributes in `mobile.html`:
```html
<input type="range" id="width" min="1" max="36" step="0.5" value="16">
```

### Pricing Logic
Edit calculations in `mobile-calculator.js`:
```javascript
calculateProcessors(totalModules) {
  return Math.ceil(totalModules / 100);
}
```

## Testing

Test on different screen sizes:
- iPhone SE (375px)
- iPhone 12/13/14 (390px)
- iPhone 14 Pro Max (428px)
- Android phones (360px - 412px)

Use Chrome DevTools device emulation for testing.

## Deployment

The mobile calculator can be:
1. Deployed alongside the desktop version
2. Served at a mobile-specific subdomain (m.yourdomain.com)
3. Auto-detected via responsive redirects

## Browser Support

- iOS Safari 12+
- Chrome Mobile 80+
- Firefox Mobile 80+
- Edge Mobile 80+

## Performance

Optimizations:
- No Three.js library (saves ~500KB)
- No 3D rendering (saves CPU/GPU)
- Minimal dependencies
- Touch-optimized interactions
- Fast load time (< 2s on 3G)

## Future Enhancements

Potential additions:
- Swipe gestures for mode switching
- Offline support with Service Workers
- Share quote via WhatsApp/Email
- Camera integration for site photos
- Push notifications for quote updates

## Support

For issues or questions, contact the development team or refer to the main CLAUDE.md documentation.
