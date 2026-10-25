import { EventEmitter } from 'node:events';
import type { ScanEventsMap } from './types.js';

export class ScanEventBus {
  private emitter = new EventEmitter();

  public emit<K extends keyof ScanEventsMap>(event: K, payload: ScanEventsMap[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  public on<K extends keyof ScanEventsMap>(
    event: K,
    listener: (payload: ScanEventsMap[K]) => void
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public off<K extends keyof ScanEventsMap>(
    event: K,
    listener: (payload: ScanEventsMap[K]) => void
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public removeAllListeners(): this {
    this.emitter.removeAllListeners();
    return this;
  }
}
