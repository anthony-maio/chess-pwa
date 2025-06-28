# Deploying Your Vite PWA to GitHub Pages

This guide explains how to deploy your Vite-based Progressive Web App (PWA) to GitHub Pages. We'll cover configuring Vite, setting up a deployment workflow with GitHub Actions (recommended), and configuring your GitHub repository.

## Prerequisites

*   A GitHub account and a repository for your PWA.
*   Node.js and npm (or yarn/pnpm) installed locally.
*   Your Vite PWA project pushed to the GitHub repository.
*   `vite-plugin-pwa` should be configured in your project (as per previous steps).

## Step 1: Configure Vite for GitHub Pages

GitHub Pages often serves projects from a subdirectory (e.g., `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`). You need to tell Vite about this path by setting the `base` option in your `vite.config.js`.

1.  Open your `vite.config.js` file.
2.  Add or modify the `base` property. It should be your repository name, enclosed in slashes (e.g., `/my-chess-pwa/`).

    ```javascript
    // vite.config.js
    import { defineConfig } from 'vite';
    import { VitePWA } from 'vite-plugin-pwa'; // Assuming you have this

    export default defineConfig({
      base: '/<YOUR_REPO_NAME>/', // <--- ADD THIS LINE
      plugins: [
        // ... your other plugins
        VitePWA({
          // ... your VitePWA options
        })
      ],
      // ... rest of your config
    });
    ```
    Replace `<YOUR_REPO_NAME>` with the actual name of your GitHub repository.

3.  Commit and push this change to your GitHub repository.

## Step 2: Deploy using GitHub Actions (Recommended)

GitHub Actions can automate the process of building and deploying your PWA whenever you push changes to your main branch.

1.  **Create a Workflow File:**
    *   In your project's root directory, create a folder named `.github` if it doesn't already exist.
    *   Inside `.github`, create another folder named `workflows`.
    *   Inside `.github/workflows`, create a new file named `deploy.yml` (or `gh-pages.yml`).

2.  **Add Workflow Content:**
    Paste the following content into your `deploy.yml` file:

    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches:
          - main # Or your default branch (e.g., master)
      workflow_dispatch: # Allows manual triggering from the Actions tab

    permissions:
      contents: read
      pages: write
      id-token: write

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout repository
            uses: actions/checkout@v4

          - name: Set up Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '18' # Or your preferred Node.js version
              cache: 'npm' # Or yarn, pnpm

          - name: Install dependencies
            run: npm install # Or yarn install, pnpm install

          - name: Build project
            run: npm run build # Or yarn build, pnpm build
            # The `base` path in vite.config.js is crucial here

          - name: Setup Pages
            uses: actions/configure-pages@v4

          - name: Upload artifact
            uses: actions/upload-pages-artifact@v3
            with:
              path: './dist' # Vite's default output directory

      deploy:
        needs: build
        runs-on: ubuntu-latest
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        steps:
          - name: Deploy to GitHub Pages
            id: deployment
            uses: actions/deploy-pages@v4
    ```

3.  **Understand the Workflow:**
    *   `on`: This workflow triggers on pushes to the `main` branch and allows manual triggers.
    *   `permissions`: Sets necessary permissions for deploying to GitHub Pages.
    *   `jobs`:
        *   `build`:
            *   Checks out your code.
            *   Sets up Node.js.
            *   Installs project dependencies.
            *   Builds your Vite project (outputting to the `dist` directory).
            *   Configures GitHub Pages and uploads the `dist` directory as an artifact.
        *   `deploy`:
            *   Depends on the `build` job completing.
            *   Deploys the uploaded artifact to GitHub Pages.

4.  **Commit and Push:**
    Commit the `deploy.yml` file and push it to your GitHub repository. This will trigger the first deployment.

## Step 3: Configure GitHub Pages in Repository Settings

After the GitHub Action has run successfully for the first time (you can check its progress in the "Actions" tab of your repository), you need to configure your repository to use the deployed files.

1.  Go to your GitHub repository.
2.  Click on "Settings".
3.  In the left sidebar, click on "Pages" (under "Code and automation").
4.  Under "Build and deployment":
    *   For "Source", select "**GitHub Actions**".
    *   (Older setups might have used a `gh-pages` branch; the modern approach with `upload-pages-artifact` and `deploy-pages` actions is generally preferred and simpler to configure here).

5.  Your site should now be live at `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`. It might take a few minutes for the changes to propagate after the first deployment. The URL will also be displayed in the "Pages" settings once deployed.

## Step 4: Access Your Deployed PWA

Once the GitHub Action completes and GitHub Pages is configured, you should be able to access your PWA at the GitHub Pages URL (e.g., `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`).

Test all PWA features, including installation and offline functionality.

## Alternative: Manual Deployment (Not Recommended for Regular Updates)

While GitHub Actions is preferred, you could manually deploy:

1.  **Configure `vite.config.js`:** Ensure the `base` path is set as described in Step 1.
2.  **Build:** Run `npm run build`.
3.  **Initialize Git in `dist` (Careful!):**
    *   Navigate to your `dist` folder.
    *   Initialize a new Git repository: `git init`
    *   Create a `gh-pages` branch: `git checkout -b gh-pages`
    *   Add all files: `git add .`
    *   Commit: `git commit -m "Deploy to GitHub Pages"`
    *   Add your main repository as a remote: `git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git`
    *   Force push to the `gh-pages` branch: `git push -f origin gh-pages`
4.  **Configure GitHub Pages Settings:** In your repository settings, under "Pages", set the "Source" to deploy from the `gh-pages` branch (and select the `/ (root)` folder).

**Why manual is not recommended:** It's error-prone, requires you to rebuild and push manually for every update, and doesn't keep your build artifacts in your main project history cleanly.

## Important Considerations for PWAs

*   **HTTPS:** GitHub Pages serves sites over HTTPS by default, which is a requirement for PWAs.
*   **Service Worker Paths:** `vite-plugin-pwa` (when configured correctly with `base`) should handle service worker paths correctly for the subdirectory deployment.
*   **Custom Domain:** You can configure a custom domain for your GitHub Pages site if desired (see GitHub Pages documentation).

---
