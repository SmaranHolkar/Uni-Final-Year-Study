/**
 * useSEO — lightweight per-page SEO hook.
 * Sets document.title and key <meta> tags on mount, cleans up on unmount.
 *
 * Usage:
 *   useSEO({ title: "Login | HydrusLearn", description: "..." });
 */
import { useEffect } from "react";

const BASE_ORIGIN = "https://hydruslearn.com";

const upsertMeta = (nameOrProperty, content, isProperty = false) => {
  if (typeof document === "undefined") return null;
  const attr = isProperty ? "property" : "name";
  let tag = document.head.querySelector(`meta[${attr}="${nameOrProperty}"]`);
  const created = !tag;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, nameOrProperty);
    document.head.appendChild(tag);
  }
  const prev = tag.getAttribute("content");
  tag.setAttribute("content", content);
  return { tag, created, prev };
};

const upsertCanonical = (href) => {
  if (typeof document === "undefined") return null;
  let link = document.head.querySelector('link[rel="canonical"]');
  const created = !link;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  const prev = link.getAttribute("href");
  link.setAttribute("href", href);
  return { tag: link, created, prev };
};

export function useSEO({
  title,
  description,
  path = "",
  noIndex = false,
  structuredData = null,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const canonicalUrl = `${BASE_ORIGIN}${path}`;
    const managed = [];

    if (description) {
      managed.push(upsertMeta("description", description));
      managed.push(upsertMeta("og:description", description, true));
      managed.push(upsertMeta("twitter:description", description));
    }

    managed.push(upsertMeta("og:title", title, true));
    managed.push(upsertMeta("twitter:title", title));
    managed.push(upsertMeta("og:url", canonicalUrl, true));
    managed.push(upsertMeta("robots", noIndex ? "noindex, nofollow" : "index, follow"));

    const canonEntry = upsertCanonical(canonicalUrl);
    managed.push(canonEntry);

    // Inject structured data
    let scriptTag = null;
    if (structuredData) {
      const id = "page-seo-schema";
      scriptTag = document.getElementById(id);
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.type = "application/ld+json";
        scriptTag.id = id;
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    }

    return () => {
      document.title = previousTitle;
      managed.forEach((entry) => {
        if (!entry) return;
        if (entry.created && entry.tag?.parentNode) {
          entry.tag.parentNode.removeChild(entry.tag);
        } else if (!entry.created && entry.tag && entry.prev != null) {
          entry.tag.setAttribute(entry.tag.tagName === "LINK" ? "href" : "content", entry.prev);
        }
      });
      if (scriptTag?.parentNode) scriptTag.parentNode.removeChild(scriptTag);
    };
  }, [title, description, path, noIndex]);
}
