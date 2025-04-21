import { incrementVersion } from '../utils/version';

export const enableNewFeature = () => {
  // ... كود تفعيل الميزة
  incrementVersion('minor');
}; 