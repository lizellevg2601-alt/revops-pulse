// Public-facing legal and contact details. Keep these in one place so the
// footer, Terms, and Privacy pages cannot drift apart.
export const siteConfig = {
  siteName: "RevOps Pulse",
  publisher: "GTM Automation Academy",
  contactEmail: "admin@gtmautomationacademy.com",
  legalEffectiveDate: "21 November 2026",
} as const;

export const takedownMailto = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent("RevOps Pulse copyright / takedown request")}`;
