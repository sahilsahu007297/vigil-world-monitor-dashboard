import { useEffect, useRef } from 'react';

export default function HlsVideo({ url, onLoad, onError }: { url: string; onLoad: () => void; onError: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      return;
    }
    let disposed = false;
    let player: import('hls.js').default | undefined;
    import('hls.js').then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) { onErrorRef.current(); return; }
      player = new Hls();
      player.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) onErrorRef.current(); });
      player.loadSource(url);
      player.attachMedia(video);
    }).catch(() => onErrorRef.current());
    return () => { disposed = true; player?.destroy(); };
  }, [url]);
  return <video ref={ref} controls autoPlay muted playsInline onLoadedData={onLoad} onError={onError} />;
}
