import { ExtraLinks } from './starAssoc/ExtraLinks';
import { PrimaryContent } from './starAssoc/PrimaryContent';
import type { ExtrasProps } from '../resources/types';

import './starAssoc/starAssoc.css';

export default function StarAssociations({ id }: ExtrasProps) {
  return (
    <div>
      <section className="assoc-section">
        <h4>Primary content</h4>
        <p className="muted small">Items that name this Star as their Related Star. Change it from the item’s own editor.</p>
        <PrimaryContent starId={id} />
      </section>
      <section className="assoc-section">
        <h4>Extra associations</h4>
        <p className="muted small">Also show other items under this Star, beyond those that belong to it directly.</p>
        <ExtraLinks starId={id} />
      </section>
    </div>
  );
}
