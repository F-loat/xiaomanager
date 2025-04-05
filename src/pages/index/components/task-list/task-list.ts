import { store } from '@/stores';
import { formatFileSize, parseCammand } from '@/utils';
import { request } from '@/utils/request';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';

interface Task {
  id: string;
  filename: string;
  progress: number;
  status: keyof typeof fileStateEnum;
  size: string;
  speed?: string;
  classNames?: string;
}

enum fileStateEnum {
  pending = 0,
  copying = 1,
  completed = 2,
  failed = 7,
}

const classNamesForStatus = (status: fileStateEnum) => {
  switch (status) {
    case fileStateEnum.completed:
      return 'bg-green-500 dark:bg-green-600';
    case fileStateEnum.failed:
      return 'bg-red-500 dark:bg-red-600';
    case fileStateEnum.copying:
      return 'progress-bar-animated';
    default:
      return 'bg-blue-500 dark:bg-blue-600';
  }
};

function calculateSpeed({
  start_time,
  end_time,
  progress,
  total_bytes,
}: {
  start_time: string;
  end_time?: string;
  progress: number;
  total_bytes: number;
}): string {
  const start = new Date(start_time);
  const end = new Date(end_time || Date.now());
  const timeDiff = (end.getTime() - start.getTime()) / 1000;
  return formatFileSize(
    timeDiff <= 0 ? 0 : (total_bytes * (progress / 100)) / timeDiff,
  );
}

const formatTask = (item): Task => {
  const { sourceName } = parseCammand(item.name);
  return {
    id: item.id,
    filename: sourceName || '',
    progress: Math.round(item.progress),
    status: fileStateEnum[item.state],
    size: formatFileSize(item.total_bytes),
    speed: calculateSpeed(item) + '/s',
    classNames: classNamesForStatus(item.state),
  };
};

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
  data: {
    tasks: [] as Task[],
    doneTasks: [] as Task[],
    visibleTasks: [] as Task[],
    showAllTasks: false,
    taskType: wx.getStorageSync('taskType') || 'copy',
  },
  lifetimes: {
    attached() {
      this.fetchTaskList();
    },
  },
  pageLifetimes: {
    show() {
      this.fetchTaskList();
    },
  },
  methods: {
    setShowAllTasks() {
      this.setData({
        visibleTasks: this.data.tasks,
        showAllTasks: !this.data.showAllTasks,
      });
    },
    getApiUrl(api: string, type?: string) {
      const taskType = type || this.data.taskType;
      return `/api/task/${taskType}/${api}`;
    },
    async fetchTaskList() {
      await Promise.all([this.fetchDoneList(), this.fetchUndoneList()]);
    },
    async fetchDoneList() {
      const res = await request<Task[]>({
        url: this.getApiUrl('done'),
        method: 'GET',
      });
      this.setData({
        doneTasks: res.data.map(formatTask),
      });
      this.updateVisibleTasks();
    },
    async fetchUndoneList() {
      const res = await request<Task[]>({
        url: this.getApiUrl('undone'),
        method: 'GET',
      });
      this.setData({
        tasks: res.data.map(formatTask),
      });
      this.updateVisibleTasks();
      if (res.data.length) {
        setTimeout(() => this.fetchUndoneList(), 1000);
      }
    },
    updateVisibleTasks() {
      const { tasks, doneTasks } = this.data;
      this.setData({
        visibleTasks: tasks.concat(doneTasks).slice(0, 2),
      });
    },
    handleSwitchType() {
      const items = [
        { label: '复制', value: 'copy' },
        { label: '解压', value: 'decompress' },
        { label: '离线下载', value: 'offline_download' },
        { label: '上传', value: 'upload' },
      ];
      wx.showActionSheet({
        alertText: '任务类型',
        itemList: items.map((i) => i.label),
        success: (res) => {
          const { value } = items[res.tapIndex];
          this.setData({ taskType: value });
          wx.setStorageSync('taskType', value);
          this.fetchTaskList();
        },
      });
    },
    handleTaskClick(e: {
      currentTarget: {
        dataset: {
          id: string;
          status: string;
        };
      };
    }) {
      const { id, status } = e.currentTarget.dataset;

      const items: { label: string; value: string }[] = [];

      if (status === 'failed') {
        items.push(
          { label: '重试', value: 'retry' },
          { label: '删除', value: 'delete' },
        );
      } else if (status === 'copying' || status === 'pending') {
        items.push({ label: '取消', value: 'cancel' });
      } else if (status === 'completed') {
        items.push({ label: '删除', value: 'delete' });
      }

      wx.showActionSheet({
        alertText: '操作',
        itemList: items.map((i) => i.label),
        success: async (res) => {
          const { value } = items[res.tapIndex];
          switch (value) {
            case 'retry':
              await request({
                url: this.getApiUrl(`retry?tid=${id}`),
                method: 'POST',
              });
              break;
            case 'cancel':
              await request({
                url: this.getApiUrl(`cancel?tid=${id}`),
                method: 'POST',
              });
              break;
            case 'delete':
              await request({
                url: this.getApiUrl(`delete?tid=${id}`),
                method: 'POST',
              });
              break;
            default:
              break;
          }
          await this.fetchTaskList();
        },
      });
    },
  },
});
