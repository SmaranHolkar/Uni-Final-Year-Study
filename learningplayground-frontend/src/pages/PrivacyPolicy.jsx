import React from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly, such as your email address when signing up, prompt inputs, saved tools, and session activity in Learning Playground. We also collect minimal technical diagnostic data (browser type, IP address, performance metrics).`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use your information exclusively to provide, maintain, and optimize Learning Playground, deliver user authentication, save interactive tools, and process AI study generation requests. We do NOT sell your personal data or use your private notes to train external AI models.`,
  },
  {
    title: "3. Information Sharing",
    content: `Your data is only shared with third-party service providers (such as cloud database providers and AI model endpoints) as required to operate the platform securely. Public marketplace items published by you are accessible to other users of the Service.`,
  },
  {
    title: "4. Data Security & Storage",
    content: `We employ industry-standard encryption, SSL transport security, and Supabase row-level authentication security policies to safeguard your data.`,
  },
  {
    title: "5. Your Rights & Data Deletion",
    content: `You have the right to access, export, or delete your personal data and saved playground tools at any time by contacting support@learningplayground.com or utilizing in-app account deletion.`,
  },
  {
    title: "6. Updates to This Policy",
    content: `We may update this Privacy Policy periodically. Notice of significant updates will be posted on this page with an updated timestamp.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-4 py-12 bg-[#131519] text-[#CDD1D6]">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#6E7580] hover:text-[#CDD1D6] transition-colors"
        >
          ← Back to Learning Playground
        </Link>
        <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-bold text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#6E7580] font-mono mb-8">
          Last updated: August 12, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-[#CDD1D6]">
          {sections.map((section, idx) => (
            <div key={idx} className="p-6 rounded-xl bg-[#1A1E24] border border-[#282E38]">
              <h2 className="text-lg font-semibold text-white mb-3">
                {section.title}
              </h2>
              <p className="whitespace-pre-line text-[#CDD1D6]">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
