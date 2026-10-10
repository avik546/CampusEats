# CampusEats — local web app

A campus canteen ordering app that runs on one PC. The new web app is in `server.js` and `public/`; the original Java Swing project remains in `src/`.

## Run

Requires Node.js 24 or newer (already available on this PC).

```powershell
node server.js
```

Open **http://localhost:3000** in your browser. Leave the terminal running. Press Ctrl+C to stop. No npm install, database server, or internet connection is needed.

### Run from NetBeans

1. Open `C:\Users\LOQ\OneDrive\Desktop\project\CampusEats` in NetBeans. It is named **CampusEats Web (Local)** to distinguish it from other copies. If it was already open when these settings changed, close and reopen the project.
2. Right-click **CampusEats Web (Local)** in the Projects panel and choose **Run**, or select the project and press **F6**.
3. Open **http://localhost:3000** in your browser. Keep the NetBeans run active; use Stop in its Output window when finished.

`build.xml` now overrides the project's `run` target to start `server.js`. Compile on Save is disabled in this PC's private project settings, so NetBeans uses that target. If Swing still opens, open Project Properties → Build → Compiling and make sure **Compile on Save** is unchecked, then reopen the project and choose **Run Project**, rather than Run File on `Main.java`.

The Node executable for this PC is configured in `nbproject/private/private.properties`. On another PC, set `node.executable` to its Node executable, or omit the property to use `node` from PATH. `campuseats.Main` also launches the web app and opens its browser, so Java Run File / Compile on Save no longer opens the old login panel in this project. Java UI source files remain available for reference.

For a different port:

```powershell
$env:PORT = '3001'
node server.js
```

## Demo accounts

| Account | Email | Password |
| --- | --- | --- |
| Student | student@campus.local | student123 |
| Shop staff | staff@campus.local | staff1234 |

Use the demo buttons in the sign-in dialog, or register your own student account. Staff manage all six shops in this local demo. Staff accounts cannot be created through public registration.

## What's connected

- Six seeded shops with 24 shop-specific menu items.
- Search and category filters; vegetarian filter in each menu.
- Single-shop bag with quantities, saved in this browser.
- Registration and login with salted scrypt password hashes and HTTP-only session cookies.
- Campus delivery address, ₹15 delivery fee, and cash on delivery.
- Orders persisted in SQLite, using database prices and availability checks.
- Duplicate checkout protection and transactional order creation.
- Student order history and status tracking, refreshed every 10 seconds.
- Staff order board: accept → prepare → dispatch → deliver, or cancel.
- Staff can mark menu items sold out and available again.

Orders are updated by staff; there is no automatic simulated delivery or online payment gateway. Use a student browser window to order and a private/incognito window to sign in as staff and update it. Refreshing or restarting retains users, orders, availability, and unexpired sessions.

## Database

The server automatically creates and connects to **`database/campuseats-web.db`**, relative to `server.js`. This is a new database, separate from the old Swing SQLite filename and any SQL database you previously created manually. No existing database is overwritten or imported.

Tables: `users`, `sessions`, `shops`, `menu_items`, `orders`, `order_items`, `order_events`. Foreign keys are enabled on the connection. Prices use integer paise. Order items retain names and prices as snapshots; delivery details are stored on the order.

To back up, stop the server and copy `database/campuseats-web.db`. To inspect, use a SQLite-compatible viewer; the application does not require one.

## Check

```powershell
node --test test/web.test.js
```

The integration test uses an isolated temporary database. It checks registration, login, role isolation, server pricing, order validation, duplicate requests, status transitions, sold-out items, persistence after restart, and logout.

## Local scope

The server binds to `127.0.0.1` so it is accessible from this PC. Demo accounts, campus location names, and menu data are sample data. Before a real campus launch, replace these and add HTTPS, individual shop ownership, delivery staff, account recovery, production monitoring, and a payment provider if needed.
