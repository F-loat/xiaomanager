import { makeAutoObservable } from 'mobx-miniprogram';
import { Store } from '..';

export class FeatureModule {
  store: Store;

  homeTasks: boolean; // 首页任务

  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this);

    const featureInfo = wx.getStorageSync('featureInfo') || {};
    this.homeTasks = featureInfo.homeTasks ?? true;
  }

  setHomeTasks(value: boolean) {
    this.homeTasks = value;
  }
}
