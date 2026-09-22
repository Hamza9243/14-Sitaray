import { AudioPlayer } from '../../components/AudioPlayer';
import { Badge, IconButton } from '../../components/ui';
import { useLookups } from '../../lib/data';
import { formatDuration, titleCase } from '../../lib/format';
import { mediaUrl, thumbUrl } from '../../lib/media';
import type { Row } from '../../lib/db';
import { useMedia } from '../../lib/useMedia';
import { ReorderButtons } from '../shared';

interface Props {
  scene: Row;
  index: number;
  count: number;
  busy: boolean;
  onMove: (delta: -1 | 1) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function SceneCard({ scene, index, count, busy, onMove, onEdit, onDuplicate, onDelete }: Props) {
  const { characters } = useLookups();
  const bg = useMedia(scene.background_media_id).media;
  const audio = useMedia(scene.audio_media_id).media;
  const character = characters.find((c) => c.id === scene.character_id);
  return (
    <li id={`scene-${scene.id}`} className={busy ? 'ex-scene ex-row-busy' : 'ex-scene'}>
      <span className="ex-num">{index + 1}</span>
      <div className="ex-scene-thumb">{bg ? <img src={thumbUrl(bg)} alt={bg.alt_text ?? bg.display_name} loading="lazy" /> : 'No background'}</div>
      <div className="ex-scene-info">
        <strong>{scene.name}</strong>
        <div className="row gap-xs wrap">
          <Badge tone={character ? 'violet' : 'neutral'}>{character ? `${character.name} · ${scene.character_expression}` : 'No character'}</Badge>
          {character ? <Badge>{titleCase(scene.character_position)}</Badge> : null}
          <Badge tone="blue">{titleCase(scene.animation)}</Badge>
          <Badge>{titleCase(scene.transition)}</Badge>
        </div>
        {scene.text ? <span className="ex-scene-text">{scene.text}</span> : <span className="ex-scene-text">No text</span>}
        {audio ? <AudioPlayer url={mediaUrl(audio)} duration={audio.duration_seconds} compact /> : <span className="muted small">No audio</span>}
      </div>
      <div className="ex-scene-side">
        <Badge tone="green">{Number(scene.duration_seconds)}s ({formatDuration(scene.duration_seconds)})</Badge>
        <div className="ex-actions">
          <ReorderButtons index={index} count={count} onMove={onMove} />
          <IconButton icon="edit" label="Edit scene" onClick={onEdit} />
          <IconButton icon="copy" label="Duplicate scene" onClick={onDuplicate} />
          <IconButton icon="trash" variant="danger" label="Delete scene" onClick={onDelete} />
        </div>
      </div>
    </li>
  );
}
