'use client';

export function PrintButtons({ scanUrl, png, eventName }: { scanUrl: string; png: string; eventName: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(scanUrl);
      alert('Scan link copied to clipboard');
    } catch { alert('Copy failed'); }
  }
  function download() {
    const a = document.createElement('a');
    a.href = png;
    a.download = `partime-qr-${eventName.replace(/\W+/g, '-').toLowerCase()}.png`;
    a.click();
  }
  return (
    <div className="flex gap-2">
      <button className="btn-ghost" onClick={download}>⬇ Download</button>
      <button className="btn-ghost" onClick={copy}>🔗 Copy Link</button>
      <button className="btn-primary" onClick={() => window.print()}>🖨 Print QR</button>
    </div>
  );
}
