/**
 * Utilities for generating email HTML with Image 1's dark card styling.
 * Preserves the exact smooth, flawless rounded corners (border-radius: 16px)
 * while using linear-gradient shields to prevent Gmail iOS from inverting
 * dark backgrounds into washed-out light lavender boxes.
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
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      width: 100% !important;
      min-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
    }
    .email-cell {
      padding: 40px 20px !important;
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
    }
    .card {
      max-width: 560px !important;
      margin: 0 auto !important;
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      border-radius: 16px !important;
      padding: 40px !important;
      text-align: center !important;
      border: 1px solid #334155 !important;
      box-sizing: border-box !important;
    }
    .logo {
      width: 64px !important;
      height: 64px !important;
      margin-bottom: 24px !important;
      border-radius: 16px !important;
      display: inline-block !important;
    }
    h1 {
      color: #ffffff !important;
      font-size: 24px !important;
      line-height: 1.3 !important;
      margin-top: 0 !important;
      margin-bottom: 20px !important;
      font-weight: 700 !important;
      text-align: center !important;
    }
    .content {
      color: #94a3b8 !important;
      font-size: 16px !important;
      line-height: 1.6 !important;
      margin-bottom: 32px !important;
      text-align: left !important;
    }
    .footer {
      text-align: center !important;
      margin-top: 32px !important;
      color: #64748b !important;
      font-size: 14px !important;
    }

    @media (prefers-color-scheme: dark) {
      body, .email-wrapper, .email-cell {
        background-color: #0f172a !important;
        background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
      }
      .card {
        background-color: #1e293b !important;
        background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
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

    [data-ogsc] body, [data-ogsb] body, [data-ogsc] .email-wrapper, [data-ogsb] .email-wrapper, [data-ogsc] .email-cell, [data-ogsb] .email-cell {
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
    }
    [data-ogsc] .card, [data-ogsb] .card {
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
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
<body style="background-color: #0f172a !important; background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important; margin: 0 !important; padding: 0 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="width: 100% !important; min-width: 100% !important; margin: 0 !important; padding: 0 !important; background-color: #0f172a !important; background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important; border-collapse: collapse;">
    <tr>
      <td align="center" class="email-cell" style="padding: 40px 20px !important; background-color: #0f172a !important; background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;">
        <div class="card" style="max-width: 560px !important; margin: 0 auto !important; background-color: #1e293b !important; background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important; border-radius: 16px !important; border: 1px solid #334155 !important; padding: 40px !important; text-align: center !important; box-sizing: border-box !important;">
          <img src="${logoUrl}" alt="Axon" class="logo" style="width: 64px !important; height: 64px !important; margin-bottom: 24px !important; border-radius: 16px !important; display: inline-block !important;">
          <h1 data-ogsc="color: #ffffff;" style="color: #ffffff !important; font-size: 24px !important; line-height: 1.3 !important; margin-top: 0 !important; margin-bottom: 20px !important; font-weight: 700 !important; text-align: center !important;">${safeSubject}</h1>
          <div class="content" data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px !important; line-height: 1.6 !important; margin-bottom: 32px !important; text-align: left !important;">
            ${formattedMessage}
          </div>
        </div>
        <div class="footer" data-ogsc="color: #64748b;" style="text-align: center !important; margin-top: 32px !important; color: #64748b !important; font-size: 14px !important;">
          &copy; 2026 Axon. All rights reserved.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}
