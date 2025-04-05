import { store } from '@/stores';
import { isPrivateDomain, parseAuthUrl } from '@/utils';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';

ComponentWithStore({
  properties: {
    error: String,
  },
  storeBindings: [
    {
      store,
      fields: ['serverConfig', 'isPC'] as const,
      actions: [] as const,
    },
  ],
  methods: {
    handleRepoLink() {
      wx.setClipboardData({
        data: 'http://xdocs.hanxi.cc',
        success: () => {
          wx.showToast({
            title: '链接已复制，请在浏览器中访问～',
            icon: 'none',
          });
        },
      });
    },
    handleSetting() {
      const { domain, username, password } = store.serverConfig;
      const account = username ? `${username}:${password || ''}@` : '';
      wx.showModal({
        title: '请输入 alist 的服务地址',
        placeholderText: '192.168.1.6:5244',
        content: `${account}${domain || ''}`,
        editable: true,
        success: async (res) => {
          if (!res.confirm || !res.content) return;
          const config = {
            ...store.serverConfig,
            ...parseAuthUrl(res.content),
          };
          await store.updateServerConfig(config);
          this.triggerEvent('refresh');
          const isPrivate = isPrivateDomain(config.domain);
          if (isPrivate && store.isPC) {
            wx.setClipboardData({
              data: 'https://github.com/F-loat/xiaoplayer/issues/3',
            });
            wx.showToast({
              title:
                'PC 端可能不支持内网访问，请尝试配置公网服务地址或参考剪贴板中教程配置',
              icon: 'none',
            });
          }
        },
      });
    },
    handleError() {
      wx.setClipboardData({
        data: this.data.error || '未知异常',
        success: () => {
          wx.showToast({
            title: '错误日志已复制～',
            icon: 'none',
          });
        },
      });
    },
    handleSwitchDomain() {
      this.triggerEvent('switch');
    },
  },
});
