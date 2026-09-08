'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

type LightboxMedia =
  | {
      readonly kind: 'image';
      readonly alt: string;
      readonly src: string;
    }
  | {
      readonly kind: 'diagram';
      readonly svg: SVGSVGElement;
    };

type LightboxDialogProps = {
  readonly media: LightboxMedia;
  readonly onClose: () => void;
  readonly visible: boolean;
};

function getMediaForTrigger(trigger: HTMLButtonElement): LightboxMedia | null {
  const image = trigger.querySelector<HTMLImageElement>('img');
  if (image) {
    return {
      kind: 'image',
      alt: image.alt,
      src: image.currentSrc || image.src,
    };
  }

  const svg = trigger.querySelector<SVGSVGElement>('svg');
  return svg ? { kind: 'diagram', svg } : null;
}

function addImageTrigger(image: HTMLImageElement) {
  if (image.dataset.lightboxEnhanced === 'true') return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lightbox-trigger lightbox-image-trigger';
  trigger.dataset.lightboxTrigger = 'image';
  trigger.setAttribute(
    'aria-label',
    image.alt ? `expand image: ${image.alt}` : 'expand image',
  );
  image.dataset.lightboxEnhanced = 'true';
  image.before(trigger);
  trigger.append(image);
}

function addDiagramTrigger(wrapper: HTMLElement) {
  if (wrapper.querySelector('[data-lightbox-trigger]')) return;

  const svg = wrapper.querySelector('svg');
  if (!svg) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lightbox-trigger lightbox-diagram-trigger';
  trigger.dataset.lightboxTrigger = 'diagram';
  trigger.setAttribute('aria-label', 'expand diagram');
  while (wrapper.firstChild) {
    trigger.append(wrapper.firstChild);
  }
  wrapper.append(trigger);
}

function LightboxDialog({ media, onClose, visible }: LightboxDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (media.kind !== 'diagram' || !svgContainerRef.current) return;
    svgContainerRef.current.replaceChildren(media.svg.cloneNode(true));
  }, [media]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      closeButtonRef.current?.focus();
    }
  }

  return (
    <div
      className={`lightbox-overlay${visible ? ' lightbox-overlay-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={media.kind === 'image' ? `expanded image: ${media.alt}` : 'expanded diagram'}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className="lightbox-content">
        {media.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element -- the source is an existing static site image.
          <img className="lightbox-media" src={media.src} alt={media.alt} />
        ) : (
          <div
            className="lightbox-media lightbox-diagram-media"
            ref={svgContainerRef}
            aria-hidden="true"
          />
        )}
        <button
          ref={closeButtonRef}
          className="lightbox-close"
          type="button"
          aria-label="close expanded media"
          onClick={onClose}
        >
          close
        </button>
        <p className="lightbox-hint">esc or click to close</p>
      </div>
    </div>
  );
}

export default function Lightbox() {
  const [media, setMedia] = useState<LightboxMedia | null>(null);
  const [visible, setVisible] = useState(false);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function enhanceMedia() {
      document.querySelectorAll<HTMLImageElement>('.prose img').forEach(addImageTrigger);
      document.querySelectorAll<HTMLElement>('.mermaid-diagram[data-source]').forEach(addDiagramTrigger);
    }

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLButtonElement>('[data-lightbox-trigger]');
      if (!trigger) return;

      const nextMedia = getMediaForTrigger(trigger);
      if (!nextMedia) return;
      event.preventDefault();
      activeTriggerRef.current = trigger;
      setVisible(false);
      setMedia(nextMedia);
    }

    enhanceMedia();
    const observer = new MutationObserver(enhanceMedia);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleClick);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    if (media === null) {
      setVisible(false);
      activeTriggerRef.current?.focus();
      activeTriggerRef.current = null;
      return;
    }

    const siteShell = document.querySelector<HTMLElement>('.site-shell');
    const hadInert = siteShell?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    if (siteShell) siteShell.inert = true;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';

    const frame = window.requestAnimationFrame(() => setVisible(true));

    return () => {
      window.cancelAnimationFrame(frame);
      if (siteShell) {
        siteShell.inert = hadInert;
      }
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [media]);

  function closeLightbox() {
    setMedia(null);
  }

  if (media === null) return null;
  return createPortal(
    <LightboxDialog media={media} onClose={closeLightbox} visible={visible} />,
    document.body,
  );
}
