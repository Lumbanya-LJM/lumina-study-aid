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
          background-color: #f0f2f5;
          margin: 0;
          padding: 20px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          border: 1px solid #e0e0e0;
        }
        .header {
          background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%);
          padding: 40px;
          text-align: center;
        }
        .logo {
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .main-content {
          padding: 40px;
          color: #333333;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #1b263b;
        }
        p, ul, li {
          font-size: 16px;
          line-height: 1.7;
          margin: 0 0 20px 0;
        }
        ul {
          padding-left: 25px;
        }
        .button {
          display: inline-block;
          background-color: #2a6fdb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          padding: 30px;
          text-align: center;
          background-color: #f8f9fa;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          color: #888888;
          font-size: 12px;
          margin: 0;
        }
        .highlight {
          color: #2a6fdb;
          font-weight: 600;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .header, .main-content {
            padding: 30px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">LMV ACADEMY</div>
        </div>
        <div class="main-content">
          <h1>${title}</h1>
          <p>Hello${userName},</p>
          ${content}
        </div>
        <div class="footer">
          <p>${footerText || `© ${currentYear} LMV Academy. All rights reserved.`}</p>
          <p>If you have any questions, please contact us at <a href="mailto:admin@lmvacademy.com">admin@lmvacademy.com</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
