import { ServerConfig } from '@/types';
import { hashPwd } from '@/utils';
import { request } from '@/utils/request';
import { makeAutoObservable } from 'mobx-miniprogram';

const { platform } = wx.getDeviceInfo();

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

  constructor() {
    makeAutoObservable(this);
  }

  setData = (values: any) => {
    Object.assign(this, values);
  };

  updateServerConfig = async (config: ServerConfig) => {
    this.serverConfig = config;
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
  };

  setCopyFile(name: string) {}
}

export const store = new Store();
