# GitHub Actions Deployment

The production workflow builds the Vite site, installs production Composer
dependencies, and deploys `dist/` over FTP. Create a GitHub environment named
`production` and add these secrets to it:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`

The workflow supports manual releases with `workflow_dispatch`. The FTP action
currently uses the hosting account's default remote directory, matching the
existing working deployment. The FTP action still uses a Node 20 runtime; the
checkout and Node setup actions use current Node 24-compatible releases.
