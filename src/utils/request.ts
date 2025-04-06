import { store } from '../stores';

interface RequestParams {
  url: string;
  method?:
    | 'OPTIONS'
    | 'GET'
    | 'HEAD'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'TRACE'
    | 'CONNECT';
  data?: any;
  timeout?: number;
}

let cachedCloudInstance: Promise<WxCloud>;

const getSharedCloudInstance = async () => {
  const cloud = new wx.cloud.Cloud({
    resourceAppid: import.meta.env.VITE_CLOUD_RESOURCE_APPID,
    resourceEnv: import.meta.env.VITE_CLOUD_RESOURCE_ENV,
  });
  await cloud.init();
  return cloud;
};

const getHostedCloudInstance = () => {
  const callFunction = ({
    name,
    data,
    success,
    fail,
    complete,
  }: {
    name: string;
    data: RequestParams & {
      headers: {
        Authorization?: string;
      };
    };
    success: (res: any) => void;
    fail: (err: any) => void;
    complete: () => void;
  }) => {
    wx.request({
      ...data,
      url: `${import.meta.env.VITE_CLOUD_HOSTED_SERVER}/${name}`,
      header: data.headers,
      method: data.method || 'POST',
      data,
      success: (res) => {
        if (res.statusCode !== 200 || res.data?.name === 'Error') {
          return fail(res.data);
        }
        success({ result: res.data });
      },
      fail,
      complete,
    });
  };
  return Promise.resolve({
    callFunction,
  }) as Promise<WxCloud>;
};

export const getCloudInstance = () => {
  if (cachedCloudInstance) {
    return cachedCloudInstance;
  }
  if (import.meta.env.VITE_CLOUD_ENV) {
    wx.cloud.init({
      env: import.meta.env.VITE_CLOUD_ENV,
    });
    cachedCloudInstance = Promise.resolve(wx.cloud);
    return cachedCloudInstance;
  } else if (import.meta.env.VITE_CLOUD_RESOURCE_ENV) {
    cachedCloudInstance = getSharedCloudInstance();
  } else if (import.meta.env.VITE_CLOUD_HOSTED_SERVER) {
    cachedCloudInstance = getHostedCloudInstance();
  } else {
    throw new Error('服务配置缺失');
  }
  return cachedCloudInstance;
};

export const request = <T>({ url, method, data, timeout }: RequestParams) => {
  const header: {
    Authorization?: string;
  } = {};
  const serverConfig = store
    ? store.serverConfig
    : wx.getStorageSync('serverConfig');
  const { domain, privateDomain, token } = serverConfig || {};
  if (!domain) return Promise.reject('domain error');
  if (token) header.Authorization = token;
  type Result = { data: T; code: number; message: string };
  return new Promise<Result>(async (resolve, reject) => {
    const prefix = domain.startsWith('http') ? '' : 'http://';
    const options = {
      url: `${prefix}${domain}${url}`,
      method,
      data,
      timeout,
    };
    const handleResult = (result: Result) => {
      if (result.code === 200) {
        resolve(result);
      } else {
        reject(result);
      }
    };
    if (domain === privateDomain) {
      wx.request({
        ...options,
        header,
        success: (res) => handleResult(res.data as Result),
        fail: reject,
      });
    } else {
      const cloud = await getCloudInstance();
      cloud.callFunction({
        name: 'proxy',
        data: {
          ...options,
          headers: header,
        },
        success: (res) => handleResult(res.result as Result),
        fail: reject,
      });
    }
  });
};
