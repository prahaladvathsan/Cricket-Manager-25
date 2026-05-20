/**
 * @file NewsArticleModal.jsx
 * @description Newspaper-style modal that renders a single news article in an
 * editorial broadsheet aesthetic. Reads structured fields from the inbox
 * message's metadata (headline, subhead, body paragraphs, tags) — populated by
 * the inboxSubscriber when the NewsDispatcher emits an event.
 *
 * Design notes:
 *  - Cream paper background with a faint vertical column rule
 *  - Double-rule masthead with date / issue number
 *  - Section kicker (tiny caps) above the headline
 *  - Serif headline + italic deck + byline rule
 *  - 4-line drop cap, em-square hung
 *  - Decorative section break (•••) between paragraphs in long articles
 *  - "—WPLT—" sign-off + tag pills at the bottom
 */

import React, { useEffect } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';
import { parseEntities, extractQuoteMark, stripSentinels } from '../../core/news/entityHelpers';
import { getTeamBadge } from '../../utils/assetHelpers';

const TAG_LABELS = {
  injury: 'Injury Report',
  recovery: 'Squad News',
  match: 'Match Report',
  transfer: 'Transfer',
  retention: 'Retention',
  release: 'Release',
  playoff: 'Playoffs',
  final: 'Final',
  champion: 'Champion',
  marquee: 'Marquee',
  severe: 'Severe',
  major: 'Major',
  minor: 'Minor',
  window: 'Transfer Window',
  bid: 'Bidding',
  listing: 'Listing',
  high_scoring: 'Run-fest',
  close_finish: 'Thriller',
  one_sided: 'Rout',
  q1: 'Qualifier 1',
  q2: 'Qualifier 2',
  eliminator: 'Eliminator',
  top_seed: 'Top Seed'
};

function formatLongDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

