import React, { useState } from 'react';
import { Mail, Eye, Palette, Send, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'enrollment' | 'tutor' | 'notification';
  subject: string;
  previewData: Record<string, string>;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Sent when a new user signs up',
    category: 'auth',
    subject: 'Welcome to LMV Academy!',
    previewData: { name: 'John Doe', email: 'john@example.com' },
  },
  {
    id: 'signup',
    name: 'Email Confirmation',
    description: 'Sent to confirm email address during signup',
    category: 'auth',
    subject: 'Welcome to LMV Academy - Confirm Your Email',
    previewData: { name: 'John Doe' },
  },
  {
    id: 'recovery',
    name: 'Password Reset',
    description: 'Sent when user requests password reset',
    category: 'auth',
    subject: 'Reset Your Password — LMV Academy',
    previewData: { name: 'John Doe' },
  },
  {
    id: 'magiclink',
    name: 'Magic Link Login',
    description: 'Passwordless login email',
    category: 'auth',
    subject: 'Your LMV Academy Login Link',
    previewData: { name: 'John Doe' },
  },
  {
    id: 'enrollment',
    name: 'Enrollment Confirmation',
    description: 'Sent when student enrolls in a course',
    category: 'enrollment',
    subject: 'Course Enrollment Confirmed - LMV Academy',
    previewData: { name: 'John Doe', courseName: 'Legal Practice' },
  },
  {
    id: 'tutor-invitation',
    name: 'Tutor Invitation',
    description: 'Sent to invite new tutors',
    category: 'tutor',
    subject: 'You\'re Invited to Teach at LMV Academy',
    previewData: { name: 'Jane Smith' },
  },
  {
    id: 'tutor-approved',
    name: 'Tutor Application Approved',
    description: 'Sent when tutor application is approved',
    category: 'tutor',
    subject: 'Congratulations! Your Tutor Application is Approved',
    previewData: { name: 'Jane Smith' },
  },
  {
    id: 'tutor-rejected',
    name: 'Tutor Application Rejected',
    description: 'Sent when tutor application is rejected',
    category: 'tutor',
    subject: 'Update on Your LMV Academy Tutor Application',
    previewData: { name: 'Jane Smith' },
  },
  {
    id: 'class-scheduled',
    name: 'Class Scheduled',
    description: 'Sent when a new class is scheduled',
    category: 'notification',
    subject: 'New Class Scheduled - LMV Academy',
    previewData: { name: 'John Doe', className: 'Contract Law' },
  },
  {
    id: 'class-reminder',
    name: 'Class Reminder',
    description: 'Sent before a class starts',
    category: 'notification',
    subject: 'Class Starting Soon - LMV Academy',
    previewData: { name: 'John Doe', className: 'Contract Law' },
  },
  {
    id: 'weekly-report',
    name: 'Weekly Progress Report',
    description: 'Sent to accountability partners',
    category: 'notification',
    subject: 'Weekly Progress Report - LMV Academy',
    previewData: { name: 'Parent/Guardian', studentName: 'John Doe' },
  },
];

const categoryLabels = {
  auth: 'Authentication',
  enrollment: 'Enrollment',
  tutor: 'Tutor',
  notification: 'Notifications',
};

