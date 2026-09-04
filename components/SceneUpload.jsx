// components/SceneUpload.jsx
//
// Step 1 of the Multi-Character Timeline: upload ONE shared scene —
// a photo or a video — that all tagged characters live inside of.
// Replaces the old per-character face upload entirely.
//
// Uses @vercel/blob/client's upload() helper so video files (which can
// be much larger than 4.5MB) go straight from the browser to Blob
// storage, authorized by a short-lived token from
// /api/scene-upload-token, rather than passing through a serverless
// function body (which has a hard 4.5MB ceiling).

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

export default function SceneUpload({ scene, onChange, userId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setError("Please upload an image or video file.");
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    // Immediate local preview while the real upload happens in the
    // background — same pattern as the old CharacterSetup component.
    // width/height start null and get filled in by the preview
    // media's onLoad/onLoadedMetadata below (real pixel dimensions,
    // needed server-side for mask generation — see the note there).
    //
    // NOTE: every onChange call below uses the FUNCTIONAL setState
    // form (onChange is setScene from pages/timeline.jsx), not a plain
    // object built from the `scene` closure variable. The dimension
    // callback can fire at any point during the upload (it's a local,
    // near-instant browser decode racing an async network upload), so
    // building each update from the CURRENT state rather than the
    // scene value captured when handleFile started is what keeps
    // width/height from getting silently clobbered by whichever
    // update lands second.
    const previewUrl = URL.createObjectURL(file);
    onChange((prev) => ({
      ...prev,
      previewUrl,
      mediaType: isVideo ? "video" : "image",
      url: null,
      width: null,
      height: null,
    }));

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/scene-upload-token",
        // SECURITY FIX [Sep 4 2026]: this used to hand out an upload
        // token to anyone who could reach this endpoint directly, with
        // no identity attached at all — see scene-upload-token.js for
        // why that mattered (up to 500MB per request, unauthenticated).
        // clientPayload is the @vercel/blob/client-supported way to
        // carry data through to that token-issuing step.
        clientPayload: JSON.stringify({ userId }),
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });

      onChange((prev) => ({
        ...prev,
        previewUrl,
        mediaType: isVideo ? "video" : "image",
        url: blob.url,
      }));
    } catch (err) {
      setError(err.message || "Upload failed");
      onChange((prev) => ({ ...prev, previewUrl: null, mediaType: null, url: null, width: null, height: null }));
    } finally {
      setUploading(false);
    }
  }

  // Real pixel dimensions of the uploaded media, captured directly from
  // the browser's own decode of the file (video's intrinsic
  // videoWidth/videoHeight, or an image's naturalWidth/naturalHeight).
  //
  // WHY THIS EXISTS: the Multi-Character Timeline's 3rd-character pass
  // needs real pixel dimensions to build a mask image (see
  // utils/generateMask.js's generateMaskFromBox). That used to be
  // fetched server-side via sharp(buffer).metadata() — which works
  // fine for a real image, but throws "Input buffer contains
  // unsupported image format" when the scene is a VIDEO, since sharp
  // is an image library and cannot decode video bytes at all. Capturing
  // real dimensions here, once, at upload time, and sending them along
  // with the scene means the backend never needs to sharp-decode a
  // video file. See pages/api/timeline-generate.js for the consuming
  // side of this fix.
  function handleMediaDimensions(width, height) {
    if (!width || !height) return;
    onChange((prev) => ({ ...prev, width, height }));
  }

  function handleRemove() {
    onChange({ previewUrl: null, mediaType: null, url: null, width: null, height: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="scene-upload">
      <div className="scene-upload-header">
        <span className="section-label text-silver-red">Scene</span>
        <span className="section-meta">One shared photo or video — tag faces next</span>
      </div>

      {!scene?.previewUrl && (
        <label className="scene-dropzone">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            className="scene-file-input"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <span>Click or drag a photo or video of the scene</span>
        </label>
      )}

      {scene?.previewUrl && (
        <div className="scene-preview">
          {scene.mediaType === "video" ? (
            <video
              src={scene.previewUrl}
              className="scene-preview-media"
              controls
              muted
              onLoadedMetadata={(e) => handleMediaDimensions(e.target.videoWidth, e.target.videoHeight)}
            />
          ) : (
            <img
              src={scene.previewUrl}
              alt="Scene"
              className="scene-preview-media"
              onLoad={(e) => handleMediaDimensions(e.target.naturalWidth, e.target.naturalHeight)}
            />
          )}

          {uploading && (
            <div className="scene-progress-badge">Uploading… {progress}%</div>
          )}

          {!uploading && scene.url && (
            <button className="scene-remove-btn" onClick={handleRemove} type="button">
              Remove
            </button>
          )}
        </div>
      )}

      {error && <p className="scene-upload-error">{error}</p>}

      <style jsx>{`
        .scene-upload {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .scene-upload-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .scene-dropzone {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 220px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.04);
          color: #d9d9d9;
          font-size: 0.9rem;
          cursor: pointer;
          text-align: center;
          padding: 24px;
        }

        .scene-file-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .scene-preview {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
        }

        .scene-preview-media {
          width: 100%;
          max-height: 480px;
          object-fit: contain;
          display: block;
        }

        .scene-progress-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          text-align: center;
          background: rgba(0, 0, 0, 0.75);
          color: #fff;
          font-size: 0.8rem;
          border-radius: 8px;
          padding: 6px 0;
        }

        .scene-remove-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fca5a5;
          font-size: 0.75rem;
          border-radius: 8px;
          padding: 4px 10px;
          cursor: pointer;
        }

        .scene-upload-error {
          color: #fca5a5;
          font-size: 0.8rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
