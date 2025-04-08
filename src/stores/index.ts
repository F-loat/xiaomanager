import { ServerConfig } from '@/types';
import { hashPwd } from '@/utils';
import { request } from '@/utils/request';
import { makeAutoObservable } from 'mobx-miniprogram';
import { FeatureModule } from './modules/feature';

const { platform } = wx.getDeviceInfo();

interface StarFile {
  name: string;
  originName?: string;
  path: string;
  is_dir: boolean;
  icon?: string;
}

export const SLOGAN = 'AList小程序，轻松管理云端文件';
export const SHARE_COVER =
  'https://assets-1251785959.cos.ap-beijing.myqcloud.com/xiaomanager/cover.png';

export class Store {
  isPC =
    platform === 'windows' ||
    platform === 'mac' ||
    !wx.getSkylineInfoSync?.().isSupported;
  serverConfig: ServerConfig = wx.getStorageSync('serverConfig') || {};

  tempFile?: {
    dir: string;
    names: string[];
  };

  starFiles: StarFile[] = wx.getStorageSync('starFiles') || [];

  feature: FeatureModule;

  constructor() {
    makeAutoObservable(this);

    this.feature = new FeatureModule(this);
  }

  setData = (values: any) => {
    Object.assign(this, values);
  };

  updateServerConfig = async (config: ServerConfig) => {
    this.serverConfig = config;
    wx.setStorageSync('serverConfig', config);
    if (!config.username || !config.password) {
      return;
    }
    try {
      const res = await request<{
        token: string;
      }>({
        url: '/api/auth/login/hash',
        method: 'POST',
        data: {
          otp_code: '',
          username: config.username,
          password: hashPwd(config.password),
        },
      });
      this.serverConfig = { ...config, token: res.data?.token };
      wx.setStorageSync('serverConfig', { ...config, token: res.data?.token });
    } catch (err) {
      wx.showToast({
        title: err.message,
        icon: 'none',
      });
    }
  };

  addStreFile = (file: StarFile) => {
    const paths = this.starFiles.map((item) => item.path);
    if (!paths.includes(file.path)) {
      this.starFiles = [...this.starFiles, file];
    }
    wx.setStorageSync('starFiles', this.starFiles);
  };

  removeStreFile = (index: number) => {
    this.starFiles = [
      ...this.starFiles.slice(0, index),
      ...this.starFiles.slice(index + 1),
    ];
    wx.setStorageSync('starFiles', this.starFiles);
  };

  renameStreFile = (index: number, name: string) => {
    const files = [...this.starFiles];
    files[index].name = name;
    files[index].originName = files[index].path.split('/').pop();
    this.starFiles = files;
    wx.setStorageSync('starFiles', this.starFiles);
  };
}

export const store = new Store();
