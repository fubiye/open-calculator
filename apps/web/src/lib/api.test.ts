import { describe, expect, it } from 'vitest';
import { apiUrl } from './api';

describe('apiUrl', () => {
  it('在未配置后端地址时保持同源路径', () => {
    expect(apiUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('为缺少前导斜杠的路径补上斜杠', () => {
    expect(apiUrl('api/v1/meta')).toBe('/api/v1/meta');
  });
});