const NewsArticleModal = ({ message, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!message) return null;

  const meta = message.metadata || {};
  const headline = meta.headline || message.subject || 'WPL Newsdesk';
  const subhead = meta.subhead || '';
  const paragraphs = Array.isArray(meta.bodyParagraphs) && meta.bodyParagraphs.length > 0
    ? meta.bodyParagraphs.filter(Boolean)
    : (message.body || '').split('\n\n').filter(Boolean);
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const dateLabel = formatLongDate(message.date);

  const primarySectionTag = tags.find(t => TAG_LABELS[t]);
  const sectionLabel = (primarySectionTag && TAG_LABELS[primarySectionTag]) || 'League News';
  const issueLabel = meta.season != null ? `Season ${meta.season}` : 'Edition';
  const dayLabel = meta.gameDay != null ? `№ ${String(meta.gameDay).padStart(3, '0')}` : '';

  // Pull a relevant team id from the payload for the hero badge. Priority:
  // match winner > champion > affected team > home team > a transfer target.
  // Falls back to null when nothing relevant — the badge slot is skipped.
  const payload = meta.payload || {};
  const heroTeamId =
    payload.winner?.id
    || payload.champion?.id
    || payload.team?.id
    || payload.toTeam?.id
    || payload.home?.id
    || null;
  const heroBadgeSrc = heroTeamId ? getTeamBadge(heroTeamId) : null;

  // Tags filed at the bottom — but skip the section tag itself, which is
  // already shown in the masthead's top-right. Avoids the same "MATCH REPORT"
  // pill appearing twice on the page.
  const filedUnderTags = tags.filter(t => t !== primarySectionTag);

  // Paper texture: faint diagonal noise via layered radial gradients (no images required).
  const paperStyle = {
    background:
      'radial-gradient(circle at 20% 10%, rgba(180,140,80,0.06) 0, transparent 40%),' +
      'radial-gradient(circle at 80% 30%, rgba(120,90,40,0.05) 0, transparent 45%),' +
      'radial-gradient(circle at 60% 90%, rgba(150,110,60,0.05) 0, transparent 50%),' +
      '#f4ecd8',
    color: '#1a1a1a',
    fontFamily: 'Georgia, "Times New Roman", serif'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-md shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
        style={paperStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vertical column rule — runs full height, very faint */}
        <div
          aria-hidden="true"
          className="absolute top-12 bottom-12 left-1/2 -translate-x-1/2 w-px pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.05)' }}
        />

        {/* Close button */}
        <button
          aria-label="Close article"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 text-black/70 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative p-6 md:p-9">
          {/* ---------- Masthead ---------- */}
          <div className="border-y-2 border-double border-black/85 py-1.5 mb-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.25em] text-black/60 w-1/4">
                Est. MMXXV
              </div>
              <div
                className="flex-1 text-center uppercase font-bold text-black"
                style={{
                  fontFamily: '"Bebas Neue", Georgia, serif',
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                  letterSpacing: '0.18em'
                }}
              >
                The WPL Times
              </div>
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.25em] text-black/60 w-1/4 text-right">
                {issueLabel} {dayLabel}
              </div>
            </div>
          </div>

          {/* Date / issue ribbon — the section tag (MATCH REPORT) lives here only.
              The old "Kicker" line below the ribbon was removed (it duplicated
              the same label). */}
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-black/65 pb-2.5 mb-4 border-b border-black/15">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3" />
              {dateLabel || '—'}
            </span>
            <span className="hidden md:inline italic font-serif text-black/50 normal-case tracking-normal">
              All The Cricket That's Fit To Print
            </span>
            <span className="font-mono">{sectionLabel}</span>
          </div>

          {/* ---------- Article ---------- */}
          {/* Headline (badge has been moved into the body, newspaper-style,
              so it accompanies the lede rather than crowding the headline). */}
          <h1
            className="text-[1.9rem] md:text-[2.4rem] font-bold leading-[1.05] text-black mb-2"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.01em' }}
          >
            {headline}
          </h1>

          {/* Deck / subhead */}
          {subhead && (
            <p
              className="text-base md:text-lg italic text-black/75 leading-snug mb-3"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {subhead}
            </p>
          )}

          {/* Byline rule — name on the left, tagline right-aligned.
              Date is intentionally not repeated here; the masthead's date
              ribbon already carries it. */}
          <div className="flex items-center gap-3 py-1.5 border-y border-black/20 mb-4">
            <span
              className="text-[10px] uppercase tracking-[0.3em] text-black/70"
              style={{ fontFamily: '"Bebas Neue", Georgia, serif' }}
            >
              By
            </span>
            <span className="text-sm text-black font-medium whitespace-nowrap">
              {message.sender || 'WPL Newsdesk'}
            </span>
            {meta.reporterTagline && (
              <span
                className="ml-auto text-[11px] italic text-black/55 text-right truncate"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {meta.reporterTagline}
              </span>
            )}
          </div>

          {/* Body — the hero team badge floats right inside the first paragraph
              so the lede wraps around it newspaper-style. Falls back to no
              badge when there's no relevant team id on the payload. */}
          {heroBadgeSrc && (
            <img
              src={heroBadgeSrc}
              alt=""
              aria-hidden="true"
              className="float-right w-48 md:w-64 h-auto ml-6 mb-3 mt-1 select-none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.22))' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="space-y-3 text-[15.5px] leading-[1.6] text-black/90">
            {paragraphs.map((para, idx) => {
              const { isQuote, text } = extractQuoteMark(para);
              const segments = parseEntities(text);

              const inlineContent = segments.map((seg, segIdx) => {
                if (seg.kind === 'player') {
                  return (
                    <PlayerName
                      key={segIdx}
                      playerId={seg.id}
                      className="text-cricket-primary hover:underline font-semibold not-italic"
                    />
                  );
                }
                if (seg.kind === 'team') {
                  return (
                    <TeamName
                      key={segIdx}
                      teamId={seg.id}
                      inline
                      className="text-cricket-primary hover:underline font-semibold not-italic"
                    />
                  );
                }
                return <React.Fragment key={segIdx}>{seg.text}</React.Fragment>;
              });

              // For pull-quotes, split on the em-dash separator into quote
              // body + attribution so the citation reads as a proper cite block
              // below the quote rather than wrapping inline. Also strip the
              // outer "..." marks — the blockquote styling + opening ❝ glyph
              // already signal that this is a quote.
              let quoteContent = null;
              let citeContent = null;
              if (isQuote) {
                // Find the LAST " — " (em dash with spaces) in the raw text — that's
                // the boundary between the quoted line and the attribution.
                const sep = ' — ';
                const sepIdx = text.lastIndexOf(sep);
                let quoteSource = text;
                let citeSource = '';
                if (sepIdx !== -1) {
                  quoteSource = text.slice(0, sepIdx).trim();
                  citeSource = text.slice(sepIdx + sep.length).trim();
                }
                // Drop the matching leading/trailing literal quote marks
                quoteSource = quoteSource.replace(/^["“]/, '').replace(/["”]$/, '').trim();
                quoteContent = parseEntities(quoteSource).map((seg, segIdx) => {
                  if (seg.kind === 'player') {
                    return <PlayerName key={segIdx} playerId={seg.id} className="text-cricket-primary hover:underline font-semibold not-italic" />;
                  }
                  if (seg.kind === 'team') {
                    return <TeamName key={segIdx} teamId={seg.id} inline className="text-cricket-primary hover:underline font-semibold not-italic" />;
                  }
                  return <React.Fragment key={segIdx}>{seg.text}</React.Fragment>;
                });
                if (citeSource) {
                  citeContent = parseEntities(citeSource).map((seg, segIdx) => {
                    if (seg.kind === 'player') {
                      return <PlayerName key={segIdx} playerId={seg.id} className="text-cricket-primary hover:underline font-semibold not-italic" />;
                    }
                    if (seg.kind === 'team') {
                      return <TeamName key={segIdx} teamId={seg.id} inline className="text-cricket-primary hover:underline font-semibold not-italic" />;
                    }
                    return <React.Fragment key={segIdx}>{seg.text}</React.Fragment>;
                  });
                }
              }

              return (
                <React.Fragment key={idx}>
                  {/* Decorative section break every 2 paragraphs (after idx 1, 3, …) */}
                  {idx > 0 && idx % 2 === 0 && (
                    <div className="text-center text-black/35 tracking-[0.6em] py-1 select-none" aria-hidden="true">
                      • • •
                    </div>
                  )}
                  {isQuote ? (
                    <blockquote
                      className="border-l-4 border-black/30 pl-4 my-3 italic text-black/80"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      <span aria-hidden="true" className="text-3xl leading-none text-black/40 mr-1 align-bottom select-none float-left">❝</span>
                      <span>{quoteContent}</span>
                      {citeContent && (
                        <footer className="not-italic text-right text-[12px] text-black/60 mt-1 pl-2 clear-both">
                          <span aria-hidden="true" className="mr-1">—</span>
                          {citeContent}
                        </footer>
                      )}
                    </blockquote>
                  ) : (
                    <p
                      className={
                        idx === 0
                          ? 'first-letter:text-[3.5rem] first-letter:leading-[0.85] first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-black'
                          : ''
                      }
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {inlineContent}
                    </p>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Sign-off — clear:both so the floated badge above can't intrude */}
          <div
            className="mt-6 text-center text-black/50 tracking-[0.45em] text-xs select-none clear-both"
            style={{ fontFamily: '"Bebas Neue", Georgia, serif' }}
            aria-hidden="true"
          >
            — W P L T —
          </div>

          {/* Tag pills — filtered to skip the primary section tag (already in
              the masthead) so the same label doesn't appear twice. */}
          {filedUnderTags.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/15 flex flex-wrap gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-black/55 mr-1">
                Filed under
              </span>
              {filedUnderTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border border-black/35 text-black/65 bg-white/40"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {TAG_LABELS[tag] || tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsArticleModal;
