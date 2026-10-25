# Pikado LIVE – Google Drive

Private Google Apps Script web app. Deploy as the owner, with access set to **Only myself**. Each device signs into the same Google account.

`Code.gs` contains the manual scoring app and Drive backend. `appsscript.json` records the required private deployment and scopes. No API keys or paid transcription.

The app stores `pikado-podatki.json` in the owner's `Pikado LIVE` folder and keeps daily snapshots in `Varnostne kopije`. File IDs stay in Script Properties. Each save uses a revision check and a script lock; a stale device cannot overwrite newer data. The UI retains a local pending copy on save failures and supports JSON export/import.

Data stored only in the old Netlify browser's local storage cannot be read from the new app origin. Import an exported JSON backup to migrate it; do not overwrite the shared record without reviewing a backup.

Google service quotas and account storage limits still apply. A successful deployment and owner OAuth approval are required before the shared app is live.
