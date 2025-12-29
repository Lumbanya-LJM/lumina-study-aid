export interface EmailTemplateProps {
  title: string;
  name?: string;
  content: string;
  footerText?: string;
  school?: 'law' | 'business' | 'health';
}

interface SchoolEmailColors {
  primary: string;
  primaryDark: string;
  accent: string;
  subtitle: string;
}

const SCHOOL_EMAIL_COLORS: Record<string, SchoolEmailColors> = {
  law: {
    primary: '#1e3a5f',
    primaryDark: '#0f1f33',
    accent: '#3366a3',
    subtitle: 'Legal Excellence • Professional Growth',
  },
  business: {
    primary: '#1a5c42',
    primaryDark: '#0e3326',
    accent: '#c9a227',
    subtitle: 'Business Acumen • Leadership Development',
  },
  health: {
    primary: '#2A5A6A',
    primaryDark: '#163945',
    accent: '#3d8e8e',
    subtitle: 'Clinical Excellence • Compassionate Care',
  },
};

const getSchoolName = (school?: string): string => {
  const names: Record<string, string> = {
    law: 'LMV LAW',
    business: 'LMV BUSINESS',
    health: 'LMV HEALTH',
  };
  return school ? names[school] || 'LMV ACADEMY' : 'LMV ACADEMY';
};

export const getEmailTemplate = ({ title, name, content, footerText, school }: EmailTemplateProps): string => {
  const currentYear = new Date().getFullYear();
  const userName = name ? `, ${name}` : '';
  
  // Use school-specific colors or default to health (teal)
  const colors = school && SCHOOL_EMAIL_COLORS[school] 
    ? SCHOOL_EMAIL_COLORS[school] 
    : SCHOOL_EMAIL_COLORS.health;
  
  const schoolName = getSchoolName(school);
  const subtitle = colors.subtitle;

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
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid #e8edf2;
        }
        .header {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
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
          color: ${colors.primary};
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
          color: ${colors.primary};
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 10px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .button:hover {
          background: linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%);
        }
        .info-box {
          background: linear-gradient(135deg, #f0f7f9 0%, #e8f4f8 100%);
          border-left: 4px solid ${colors.primary};
          padding: 20px;
          border-radius: 0 10px 10px 0;
          margin: 20px 0;
        }
        .info-box p {
          margin: 0;
          color: ${colors.primary};
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
          color: ${colors.primary};
          text-decoration: none;
          font-weight: 500;
        }
        .footer-logo {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.primary};
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        .highlight {
          color: ${colors.primary};
          font-weight: 600;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e8edf2, transparent);
          margin: 30px 0;
        }
        .accent-badge {
          display: inline-block;
          background-color: ${colors.accent};
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin: 5px 0;
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
          <div class="logo">${schoolName}</div>
          <div class="logo-subtitle">${subtitle}</div>
        </div>
        <div class="main-content">
          <h1>${title}</h1>
          <p>Hello${userName},</p>
          ${content}
        </div>
        <div class="footer">
          <div class="footer-logo">LUMINARY INNOVISION ACADEMY</div>
          <p>Law • Business • Health</p>
          <p>${footerText || `© ${currentYear} LMV Academy. All rights reserved.`}</p>
          <p>Questions? Contact us at <a href="mailto:admin@lmvacademy.com">admin@lmvacademy.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};