import type { Config } from 'tailwindcss';

export default <Config>{
  content: [
    // 添加你需要提取的文件目录
    'src/**/*.{wxml,js,ts}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