const categoryColors = {
  auth: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  enrollment: 'bg-green-500/10 text-green-600 border-green-500/20',
  tutor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  notification: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const getEmailContent = (templateId: string, data: Record<string, string>): string => {
  const name = data.name || 'User';
  
  switch (templateId) {
    case 'welcome':
      return `
        <p>Thank you for joining LMV Academy! We're excited to have you as part of our legal education community.</p>
        <div class="info-box">
          <p><strong>What's Next?</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Explore our course catalog</li>
            <li>Set up your study profile</li>
            <li>Join live classes with expert tutors</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Get Started</a>
        </div>
      `;
    case 'signup':
      return `
        <p>Thank you for joining LMV Academy. You're one step away from accessing world-class legal education resources.</p>
        <p>Please confirm your email address to activate your account:</p>
        <div style="text-align: center;">
          <a href="#" class="button">Confirm Email Address</a>
        </div>
        <p>⏰ This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
      `;
    case 'recovery':
      return `
        <p>We received a request to reset your password for your LMV Academy account. Click the button below to create a new password:</p>
        <div style="text-align: center;">
          <a href="#" class="button">Reset Password</a>
        </div>
        <p>⚠️ This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
      `;
    case 'magiclink':
      return `
        <p>Click the button below to securely log in to your LMV Academy account:</p>
        <div style="text-align: center;">
          <a href="#" class="button">Log In to LMV Academy</a>
        </div>
        <p>⏰ This link expires in 1 hour and can only be used once.</p>
      `;
    case 'enrollment':
      return `
        <p>Congratulations! You have successfully enrolled in <strong>${data.courseName || 'Legal Practice'}</strong>.</p>
        <div class="info-box">
          <p><strong>Your enrollment includes:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Access to all live classes</li>
            <li>Course materials and resources</li>
            <li>Class recordings</li>
            <li>Direct tutor support</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">View Your Course</a>
        </div>
      `;
    case 'tutor-invitation':
      return `
        <p>You have been invited to join LMV Academy as a tutor!</p>
        <p>LMV Academy is a leading platform for legal education in Zambia, and we believe your expertise would be a valuable addition to our team.</p>
        <div class="info-box">
          <p><strong>As a tutor, you'll be able to:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Conduct live classes for law students</li>
            <li>Share your legal expertise and experience</li>
            <li>Earn while making a difference in legal education</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Accept Invitation</a>
        </div>
        <p>⏰ This invitation expires in 7 days.</p>
      `;
    case 'tutor-approved':
      return `
        <p>We're thrilled to inform you that your application to become a tutor at LMV Academy has been <strong>approved</strong>! 🎉</p>
        <p>Welcome to our team of dedicated legal educators.</p>
        <div class="info-box">
          <p><strong>Next Steps:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Access your tutor dashboard</li>
            <li>Set up your teaching schedule</li>
            <li>Prepare your first class materials</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Go to Tutor Dashboard</a>
        </div>
      `;
    case 'tutor-rejected':
      return `
        <p>Thank you for your interest in becoming a tutor at LMV Academy. After careful review of your application, we regret to inform you that we are unable to move forward at this time.</p>
        <p>This decision was made based on our current needs and requirements. We encourage you to reapply in the future as our needs evolve.</p>
        <p>If you have any questions, please don't hesitate to reach out to us.</p>
        <div style="text-align: center;">
          <a href="#" class="button">Contact Support</a>
        </div>
      `;
    case 'class-scheduled':
      return `
        <p>A new class has been scheduled for your enrolled course!</p>
        <div class="info-box">
          <p><strong>Class Details:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li><strong>Class:</strong> ${data.className || 'Contract Law'}</li>
            <li><strong>Date:</strong> Monday, January 15, 2025</li>
            <li><strong>Time:</strong> 10:00 AM (CAT)</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Add to Calendar</a>
        </div>
      `;
    case 'class-reminder':
      return `
        <p>Your class is starting soon! Don't miss out on this session.</p>
        <div class="info-box">
          <p><strong>Class:</strong> ${data.className || 'Contract Law'}</p>
          <p><strong>Starting in:</strong> 30 minutes</p>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Join Class Now</a>
        </div>
      `;
    case 'weekly-report':
      return `
        <p>Here's the weekly progress report for ${data.studentName || 'your student'}.</p>
        <div class="info-box">
          <p><strong>This Week's Activity:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li><strong>Study Hours:</strong> 12 hours</li>
            <li><strong>Tasks Completed:</strong> 8/10</li>
            <li><strong>Quizzes Taken:</strong> 3</li>
            <li><strong>Average Score:</strong> 85%</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">View Full Report</a>
        </div>
      `;
    default:
      return '<p>Email content preview not available.</p>';
  }
};

const generateFullEmailHtml = (title: string, name: string, content: string): string => {
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
        ul { padding-left: 25px; }
        li { margin-bottom: 10px; }
        strong { color: #2A5A6A; }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #2A5A6A 0%, #1e4a58 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 10px;
          font-weight: 600;
          margin: 20px 0;
          box-shadow: 0 4px 15px rgba(42, 90, 106, 0.3);
        }
        .info-box {
          background: linear-gradient(135deg, #f0f7f9 0%, #e8f4f8 100%);
          border-left: 4px solid #2A5A6A;
          padding: 20px;
          border-radius: 0 10px 10px 0;
          margin: 20px 0;
        }
        .info-box p { margin: 0; color: #2A5A6A; }
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
        .footer a { color: #2A5A6A; text-decoration: none; font-weight: 500; }
        .footer-logo {
          font-size: 14px;
          font-weight: 700;
          color: #2A5A6A;
          letter-spacing: 1px;
          margin-bottom: 10px;
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
          <p>© ${currentYear} LMV Academy. All rights reserved.</p>
          <p>Questions? Contact us at <a href="mailto:admin@lmvacademy.com">admin@lmvacademy.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const EmailTemplatesManager: React.FC = () => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(emailTemplates[0]);
  const [previewData, setPreviewData] = useState<Record<string, string>>(emailTemplates[0].previewData);
  const [showHtml, setShowHtml] = useState(false);
  const [sendTestEmail, setSendTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['auth']);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewData(template.previewData);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSendTest = async () => {
    if (!sendTestEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter an email address to send the test.',
      });
      return;
    }

    setSending(true);
    // Simulate sending - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    
    toast({
      title: 'Test Email Sent',
      description: `Preview sent to ${sendTestEmail}`,
    });
    setSendTestEmail('');
  };

  const groupedTemplates = emailTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const emailContent = getEmailContent(selectedTemplate.id, previewData);
  const fullHtml = generateFullEmailHtml(
    selectedTemplate.subject.split(' - ')[0].replace('Welcome to LMV Academy - ', '').replace(' — LMV Academy', ''),
    previewData.name || '',
    emailContent
  );

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-5 h-5" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Preview and customize email templates used throughout the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Templates</h3>
              <div className="space-y-2">
                {Object.entries(groupedTemplates).map(([category, templates]) => (
                  <Collapsible
                    key={category}
                    open={expandedCategories.includes(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={categoryColors[category as keyof typeof categoryColors]}>
                          {categoryLabels[category as keyof typeof categoryLabels]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({templates.length})
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedCategories.includes(category) ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedTemplate.id === template.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{template.name}</p>
                            {selectedTemplate.id === template.id && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {template.description}
                          </p>
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs defaultValue="preview" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="customize" className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Customize
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHtml(!showHtml)}
                  >
                    {showHtml ? 'Show Preview' : 'Show HTML'}
                  </Button>
                </div>

                <TabsContent value="preview" className="mt-0">
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{selectedTemplate.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          To: {previewData.name || 'Recipient'} &lt;recipient@example.com&gt;
                        </p>
                      </div>
                      <Badge variant="outline" className={categoryColors[selectedTemplate.category]}>
                        {categoryLabels[selectedTemplate.category]}
                      </Badge>
                    </div>
                    {showHtml ? (
                      <pre className="p-4 text-xs overflow-auto max-h-[500px] bg-background">
                        <code>{fullHtml}</code>
                      </pre>
                    ) : (
                      <div className="p-4 bg-background">
                        <iframe
                          srcDoc={fullHtml}
                          className="w-full h-[500px] border-0"
                          title="Email Preview"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="customize" className="mt-0 space-y-4">
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Preview Data</CardTitle>
                      <CardDescription className="text-xs">
                        Customize the preview data for this template
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(previewData).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                          <Input
                            value={value}
                            onChange={(e) => setPreviewData(prev => ({ ...prev, [key]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Send Test Email</CardTitle>
                      <CardDescription className="text-xs">
                        Send a test email to verify the template
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={sendTestEmail}
                          onChange={(e) => setSendTestEmail(e.target.value)}
                          className="h-9"
                        />
                        <Button
                          onClick={handleSendTest}
                          disabled={sending}
                          size="sm"
                          className="shrink-0"
                        >
                          {sending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Test
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>Note:</strong> Email templates are currently defined in the codebase. 
                      To modify the actual email content, edit the template files in <code className="bg-amber-500/20 px-1 rounded">supabase/functions/_shared/email-template.ts</code> and the respective edge functions.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplatesManager;
