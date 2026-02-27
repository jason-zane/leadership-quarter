export type EmailTemplateKey =
  | 'interest_internal_notification'
  | 'interest_user_confirmation'

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
      <p>Thanks for registering your interest in Miles Between.</p>
      <p>We will be in touch when dates and locations are confirmed.</p>
    `,
    text: [
      'Hi {{first_name}},',
      '',
      'Thanks for registering your interest in Miles Between.',
      'We will be in touch when dates and locations are confirmed.',
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
