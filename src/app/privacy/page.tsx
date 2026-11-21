import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/shared/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy | RevOps Pulse",
  description: "What RevOps Pulse stores, what it does not collect, how saved stories work, and how to reach us about privacy.",
};

export default function PrivacyPage() {
  return <LegalPage
    eyebrow="Legal"
    title="Privacy Policy"
    intro="RevOps Pulse is designed to need as little information about you as possible. This page describes what is stored, what is not, and the limited cases where a third party is involved."
    contactContext="this Privacy Policy"
  >
    <LegalSection title="The short version">
      <p>There are no accounts, sign-up forms, or payments. We do not run analytics, advertising trackers, or third-party cookies on this site. The one thing we store for you — your saved stories — lives in your own browser and is never sent to us.</p>
    </LegalSection>

    <LegalSection title="What we collect directly">
      <p>Nothing that identifies you. We do not ask for your name, email address, or organisation when you read the feed, search it, filter it, or save a story. We do not operate a newsletter, contact form, or comment system on this site.</p>
      <p>If you email us, we will of course receive the address and content of that message, and we will use it only to respond to you and to handle the request.</p>
    </LegalSection>

    <LegalSection title="What is stored in your browser">
      <p>When you save a story, we write the story IDs to your browser&apos;s local storage under the key <code>revops-pulse-saved-v1</code>. That data stays on your device: it is not transmitted to our servers or to any publisher. It is used only to show you your saved list. Because it is local, there is no cross-device sync.</p>
      <p>Only saved stories that are still present in the current feed are displayed. Clearing your browser&apos;s site data removes your bookmarks. If your browser blocks storage, saving still works for the current tab but will not persist after it closes.</p>
    </LegalSection>

    <LegalSection title="Hosting and request logs">
      <p>This is a static site hosted on Cloudflare Pages. Like most websites, the hosting provider may record standard request information such as your IP address, browser type, requested page, and timestamp for security, debugging, and performance purposes. Those records are handled by our provider under its own privacy policy; we do not use them to build profiles of readers.</p>
    </LegalSection>

    <LegalSection title="Feed collection and outgoing links">
      <p>Stories are gathered by an automated job that fetches public RSS feeds from publishers and writes them into the site at build time. That job does not receive or send any information about you.</p>
      <p>When you follow a link to a publisher, you leave {siteConfig.siteName} and the publisher&apos;s own privacy terms apply. We do not control those sites, and this policy does not cover their practices.</p>
    </LegalSection>

    <LegalSection title="Children">
      <p>RevOps Pulse is intended for a professional audience and is not directed at children. We do not knowingly collect information from anyone under 16.</p>
    </LegalSection>

    <LegalSection title="Your choices and changes">
      <p>You can remove saved stories at any time in the interface or by clearing this site&apos;s data in your browser. You can also contact us with privacy questions or requests. We may update this policy as the site changes; when we do, we will update the effective date at the top of this page.</p>
    </LegalSection>
  </LegalPage>;
}
