// /Frame: put the 1-Earth gold frame around your profile picture.
// Everything happens in the browser; the image never leaves the device.
// Note: images are loaded without temporary blob: links, because the site's
// security policy (public/_headers) only allows 'self', data: and https: images.
import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 1000;      // output: 1000 x 1000 PNG (X shows profile pictures as circles)
const RING = 0.055;     // ring thickness, as a share of the size
const FILE_NAME = "1-earth-gold-frame-pfp.png";

function drawRing(ctx, s) {
  const r = s / 2;
  const w = s * RING;
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0.0, "#8a5f12");
  g.addColorStop(0.28, "#d9ad48");
  g.addColorStop(0.45, "#f6dc8a");
  g.addColorStop(0.62, "#c9962f");
  g.addColorStop(0.85, "#e8c25e");
  g.addColorStop(1.0, "#8a5f12");
  ctx.beginPath();
  ctx.arc(r, r, r - w / 2, 0, Math.PI * 2);
  ctx.lineWidth = w;
  ctx.strokeStyle = g;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r, r, r - w, 0, Math.PI * 2);
  ctx.lineWidth = s * 0.004;
  ctx.strokeStyle = "rgba(90, 60, 10, 0.55)";
  ctx.stroke();
}

export default function Frame() {
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [msg, setMsg] = useState("");
  const drag = useRef(null);

  useEffect(() => { document.title = "Gold Frame PFP · 1-Earth"; }, []);

  const useImage = (im) => { setImg(im); setZoom(1); setOffset({ x: 0, y: 0 }); setMsg(""); };

  const loadFile = useCallback(async (file) => {
    if (!file || !file.type?.startsWith("image/")) {
      setMsg("That isn’t an image. Copy or choose a picture and try again.");
      return;
    }
    try {
      useImage(await createImageBitmap(file));
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const im = new Image();
        im.onload = () => useImage(im);
        im.onerror = () => setMsg("Couldn’t read that image. Try saving it first, then upload it.");
        im.src = reader.result; // a data: URL, which the security policy allows
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Draw the photo (cropped to a circle) and the ring.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const s = SIZE;
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - s * RING * 0.5, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
      const cover = Math.max(s / img.width, s / img.height) * zoom;
      const w = img.width * cover, h = img.height * cover;
      ctx.drawImage(img, (s - w) / 2 + offset.x, (s - h) / 2 + offset.y, w, h);
    } else {
      // Empty-circle color follows the site theme (--frame-empty), light by default.
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--frame-empty").trim() || "#e7ece3";
      ctx.fillRect(0, 0, s, s);
    }
    ctx.restore();
    drawRing(ctx, s);
  }, [img, zoom, offset]);

  // Drag to reposition.
  const scale = () => SIZE / canvasRef.current.getBoundingClientRect().width;
  const onDown = (e) => { if (!img) return; drag.current = { x: e.clientX, y: e.clientY, o: offset }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (!drag.current) return;
    const k = scale();
    setOffset({ x: drag.current.o.x + (e.clientX - drag.current.x) * k, y: drag.current.o.y + (e.clientY - drag.current.y) * k });
  };
  const onUp = () => { drag.current = null; };

  const getBlob = () => new Promise((res) => canvasRef.current.toBlob(res, "image/png"));

  // Save: phones get the share sheet ("Save Image"), computers download a PNG.
  const save = async () => {
    const blob = await getBlob();
    const file = new File([blob], FILE_NAME, { type: "image/png" });
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch { /* cancelled */ }
      return;
    }
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = FILE_NAME;
    document.body.appendChild(a); a.click(); a.remove();
    setMsg("Saved. Now set it as your profile picture on X.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": getBlob() })]);
      setMsg("Copied! Paste it wherever you need it.");
    } catch {
      setMsg("Your browser doesn’t allow copying images. Use Save image instead.");
    }
  };

  return (
    <div className="page fr">
      <header className="topbar">
        <a href="/" className="brand">
          <img src="/globe.webp" alt="" width="46" height="46" />
          <span>1-Earth</span>
        </a>
        <a href="/" className="pd-back">← Back to the mint</a>
      </header>

      <h1 className="pd-title">Gold Frame PFP</h1>
      <p className="pd-intro">Drag in or upload your profile picture, then save it with the gold frame.</p>

      <div className="fr-box">
        <label
          className={`fr-stage ${img ? "has-img" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files?.[0]); }}
        >
          <canvas
            ref={canvasRef} width={SIZE} height={SIZE}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            aria-label="Your profile picture with the gold frame"
          />
          {!img && <span className="fr-hint">Drag your image here<br />or tap to upload</span>}
          {!img && <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files?.[0])} />}
        </label>

        {!img ? (
          <div className="fr-controls">
            <label className="buy fr-download fr-primary fr-upload">
              Upload image
              <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files?.[0])} />
            </label>
            <p className="pd-muted fr-tip">
              Save your profile picture to your device first, then drag it into the circle or tap Upload image.
            </p>
          </div>
        ) : (
          <div className="fr-controls">
            <label className="fr-zoom">Zoom
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </label>
            <p className="pd-muted fr-tip">Drag the photo to reposition.</p>
            <div className="fr-actions">
              <button type="button" className="buy fr-download fr-primary" onClick={save}>Save image</button>
              <button type="button" className="buy fr-download" onClick={copy}>Copy image</button>
            </div>
            <label className="fr-change">Use a different image
              <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files?.[0])} />
            </label>
          </div>
        )}
      </div>

      {msg && <p className="fr-msg" role="status">{msg}</p>}
      <p className="pd-muted fr-note">Your image never leaves your device. Then set it as your profile picture on X.</p>
    </div>
  );
}
