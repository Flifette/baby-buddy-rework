# Baby Buddy Dashboard Rework

An independent bilingual French/English dashboard for [Baby Buddy](https://github.com/babybuddy/babybuddy), available as a Home Assistant add-on, a standalone Docker container, or a local development application.

This project is derived from [mbentancour/baby-buddy-dashboard](https://github.com/mbentancour/baby-buddy-dashboard) and distributed under the MIT License. It keeps the original architecture while adding an extensively reworked interface and data model.

[Documentation française](README.fr.md)

## Table of contents

- [About and acknowledgements](#about-and-acknowledgements)
- [Features](#features)
- [Language selection](#language-selection)
- [Screenshots](#screenshots)
- [Home Assistant cards and helpers](#home-assistant-cards-and-helpers)
- [Home Assistant add-on](#home-assistant-add-on)
- [Docker Compose](#docker-compose)
- [Standalone Docker](#standalone-docker)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Build and test](#build-and-test)
- [License and attribution](#license-and-attribution)

## About and acknowledgements

I am not an experienced developer; I am still learning, and this project was created largely with Codex guidance and supervision. I am sharing it in the hope that it may help others, without claiming that I will be able to maintain it indefinitely.

Thank you to [mbentancour/baby-buddy-dashboard](https://github.com/mbentancour/baby-buddy-dashboard) for providing such an excellent starting point and for all the work already invested in it, which gave me many ideas for this dashboard.

Above all, I want to offer a hundred million thanks to [herveaurel/HomeAssistant](https://github.com/herveaurel/HomeAssistant). That remarkable “Mad-Geek” dashboard is what inspired me to begin my Home Assistant journey. For nearly two years, this work fascinated me, inspired me, and helped me understand an entire world I had never known. Without that generosity, I would probably never have made it this far.

## Features

- Overview, Growth, Day, Routine, and Notes views
- Responsive desktop, tablet, and mobile interface
- Quick create, edit, and delete forms
- Feeding, sleep, diaper, pumping, tummy-time, measurement, and note tracking
- Configurable periods, charts, cards, and per-browser preferences
- Estimated breast-milk stock and dashboard-only uneaten-milk occurrences
- Complete French and English interface with a persistent language selector
- Localized Baby Buddy activity data, dates, charts, forms, and tooltips

Uneaten milk is stored by this dashboard in `/data/milk-waste.json`. It reduces the amount actually consumed but is never sent to Baby Buddy as another feeding and is never deducted from stock a second time.

## Language selection

Use the compact **FR / EN** selector in the dashboard header to switch languages immediately. The selection applies to views, cards, forms, buttons, charts, tooltips, dates, times, Baby Buddy activity labels, and validation or error messages.

The selected language is stored locally by the browser. Each device or browser profile can therefore keep its own preference without changing Baby Buddy data or the technical values sent to its API. French is used when no preference has been saved yet.

The Home Assistant add-on configuration fields follow the language selected in Home Assistant. Its Supervisor **Documentation** tab contains both English and French instructions in the same page.

## Screenshots

<table>
  <tr>
    <td align="center"><strong>Overview</strong><br><img src="screenshots/overview-current.jpg" alt="Overview dashboard" width="440"></td>
    <td align="center"><strong>Growth and milk stock</strong><br><img src="screenshots/growth-current.jpg" alt="Growth charts and milk stock" width="440"></td>
  </tr>
  <tr>
    <td align="center"><strong>Day timeline</strong><br><img src="screenshots/day-timeline.jpg" alt="Daily activity timeline" width="440"></td>
    <td align="center"><strong>Routine</strong><br><img src="screenshots/routine-overview.jpg" alt="Routine visualization" width="440"></td>
  </tr>
  <tr>
    <td align="center"><strong>Notes</strong><br><img src="screenshots/notes-view.jpg" alt="Notes view" width="440"></td>
    <td align="center"><strong>Personalized tiles</strong><br><img src="screenshots/tile-settings.jpg" alt="Tile settings" width="440"></td>
  </tr>
</table>

## Home Assistant cards and helpers

> **Important:** Baby Buddy Dashboard Rework does not replace Baby Buddy. A working Baby Buddy instance is required. The community Home Assistant Baby Buddy integration is optional for the Dashboard add-on itself, but required for the example cards, helpers, and HAOS scripts below.

The add-on is not the only way to use Baby Buddy in Home Assistant. A separate [French Home Assistant examples guide](examples/home-assistant/README.md) shows how to build reusable Lovelace forms, input helpers, dynamically selected children, quick-action cards, and activity timers with the community Baby Buddy integration.

## Home Assistant add-on

Before installing the add-on, make sure you already have a working Baby Buddy instance that Home Assistant can reach. You will need its URL and an API key. The separate Home Assistant Baby Buddy integration is **not required** to use this Dashboard add-on.

Add this repository to Home Assistant with one click:

[![Open your Home Assistant instance and add the Baby Buddy Dashboard Rework repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FFlifette%2Fbaby-buddy-rework)

Alternatively, add it manually:

1. Open **Settings > Add-ons > Add-on Store**.
2. Open **Repositories** from the three-dot menu.
3. Add:

   ```text
   https://github.com/Flifette/baby-buddy-rework
   ```

4. Install **Baby Buddy Dashboard Rework**.
5. Configure the Baby Buddy URL and API key, then start the add-on.

The add-on's bilingual [Supervisor documentation](baby-buddy-dashboard/DOCS.md) explains its connection, language, persistence, and backup settings.

The add-on retains the historical slug `baby-buddy-dashboard` so existing installations and their `/data` remain compatible. Consequently, this fork and the original add-on cannot be installed side-by-side in the same Home Assistant instance.

Supported Home Assistant architectures: `amd64` and `aarch64`. The legacy 32-bit base images previously declared by the upstream repository are no longer published for the selected Home Assistant Python base.

Standalone Docker installations also support `linux/amd64` and `linux/arm64`. The 32-bit `arm/v7` image is not published because the current Python dependencies do not provide a compatible build chain for that platform.

## Docker Compose

Clone this repository, create the environment file, and build the dashboard from the checked-out source:

```bash
cp .env.example .env
docker compose up -d --build
```

Before starting, replace `DASHBOARD_PASSWORD` in `.env` with a unique password of at least 16 characters. Standalone installations require HTTP Basic authentication; your browser will ask for `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD`.

For an existing Baby Buddy server, set `BABY_BUDDY_URL` in `.env` to an address reachable from the container.

To run Baby Buddy and the dashboard together:

```bash
docker compose --profile full up -d --build
```

Baby Buddy is then available on port `8000`, and the dashboard on port `8099`. The named volumes `babybuddy_data` and `dashboard_data` preserve their respective data.

## Standalone Docker

```bash
docker build -t baby-buddy-dashboard-rework .
docker run -d --name baby-buddy-dashboard-rework \
  -p 8099:8099 \
  -e BABY_BUDDY_URL=http://your-baby-buddy:8000 \
  -e BABY_BUDDY_API_KEY=your_api_key \
  -e DASHBOARD_USERNAME=admin \
  -e DASHBOARD_PASSWORD=replace_with_a_unique_password_of_at_least_16_characters \
  -v baby-buddy-dashboard-data:/data \
  baby-buddy-dashboard-rework
```

Release images may also be published as `ghcr.io/flifette/baby-buddy-rework:<version>`. The source-build commands above remain the canonical installation path and do not depend on package visibility.

## Local development

Requirements: Node.js 20 or newer, Python 3.10 or newer, and a reachable Baby Buddy instance.

```bash
cp .env.example .env
./run_local.sh
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
.\run_local.ps1
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:8099`. Local dashboard data is written under the ignored `.local-data` directory.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `BABY_BUDDY_URL` | Baby Buddy base URL | `http://babybuddy:8000` |
| `BABY_BUDDY_API_KEY` | Baby Buddy API token | required outside demo mode |
| `DASHBOARD_USERNAME` | Standalone HTTP Basic username | required in standalone mode |
| `DASHBOARD_PASSWORD` | Standalone HTTP Basic password, at least 16 characters | required in standalone mode |
| `REFRESH_INTERVAL` | Polling interval in seconds | `30` |
| `UNIT_SYSTEM` | `metric` or `imperial` labels | `metric` |
| `DEMO_MODE` | Use demonstration data | `false` |
| `TZ` | Container timezone | `Europe/Paris` |
| `MILK_WASTE_FILE` | Standalone persistence file | `/data/milk-waste.json` |

Keep `.env`, API keys, runtime data, backups, and temporary scripts out of Git.

The Home Assistant add-on relies on authenticated Supervisor ingress and does not use the standalone credentials. Do not expose development ports or bypass ingress for the add-on. See [SECURITY.md](SECURITY.md) for the supported security boundary and responsible disclosure process.

## Build and test

```bash
cd baby-buddy-dashboard/frontend
npm ci
npm test
npm run build
```

GitHub Actions validates the frontend, Python backend, add-on metadata, standalone image, and all declared Home Assistant architectures. Version tags can publish a multi-architecture standalone image to GHCR.

## License and attribution

Licensed under the [MIT License](LICENSE). See [NOTICE](NOTICE) for upstream attribution and modification details.
