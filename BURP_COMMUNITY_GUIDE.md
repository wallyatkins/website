# Local Security Testing Guide: Burp Suite Community Edition

This guide walks you through using **Burp Suite Community Edition** (free) to perform interactive and passive security auditing of your website (`wallyatkins.com`) on your local machine.

---

## 1. Installation & Initial Setup

1. **Download & Install:**
   - Download the free installer for your OS (Windows / macOS / Linux) from [PortSwigger's Official Website](https://portswigger.net/burp/communitydownload).
2. **Launch Burp Suite:**
   - Select **Temporary Project** (default in Community Edition).
   - Choose **Use Burp defaults** for configuration and click **Start Burp**.

---

## 2. The Easiest Way to Browse (Burp's Embedded Browser)

*You do not need to configure proxy settings or install root SSL certificates manually in your daily browser.*

1. Go to the **Proxy** tab at the top.
2. Ensure the **Intercept is off** button is toggled (toggle it off so pages load smoothly without pausing each request).
3. Click the orange **Open Browser** button.
   - Burp launches a pre-configured Chromium instance where all HTTP/HTTPS traffic is automatically captured and analyzed by Burp.

---

## 3. Defining Target Scope (Filter Noise)

To avoid cluttering your project with third-party tracking or external font requests:

1. In Burp's embedded browser, navigate to:
   ```
   https://wallyatkins.com
   ```
2. In Burp, switch to the **Target** &rarr; **Site map** tab.
3. Right-click `https://wallyatkins.com` in the left tree.
4. Select **Add to scope**.
5. When prompted *"Do you want Proxy to stop sending out-of-scope items to the HTTP history?"*, click **Yes**.
6. Click the filter bar above the Site Map (e.g. *Filter: Showing all items*) and check **"Show only in-scope items"**.

---

## 4. Auditing Your Web Application

### A. Mapping & Passive Inspection
Walk through the features of your site in the embedded browser:
- [x] **Homepage & Navigation:** Scroll through sections, click project cards.
- [x] **Contact Form (`/pine.php`):** Fill out a test contact message to observe how POST payloads and responses are handled.
- [x] **Easter Egg / IRC Flow (`/irc.php`):** Trigger the interactive chat terminal to observe token generation and encrypted polling.
- [x] **Flash / Ruffle Emulator:** Trigger the retro Flash player to verify WebAssembly isolation.

### B. Analyzing Captured Traffic in the Site Map
Switch back to **Target** &rarr; **Site map**:
- Click through each endpoint on the left.
- In the **Issue activity** panel (or Target details), review any automatically flagged issues:
  - **MIME Confusion / Content-Type headers:** Check that responses specify proper `nosniff`.
  - **Cross-Origin Resource Sharing (CORS):** Ensure `Access-Control-Allow-Origin` is not wildcarded with credentials.
  - **Cookie Security:** Verify that cookies have `Secure`, `HttpOnly`, and `SameSite=Lax` or `Strict` attributes.
  - **Sensitive Data in Query Parameters:** Ensure tokens/credentials are not passed in GET URLs.

---

## 5. Manual Testing with the "Repeater" Tool

Burp Repeater allows you to modify and re-send individual HTTP requests to verify server error handling and input validation:

1. Go to **Proxy** &rarr; **HTTP history**.
2. Find the POST request to `/pine.php`.
3. Right-click the request and choose **Send to Repeater** (or press `Ctrl+R` / `Cmd+R`).
4. Switch to the **Repeater** tab:
   - **Test 1 (Fast submission):** Modify the `form_timestamp` parameter to simulate a bot sending instantly. Click **Send** and confirm the server returns `400 / "Submission too fast"`.
   - **Test 2 (Honeypot):** Populate `website_url=https://spambot.com`. Confirm the server quietly absorbs the bot submission without sending email.
   - **Test 3 (Malformed input):** Send missing email or non-standard characters and verify clean JSON responses without revealing internal PHP stack traces.

---

## 6. Verifying Security Headers

In the **Proxy &rarr; HTTP history** tab, click any response from `https://wallyatkins.com/` and check the response headers:
- `Content-Security-Policy`: Confirms script and frame restrictions.
- `X-Frame-Options: DENY`: Confirms clickjacking defense.
- `Strict-Transport-Security`: Confirms HSTS enforcement.
- `X-Content-Type-Options: nosniff`: Confirms MIME sniffing protection.
- `Permissions-Policy`: Confirms device API restrictions.

---

## 7. Recommended CI/CD & Automated Companion

While Burp Community is used for hands-on local manual testing, automated scans run automatically in your repository:
- **OWASP ZAP Baseline Scan:** Configured in `.github/workflows/security-scan.yml` (runs dynamic vulnerability checks on every release).
- **GitHub CodeQL Analysis:** Configured in `.github/workflows/codeql.yml` (scans TypeScript and PHP source code for security vulnerabilities).
