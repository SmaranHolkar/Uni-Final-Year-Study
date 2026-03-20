import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using HydrusLearn ("the Service"), you confirm that you are at least 13 years of age and agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the Service. Your continued use of HydrusLearn constitutes ongoing acceptance of any updates to these Terms.`,
  },
  {
    title: "2. Description of Service",
    content: `HydrusLearn is an AI-powered learning platform that allows users to upload study documents, generate quizzes, explore interactive mind maps, and track learning progress. The Learning Playground lets users create revision tools — such as flashcards, Q&A sets, and study guides — from plain-English prompts; the AI selects the most appropriate format for each request. Features may be updated, extended, or discontinued at any time without prior notice. The service is provided for educational and personal use only.`,
  },
  {
    title: "3. User Accounts",
    content: `You must create an account to access core features of HydrusLearn. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorised access or breach of security. We reserve the right to suspend or terminate accounts that violate these Terms or are found to be inactive for an extended period.`,
  },
  {
    title: "4. Acceptable Use",
    content: `You agree not to misuse the Service. Prohibited activities include, but are not limited to:\n\n• Uploading content that is unlawful, offensive, defamatory, or infringes any third-party intellectual property rights.\n• Attempting to reverse-engineer, scrape, or otherwise extract data or AI models from the platform.\n• Using the Service to generate, distribute, or facilitate deceptive, harmful, or fraudulent content.\n• Circumventing any authentication, access controls, or rate-limiting measures.\n• Sharing your account credentials with third parties.\n\nWe reserve the right to remove content and suspend accounts found in violation of these rules.`,
  },
  {
    title: "5. User-Uploaded Content",
    content: `You retain ownership of all documents and materials you upload to HydrusLearn. By uploading content, you grant HydrusLearn a limited, non-exclusive licence to process that content solely for the purpose of delivering the Service to you (e.g. generating quizzes and summaries). We do not sell or share your uploaded content with third parties. You are solely responsible for ensuring you have the right to upload any material and that doing so does not infringe third-party copyright or other rights.`,
  },
  {
    title: "6. AI-Generated Content",
    content: `HydrusLearn uses artificial intelligence to generate quizzes, summaries, suggestions, and feedback. AI-generated content is provided for educational assistance only and may contain errors, omissions, or inaccuracies. You should independently verify any AI-generated output before relying on it for academic submissions or important decisions. We do not guarantee the accuracy, completeness, or fitness for purpose of any AI-generated content.`,
  },
  {
    title: "7. Academic Integrity and Fair Use",
    content: `HydrusLearn is designed to support and enhance your personal study and learning process. It is strictly prohibited to use our AI-generated quizzes, summaries, or any other output to commit academic misconduct, including but not limited to plagiarism, cheating on exams, or submitting AI-generated work as your own original material. We are not responsible for any disciplinary actions taken against you by educational institutions resulting from the misuse of our platform.`,
  },
  {
    title: "8. Intellectual Property",
    content: `All platform content, branding, logos, software, and underlying technology are the intellectual property of HydrusLearn and its licensors. Nothing in these Terms grants you a right to use HydrusLearn's trade names, trademarks, logos, or other proprietary information without prior written permission. You may not copy, modify, distribute, or create derivative works of the platform or its components.`,
  },
  {
    title: "9. Privacy",
    content: `Your use of HydrusLearn is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of your information as described in the Privacy Policy. We take reasonable technical and organisational measures to protect your personal data but cannot guarantee absolute security.`,
    privacyLink: true,
  },
  {
    title: "10. Data Storage and Account Deletion",
    content: `We securely store your account info and uploaded documents to provide the Service. You can request account deletion at any time through your account settings. Upon deletion, your personal data and uploaded documents will be permanently removed from our active databases, though some anonymised data or routine system backups may be retained temporarily as required for legal or security purposes.`,
  },
  {
    title: "11. Service Availability and Limitations",
    content: `While we strive to keep HydrusLearn up and running 100% of the time, we cannot guarantee uninterrupted access. The platform relies on complex infrastructure and third-party AI models, meaning the Service may occasionally be unavailable due to maintenance, network issues, or API limits. We are not liable for any lost study time or academic setbacks caused by system downtime.`,
  },
  {
    title: "12. Disclaimers",
    content: `The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free from viruses or other harmful components. HydrusLearn is not liable for the accuracy of AI-generated study content and does not endorse any specific academic outcomes.`,
  },
  {
    title: "13. Limitation of Liability",
    content: `To the fullest extent permitted by applicable law, HydrusLearn and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, loss of profits, or loss of goodwill, arising out of or in connection with your use of the Service. Our total liability for any claim arising out of these Terms shall not exceed the amount you paid (if any) to use the Service in the twelve months prior to the claim.`,
  },
  {
    title: "14. Third-Party Services",
    content: `HydrusLearn may integrate with or link to third-party services (such as AI providers or cloud storage). We are not responsible for the content, availability, or practices of any third-party services. Your use of third-party services is subject to their respective terms and privacy policies.`,
  },
  {
    title: "15. Termination",
    content: `We may suspend or terminate your access to HydrusLearn at any time, with or without cause or notice, including if we reasonably believe you have violated these Terms. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including intellectual property, disclaimers, and limitation of liability) will remain in effect.`,
  },
  {
    title: "16. Changes to These Terms",
    content: `We may update these Terms from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of the Service after any changes constitutes your acceptance of the new Terms. We encourage you to review this page periodically.`,
  },
  {
    title: "17. Governing Law",
    content: `These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
  {
    title: "18. Contact Us",
    content: `If you have questions or concerns about these Terms, please contact us at:\n\nHydrusLearn Support\nEmail: support@hydruslearn.com\n\nWe will do our best to address your enquiry in a timely manner.`,
  },
];

export default function TermsAndConditions() {
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
            Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Last updated: March 20, 2026
          </p>
          <p className="mt-4 text-[var(--muted-foreground)]">
            Please read these Terms and Conditions carefully before using
            HydrusLearn. By creating an account or using the Service, you agree
            to be bound by the terms below.
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
                {section.privacyLink && (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    <Link
                      to="/privacy"
                      className="font-medium text-[var(--primary)] transition-opacity hover:opacity-80"
                    >
                      Read our full Privacy Policy →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--primary)]/10 p-5 text-center">
          <p className="text-sm text-[var(--foreground)]">
            By signing up for HydrusLearn, you confirm that you have read and
            agree to these Terms and Conditions. You can also review our{" "}
            <Link
              to="/privacy"
              className="font-medium text-[var(--primary)] transition-opacity hover:opacity-80"
            >
              Privacy Policy
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
