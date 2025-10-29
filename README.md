# Noam Teshuva - Personal Portfolio Website

This is my personal portfolio website showcasing my skills, projects, and professional experience. The website is fully responsive, accessible, and deployed on a custom domain.

## Project Overview

This website serves as my online resume and portfolio. It includes links to my GitHub and LinkedIn profiles, highlights my projects, and provides a way to get in touch with me.

### Features

- **Responsive Design:** Optimized for phones, tablets, and desktops
- **HTTPS Secure:** Enforced HTTPS for secure browsing
- **Custom Domain:** Available at [https://noamteshuva.com](https://noamteshuva.com)
- **SEO Optimized:** Includes favicon, title, and meta tags
- **Automatic Deployment:** Deployed via GitHub Pages with automatic updates
- **Analytics Integration:** Google Analytics for visitor tracking and insights
- **Accessibility Compliant:** Fully accessible with:
  - Alternative text for images
  - Proper color contrast for readability
  - Keyboard navigation support
- **Performance Optimized:** Validated with Google Lighthouse for performance, accessibility, best practices, and SEO

## Technologies Used

- **React.js** - JavaScript framework for building the user interface
- **Tailwind CSS** - Utility-first CSS framework for responsive and modern styling
- **GitHub Pages** - Hosting and automatic deployment platform
- **Google Analytics** - Web analytics service for tracking visitor metrics
- **Google Lighthouse** - Performance and accessibility auditing tool
- **GoDaddy** - Domain provider for the custom domain name

## Contact

- **Email:** [Teshuva91@gmail.com](mailto:Teshuva91@gmail.com)
- **LinkedIn:** [Noam Teshuva](https://www.linkedin.com/in/noam-teshuva-452101221)
- **GitHub:** [NoamTeshuva](https://github.com/NoamTeshuva)

## Local Development

To run this project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/NoamTeshuva/noam-website.git
   cd noam-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser

## Environment Variables

For full functionality including real-time stock data, you'll need to set up API keys:

1. **Deploy the Cloudflare Worker** for Twelve Data API:
   ```bash
   # Set your Twelve Data API key as a secret
   npx wrangler secret put TWELVEDATA_KEY
   # (Paste your Twelve Data API key when prompted)

   # Deploy the worker
   npx wrangler deploy
   ```

2. Copy the environment template:
   ```bash
   cp .env.production.example .env.production
   ```

3. Get your API keys:
   - **Twelve Data API Key**: Sign up at [twelvedata.com](https://twelvedata.com/) (Free plan: ~800 calls/day)
   - **Finnhub API Key**: Sign up at [finnhub.io](https://finnhub.io/) (Optional, for company profiles)

4. Add your worker URL to `.env.production`:
   ```
   REACT_APP_WORKER_URL=https://twelvedata-proxy.YOUR_SUBDOMAIN.workers.dev
   REACT_APP_FINNHUB_KEY=your_finnhub_key_here
   ```

**Security Note**:
- Never commit actual API keys to version control
- The Twelve Data API key is stored securely in Cloudflare Worker secrets
- The `.env.production` file is already included in `.gitignore`

## Data Sources

**Real-time Stock Data**: Powered by [Twelve Data](https://twelvedata.com) via Cloudflare Worker proxy with 60-second edge caching. Free plan is for personal use only; public redistribution requires a paid plan and attribution.

## Analytics

The website uses Google Analytics to track visitor metrics and improve user experience. This provides valuable insights into visitor behavior and helps optimize site performance.

## Accessibility

The website follows accessibility best practices to ensure it's usable by everyone:

- Alternative text for all images
- Proper color contrast between background and text
- Full keyboard navigation support
- Semantic HTML structure

## Future Improvements

Planned enhancements for the website:

- Add more projects to showcase additional work
- Implement a contact form using a service like Formspree
- Continue improving SEO to increase visibility
- Further optimize image sizes and loading times for better performance

## Image Optimization

The profile photo is optimized using the AVIF format for faster loading and better performance, with a PNG fallback for older browsers. The `<picture>` element serves the most efficient image format supported by the visitor's browser.

## 404 Error Handling

A custom 404 page handles non-existing URLs. The page is styled with Tailwind CSS and provides navigation back to the homepage when users encounter broken links.

The 404.html file is located in the public/ folder, and GitHub Pages automatically serves it for invalid routes.

Example: [https://noamteshuva.com/non-existing-page](https://noamteshuva.com/non-existing-page)

## Live Website

Visit the website at: [https://noamteshuva.com](https://noamteshuva.com)

Thank you for visiting my portfolio website. Feel free to reach out with any feedback or collaboration opportunities.
