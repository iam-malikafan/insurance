# Live reviews – one-time setup (about 5 minutes)

Without this setup, reviews are only emailed to Karandeep. With it, every review
is saved in a Google Sheet and appears on the website automatically.

1. Sign in to the Google account karandeepsinghinsurance@gmail.com.
2. Create a new Google Sheet (name it "Website Reviews").
3. In the sheet: Extensions → Apps Script.
4. Delete the sample code, paste everything from `Code.gs`, and click Save.
5. Click Deploy → New deployment → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click Deploy, allow the permissions, and copy the **Web app URL**
   (it looks like https://script.google.com/macros/s/XXXX/exec).
7. Open `assets/main.js` and paste it here:
   const REVIEWS_API = 'https://script.google.com/macros/s/XXXX/exec';
8. Upload the updated `assets/main.js` to GitHub.

Hide a review: in the Google Sheet, change its "Show" cell to FALSE.
Delete a review: delete its row.

If you ever change Code.gs: Deploy → Manage deployments → Edit → Version: New version → Deploy.
