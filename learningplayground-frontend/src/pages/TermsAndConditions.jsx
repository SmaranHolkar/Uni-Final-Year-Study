import React from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Learning Playground ("the Service"), you confirm that you are at least 13 years of age and agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the Service.`,
  },
  {
    title: "2. Description of Service",
    content: `Learning Playground is an AI-powered interactive study environment allowing users to generate custom revision tools — such as flashcards, Q&A sets, mindmaps, notes, and study guides — from plain-English prompts. Features may be updated or extended at any time without prior notice for educational and personal use only.`,
  },
  {
    title: "3. User Accounts & Access",
    content: `You may access Learning Playground as a guest or by creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity occurring under your account.`,
  },
  {
    title: "4. Acceptable Use",
    content: `You agree not to misuse the Service. Prohibited activities include uploading unlawful content, attempting to reverse-engineer AI models, using the Service for automated spam/scraping, or circumventing access limits.`,
  },
  {
    title: "5. AI-Generated Content",
    content: `Learning Playground uses artificial intelligence to compile study widgets. AI-generated content is provided for educational assistance only and may contain errors. You should independently verify any output before relying on it for academic submissions.`,
  },
  {
    title: "6. User Data & Storage",
    content: `We securely store your saved tools and session history to deliver the Service. You can request account deletion at any time.`,
  },
  {
    title: "7. Intellectual Property & Marketplace Sharing",
    content: `When you choose to publish a tool to the public Marketplace, you grant Learning Playground a non-exclusive license to display and share the tool with the community. All platform software and branding remain the property of Learning Playground.`,
  },
  {
    title: "8. Contact Us",
    content: `For any legal inquiries regarding Learning Playground, contact support@learningplayground.com.`,
  },
];

export default function TermsAndConditions() {
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
          Terms &amp; Conditions
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
