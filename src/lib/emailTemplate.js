/**
 * Utilities for generating announcement emails with a full-bleed dark background.
 * Avoids light-mode gutters around the content in Gmail dark mode.
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
<html lang="en" style="background-color: #1e293b;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${safeSubject}</title>
  <style>
    :root {
      color-scheme: light only;
      supported-color-schemes: light only;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      width: 100% !important;
      min-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
    }
    .email-cell {
      padding: 0 !important;
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
    }
    .card {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      border-radius: 0 !important;
      padding: 40px 24px !important;
      text-align: center !important;
      border: 0 !important;
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

    /* Gmail iOS / Android dark mode inversion counter-shield */
    u + .body .gmail-blend-screen {
      background: #000000;
      mix-blend-mode: screen;
    }
    u + .body .gmail-blend-difference {
      background: #000000;
      mix-blend-mode: difference;
    }

    @media (prefers-color-scheme: dark) {
      body, .email-wrapper, .email-cell {
        background-color: #1e293b !important;
        background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      }
      .card {
        background-color: #1e293b !important;
        background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
        border: 0 !important;
        border-radius: 0 !important;
      }
      h1, h1 span {
        color: #ffffff !important;
      }
      .content, .content * {
        color: #94a3b8 !important;
      }
      .footer, .footer * {
        color: #64748b !important;
      }
    }

    [data-ogsc] body, [data-ogsb] body, [data-ogsc] .email-wrapper, [data-ogsb] .email-wrapper, [data-ogsc] .email-cell, [data-ogsb] .email-cell {
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
    }
    [data-ogsc] .card, [data-ogsb] .card {
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      border: 0 !important;
      border-radius: 0 !important;
    }
    [data-ogsc] h1, [data-ogsc] h1 span {
      color: #ffffff !important;
    }
    [data-ogsc] .content, [data-ogsc] .content * {
      color: #94a3b8 !important;
    }
    [data-ogsc] .footer, [data-ogsc] .footer * {
      color: #64748b !important;
    }
  </style>
</head>
<body class="body" bgcolor="#1e293b" style="background-color: #1e293b !important; background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important; margin: 0 !important; padding: 0 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" bgcolor="#1e293b" style="width: 100% !important; min-width: 100% !important; margin: 0 !important; padding: 0 !important; background-color: #1e293b !important; background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important; border-collapse: collapse;">
    <tr>
      <td align="center" class="email-cell" bgcolor="#1e293b" style="padding: 0 !important; background-color: #1e293b !important; background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;">
        <div class="card" style="width: 100% !important; max-width: none !important; margin: 0 !important; background-color: #1e293b !important; background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important; border-radius: 0 !important; border: 0 !important; padding: 40px 24px !important; text-align: center !important; box-sizing: border-box !important;">
          <img src="${logoUrl}" alt="Axon" class="logo" style="width: 64px !important; height: 64px !important; margin-bottom: 24px !important; border-radius: 16px !important; display: inline-block !important;">
          <div class="gmail-blend-screen">
            <div class="gmail-blend-difference">
              <h1 data-ogsc="color: #ffffff;" style="color: #ffffff !important; font-size: 24px !important; line-height: 1.3 !important; margin-top: 0 !important; margin-bottom: 20px !important; font-weight: 700 !important; text-align: center !important;">
                <span style="color: #ffffff !important;">${safeSubject}</span>
              </h1>
              <div class="content" data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px !important; line-height: 1.6 !important; margin-bottom: 32px !important; text-align: left !important;">
                ${formattedMessage}
              </div>
            </div>
          </div>
          <div class="gmail-blend-screen">
            <div class="gmail-blend-difference">
              <div class="footer" data-ogsc="color: #64748b;" style="text-align: center !important; margin-top: 32px !important; color: #64748b !important; font-size: 14px !important;">
              &copy; 2026 Axon. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}
