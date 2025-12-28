export interface EmailTemplateProps {
  title: string;
  name?: string;
  content: string;
  footerText?: string;
}

export const getEmailTemplate = ({ title, name, content, footerText }: EmailTemplateProps): string => {
  const currentYear = new Date().getFullYear();
  const userName = name ? `, ${name}` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f5f7fa;
          margin: 0;
          padding: 20px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(42, 90, 106, 0.1);
          border: 1px solid #e8edf2;
        }
        .header {
          background: linear-gradient(135deg, #2A5A6A 0%, #1e4a58 50%, #163945 100%);
          padding: 40px;
          text-align: center;
        }
        .logo {
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .logo-subtitle {
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 3px;
          margin-top: 8px;
          text-transform: uppercase;
        }
        .main-content {
          padding: 40px;
          color: #2c3e50;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #2A5A6A;
        }
        p, ul, li {
          font-size: 16px;
          line-height: 1.7;
          margin: 0 0 20px 0;
          color: #4a5568;
        }
        ul {
          padding-left: 25px;
        }
        li {
          margin-bottom: 10px;
        }
        strong {
          color: #2A5A6A;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #2A5A6A 0%, #1e4a58 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 10px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
          box-shadow: 0 4px 15px rgba(42, 90, 106, 0.3);
        }
        .button:hover {
          background: linear-gradient(135deg, #1e4a58 0%, #163945 100%);
        }
        .info-box {
          background: linear-gradient(135deg, #f0f7f9 0%, #e8f4f8 100%);
          border-left: 4px solid #2A5A6A;
          padding: 20px;
          border-radius: 0 10px 10px 0;
          margin: 20px 0;
        }
        .info-box p {
          margin: 0;
          color: #2A5A6A;
        }
        .footer {
          padding: 30px 40px;
          text-align: center;
          background: linear-gradient(180deg, #f8f9fa 0%, #f0f2f5 100%);
          border-top: 1px solid #e8edf2;
        }
        .footer p {
          color: #718096;
          font-size: 13px;
          margin: 0 0 10px 0;
        }
        .footer a {
          color: #2A5A6A;
          text-decoration: none;
          font-weight: 500;
        }
        .footer-logo {
          font-size: 14px;
          font-weight: 700;
          color: #2A5A6A;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        .highlight {
          color: #2A5A6A;
          font-weight: 600;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e8edf2, transparent);
          margin: 30px 0;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .header, .main-content {
            padding: 30px 20px;
          }
          .footer {
            padding: 25px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">LMV ACADEMY</div>
          <div class="logo-subtitle">Legal Excellence • Professional Growth</div>
        </div>
        <div class="main-content">
          <h1>${title}</h1>
          <p>Hello${userName},</p>
          ${content}
        </div>
        <div class="footer">
          <div class="footer-logo">LMV ACADEMY</div>
          <p>${footerText || `© ${currentYear} LMV Academy. All rights reserved.`}</p>
          <p>Questions? Contact us at <a href="mailto:admin@lmvacademy.com">admin@lmvacademy.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};
