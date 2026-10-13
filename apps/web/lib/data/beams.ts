import type { HTMLAttributes } from "react";

export interface BeamsProps extends HTMLAttributes<HTMLDivElement> {
  color?: string;
  beamWidth?: number;
  rotation?: number;
  speed?: number;
  waveLength?: number;
  depth?: number;
  sharpness?: number;
  twist?: number;
  fillLight?: number;
  glow?: number;
  brightness?: number;
  variation?: number;
  grain?: number;
  quality?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  intro?: boolean;
  fade?: number;
  opacity?: number;
  lightMode?: boolean;
  backgroundColor?: string;
  paused?: boolean;
  dpr?: number;
  className?: string;
}

export type Settings = {
  color: string;
  beamWidth: number;
  rotation: number;
  speed: number;
  waveLength: number;
  depth: number;
  sharpness: number;
  twist: number;
  fillLight: number;
  glow: number;
  brightness: number;
  variation: number;
  grain: number;
  quality: number;
  mouseInteraction: boolean;
  mouseStrength: number;
  intro: boolean;
  fade: number;
  opacity: number;
  lightMode: boolean;
  paused: boolean;
  dpr?: number;
};

export type Program = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};
