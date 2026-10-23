"use client";

import { useEffect, useRef, useState } from "react";
import { ModalDialog } from "@/components/ui/primitives";

// AT-14: a selfie for check-in. Uses the front camera when the browser allows it, otherwise a
// picked or captured image file. Pictures are shrunk to 960 px JPEG before they leave the browser.

const MAX_SIDE = 960;
const QUALITY = 0.8;

function toJpeg(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

function fileToJpeg(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve(toJpeg(image, image.naturalWidth, image.naturalHeight));
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

export function CheckInCamera({ title, onConfirm, onClose }: { title: string; onConfirm: (photo: string) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setCameraError("Trình duyệt không mở được camera. Chọn hoặc chụp ảnh bằng nút bên dưới."));
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => undefined);
          }
        })
        .catch((error: unknown) => {
          const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
          setCameraError(denied ? "Bạn đã chặn quyền camera. Bật lại trong cài đặt trình duyệt, hoặc chọn ảnh bằng nút bên dưới." : "Không mở được camera. Chọn hoặc chụp ảnh bằng nút bên dưới.");
        });
    }
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (dialog?.open) dialog.close();
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setPhoto(toJpeg(video, video.videoWidth, video.videoHeight));
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await fileToJpeg(file));
    } catch {
      setCameraError("Không đọc được ảnh này, hãy chọn ảnh khác.");
    }
  };

  return (
    <ModalDialog className="shift-dialog check-in-camera" ref={dialogRef} title={title} onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <div className="check-in-camera-frame">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local data URL preview
            <img alt="Ảnh vừa chụp" src={photo} />
          ) : cameraError ? (
            <p>{cameraError}</p>
          ) : (
            <video
              aria-label="Camera"
              autoPlay
              muted
              playsInline
              // "Chụp lại" mounts a new element: give it the running stream again.
              ref={(node) => {
                videoRef.current = node;
                if (node && streamRef.current && node.srcObject !== streamRef.current) {
                  node.srcObject = streamRef.current;
                  void node.play().catch(() => undefined);
                }
              }}
              onLoadedData={() => setReady(true)}
            />
          )}
        </div>
        <p className="check-in-camera-hint">Ảnh chụp khuôn mặt để xác nhận người chấm công; HR xem được ảnh này.</p>
        <div className="account-dialog-actions">
          <label className="secondary-button check-in-camera-file">
            {cameraError ? "Chọn / chụp ảnh" : "Chọn ảnh khác"}
            <input accept="image/*" capture="user" type="file" onChange={(event) => void pick(event.target.files?.[0])} />
          </label>
          {photo ? (
            <>
              {!cameraError ? (
                <button className="secondary-button" type="button" onClick={() => setPhoto(null)}>
                  Chụp lại
                </button>
              ) : null}
              <button className="primary-button" type="button" onClick={() => onConfirm(photo)}>
                Dùng ảnh này
              </button>
            </>
          ) : (
            <button className="primary-button" disabled={Boolean(cameraError) || !ready} type="button" onClick={capture}>
              Chụp
            </button>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
