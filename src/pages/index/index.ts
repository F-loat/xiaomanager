import { SHARE_COVER, SLOGAN, store } from '@/stores';
import { formatFileSize, formatTime, getFileType } from '@/utils';
import { request } from '@/utils/request';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';

interface Item {
  name: string;
  is_dir: boolean;
  created: string;
  modified: string;
  size: string;
}

const getDocumentIconmName = (type?: string) => {
  switch (type) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
      return 'excel';
    case 'ppt':
    case 'pptx':
      return 'ppt';
    case 'txt':
      return 'txt';
    default:
      return 'wps';
  }
};

const getIcomName = (name: string, is_dir: boolean) => {
  if (is_dir) return 'folder';
  const type = name.split('.').pop();
  const fileType = getFileType(type);

  switch (fileType) {
    case 'audio':
      return 'music';
    case 'video':
      return 'video';
    case 'image':
      return 'image';
    case 'document':
      return getDocumentIconmName(type);
    default:
      return 'weizhiwenjian';
  }
};

ComponentWithStore({
  properties: {
    path: String,
  },
  data: {
    list: [] as Item[],
    connected: !!store.serverConfig.domain,
    total: 0,
    _page: 1,
  },
  storeBindings: [
    {
      store,
      fields: ['serverConfig', 'isPC', 'tempFile', 'starFiles'] as const,
      actions: [] as const,
    },
    {
      store: store.feature,
      fields: ['homeTasks'] as const,
      actions: [] as const,
    },
  ],
  lifetimes: {
    attached() {
      this.fetchList(true);
    },
  },
  methods: {
    onShareAppMessage() {
      return {
        title: SLOGAN,
        imageUrl: SHARE_COVER,
      };
    },
    onShareTimeline() {
      return {
        title: SLOGAN,
        imageUrl: SHARE_COVER,
      };
    },
    async fetchList(refresh = false, retry = false) {
      try {
        wx.showLoading({
          title: '加载中',
        });
        if (refresh) {
          this.data._page = 1;
        }
        const { path } = this.properties;
        const res = await request<{
          content: Item[];
          total: number;
        }>({
          url: '/api/fs/list',
          method: 'POST',
          data: {
            path,
            page: this.data._page,
            per_page: 50,
          },
        });
        if (!res.data) {
          return;
        }
        const list: Item[] =
          res.data.content?.map((item) => ({
            ...item,
            modified: formatTime(new Date(item.modified)),
            icon: getIcomName(item.name, item.is_dir),
            size: formatFileSize(Number(item.size)),
          })) || [];
        this.setData({
          connected: true,
          list: this.data._page === 1 ? list : [...this.data.list, ...list],
          total: res.data.total,
        });
      } catch (err) {
        if (err.code === 401) {
          if (retry) {
            wx.showModal({
              title: '鉴权失败',
              content: '请确认账号密码是否配置正确',
              success: (res) => {
                if (!res.confirm) return;
                wx.navigateTo({
                  url: '/pages/setting/index',
                });
              },
            });
            throw new Error('401 Unauthorized');
          } else {
            await store.updateServerConfig(store.serverConfig);
            await this.fetchList(true, true);
            return;
          }
        }
        const message = (err as { errMsg: string }).errMsg || '';
        if (!this.data.list.length) {
          this.setData({
            connected: false,
            error: message,
          });
        }
        if (message === 'request:fail url not in domain list') {
          wx.showModal({
            title: '网络异常',
            content: '局域网访问请确保小程序与 alist 服务在同一网段下',
          });
        }
        if (message.includes('-109')) {
          wx.showModal({
            title: '请求异常',
            content: '局域网访问请确认【系统设置-隐私-本地网络】权限已授予微信',
          });
        }
        console.error(err);
      } finally {
        wx.hideLoading();
      }
    },
    handleLoadMore() {
      if (this.data.total && this.data._page * 50 >= this.data.total) {
        return;
      }
      this.data._page += 1;
      this.fetchList();
    },
    handleRefresh() {
      wx.createSelectorQuery()
        .select('#scrollview')
        .node()
        .exec(async (res) => {
          const scrollView = res[0].node;
          await this.fetchList(true);
          scrollView.closeRefresh();
          wx.showToast({
            title: '列表刷新成功',
            icon: 'none',
          });
        });
    },
    async handleSwitchDomain() {
      const { serverConfig } = store;
      if (!serverConfig.privateDomain || !serverConfig.publicDomain) {
        return;
      }
      const isPrivate = serverConfig.domain === serverConfig.privateDomain;
      const config = {
        ...serverConfig,
        domain: isPrivate
          ? serverConfig.publicDomain!
          : serverConfig.privateDomain!,
      };
      wx.showLoading({
        title: '网络切换中',
      });
      await store.updateServerConfig(config);
      this.fetchList(true);
      wx.hideLoading();
      wx.showToast({
        title: isPrivate ? '已切换为公网连接' : '已切换为内网连接',
        icon: 'none',
      });
    },
    handleViewTap(e: {
      currentTarget: {
        dataset: {
          name: string;
          path?: string;
          is_dir: boolean;
        };
      };
    }) {
      const { name, is_dir, path } = e.currentTarget.dataset;
      const target = path || `${this.properties.path}/${name}`;
      if (is_dir) {
        wx.navigateTo({
          url: `/pages/index/index?path=${target}`,
        });
      } else {
        wx.navigateTo({
          url: `/pages/player/player?path=${target}`,
        });
      }
    },

    handleListOperation(e: {
      detail: {
        value: string;
        index: number;
      };
    }) {
      const { value: name, index } = e.detail;
      const items = [
        { label: '重命名', value: 'rename' },
        { label: '复制', value: 'copy' },
        { label: '收藏', value: 'star' },
        { label: '删除', value: 'delete' },
      ];

      wx.showActionSheet({
        alertText: '操作',
        itemList: items.map((i) => i.label),
        success: (res) => {
          const { value } = items[res.tapIndex];
          switch (value) {
            case 'rename':
              this.handleRenameFile(name);
              break;
            case 'copy':
              this.handleCopyFile(name);
              break;
            case 'star':
              this.handleStarFile(name, this.data.list[index]?.is_dir);
              break;
            case 'delete':
              this.handleRemoveFile(name);
              break;
            default:
              break;
          }
        },
      });
    },
    handleStarOperation(e: {
      detail: {
        value: string;
        index: number;
      };
    }) {
      const { value: name, index } = e.detail;
      const items = [
        { label: '重命名', value: 'rename' },
        { label: '移除', value: 'remove' },
      ];

      wx.showActionSheet({
        alertText: '操作',
        itemList: items.map((i) => i.label),
        success: (res) => {
          const { value } = items[res.tapIndex];
          switch (value) {
            case 'rename':
              wx.showModal({
                title: '请输入新名称',
                content: name,
                editable: true,
                success: async (res) => {
                  if (!res.confirm || !res.content) return;
                  if (res.content === name) return;
                  store.renameStreFile(index, res.content);
                },
              });
              break;
            case 'remove':
              store.removeStreFile(index);
              break;
            default:
              break;
          }
        },
      });
    },
    handleRenameFile(name: string) {
      wx.showModal({
        title: '请输入新名称',
        content: name,
        editable: true,
        success: async (res) => {
          if (!res.confirm || !res.content) return;
          if (res.content === name) return;
          const { path } = this.properties;
          try {
            await request<{
              raw_url: string;
            }>({
              url: '/api/fs/rename',
              method: 'POST',
              data: {
                name: res.content,
                overwrite: false,
                path: `${path}/${name}`,
              },
            });
            await this.fetchList(true);
          } catch (err) {
            wx.showToast({
              title: err.message,
              icon: 'none',
            });
          }
        },
      });
    },
    handleCopyFile(name: string) {
      store.setData({
        tempFile: {
          dir: this.properties.path,
          names: [name],
        },
      });
    },
    handleStarFile(name: string, is_dir: boolean) {
      const { path } = this.properties;
      store.addStreFile({
        name,
        path: `${path}/${name}`,
        is_dir,
        icon: getIcomName(name, is_dir),
      });
    },
    handleRemoveFile(name: string) {
      wx.showModal({
        title: '删除',
        content: '确定要删除所选对象吗?',
        success: async (res) => {
          if (!res.confirm) return;
          const { path } = this.properties;
          await request<{
            raw_url: string;
          }>({
            url: '/api/fs/remove',
            method: 'POST',
            data: {
              dir: path,
              names: [name],
            },
          });
          await this.fetchList(true);
        },
      });
    },
    async handlePasteFile() {
      if (!store.tempFile) {
        return;
      }
      await request({
        url: '/api/fs/copy',
        method: 'POST',
        data: {
          src_dir: store.tempFile.dir,
          dst_dir: this.properties.path,
          names: store.tempFile.names,
          overwrite: false,
        },
      });
      store.setData({
        tempFile: undefined,
      });
      this.fetchList(true);
    },
  },
});
