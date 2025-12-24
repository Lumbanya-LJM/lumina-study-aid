# LMV Academy - Supabase Auth Email Templates

Copy these templates into your Supabase Auth settings under **Users → Auth Settings → Email Templates**.

---

## 1. Confirm Signup Email

**Subject:**
```
Confirm your LMV Academy account
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">LMV Academy</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Luminary Innovision Academy</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">Confirm Your Email</h2>
      
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        Welcome to LMV Academy! Please confirm your email address to complete your registration and start your learning journey.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Confirm Email Address
        </a>
      </div>
      
      <p style="color: #888; font-size: 14px; margin: 20px 0 0 0;">
        If you didn't create an account with LMV Academy, you can safely ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
        © 2025 Luminary Innovision Academy. All rights reserved.<br>
        <a href="https://app.lmvacademy.com" style="color: #7c3aed;">app.lmvacademy.com</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 2. Password Reset Email

**Subject:**
```
Reset your LMV Academy password
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">LMV Academy</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">Reset Your Password</h2>
      
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        We received a request to reset your LMV Academy password. Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          ⚠️ This link will expire in 24 hours. If you didn't request a password reset, please ignore this email or contact support.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
        © 2025 Luminary Innovision Academy. All rights reserved.<br>
        <a href="https://app.lmvacademy.com" style="color: #7c3aed;">app.lmvacademy.com</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 3. Magic Link Email

**Subject:**
```
Your LMV Academy login link
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">LMV Academy</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Login Link</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">Log In to LMV Academy</h2>
      
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        Click the button below to securely log in to your LMV Academy account. No password required!
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Log In to LMV Academy
        </a>
      </div>
      
      <p style="color: #888; font-size: 14px; margin: 20px 0 0 0;">
        This magic link will expire in 1 hour. If you didn't request this login link, you can safely ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
        © 2025 Luminary Innovision Academy. All rights reserved.<br>
        <a href="https://app.lmvacademy.com" style="color: #7c3aed;">app.lmvacademy.com</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 4. Email Change Confirmation

**Subject:**
```
Confirm your new email for LMV Academy
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">LMV Academy</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Email Change Request</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">Confirm Your New Email</h2>
      
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        You've requested to change your email address for your LMV Academy account. Please confirm this change by clicking the button below.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Confirm New Email
        </a>
      </div>
      
      <p style="color: #888; font-size: 14px; margin: 20px 0 0 0;">
        If you didn't request this email change, please contact our support team immediately.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
        © 2025 Luminary Innovision Academy. All rights reserved.<br>
        <a href="https://app.lmvacademy.com" style="color: #7c3aed;">app.lmvacademy.com</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## How to Apply These Templates

1. Open the Backend dashboard
2. Go to **Users → Auth Settings**
3. Scroll to **Email Templates**
4. For each template type, paste the corresponding Subject and HTML body
5. Save changes

