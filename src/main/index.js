'use strict'

import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow, webContents
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

const feedUrl = `http://127.0.0.1:8000/`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)
  webContents = mainWindow.webContents

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// 主进程监听渲染进程传来的信息
ipcMain.on('update', (e, arg) => {
  console.log('update')
  checkForUpdates()
})

// 主进程主动发送消息给渲染进程函数
function sendUpdateMessage (message, data) {
  console.log({ message, data })
  webContents.send('message', { message, data })
}

app.on('ready', () => {
  console.log('app.on(ready)')
  if (process.env.NODE_ENV === 'production') {
    console.log('autoUpdater.checkForUpdates()')
    autoUpdater.checkForUpdates()
  }
})

let checkForUpdates = () => {
  // 配置安装包远端服务器
  autoUpdater.setFeedURL(feedUrl)

  // 下面是自动更新的整个生命周期所发生的事件
  autoUpdater.once('error', function (message) {
    sendUpdateMessage('error', message)
  })
  autoUpdater.once('checking-for-update', function (message) {
    sendUpdateMessage('checking-for-update', message)
  })
  autoUpdater.once('update-available', function (message) {
    sendUpdateMessage('update-available', message)
  })
  autoUpdater.once('update-not-available', function (message) {
    sendUpdateMessage('update-not-available', message)
  })

  // 更新下载进度事件
  autoUpdater.once('download-progress', function (progressObj) {
    sendUpdateMessage('downloadProgress', progressObj)
  })
  // 更新下载完成事件
  autoUpdater.once('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {
    sendUpdateMessage('isUpdateNow')
    ipcMain.on('updateNow', (e, arg) => {
      autoUpdater.quitAndInstall()
    })
  })

  // 执行自动更新检查
  autoUpdater.checkForUpdates()
}
