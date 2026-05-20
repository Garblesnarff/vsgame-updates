export type ParticleType = 'blood' | 'nova' | 'bloodNova' | 'shadowTrail' | 'shield';

interface ParticleBasePayload {
  type: ParticleType;
  x: number;
  y: number;
}

export interface BloodParticlePayload extends ParticleBasePayload {
  type: 'blood';
  count?: number;
}

export interface NovaParticlePayload extends ParticleBasePayload {
  type: 'nova' | 'bloodNova';
}

export interface ShadowTrailParticlePayload extends ParticleBasePayload {
  type: 'shadowTrail';
}

export interface ShieldParticlePayload extends ParticleBasePayload {
  type: 'shield';
  count?: number;
}

export type ParticleEmitPayload =
  | BloodParticlePayload
  | NovaParticlePayload
  | ShadowTrailParticlePayload
  | ShieldParticlePayload;
