"use client";

import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";

const constraints: MediaStreamConstraints = {
  audio: false,
  video: true,
};

const useBodyPix = () => {
  const [model, setModel] = useState<bodyPix.BodyPix | undefined>(undefined);

  const loadModel = useCallback(async () => {
    bodyPix.load().then((net) => {
      setModel(net);
    });
  }, []);

  const showResult = useCallback(
    ({
      seg,
      canvasElm,
      videoElm,
    }: {
      seg: bodyPix.SemanticPersonSegmentation;
      canvasElm: HTMLCanvasElement;
      videoElm: HTMLVideoElement;
    }) => {
      const foregroundColor = { r: 0, g: 0, b: 0, a: 0 };
      const backgroundColor = { r: 127, g: 127, b: 127, a: 255 };

      const mask = bodyPix.toMask(seg, foregroundColor, backgroundColor);

      const opacity = 0.7;

      bodyPix.drawMask(canvasElm, videoElm, mask, opacity, 0, false);
    },
    []
  );

  const estimate = useCallback(
    async ({
      canvasElm,
      videoElm,
    }: {
      canvasElm: HTMLCanvasElement;
      videoElm: HTMLVideoElement;
    }) => {
      if (model === undefined) {
        return;
      }
      model.segmentPerson(videoElm).then((segmentation) => {
        showResult({ seg: segmentation, canvasElm, videoElm });
      });
    },
    [model, showResult]
  );

  return {
    loadModel,
    estimate,
  };
};
export const WebCam: FC = () => {
  const [currentStream, setCurrentStream] = useState<MediaStream | undefined>(
    undefined
  );
  const requestIdRef = useRef<number | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { loadModel, estimate } = useBodyPix();

  const setup = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current === null) {
        return;
      }
      videoRef.current.srcObject = stream;
      setCurrentStream(stream);
    } catch (err) {
      /* エラーを処理 */
    }
    await loadModel();
  }, [loadModel]);

  const loop = useCallback(async () => {
    requestIdRef.current = requestAnimationFrame(loop);
    await estimate({
      canvasElm: canvasRef.current!,
      videoElm: videoRef.current!,
    });
  }, [estimate]);

  useEffect(() => {
    return () => {
      requestIdRef.current && cancelAnimationFrame(requestIdRef.current);
    };
  }, []);

  return (
    <>
      <video autoPlay ref={videoRef} />
      <button className={"btn"} onClick={setup}>
        init
      </button>
      <button className={"btn"} onClick={loop}>
        estimate
      </button>
      <canvas ref={canvasRef} />
    </>
  );
};
