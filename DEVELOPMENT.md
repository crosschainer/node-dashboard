# Development Guide for AI Assistants

This document provides comprehensive guidance for AI assistants working on the CometBFT Node Dashboard project.

## 🎯 Project Overview

**Purpose**: Real-time monitoring dashboard for CometBFT 0.38.12 nodes
**Tech Stack**: React 18 + TypeScript + Vite
**Architecture**: Component-based SPA with REST API integration
**Design**: Modern dark theme with gradient accents

## 📁 Project Structure Understanding

```
node-dashboard/
├── src/
│   ├── components/              # React components (main UI logic)
│   │   ├── Dashboard.tsx        # Main layout with responsive grid
│   │   ├── Header.tsx           # Node URL config + refresh controls
│   │   ├── cards/               # Monitoring cards (core functionality)
│   │   │   ├── NodeStatusCard.tsx      # Sync status, block height
│   │   │   ├── VersionInfoCard.tsx     # CometBFT + ABCI versions
│   │   │   ├── NetworkInfoCard.tsx     # Network ID, peers, validator
│   │   │   └── HealthAlertsCard.tsx    # Error detection, alerts
│   │   └── LoadingSpinner.tsx   # Reusable loading component
│   ├── services/                # API layer (external communication)
│   │   └── cometbft.ts          # CometBFT REST API client
│   ├── types/                   # TypeScript definitions
│   │   └── cometbft.ts          # API response type definitions
│   ├── styles/                  # Styling
│   │   └── index.css            # Global CSS with design system
│   ├── App.tsx                  # Root component with state management
│   └── main.tsx                 # Application entry point
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Build tool configuration
└── README.md                   # User documentation
```

## 🔧 Key Technologies & Patterns

### React Patterns Used
- **Functional Components**: All components use hooks
- **State Management**: useState for local state, useEffect for side effects
- **Props Interface**: TypeScript interfaces for all component props
- **Error Boundaries**: Implemented in card components
- **Conditional Rendering**: Loading states and error handling

### TypeScript Integration
- **Strict Mode**: Enabled for type safety
- **Interface Definitions**: All API responses typed in `types/cometbft.ts`
- **Component Props**: Strongly typed interfaces
- **Service Layer**: Typed API client methods

### CSS Architecture
- **CSS Custom Properties**: Design system variables
- **Modern CSS**: Grid, Flexbox, CSS animations
- **Responsive Design**: Mobile-first approach
- **Component Scoping**: Logical class naming

## 🎨 Design System Implementation

### Color Palette (CSS Variables)
```css
/* Located in src/styles/index.css */
--primary-gradient: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)
--bg-primary: #0a0e1a
--text-primary: #ffffff
--color-success: #4ade80
--color-error: #ef4444
--color-warning: #fbbf24
```

