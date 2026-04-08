import { useCallback, useEffect, useRef } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
}

export function Waveform({ analyser }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataArrayRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Float32Array(bufferLength);
    }
    const dataArray = dataArrayRef.current;
    analyser.getFloatTimeDomainData(dataArray);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#C87533"; // copper accent
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const sample = dataArray[i] ?? 0;
      const y = (sample * 0.5 + 0.5) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.stroke();
    rafRef.current = requestAnimationFrame(draw);
  }, [analyser]);

  useEffect(() => {
    if (analyser) {
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      className="w-full h-16 rounded-lg"
      style={{ backgroundColor: "var(--surface-sunken)" }}
    />
  );
}
