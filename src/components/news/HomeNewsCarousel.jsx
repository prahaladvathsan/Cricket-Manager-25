/**
 * @file HomeNewsCarousel.jsx
 * @description News-only carousel for the Home dashboard. Cycles through recent
 * league_news inbox messages at a fixed card height so the dashboard layout
 * never jumps between articles. The Next Match card is now rendered separately
 * by Home.jsx — this component is purely news.
 *
 * News slides are sourced from inboxStore messages of type `league_news`,
 * written by the NewsDispatcher's inbox subscriber.
 *
 * Layout:
 *   - Fixed card height (CARD_HEIGHT) — body content is clipped with a
 *     fade-to-"Read more" gradient when it overflows.
 *   - Translucent edge buttons on hover for manual navigation.
 *   - Tiny pagination dots overlay at the bottom of the card.
 *
 * Click any news card → opens NewsArticleModal in newspaper layout.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import useInboxStore from '../../stores/inboxStore';
import NewsArticleModal from './NewsArticleModal';
import { stripSentinels, extractQuoteMark } from '../../core/news/entityHelpers';
import { getTeamBadge } from '../../utils/assetHelpers';

const MAX_NEWS_SLIDES = 8;
const AUTO_ROTATE_MS = 10000;
// Hard-fixed height: every article in the rotation renders at exactly this
// pixel size. The body section inside has overflow-hidden so longer articles
// fade into the bottom gradient without pushing the card taller.
// The sibling League Standings card is locked to the same height in Home.jsx
// so the two always line up perfectly.
// Tuned to match the Home dashboard's League Standings card height — 7 visible
// rows + eyebrow + thead with the table's natural padding. Bump together if
// either side's content changes.
const CARD_HEIGHT = 'h-[260px]';

// Color rails for the section eyebrow (left strip + tag pill). Pick order
// matters — pickTheme iterates the tag array and returns the first match,
// so put more-specific tags before generic ones in template `tags` arrays.
const SECTION_THEME = {
  injury:   { rail: 'bg-status-loss',         pill: 'bg-status-loss/15 text-status-loss border-status-loss/40',         label: 'Injury Report' },
  recovery: { rail: 'bg-status-win',          pill: 'bg-status-win/15 text-status-win border-status-win/40',           label: 'Squad News' },
  match:    { rail: 'bg-blue-500',            pill: 'bg-blue-500/15 text-blue-300 border-blue-500/40',                  label: 'Match Report' },
  roundup:  { rail: 'bg-cricket-primary',     pill: 'bg-cricket-primary/15 text-cricket-primary border-cricket-primary/40', label: 'Weekly Roundup' },
  season:   { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Season Opener' },
  opener:   { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Season Opener' },
  transfer: { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Transfer Desk' },
  retention:{ rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Retention' },
  release:  { rail: 'bg-yellow-500',          pill: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',            label: 'Released' },
  playoff:  { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Playoffs' },
  final:    { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Final' },
  champion: { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Champions' },
  marquee:  { rail: 'bg-cricket-accent',      pill: 'bg-cricket-accent/15 text-cricket-accent border-cricket-accent/40', label: 'Marquee' },
  window:   { rail: 'bg-blue-500',            pill: 'bg-blue-500/15 text-blue-300 border-blue-500/40',                  label: 'Window' },
  default:  { rail: 'bg-text-tertiary',       pill: 'bg-bg-tertiary text-text-secondary border-border-primary',         label: 'News' }
};

function pickTheme(tags = []) {
  for (const t of tags) {
    if (SECTION_THEME[t]) return { ...SECTION_THEME[t], key: t };
  }
  return { ...SECTION_THEME.default, key: 'default' };
}

function formatLongDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch { return ''; }
}

const NewsCard = ({ message, onOpen }) => {
  const meta = message.metadata || {};
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const theme = pickTheme(tags);
  const headline = stripSentinels(meta.headline || message.subject || '');
  const paragraphs = Array.isArray(meta.bodyParagraphs) ? meta.bodyParagraphs : [];
  // Drop pull-quote paragraphs (prefixed with `> `) — they don't read well as a
  // teaser. Strip sentinels too.
  const bodyParagraphs = paragraphs
    .filter(p => p && !extractQuoteMark(p).isQuote)
    .map(stripSentinels);
  const dateLabel = formatLongDate(message.date);

  // Hero team badge: same priority chain as the article modal so the two views
  // stay visually linked. Falls through to no badge if no relevant team id.
  const payload = meta.payload || {};
  const heroTeamId =
    payload.winner?.id
    || payload.champion?.id
    || payload.team?.id
    || payload.toTeam?.id
    || payload.home?.id
    || null;
  const heroBadgeSrc = heroTeamId ? getTeamBadge(heroTeamId) : null;

  return (
    <div
      className="card-interactive relative p-0 overflow-hidden h-full flex"
      onClick={() => onOpen(message)}
    >
      {/* Color rail (section accent) */}
      <div className={`w-1 shrink-0 ${theme.rail}`} aria-hidden="true" />

      <div className="flex-1 min-w-0 p-3 flex flex-col">
        {/* Headline (left) + tag/byline stacked on the right.
            Badge has moved into the body — see below. */}
        <div className="flex items-start gap-3 mb-2">
          <h4
            className="flex-1 text-text-primary font-bold leading-[1.1] line-clamp-2"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.4rem' }}
          >
            {headline}
          </h4>
          <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5 max-w-[45%]">
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${theme.pill}`}>
              {theme.label}
            </span>
            <div className="text-[11px] text-text-tertiary text-right leading-tight">
              By <span className="text-text-secondary font-medium">{message.sender || 'WPL Newsdesk'}</span>
              {dateLabel && <span className="text-text-tertiary/70"> · {dateLabel}</span>}
            </div>
          </div>
        </div>

        {/* Body — fills remaining card height. The hero team badge floats
            right inside the body so the lede text wraps around it
            newspaper-style. The pagination dots overlay on top of the trailing
            body text; a subtle bottom gradient keeps them legible against it. */}
        <div className="flex-1 relative overflow-hidden">
          {heroBadgeSrc && (
            <img
              src={heroBadgeSrc}
              alt=""
              aria-hidden="true"
              className="float-right w-32 h-32 ml-3 mb-1 select-none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="text-[14px] text-text-secondary leading-relaxed space-y-2 pr-1">
            {bodyParagraphs.length > 0
              ? bodyParagraphs.map((para, i) => <p key={i}>{para}</p>)
              : <p className="italic text-text-tertiary">No preview available.</p>}
          </div>
          {/* Subtle bottom fade so dots remain legible over text */}
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="card flex flex-col items-center justify-center h-full text-center px-6">
    <Newspaper className="w-8 h-8 text-text-tertiary/60 mb-2" />
    <div className="text-sm text-text-secondary font-medium">No league news yet</div>
    <div className="text-xs text-text-tertiary mt-1">
      Articles will appear here as matches play, transfers settle, and the season unfolds.
    </div>
  </div>
);

const HomeNewsCarousel = () => {
  const messages = useInboxStore((s) => s.messages);
  const [index, setIndex] = useState(0);
  const [openMessage, setOpenMessage] = useState(null);

  // Strict recency sort — newest article first, no importance or user-team
  // boost. Carousel order is purely date-descending.
  const newsMessages = useMemo(() => (
    (messages || [])
      .filter((m) => m.type === 'league_news')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, MAX_NEWS_SLIDES)
  ), [messages]);

  const slideCount = newsMessages.length;

  useEffect(() => {
    if (slideCount > 0 && index >= slideCount) setIndex(0);
  }, [slideCount, index]);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Pause auto-rotation while the user is hovering the carousel (reading the
    // article) OR while a modal is open. Resumes on mouse leave / modal close.
    if (slideCount <= 1 || openMessage || isHovered) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slideCount);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [slideCount, openMessage, isHovered]);

  const go = useCallback((delta) => {
    setIndex((i) => (i + delta + slideCount) % slideCount);
  }, [slideCount]);

  const handleOpen = useCallback((msg) => {
    setOpenMessage(msg);
    if (msg && !msg.read) {
      useInboxStore.getState().markAsRead(msg.id);
    }
  }, []);

  const handleClose = useCallback(() => setOpenMessage(null), []);

  const hasMultiple = slideCount > 1;

  // Empty state — same fixed height so layout stays stable
  if (slideCount === 0) {
    return (
      <div className={`${CARD_HEIGHT} relative`}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={`${CARD_HEIGHT} relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NewsCard
        message={newsMessages[index]}
        onOpen={handleOpen}
      />

      {/* Navigation lives inside the bottom pagination pill — no floating
          chevrons over the article text. Layout: ‹  • • ● • • • • •  › */}
      {hasMultiple && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="Previous slide"
            className="flex items-center justify-center w-4 h-4 rounded-full text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? 'bg-cricket-accent w-4'
                  : 'bg-white/40 hover:bg-white/70 w-1.5'
              }`}
            />
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="Next slide"
            className="flex items-center justify-center w-4 h-4 rounded-full text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {openMessage && (
        <NewsArticleModal message={openMessage} onClose={handleClose} />
      )}
    </div>
  );
};

export default HomeNewsCarousel;
