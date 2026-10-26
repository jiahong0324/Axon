/**
 * Utilities for generating email HTML with Image 1's dark card styling.
 * Preserves the exact smooth, flawless rounded corners (border-radius: 16px)
 * while ensuring colors remain consistent in both Light Mode and Dark Mode.
 */

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildEmailHtml({ subject, message, logoUrl = 'https://axon-com.vercel.app/icons/logo.png' }) {
  const safeSubject = escapeHtml(subject || 'Axon Announcement')
  const formattedMessage = escapeHtml(message || '').replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${safeSubject}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background-color: #1e293b;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      border: 1px solid #334155;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
      border-radius: 16px;
      display: inline-block;
    }
    h1 {
      color: #ffffff;
      font-size: 24px;
      line-height: 1.3;
      margin-top: 0;
      margin-bottom: 20px;
      font-weight: 700;
      text-align: center;
    }
    .content {
      color: #94a3b8;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
      text-align: left;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #64748b;
      font-size: 14px;
    }

    /* Keep exact Image 1 dark colors in Dark Mode */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a !important;
      }
      .card {
        background-color: #1e293b !important;
        border: 1px solid #334155 !important;
        border-radius: 16px !important;
      }
      h1 {
        color: #ffffff !important;
      }
      .content, .content * {
        color: #94a3b8 !important;
      }
      .footer {
        color: #64748b !important;
      }
    }

    /* Gmail-specific dark mode overrides */
    [data-ogsc] body {
      background-color: #0f172a !important;
    }
    [data-ogsc] .card {
      background-color: #1e293b !important;
      border: 1px solid #334155 !important;
      border-radius: 16px !important;
    }
    [data-ogsc] h1 {
      color: #ffffff !important;
    }
    [data-ogsc] .content, [data-ogsc] .content * {
      color: #94a3b8 !important;
    }
    [data-ogsc] .footer {
      color: #64748b !important;
    }
  </style>
</head>
<body style="background-color: #0f172a; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div class="card" style="background-color: #1e293b; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #334155;">
      <img src="${logoUrl}" alt="Axon" class="logo" style="width: 64px; height: 64px; margin-bottom: 24px; border-radius: 16px; display: inline-block;">
      <h1 data-ogsc="color: #ffffff;" style="color: #ffffff !important; font-size: 24px; line-height: 1.3; margin-top: 0; margin-bottom: 20px; font-weight: 700; text-align: center;">${safeSubject}</h1>
      <div class="content" data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: left;">
        ${formattedMessage}
      </div>
    </div>
    <div class="footer" data-ogsc="color: #64748b;" style="text-align: center; margin-top: 32px; color: #64748b !important; font-size: 14px;">
      &copy; 2026 Axon. All rights reserved.
    </div>
  </div>
</body>
</html>`
}
