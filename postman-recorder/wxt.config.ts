import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Postman Recorder',
    description: 'Record frontend API calls and export them as a Postman collection',
    permissions: ['webRequest', 'storage', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
});
