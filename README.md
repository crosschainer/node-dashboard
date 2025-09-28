# Xian Node Dashboard

A modern, real-time dashboard for monitoring CometBFT 0.38.12 node health and status. Built with React, TypeScript, and Vite for optimal performance and developer experience.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)
![Vite](https://img.shields.io/badge/Vite-7.1.7-purple)

## 🚀 Features

### Core Monitoring
- **Node Status**: Real-time sync status, block height, and catching up indicators
- **Version Information**: CometBFT version, ABCI app version, and build details
- **Network Information**: Network ID, peer count, validator status, and connectivity
- **Health & Alerts**: Active issue detection, system status, and error monitoring

### User Experience
- **Configurable Node URL**: Easy switching between different CometBFT nodes
- **Real-time Updates**: Auto-refresh every 30 seconds with manual refresh option
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Dark theme with gradient accents and smooth animations
- **Error Handling**: Comprehensive error detection with user-friendly messages

## 🎨 Design System

The dashboard implements a modern dark theme with carefully crafted color palette:

```css
/* Primary Colors */
--primary-gradient: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)
--secondary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--accent-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)

/* Background Colors */
--bg-primary: #0a0e1a
--bg-secondary: #1a1f2e
--bg-card: #1e2332

/* Status Colors */
--color-success: #4ade80 (Healthy/Online)
--color-error: #ef4444 (Error/Offline)
--color-warning: #fbbf24 (Warning/Behind)
--color-accent: #00d4ff (Info/Active)
```

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- CometBFT node with REST API enabled

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd node-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🚀 Usage

### Development
```bash
npm run dev
```
Access the dashboard at `http://localhost:12000`

### Production Build
```bash
npm run build
npm run preview
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 12000
CMD ["npm", "run", "preview"]
```

## 🔧 Configuration

### Node URL Configuration
- Click on the node URL in the header to edit
- Default: `https://node.xian.org`
- Supports any CometBFT node with REST API enabled

### Environment Variables
Create a `.env` file for custom configuration:
```env
VITE_DEFAULT_NODE_URL=https://your-node.com
VITE_REFRESH_INTERVAL=30000
VITE_REQUEST_TIMEOUT=10000
```

## 📊 API Endpoints

The dashboard connects to these CometBFT REST API endpoints:

| Endpoint | Purpose | Data Retrieved |
|----------|---------|----------------|
| `/status` | Node sync status | Block height, sync status, catching up |
| `/abci_info` | ABCI application info | App version, build details |
| `/net_info` | Network information | Peer count, network ID |
| `/health` | Node health check | Overall health status |

## 🏗️ Project Structure

```
node-dashboard/
├── src/
│   ├── components/              # React components
│   │   ├── Dashboard.tsx        # Main dashboard layout
│   │   ├── Header.tsx           # Header with controls
│   │   ├── cards/               # Monitoring cards
│   │   │   ├── NodeStatusCard.tsx
│   │   │   ├── VersionInfoCard.tsx
│   │   │   ├── NetworkInfoCard.tsx
│   │   │   └── HealthAlertsCard.tsx
│   │   └── LoadingSpinner.tsx   # Loading component
│   ├── services/                # API services
│   │   └── cometbft.ts          # CometBFT API client
│   ├── types/                   # TypeScript definitions
│   │   └── cometbft.ts          # API response types
│   ├── styles/                  # CSS styles
│   │   └── index.css            # Global styles
│   ├── App.tsx                  # Main application
│   └── main.tsx                 # Application entry point
├── public/                      # Static assets
├── dist/                        # Production build
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite configuration
└── README.md                   # This file
```

## 🔍 Component Overview

### Dashboard Components

#### `Dashboard.tsx`
Main dashboard layout with responsive grid system for monitoring cards.

#### `Header.tsx`
- Node URL configuration with inline editing
- Manual refresh button with loading states
- Last updated timestamp display

#### `NodeStatusCard.tsx`
- Sync status (synced/catching up/behind)
- Current block height
- Catching up indicator
- Node online/offline status

#### `VersionInfoCard.tsx`
- CometBFT version information
- ABCI application version
- Build and commit details

#### `NetworkInfoCard.tsx`
- Network ID and chain information
- Connected peer count
- Validator status
- Network connectivity health

#### `HealthAlertsCard.tsx`
- Active issue detection
- System status overview
- Error categorization and alerts
- Last health check timestamp

### Services

#### `cometbft.ts`
Centralized API service for all CometBFT REST API interactions:
- Request/response handling
- Error management
- Timeout configuration
- Base URL management

## 🎯 Monitoring Capabilities

### Node Health Indicators
- **🟢 Healthy**: Node is synced and operating normally
- **🟡 Warning**: Node is catching up or has minor issues
- **🔴 Error**: Node is offline or has critical issues

### Real-time Metrics
- Block height and sync progress
- Peer connection count
- Network participation status
- API response times

### Error Detection
- Network connectivity issues
- API endpoint failures
- Sync lag detection
- Peer connectivity problems
- Version compatibility checks

## 🚨 Troubleshooting

### Common Issues

#### CORS Errors
If you encounter CORS errors when connecting to external nodes:
1. Ensure the CometBFT node has CORS enabled
2. Run the dashboard from the same domain as the node
3. Use a proxy server for development

#### Connection Timeouts
- Check node URL is correct and accessible
- Verify node's REST API is enabled
- Check firewall settings

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
npm run dev -- --force
```

## 🔒 Security Considerations

- Dashboard makes client-side requests to CometBFT nodes
- No sensitive data is stored or transmitted
- All API calls are read-only operations
- HTTPS recommended for production deployments

## 🚀 Deployment

### Static Hosting (Recommended)
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Environment-specific Builds
```bash
# Development
npm run dev

# Staging
VITE_DEFAULT_NODE_URL=https://staging-node.com npm run build

# Production
VITE_DEFAULT_NODE_URL=https://prod-node.com npm run build
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test` (if tests are added)
5. Build: `npm run build`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style
- TypeScript strict mode enabled
- ESLint configuration included
- Prettier for code formatting
- Component-based architecture

## 📝 Future Enhancements

### Planned Features
- [ ] Historical data charts and graphs
- [ ] Alert notifications and webhooks
- [ ] Multi-node monitoring dashboard
- [ ] Performance metrics and analytics
- [ ] Custom alert thresholds
- [ ] Export functionality for reports
- [ ] Dark/light theme toggle
- [ ] Mobile app version

### API Extensions
- [ ] WebSocket real-time updates
- [ ] Prometheus metrics integration
- [ ] Custom health check endpoints
- [ ] Node performance benchmarking

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- CometBFT team for the excellent blockchain infrastructure
- React and TypeScript communities
- Vite for the amazing build tool
- Contributors and users of this dashboard

## 📞 Support

For support, issues, or feature requests:
1. Check existing [GitHub Issues](../../issues)
2. Create a new issue with detailed description
3. Include node version, browser info, and error logs

---

**Built with ❤️ for the CometBFT community**

*Real-time monitoring • Modern UI • Production Ready*