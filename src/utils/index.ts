import { sha256 } from 'weapp-sha256';

const VIDEO_TYPES = ['mp4', 'mov', 'm4v', '3gp', 'avi', 'm3u8', 'webm'];
const AUDIO_TYPES = ['mp3', 'flac', 'wav', 'm4a'];
const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOCUMENT_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'];

export const getFileType = (type: string = '') => {
  if (VIDEO_TYPES.includes(type)) {
    return 'video';
  }
  if (AUDIO_TYPES.includes(type)) {
    return 'audio';
  }
  if (IMAGE_TYPES.includes(type)) {
    return 'image';
  }
  if (DOCUMENT_TYPES.includes(type)) {
    return 'document';
  }
};

export const parseCammand = (command: string = '') => {
  const regex =
    /(.*?)\s+\[\/(.*?)\]\((.*?)\)(\[\/\])?\s+to\s+\[\/(.*?)\]\((.*?)\)/;
  const match = command.match(regex);

  if (!match) return {};

  const taskType = match[1];
  const sourceDesc = match[2];
  const sourceValue = match[3];
  const destDesc = match[5];
  const destValue = match[6];

  const sourcePath = `${sourceDesc}${sourceValue}`.replace('//', '/');
  const destPath = `${destDesc}${destValue}`.replace('//', '/');
  const sourceName = sourcePath.split('/').pop();

  return {
    taskType,
    sourcePath,
    destPath,
    sourceName,
  };
};

export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
  );
}

const hash_salt = 'https://github.com/alist-org/alist';

export function hashPwd(pwd: string = '') {
  return sha256(`${pwd}-${hash_salt}`);
}

export const noop = () => {};

export const random = <T>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

export const safeJSONParse = <T>(
  str: string,
  defaultValue?: T,
): T | undefined => {
  try {
    return JSON.parse(str);
  } catch (err) {
    console.log(err);
    return defaultValue;
  }
};

const formatNumber = (n: number) => {
  const s = n.toString();
  return s[1] ? s : '0' + s;
};

export const formatTime = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  );
};

export const removeProtocol = (domain?: string) => {
  return domain ? domain.replace(/^https?\:\/\//, '') : '';
};

export const isPrivateDomain = (domain: string = '') => {
  const ip = removeProtocol(domain).split(':')[0];

  if (/^local\./.test(ip) || /\.local$/.test(ip)) {
    return true;
  }

  const privateIPRegex =
    /^(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2[0-9]|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})$/;
  return privateIPRegex.test(ip);
};

export const sleep = (time?: number) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), time);
  });
};

export const parseAuthUrl = (url: string = '') => {
  const values = url.trim().replace(/\/$/, '').split('@');
  if (values.length <= 1) {
    const domain = values[0];
    const isPrivate = isPrivateDomain(domain);
    return {
      domain,
      [isPrivate ? 'privateDomain' : 'publicDomain']: domain,
    };
  }
  const [account, domain] = values;
  const [username, password] = account.split(':');
  const isPrivate = isPrivateDomain(domain);
  return {
    domain,
    [isPrivate ? 'privateDomain' : 'publicDomain']: domain,
    username,
    password,
  };
};
