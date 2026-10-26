/**
 * Utilities for generating email HTML with forced dark mode styling.
 * Prevents Gmail (iOS/Android), Apple Mail, and Outlook from auto-inverting
 * dark backgrounds or wrapping emails in awkward white card borders.
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

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${safeSubject}</title>
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #0f172a !important;
      background-image: linear-gradient(#0f172a, #0f172a) !important;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    body, table, td, div, p, a, h1, span {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .wrapper-table {
      width: 100% !important;
      min-width: 100% !important;
      background-color: #0f172a !important;
      background-image: linear-gradient(#0f172a, #0f172a) !important;
    }
    .card-table {
      max-width: 560px !important;
      width: 100% !important;
      background-color: #1e293b !important;
      background-image: linear-gradient(#1e293b, #1e293b) !important;
      border: 1px solid #334155 !important;
      border-radius: 16px;
    }
    .card-td {
      padding: 40px 32px !important;
      background-color: #1e293b !important;
      background-image: linear-gradient(#1e293b, #1e293b) !important;
      border-radius: 16px;
    }
    .email-logo {
      width: 64px !important;
      height: 64px !important;
      margin-bottom: 24px;
      border-radius: 16px;
      display: block;
      border: 0;
      outline: none;
    }
    h1 {
      color: #ffffff !important;
      font-size: 24px;
      line-height: 1.3;
      margin: 0 0 20px 0;
      font-weight: 700;
      text-align: center;
    }
    .content {
      color: #94a3b8 !important;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 8px;
      text-align: left;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      color: #64748b !important;
      font-size: 13px;
      line-height: 1.5;
    }

    /* Force dark background & light text in Dark Mode */
    @media (prefers-color-scheme: dark) {
      body, .wrapper-table, .wrapper-td {
        background-color: #0f172a !important;
        background-image: linear-gradient(#0f172a, #0f172a) !important;
      }
      .card-table, .card-td {
        background-color: #1e293b !important;
        background-image: linear-gradient(#1e293b, #1e293b) !important;
        border: 1px solid #334155 !important;
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

    /* Target Gmail on iOS/Android to resist forced color inversion and white card wrappers */
    [data-ogsc] body, [data-ogsb] body, [data-ogsc] .wrapper-table, [data-ogsb] .wrapper-table, [data-ogsc] .wrapper-td, [data-ogsb] .wrapper-td {
      background-color: #0f172a !important;
      background-image: linear-gradient(#0f172a, #0f172a) !important;
    }
    [data-ogsc] .card-table, [data-ogsb] .card-table, [data-ogsc] .card-td, [data-ogsb] .card-td {
      background-color: #1e293b !important;
      background-image: linear-gradient(#1e293b, #1e293b) !important;
      border: 1px solid #334155 !important;
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
<body style="margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapper-table" style="width: 100% !important; min-width: 100% !important; margin: 0 !important; padding: 0 !important; border-collapse: collapse; background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important;">
    <tr>
      <td align="center" valign="top" class="wrapper-td" style="padding: 32px 16px; background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important;">
        
        <!-- Centered Card Table -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card-table" style="max-width: 560px; width: 100% !important; margin: 0 auto; border-collapse: separate; border-spacing: 0; background-color: #1e293b !important; background-image: linear-gradient(#1e293b, #1e293b) !important; border-radius: 16px; border: 1px solid #334155 !important;">
          <tr>
            <td align="center" class="card-td" style="padding: 40px 32px !important; background-color: #1e293b !important; background-image: linear-gradient(#1e293b, #1e293b) !important; border-radius: 16px;">
              <img src="${logoUrl}" alt="Axon" width="64" height="64" class="email-logo" style="width: 64px; height: 64px; margin-bottom: 24px; border-radius: 16px; display: block; border: 0; outline: none; margin-left: auto; margin-right: auto;">
              <h1 data-ogsc="color: #ffffff;" style="color: #ffffff !important; font-size: 24px; line-height: 1.3; margin: 0 0 20px 0; font-weight: 700; text-align: center;">${safeSubject}</h1>
              <div class="content" data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px; line-height: 1.6; margin-bottom: 8px; text-align: left;">
                ${formattedMessage}
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div class="footer" data-ogsc="color: #64748b;" style="max-width: 560px; margin: 24px auto 0 auto; text-align: center; color: #64748b !important; font-size: 13px; line-height: 1.5;">
          &copy; 2026 Axon. All rights reserved.
        </div>

      </td>
    </tr>
  </table>
</body>
</html>`
}
