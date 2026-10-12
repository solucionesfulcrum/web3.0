export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function detail(label: string, value: string) {
  return `<tr><td style="padding:16px 0;border-bottom:1px solid #363636"><p style="margin:0 0 8px;color:#ff8745;font-size:11px;letter-spacing:1px">${escapeHtml(label)}</p><p style="margin:0;color:#ffffff;font-size:15px;line-height:1.7;overflow-wrap:anywhere">${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p></td></tr>`;
}

// Only template-owned markup is passed as content; all user fields go through escapeHtml/detail.
export function base(title: string, content: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:#101010;color:#ffffff;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#101010"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#1b1b1b;border-top:4px solid #ff782d"><tr><td style="padding:36px 28px"><p style="font-size:30px;font-weight:bold;letter-spacing:-1px;margin:0">FULCRUM<span style="color:#ff8745">.</span></p><p style="color:#cccccc;font-size:10px;letter-spacing:1px;line-height:1.8;margin:10px 0 36px">INTELIGENCIA Y SOLUCIONES TECNOLÓGICAS</p><h1 style="font-size:26px;line-height:1.3;margin:0 0 24px">${escapeHtml(title)}</h1>${content}<p style="margin:32px 0 0;font-size:14px;line-height:1.8;color:#dddddd">Equipo FULCRUM<br><a href="https://fulcrum.com.pe" style="color:#ff8745">fulcrum.com.pe</a><br><a href="mailto:contacto@fulcrum.com.pe" style="color:#dddddd">contacto@fulcrum.com.pe</a></p></td></tr></table></td></tr></table></body></html>`;
}
