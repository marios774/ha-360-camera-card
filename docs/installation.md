# Installation

## HACS

Until this project is included in the default HACS catalog, add it as a custom
Dashboard repository:

1. Open **HACS**.
2. Open the menu in the upper-right corner.
3. Choose **Custom repositories**.
4. Enter your GitHub repository URL.
5. Select **Dashboard** as category.
6. Install **Home Assistant 360 Camera Card**.
7. Reload the browser without cache.

HACS downloads `dist/ha-360-camera-card.js`. The repository and distribution
file deliberately have matching names.

## Manual installation

1. Copy `dist/ha-360-camera-card.js` to:

   `/config/www/ha-360-camera-card/ha-360-camera-card.js`

2. In Home Assistant open:

   **Settings → Dashboards → Resources**

3. Add:

   `/local/ha-360-camera-card/ha-360-camera-card.js`

4. Select **JavaScript module**.
5. Reload the browser without cache.

During development, use a cache-busting query:

`/local/ha-360-camera-card/ha-360-camera-card.js?v=1.0.0`
