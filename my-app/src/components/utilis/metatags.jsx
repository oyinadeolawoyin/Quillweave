import { useEffect } from 'react';

/**
 * Simple Meta Tags without external dependencies
 * Works with React 19 - no package conflicts!
 */

const SITE_NAME = "Quillweave";
const THEME_COLOR = "#1a1a2e"; // brand navy — matches header/footer background
const DEFAULT_TITLE = `${SITE_NAME} — A Home for Writers`;
const DEFAULT_DESCRIPTION = "A home for writers with more ideas than finished drafts.";

export function AppMetaTags({ title, description, image } = {}) {
  const defaultImage = `${window.location.origin}/og-default.png`;
  const resolvedTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;

  useEffect(() => {
    // Update title
    document.title = resolvedTitle;

    // Core discovery / theming
    updateMetaTag('name', 'description', resolvedDescription);
    updateMetaTag('name', 'theme-color', THEME_COLOR);
    updateMetaTag('name', 'apple-mobile-web-app-title', SITE_NAME);

    // Open Graph
    updateMetaTag('property', 'og:site_name', SITE_NAME);
    updateMetaTag('property', 'og:title', resolvedTitle);
    updateMetaTag('property', 'og:description', resolvedDescription);
    updateMetaTag('property', 'og:image', image || defaultImage);
    updateMetaTag('property', 'og:image:alt', `${SITE_NAME} — ${DEFAULT_DESCRIPTION}`);
    updateMetaTag('property', 'og:url', window.location.href);
    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:locale', 'en_US');

    // Twitter / X card
    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:title', resolvedTitle);
    updateMetaTag('property', 'twitter:description', resolvedDescription);
    updateMetaTag('property', 'twitter:image', image || defaultImage);

    // Icons — points at the new Quillweave mark; swap these paths if you
    // export different sizes (e.g. /icon-32.png, /apple-touch-icon.png)
    updateLinkTag('icon', '/icon.svg', 'image/svg+xml');
    updateLinkTag('apple-touch-icon', '/icons/apple-touch-icon.png');
  }, [resolvedTitle, resolvedDescription, image]);

  return null; // This component doesn't render anything
}

export function QuoteMetaTags({ quote }) {
  const rawTitle = `"${quote.content.substring(0, 60)}${quote.content.length > 60 ? '...' : ''}"`;
  const title = `${rawTitle} · ${SITE_NAME}`;
  const description = quote.title
    ? `${quote.content} — ${quote.title}`
    : quote.content;

  useEffect(() => {
    document.title = title;

    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:site_name', SITE_NAME);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', window.location.href);
    updateMetaTag('property', 'og:type', 'article');

    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
  }, [quote]);

  return null;
}

export function ProgressMetaTags({ type, stats }) {
  const rawTitle = type === 'daily'
    ? `Today's Writing: ${stats.sprintsCompleted} sprint${stats.sprintsCompleted !== 1 ? 's' : ''}, ${stats.wordsWritten.toLocaleString()} words`
    : `This Week: ${stats.totalSprints} sprints, ${stats.totalWords.toLocaleString()} words`;
  const title = `${rawTitle} · ${SITE_NAME}`;

  const description = type === 'daily'
    ? `I'm building a consistent writing habit on ${SITE_NAME}. Join me!`
    : `My weekly writing progress on ${SITE_NAME}. Every word counts!`;

  useEffect(() => {
    document.title = title;

    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:site_name', SITE_NAME);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', window.location.href);

    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
  }, [type, stats]);

  return null;
}

// Helper function to update or create meta tags
function updateMetaTag(attr, key, content) {
  if (!content) return;

  let element = document.querySelector(`meta[${attr}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

// Helper function to update or create <link> tags (favicon, apple touch icon, etc.)
function updateLinkTag(rel, href, type) {
  if (!href) return;

  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
  if (type) element.setAttribute('type', type);
}

/**
 * Usage (EXACTLY THE SAME as before):
 *
 * // In Homepage:
 * <AppMetaTags
 *   title="Start Writing Now"
 *   description="The easiest way to show up and write. No judgment, just progress."
 * />
 *
 * // In Dashboard:
 * <AppMetaTags
 *   title="My Writing Space"
 *   description="Showing up, one sprint at a time."
 * />
 *
 * // Default:
 * <AppMetaTags />
 *
 * Note: `title` is now just the page name — it gets automatically suffixed
 * with "· Quillweave" so every tab reads e.g. "My Writing Space · Quillweave"
 * instead of repeating the full brand name on every call site.
 */