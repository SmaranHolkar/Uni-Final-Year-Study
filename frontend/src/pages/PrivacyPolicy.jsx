import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Who We Are",
    content: `HydrusLearn ("we", "us", "our") operates the HydrusLearn platform — an AI-powered study tool available at hydruslearn.com. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Service.\n\nIf you have any questions about this policy, you can contact us at support@hydruslearn.com.`,
  },
  {
    title: "2. Information We Collect",
    content: `We collect the following categories of information:\n\n• Account information: Your first name, last name, and email address when you register.\n• Uploaded content: Documents and files you voluntarily upload to the platform for processing.\n• Usage data: Information about how you interact with the Service, such as pages visited, quizzes taken, and features used.\n• Device and technical data: IP address, browser type, operating system, and referring URLs, collected automatically when you access the Service.\n• Communications: Any messages you send to our support team.\n\nWe do not knowingly collect personal data from children under 13 years of age.`,
  },
  {
    title: "3. How We Use Your Information",
    content: `We use your information to:\n\n• Provide, operate, and maintain the Service.\n• Generate AI-powered quizzes, summaries, and learning feedback from your uploaded content.\n• Manage your account and authenticate you securely.\n• Send transactional emails (e.g. email verification, password resets).\n• Improve the platform through aggregated, anonymised usage analysis.\n• Respond to support enquiries.\n• Comply with our legal obligations.\n\nWe do not use your data for advertising or sell it to third parties.`,
  },
  {
    title: "4. Legal Basis for Processing (UK/EU Users)",
    content: `Under UK GDPR and EU GDPR, we rely on the following legal bases to process your personal data:\n\n• Contractual necessity: To provide the Service you have signed up for.\n• Legitimate interests: To improve the platform and ensure security, where such interests are not overridden by your rights.\n• Consent: Where you have explicitly agreed (e.g. optional communications).\n• Legal obligation: Where processing is required by law.`,
  },
  {
    title: "5. Uploaded Documents and AI Processing",
    content: `When you upload a document, it is transmitted securely to our servers and processed by AI models to generate study content. Your documents are stored associated with your account and are not shared with other users.\n\nAI processing may involve sending document content to third-party AI providers (see Section 7). These providers process content solely to return AI-generated output and are bound by data processing agreements that prohibit training on your data.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your personal data for as long as your account is active or as needed to provide the Service. If you delete your account, your personal data and uploaded documents will be permanently removed from our active databases within 30 days.\n\nCertain anonymised or aggregated data, and data retained in routine system backups, may be kept for a limited additional period for legal, security, or operational purposes before being purged.`,
  },
  {
    title: "7. Third-Party Services",
    content: `To provide the Service, we rely on the following categories of third-party providers:\n\n• Authentication and database: Supabase (data hosted in the EU/UK region).\n• AI model providers: Third-party APIs used to generate quizzes and summaries from your content.\n• Hosting and infrastructure: Cloud hosting providers that may store data in secure data centres.\n\nAll third-party providers are selected carefully and are required to maintain appropriate security standards. We do not allow them to use your data for their own purposes.`,
  },
  {
    title: "8. Cookies and Tracking",
    content: `HydrusLearn uses minimal cookies and local storage to maintain your session and remember your preferences (such as light/dark mode). We do not use third-party advertising cookies or tracking pixels.\n\nYou can disable cookies in your browser settings, but this may affect your ability to log in and use core features of the Service.`,
  },
  {
    title: "9. Your Rights",
    content: `Depending on your location, you may have the following rights regarding your personal data:\n\n• Access: Request a copy of the personal data we hold about you.\n• Rectification: Ask us to correct inaccurate or incomplete data.\n• Erasure: Request deletion of your personal data ("right to be forgotten").\n• Restriction: Ask us to limit how we process your data.\n• Portability: Request your data in a portable, machine-readable format.\n• Objection: Object to processing based on legitimate interests.\n• Withdraw consent: Where processing is based on consent, you may withdraw it at any time.\n\nTo exercise any of these rights, contact us at support@hydruslearn.com. We will respond within 30 days.`,
  },
  {
    title: "10. Data Security",
    content: `We implement industry-standard technical and organisational measures to protect your data, including:\n\n• Encrypted connections (HTTPS/TLS) for all data in transit.\n• Secure, access-controlled storage for data at rest.\n• Authentication controls and session management.\n• Regular review of third-party security practices.\n\nWhile we take security seriously, no system is completely immune to risk. Please notify us immediately at support@hydruslearn.com if you suspect any breach or unauthorised access to your account.`,
  },
  {
    title: "11. International Transfers",
    content: `HydrusLearn is operated from the United Kingdom. If you access the Service from outside the UK, your data may be transferred to and processed in the UK or in countries where our third-party providers operate. Where such transfers occur outside the UK/EEA, we ensure appropriate safeguards are in place (such as Standard Contractual Clauses) in line with UK GDPR requirements.`,
  },
  {
    title: "12. Children's Privacy",
    content: `HydrusLearn is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us immediately and we will promptly delete it.`,
  },
  {
    title: "13. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. When we do, we will update the "Last updated" date at the top of this page. For significant changes, we may notify you by email or via an in-app notice. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.`,
  },
  {
    title: "14. Contact and Complaints",
    content: `If you have questions, concerns, or wish to exercise your data rights, please contact us:\n\nHydrusLearn Support\nEmail: support@hydruslearn.com\n\nIf you are based in the UK and are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.`,
  },
];

// Handles PrivacyPolicy logic.
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-opacity hover:opacity-80"
          >
            ← Back to home
          </Link>
          <h1 className="mt-4 text-4xl font-bold text-[var(--foreground)]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Last updated: March 20, 2026
          </p>
          <p className="mt-4 text-[var(--muted-foreground)]">
            At HydrusLearn, we take your privacy seriously. This policy explains
            what data we collect, why we collect it, and how we protect it.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.content.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-[var(--muted-foreground)] whitespace-pre-line"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--primary)]/10 p-5 text-center">
          <p className="text-sm text-[var(--foreground)]">
            By using HydrusLearn, you agree to this Privacy Policy. You can
            also review our{" "}
            <Link
              to="/terms"
              className="font-medium text-[var(--primary)] transition-opacity hover:opacity-80"
            >
              Terms &amp; Conditions
            </Link>
            .
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-md bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm font-medium text-[var(--foreground)] transition-opacity hover:opacity-80"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
