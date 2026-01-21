# Coachable

## Setup Instructions

Follow these steps to set up the project on your machine:

### Prerequisites

- **Node.js** (version 18 or higher recommended)
- **npm** (comes with Node.js) or **yarn**

To check if you have Node.js installed, run:
```bash
node --version
npm --version
```

If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/).

### Installation Steps

1. **Clone or download the repository**
   ```bash
   cd coachable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This will install all required packages listed in `package.json`.

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will start and you should see a local URL (typically `http://localhost:5173`) in your terminal.

4. **Open in your browser**
   - Open the URL shown in the terminal (usually `http://localhost:5173`)
   - The page should load and you can start using the application

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues

### Troubleshooting

- If you encounter dependency issues, try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Make sure you're using a compatible Node.js version (18+)
- If the port is already in use, Vite will automatically try the next available port
