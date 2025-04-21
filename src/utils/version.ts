export const getAppVersion = () => {
  const version = localStorage.getItem('appVersion') || '1.0.0';
  return version;
};

export const incrementVersion = (type: 'major' | 'minor' | 'patch' = 'patch') => {
  let version = localStorage.getItem('appVersion') || '1.0.0';
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      version = `${major + 1}.0.0`;
      break;
    case 'minor':
      version = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      version = `${major}.${minor}.${patch + 1}`;
      break;
  }

  localStorage.setItem('appVersion', version);
  return version;
}; 