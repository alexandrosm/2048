# 2048 Game

A responsive, mobile-friendly implementation of the classic 2048 sliding puzzle game with PWA support.

## Features

- Responsive design for mobile and desktop
- Touch/swipe controls
- Keyboard controls
- Game state persistence
- Progressive Web App (PWA) functionality
- Dark/light theme control
- Firefox mobile pull-to-refresh prevention

## Play Online

Play the game online at: https://alexandrosm.github.io/2048/

## Local Development

To run the game locally:

1. Clone this repository
2. Open `index.html` in your browser

No build step is required for development.

## Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions. When code is pushed to the main branch, it will automatically be deployed to GitHub Pages.

### Manual Deployment

To manually deploy to any web server:

1. Copy all files to your web server, maintaining the directory structure
2. Ensure the following files are included:
   - `index.html`
   - `style.css`
   - `script.js`
   - `manifest.json`
   - `service-worker.js`
   - `icons/` directory

## Recent Updates

### Fix for Firefox Mobile Pull-to-Refresh

The game now prevents Firefox's pull-to-refresh behavior when swiping down anywhere on the page. This prevents accidental page refreshes during gameplay while still allowing the game's touch controls to work properly.
