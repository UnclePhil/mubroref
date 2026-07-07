const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('mubroref', {
  platform: process.platform,
});
