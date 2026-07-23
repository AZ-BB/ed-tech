export type WrapEmailHtmlInput = {
  bodyHtml: string;
  footerHtml?: string;
};

export function wrapEmailHtml({ bodyHtml, footerHtml }: WrapEmailHtmlInput): string {
  const footerRow = footerHtml
    ? `<tr><td class="email-footer" style="padding:16px 28px 28px;border-top:1px solid #eee9dc;">${footerHtml}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@media only screen and (max-width: 620px) {
  .email-outer { padding: 20px 12px !important; }
  .email-body { padding: 22px 18px 8px !important; }
  .email-footer { padding: 14px 18px 22px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-outer" style="background:#f4f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:12px;border:1px solid #e5e2d8;overflow:hidden;">
        <tr><td class="email-body" style="padding:28px 28px 8px;">${bodyHtml}</td></tr>
        ${footerRow}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
