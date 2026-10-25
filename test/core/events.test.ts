import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScanEventBus } from '../../src/core/events.js';

describe('ScanEventBus', () => {
  it('emits and receives typed lifecycle events', () => {
    const bus = new ScanEventBus();
    const received: string[] = [];

    bus.on('stage:start', (e) => {
      received.push(`start:${e.stage}`);
    });

    bus.on('stage:complete', (e) => {
      received.push(`complete:${e.stage}:${e.status}`);
    });

    bus.emit('stage:start', { stage: 'static', target: 'test-pkg' });
    bus.emit('stage:complete', { stage: 'static', status: 'success' });

    assert.deepEqual(received, ['start:static', 'complete:static:success']);
  });
});