### Status Color Mapping
- **Green (#4ade80)**: Healthy, Online, Synced
- **Red (#ef4444)**: Error, Offline, Failed
- **Yellow (#fbbf24)**: Warning, Behind, Catching Up
- **Blue (#00d4ff)**: Info, Active, Normal

## 🔌 API Integration

### CometBFT REST Endpoints
```typescript
// Base service: src/services/cometbft.ts
const endpoints = {
  status: '/status',        // Node sync status
  abciInfo: '/abci_info',   // ABCI app version
  netInfo: '/net_info',     // Network information
  health: '/health'         // Health check
};
```

### Error Handling Pattern
```typescript
try {
  const response = await fetch(url, { 
    signal: AbortSignal.timeout(10000) 
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
} catch (error) {
  // Handle network, timeout, and HTTP errors
  throw new Error(`API Error: ${error.message}`);
}
```

## 🧩 Component Architecture

### Card Component Pattern
Each monitoring card follows this structure:
```typescript
interface CardProps {
  data: SpecificDataType | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function MonitoringCard({ data, isLoading, error, lastUpdated }: CardProps) {
  // Loading state
  if (isLoading) return <LoadingSpinner />;
  
  // Error state
  if (error) return <ErrorDisplay error={error} />;
  
  // Data display
  return <CardContent data={data} />;
}
```

### State Management in App.tsx
```typescript
const [nodeData, setNodeData] = useState<NodeData | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

// Auto-refresh every 30 seconds
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

## 🛠️ Development Workflow

### Starting Development
```bash
cd node-dashboard
npm install
npm run dev
# Access at http://localhost:12000
```

### Common Development Tasks

#### Adding New Monitoring Card
1. Create component in `src/components/cards/`
2. Define TypeScript interfaces in `src/types/cometbft.ts`
3. Add API method in `src/services/cometbft.ts`
4. Integrate in `Dashboard.tsx`
5. Update state management in `App.tsx`

#### Modifying API Integration
1. Update service methods in `src/services/cometbft.ts`
2. Update type definitions in `src/types/cometbft.ts`
3. Modify component props and rendering logic
4. Test error handling scenarios

#### Styling Changes
1. Modify CSS variables in `src/styles/index.css`
2. Update component-specific styles
3. Test responsive behavior
4. Verify dark theme consistency

### Testing Approach
```bash
# Build verification
npm run build

# Development server
npm run dev

# Type checking
npx tsc --noEmit

# Manual testing checklist:
# - Node URL editing functionality
# - Auto-refresh behavior
# - Error state handling
# - Responsive design
# - Loading states
```

## 🚨 Common Issues & Solutions

### CORS Issues
**Problem**: Browser blocks requests to external CometBFT nodes
**Solution**: Expected behavior - inform users about CORS requirements

### TypeScript Errors
**Problem**: Type mismatches or missing imports
**Solution**: 
- Check `src/types/cometbft.ts` for correct interfaces
- Ensure React imports are correct (React 18 JSX transform)
- Add `@types/node` for NodeJS types

### Build Failures
**Problem**: Vite build fails
**Solution**:
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all imports are correct

### Styling Issues
**Problem**: CSS not applying correctly
**Solution**:
- Check CSS variable names match design system
- Verify class names are correct
- Test responsive breakpoints

## 🔄 Update Patterns

### Adding New Features
1. **Plan**: Define requirements and component structure
2. **Types**: Add TypeScript interfaces
3. **Service**: Implement API methods
4. **Component**: Create React component
5. **Integration**: Add to main dashboard
6. **Testing**: Verify functionality
7. **Documentation**: Update README if needed

### Modifying Existing Features
1. **Identify**: Locate relevant components and services
2. **Update**: Modify code maintaining existing patterns
3. **Test**: Verify changes don't break existing functionality
4. **Refactor**: Clean up if needed

## 📊 Performance Considerations

### Optimization Strategies
- **Memoization**: Use React.memo for expensive components
- **Debouncing**: Implement for user input (URL changes)
- **Error Boundaries**: Prevent cascade failures
- **Loading States**: Provide immediate user feedback
- **Timeout Handling**: 10-second API timeouts

### Bundle Size Management
- **Tree Shaking**: Vite automatically removes unused code
- **Dynamic Imports**: Consider for future large features
- **Asset Optimization**: Minimize CSS and images

## 🔐 Security Best Practices

### Client-Side Security
- **No Secrets**: All API calls are read-only and public
- **Input Validation**: Validate node URLs
- **XSS Prevention**: React's built-in protection
- **HTTPS**: Recommend for production

### API Security
- **Read-Only**: Dashboard only reads data
- **Timeout Protection**: Prevent hanging requests
- **Error Handling**: Don't expose sensitive error details

## 🚀 Deployment Guidance

### Production Build
```bash
npm run build
# Outputs to dist/ directory
# Deploy dist/ to any static hosting
```

### Environment Configuration
```bash
# .env file for custom settings
VITE_DEFAULT_NODE_URL=https://your-node.com
VITE_REFRESH_INTERVAL=30000
VITE_REQUEST_TIMEOUT=10000
```

### Hosting Requirements
- **Static Hosting**: Any CDN or static host works
- **SPA Support**: Configure for client-side routing
- **HTTPS**: Recommended for production
- **CORS**: Node must allow dashboard domain

## 📝 Code Style Guidelines

### TypeScript
- Use strict mode
- Define interfaces for all props and API responses
- Prefer explicit types over `any`
- Use optional chaining for nested properties

### React
- Functional components with hooks
- Props destructuring in component parameters
- Conditional rendering for loading/error states
- useEffect cleanup for intervals/subscriptions

### CSS
- Use CSS custom properties for theming
- Mobile-first responsive design
- Logical class naming (component-based)
- Consistent spacing using design system variables

## 🎯 Future Development Areas

### High Priority
- Historical data visualization
- Alert threshold configuration
- Multi-node monitoring
- Performance metrics

### Medium Priority
- WebSocket real-time updates
- Export functionality
- Custom themes
- Mobile app version

### Low Priority
- Advanced analytics
- Integration with monitoring tools
- Custom dashboard layouts
- User authentication

## 📞 Debugging Guide

### Common Debug Steps
1. **Check Console**: Browser dev tools for errors
2. **Network Tab**: Verify API requests and responses
3. **Component State**: Use React DevTools
4. **Build Process**: Check terminal output
5. **Type Errors**: Run `npx tsc --noEmit`

### Error Categories
- **Network Errors**: CORS, timeouts, connectivity
- **Type Errors**: TypeScript compilation issues
- **Runtime Errors**: Component rendering problems
- **Build Errors**: Vite configuration or dependency issues

---

**This guide should enable any AI assistant to effectively work with and extend the CometBFT Node Dashboard project.**