import { formatFileSize, formatTime, getFileType } from '@/utils';
import { request } from '@/utils/request';

let innerAudioContext: WechatMiniprogram.InnerAudioContext;

Component({
  properties: {
    path: String,
  },
  data: {
    name: '',
    fileType: '',
    url: '',
    info: {},
  },
  lifetimes: {
    attached() {
      const name = this.properties.path.split('/').pop();
      const type = name?.split('.').pop();
      this.setData({
        name,
        fileType: getFileType(type),
      });
      this.fetchDetail();
    },
    detached() {
      innerAudioContext?.stop();
      innerAudioContext?.destroy();
    },
  },
  methods: {
    async fetchDetail() {
      const { path } = this.properties;
      const { data } = await request<{
        raw_url: string;
        provider: string;
        created: string;
        modified: string;
        size: number;
      }>({
        url: '/api/fs/get',
        method: 'POST',
        data: {
          path,
        },
      });
      this.setData({
        url: data.raw_url,
        info: {
          created: formatTime(new Date(data.created)),
          modified: formatTime(new Date(data.modified)),
          provider: data.provider,
          size: formatFileSize(data.size),
        },
      });
    },
    handlePlayAudio() {
      innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = this.data.url;
      innerAudioContext.play();
    },
    handlePreviewDocument() {
      wx.downloadFile({
        url: this.data.url,
        success: function (res) {
          wx.openDocument({
            showMenu: true,
            filePath: res.tempFilePath,
            success: function () {
              console.log('打开文档成功');
            },
          });
        },
      });
    },
    handlePreviewImage() {
      wx.previewImage({
        urls: [this.data.url],
      });
    },
    handleError(e: any) {
      console.error(e);
    },
  },
});
