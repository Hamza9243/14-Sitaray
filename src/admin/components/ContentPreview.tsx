import { richTextToParagraphs } from '@/lib/richText';

import { useLookups } from '../lib/data';
import type { Row } from '../lib/db';
import type { TransState } from '../lib/resource';
import { mediaUrl } from '../lib/media';
import { useMedia } from '../lib/useMedia';
import type { ResourceDef } from '../resources/types';

import { AudioPlayer } from './AudioPlayer';

function Img({ id, className }: { id?: string | null; className?: string }) {
  const { media } = useMedia(id);
  if (!media || media.kind !== 'image') return null;
  return <img className={className ?? 'pv-img'} src={mediaUrl(media)} alt="" loading="lazy" />;
}

function Sound({ id }: { id?: string | null }) {
  const { media } = useMedia(id);
  if (!media || media.kind !== 'audio') return null;
  return <AudioPlayer url={mediaUrl(media)} duration={media.duration_seconds} waveform={false} />;
}

/**
 * Approximates how an item looks inside the child app (colourful, big type, phone-sized) — with
 * none of the admin controls. Renders unsaved form values, in the selected language.
 */
export function ContentPreview({ def, values, translations, lang }: { def: ResourceDef; values: Row; translations: TransState; lang: string }) {
  const { defaultLanguage, languages, starName, categoryName } = useLookups();
  const isDefault = lang === defaultLanguage;
  const rtl = languages.find((l) => l.code === lang)?.direction === 'rtl';
  const t = (name: string): string => {
    const v = isDefault ? values[name] : translations[lang]?.[name];
    const text = typeof v === 'string' && v.trim() ? v : (values[name] as string | undefined);
    return typeof text === 'string' ? text : '';
  };
  const dir = rtl && !isDefault ? 'rtl' : 'ltr';

  let body: React.ReactNode;
  switch (def.preview) {
    case 'story': {
      const paragraphs = richTextToParagraphs(t('body'));
      body = (
        <>
          <div className="pv-cover">
            <Img id={values.cover_media_id} />
            {!values.cover_media_id ? <span className="pv-emoji">📖</span> : null}
          </div>
          <h2 dir={dir}>{t('title') || 'Untitled story'}</h2>
          <p className="pv-sub" dir={dir}>{t('short_description')}</p>
          <div className="pv-chips">
            {values.star_id ? <span>{starName(values.star_id)}</span> : null}
            {values.category_id ? <span>{categoryName(values.category_id)}</span> : null}
            {values.duration_minutes ? <span>{values.duration_minutes} min</span> : null}
            <span>+{values.xp_reward ?? 25} XP</span>
          </div>
          <Sound id={values.narration_media_id} />
          {paragraphs.map((p, i) => (
            <div key={i} className="pv-page" dir={dir}>
              <span className="pv-page-no">Page {i + 1}</span>
              {p}
            </div>
          ))}
          {t('moral') ? <div className="pv-note" dir={dir}><b>Moral:</b> {t('moral')}</div> : null}
          {t('takeaway') ? <div className="pv-note" dir={dir}><b>Try this:</b> {t('takeaway')}</div> : null}
        </>
      );
      break;
    }
    case 'dua':
      body = (
        <>
          <Img id={values.cover_media_id} />
          <h2 dir={dir}>{t('name') || 'Untitled du’a'}</h2>
          <div className="pv-arabic" dir="rtl">{String(values.arabic_text ?? '')}</div>
          <p className="pv-translit">{String(values.transliteration ?? '')}</p>
          <p dir={dir}>{t('translation')}</p>
          <p className="pv-sub" dir={dir}>{t('explanation')}</p>
          <Sound id={values.audio_media_id} />
        </>
      );
      break;
    case 'game':
      body = (
        <>
          <div className="pv-cover"><Img id={values.thumbnail_media_id} />{!values.thumbnail_media_id ? <span className="pv-emoji">🎮</span> : null}</div>
          <h2 dir={dir}>{t('name') || 'Untitled game'}</h2>
          <p dir={dir}>{t('description')}</p>
          <div className="pv-chips"><span>{String(values.game_type ?? '').replace(/_/g, ' ')}</span><span>{String(values.difficulty ?? '')}</span><span>+{values.reward_points ?? 0} XP</span></div>
          {t('instructions') ? <div className="pv-note" dir={dir}><b>How to play:</b> {t('instructions')}</div> : null}
          {t('quality') ? <div className="pv-note" dir={dir}><b>Teaches:</b> {t('quality')}</div> : null}
        </>
      );
      break;
    case 'daily':
      body = (
        <>
          <div className="pv-cover"><Img id={values.cover_media_id} />{!values.cover_media_id ? <span className="pv-emoji">⭐</span> : null}</div>
          <div className="pv-chips"><span>{String(values.scheduled_date ?? '')}</span>{values.star_id ? <span>{starName(values.star_id)}</span> : null}</div>
          <h2 dir={dir}>{t('title') || 'Untitled'}</h2>
          {richTextToParagraphs(t('short_story')).map((p, i) => <p key={i} dir={dir}>{p}</p>)}
          {t('lesson') ? <div className="pv-note" dir={dir}><b>Lesson:</b> {t('lesson')}</div> : null}
          {t('takeaway') ? <div className="pv-note" dir={dir}><b>Try this:</b> {t('takeaway')}</div> : null}
          <Sound id={values.audio_media_id} />
        </>
      );
      break;
    case 'quiz':
      body = (
        <>
          <span className="pv-emoji">❓</span>
          <h2 dir={dir}>{t('title') || 'Untitled quiz'}</h2>
          <p dir={dir}>{t('description')}</p>
          <div className="pv-chips"><span>{String(values.difficulty ?? '')}</span><span>{values.points_per_question ?? 0} pts / question</span><span>Pass {values.passing_score ?? 0}%</span>{values.is_daily ? <span>Daily</span> : null}</div>
        </>
      );
      break;
    case 'deed':
      body = (
        <>
          {values.icon_media_id ? <Img id={values.icon_media_id} className="pv-icon" /> : <span className="pv-emoji">{String(values.icon_emoji || '💛')}</span>}
          <h2 dir={dir}>{t('title') || 'Untitled good deed'}</h2>
          <p dir={dir}>{t('description')}</p>
          <div className="pv-chips"><span>{values.points ?? 0} points</span><span>{String(values.difficulty ?? '')}</span></div>
        </>
      );
      break;
    case 'reflection':
      body = (
        <>
          <Img id={values.image_media_id} />
          <span className="pv-emoji">💭</span>
          <h2 dir={dir}>{t('question') || 'Untitled reflection'}</h2>
          <p dir={dir}>{t('description')}</p>
          <Sound id={values.audio_media_id} />
        </>
      );
      break;
    case 'wisdom':
      body = (
        <>
          <Img id={values.image_media_id} />
          <h2 dir={dir}>{t('title') || 'Untitled'}</h2>
          <blockquote dir={dir}>{t('wisdom_text')}</blockquote>
          {values.arabic_text ? <div className="pv-arabic" dir="rtl">{String(values.arabic_text)}</div> : null}
          {t('translation') ? <p dir={dir}>{t('translation')}</p> : null}
          {t('explanation') ? <div className="pv-note" dir={dir}>{t('explanation')}</div> : null}
          <Sound id={values.audio_media_id} />
        </>
      );
      break;
    case 'star':
      body = (
        <>
          <div className="pv-cover pv-cover-star"><Img id={values.image_media_id} />{!values.image_media_id ? <span className="pv-initial">{String(values.name ?? '?').charAt(0)}</span> : null}</div>
          <div className="pv-chips"><span>Star {String(values.number ?? '')}</span></div>
          <h2 dir={dir}>{t('name')}</h2>
          <p className="pv-sub" dir={dir}>{t('title')}</p>
          <p dir={dir}>{t('description')}</p>
          <ul dir={dir}>{t('qualities').split('\n').filter(Boolean).map((q, i) => <li key={i}>{q}</li>)}</ul>
        </>
      );
      break;
    case 'character':
      body = (
        <>
          <div className="pv-row">
            {(['main_media_id', 'happy_media_id', 'sad_media_id', 'thinking_media_id', 'surprised_media_id'] as const).map((k) => <Img key={k} id={values[k]} className="pv-face" />)}
          </div>
          <h2>{String(values.name ?? '')}</h2>
          <div className="pv-chips"><span>{String(values.gender ?? '')}</span><span>{values.is_active ? 'Active' : 'Inactive'}</span></div>
          <p dir={dir}>{t('description')}</p>
          <Sound id={values.voice_media_id} />
        </>
      );
      break;
    case 'audio':
      body = (
        <>
          <Img id={values.thumbnail_media_id} />
          <h2 dir={dir}>{t('name')}</h2>
          <p dir={dir}>{t('description')}</p>
          <Sound id={values.media_id} />
        </>
      );
      break;
    default:
      body = <h2 dir={dir}>{t(def.titleField)}</h2>;
  }

  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">{body}</div>
      <p className="muted small center-text">Approximate preview — the app applies its own styling.</p>
    </div>
  );
}
