import { describe, expect, it } from 'vitest';
import { ApiError, apiUrl } from './index';

describe('apiUrl', () => {
  it('在未配置后端地址时保持同源路径', () => {
    expect(apiUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('为缺少前导斜杠的路径补上斜杠', () => {
    expect(apiUrl('api/v1/meta')).toBe('/api/v1/meta');
  });
});

describe('ApiError', () => {
  it('保留状态码与 details', () => {
    const error = new ApiError(409, 'conflict', { currentRevision: 2 });
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ currentRevision: 2 });
  });
});
