# Artery Capital

A modern, responsive website for Artery Capital with an integrated application portal.

## Features

- **Home Page**: Showcases Artery Capital's mission, services, and investment focus
- **Application Portal**: Complete application form for potential investment candidates
- **Responsive Design**: Mobile-friendly and works across all devices
- **Modern UI**: Built with React and styled with custom CSS

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Custom CSS with CSS variables

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Jaxxtheart/Artery.git
cd Artery
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally

## Project Structure

```
artery-capital/
├── public/
│   ├── index.html        # HTML entry point
│   └── logo.svg          # Artery Capital logo
├── src/
│   ├── pages/
│   │   ├── Home.jsx      # Home page component
│   │   └── Application.jsx # Application form component
│   ├── App.jsx           # Main app component with routing
│   ├── index.css         # Global styles
│   └── main.jsx          # React entry point
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
└── README.md            # This file
```

## Deployment

### Build for Production

```bash
npm run build
```

This will create a `dist` folder with optimized production files.

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify via their web interface or CLI

## Customization

### Updating Colors

Colors are defined as CSS variables in `src/index.css`:

```css
:root {
  --primary-color: #4F46E5;
  --secondary-color: #7C3AED;
  --text-color: #1F2937;
  --bg-color: #F9FAFB;
  --white: #FFFFFF;
}
```

### Modifying Content

- **Home Page**: Edit `src/pages/Home.jsx`
- **Application Form**: Edit `src/pages/Application.jsx`
- **Navigation**: Edit `src/App.jsx`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Copyright © 2026 Artery Capital. All rights reserved.
