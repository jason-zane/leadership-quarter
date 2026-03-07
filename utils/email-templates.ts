export type EmailTemplateKey =
  | 'interest_internal_notification'
  | 'interest_user_confirmation'
  | 'inquiry_internal_notification'
  | 'inquiry_user_confirmation'
  | 'lq8_report_internal_notification'
  | 'lq8_report_user_confirmation'
  | 'ai_readiness_report_internal_notification'
  | 'ai_readiness_report_user_confirmation'
  | 'portal_support_internal_notification'
  | 'portal_support_user_confirmation'
  | 'survey_invitation'
  | 'survey_completion_confirmation'

export type EmailTemplateRecord = {
  key: EmailTemplateKey
  subject: string
  html_body: string
  text_body: string | null
}

export type TemplateRuntimeShape = {
  subject: string
  html: string
  text: string | null
}

export const defaultEmailTemplates: Record<EmailTemplateKey, TemplateRuntimeShape> = {
  interest_internal_notification: {
    subject: 'New interest registration: {{first_name}} {{last_name}}',
    html: `
      <h2>New Register Interest submission</h2>
      <p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Source:</strong> {{source}}</p>
      {{notes}}
    `,
    text: [
      'New Register Interest submission',
      '',
      'Name: {{first_name}} {{last_name}}',
      'Email: {{email}}',
      'Source: {{source}}',
      '{{notes}}',
    ].join('\n'),
  },
  interest_user_confirmation: {
    subject: 'Thanks for registering your interest',
    html: `
      <p>Hi {{first_name}},</p>
      <p>Thanks for registering your interest in Leadership Quarter.</p>
      <p>We will be in touch when dates and locations are confirmed.</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Thanks for registering your interest in Leadership Quarter.',
      'We will be in touch when dates and locations are confirmed.',
    ].join('\n'),
  },
  inquiry_internal_notification: {
    subject: 'New inquiry: {{first_name}} {{last_name}}',
    html: `
      <h2>New Inquiry</h2>
      <p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Organisation:</strong> {{organisation}}</p>
      <p><strong>Role:</strong> {{role}}</p>
      <p><strong>Topic:</strong> {{topic}}</p>
      <p><strong>Message:</strong></p>
      <p>{{message}}</p>
      <p><strong>Source:</strong> {{source}}</p>
    `,
    text: [
      'New Inquiry',
      '',
      'Name: {{first_name}} {{last_name}}',
      'Email: {{email}}',
      'Organisation: {{organisation}}',
      'Role: {{role}}',
      'Topic: {{topic}}',
      'Message:',
      '{{message}}',
      '',
      'Source: {{source}}',
    ].join('\n'),
  },
  inquiry_user_confirmation: {
    subject: 'Thanks for contacting Leadership Quarter',
    html: `
      <p>Hi {{first_name}},</p>
      <p>Thanks for your inquiry. We have received your details and will respond shortly.</p>
      <p>Leadership Quarter</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Thanks for your inquiry. We have received your details and will respond shortly.',
      '',
      'Leadership Quarter',
    ].join('\n'),
  },
  lq8_report_internal_notification: {
    subject: 'LQ8 report download: {{first_name}} {{last_name}}',
    html: `
      <h2>LQ8 Report Download Request</h2>
      <p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Organisation:</strong> {{organisation}}</p>
      <p><strong>Role:</strong> {{role}}</p>
      <p><strong>Source:</strong> {{source}}</p>
    `,
    text: [
      'LQ8 Report Download Request',
      '',
      'Name: {{first_name}} {{last_name}}',
      'Email: {{email}}',
      'Organisation: {{organisation}}',
      'Role: {{role}}',
      'Source: {{source}}',
    ].join('\n'),
  },
  lq8_report_user_confirmation: {
    subject: 'Your LQ8 report access',
    html: `
      <p>Hi {{first_name}},</p>
      <p>Thanks for requesting the LQ8 report. Your access is now available from the page you submitted.</p>
      <p>If you need support applying the framework, reply to this email.</p>
      <p>Leadership Quarter</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Thanks for requesting the LQ8 report. Your access is now available from the page you submitted.',
      'If you need support applying the framework, reply to this email.',
      '',
      'Leadership Quarter',
    ].join('\n'),
  },
  ai_readiness_report_internal_notification: {
    subject: 'AI Readiness report download: {{first_name}} {{last_name}}',
    html: `
      <h2>AI Readiness & Enablement Report Download Request</h2>
      <p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Organisation:</strong> {{organisation}}</p>
      <p><strong>Role:</strong> {{role}}</p>
      <p><strong>Source:</strong> {{source}}</p>
    `,
    text: [
      'AI Readiness & Enablement Report Download Request',
      '',
      'Name: {{first_name}} {{last_name}}',
      'Email: {{email}}',
      'Organisation: {{organisation}}',
      'Role: {{role}}',
      'Source: {{source}}',
    ].join('\n'),
  },
  ai_readiness_report_user_confirmation: {
    subject: 'Your AI Readiness & Enablement white paper access',
    html: `
      <p>Hi {{first_name}},</p>
      <p>Thanks for requesting the AI Readiness & Enablement white paper. Your access is now available from the page you submitted.</p>
      <p>If you would like help applying the model to your team, reply to this email.</p>
      <p>Leadership Quarter</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Thanks for requesting the AI Readiness & Enablement white paper. Your access is now available from the page you submitted.',
      'If you would like help applying the model to your team, reply to this email.',
      '',
      'Leadership Quarter',
    ].join('\n'),
  },
  portal_support_internal_notification: {
    subject: 'Portal support request: {{topic}}',
    html: `
      <h2>Portal Support Request</h2>
      <p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Organisation:</strong> {{organisation}}</p>
      <p><strong>Campaign:</strong> {{campaign_name}}</p>
      <p><strong>Topic:</strong> {{topic}}</p>
      <p><strong>Message:</strong></p>
      <p>{{message}}</p>
      <p><strong>Source:</strong> {{source}}</p>
    `,
    text: [
      'Portal Support Request',
      '',
      'Name: {{first_name}} {{last_name}}',
      'Email: {{email}}',
      'Organisation: {{organisation}}',
      'Campaign: {{campaign_name}}',
      'Topic: {{topic}}',
      'Message:',
      '{{message}}',
      '',
      'Source: {{source}}',
    ].join('\n'),
  },
  portal_support_user_confirmation: {
    subject: 'We received your support request',
    html: `
      <p>Hi {{first_name}},</p>
      <p>Thanks for contacting support. We have received your request and will respond shortly.</p>
      <p><strong>Topic:</strong> {{topic}}</p>
      <p>If you need to add anything, reply to this email.</p>
      <p>Leadership Quarter Support</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Thanks for contacting support. We have received your request and will respond shortly.',
      'Topic: {{topic}}',
      'If you need to add anything, reply to this email.',
      '',
      'Leadership Quarter Support',
    ].join('\n'),
  },
  survey_invitation: {
    subject: "You've been invited to complete the {{survey_name}}",
    html: `
      <p>Hi {{first_name}},</p>
      <p>You have been invited to complete the <strong>{{survey_name}}</strong>.</p>
      <p>Please use the private link below to begin:</p>
      <p><a href="{{invitation_url}}">Start your survey</a></p>
      <p>Leadership Quarter</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'You have been invited to complete the {{survey_name}}.',
      'Start your survey: {{invitation_url}}',
      '',
      'Leadership Quarter',
    ].join('\n'),
  },
  survey_completion_confirmation: {
    subject: 'Your {{survey_name}} results are ready',
    html: `
      <p>Hi {{first_name}},</p>
      <p>Your {{survey_name}} submission is complete.</p>
      <p><strong>Profile:</strong> {{classification_label}}</p>
      <p>You can view your full results here:</p>
      <p><a href="{{report_url}}">Open your report</a></p>
      <p>Leadership Quarter</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Your {{survey_name}} submission is complete.',
      'Profile: {{classification_label}}',
      'Open your report: {{report_url}}',
      '',
      'Leadership Quarter',
    ].join('\n'),
  },
}

export function renderTemplate(
  template: TemplateRuntimeShape,
  variables: Record<string, string>,
  escapeForHtml = false
) {
  return {
    subject: substitute(template.subject, variables, false),
    html: substitute(template.html, variables, escapeForHtml),
    text: template.text ? substitute(template.text, variables, false) : null,
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function substitute(template: string, variables: Record<string, string>, escapeValues: boolean) {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variableName: string) => {
    const value = variables[variableName] ?? ''
    return escapeValues ? escapeHtml(value) : value
  })
}
