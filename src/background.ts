import {NewExtensionServerMessage} from "./internal/utils/message";
import {HttpUtils, get, dealHotVersion} from "./internal/utils/utils";
import {Application, Backend, Launcher} from "./internal/application";
import {ConsoleLog} from "./internal/utils/log";
import {ChromeConfigItems, NewBackendConfig} from "./internal/utils/config";
import {SystemConfig} from "./config";

class background implements Launcher {
    protected source: string;
    protected lastHotVersion: string;

    public start() {
        let server = NewExtensionServerMessage("cxmooc-tools");
        server.Accept((client, data) => {
            switch (data.type) {
                case "GM_xmlhttpRequest": {
                    HttpUtils.SendRequest(client, data);
                    break;
                }
                case "GM_notification": {
                    chrome.notifications.create({
                        title: data.details.title, message: data.details.text,
                        iconUrl: chrome.runtime.getURL("img/logo.png"), type: "basic"
                    }, (id) => {
                        if (data.details.timeout) {
                            setTimeout(() => {
                                chrome.notifications.clear(id);
                            }, data.details.timeout);
                        }
                    });
                    break;
                }
                case "GM_setValue": {
                    Application.App.config.SetConfig(data.details.key, data.details.val);
                    break;
                }
            }
        });
        this.update();
        //1小时检查更新
        setInterval(() => {
            this.update();
        }, 60 * 60 * 1000);
        this.injectedScript();
        this.event();
        this.menu();
    }

    protected menu() {
        chrome.contextMenus.create({
            title: "使用 网课小工具 搜索题目",
            contexts: ["selection"],
            onclick: function (info, tab) {
                chrome.tabs.create({url: "https://cx.icodef.com/query.html?q=" + encodeURIComponent(info.selectionText)});
            }
        });
    }

    protected event() {
        if (Application.App.debug) {
            return;
        }
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason == "install") {
                chrome.tabs.create({url: "https://cx.icodef.com/"});
            } else if (details.reason == "update") {
                chrome.tabs.create({url: "https://github.com/CodFrm/cxmooc-tools/releases"});
            }
        });
    }

    protected update() {
        Application.CheckUpdate((isnew, data) => {
            let sourceUrl = chrome.extension.getURL('src/mooc.js');
            let version = SystemConfig.version;
            if (isnew) {
                chrome.browserAction.setBadgeText({
                    text: 'new'
                });
                chrome.browserAction.setBadgeBackgroundColor({
                    color: [255, 0, 0, 255]
                });
            }
            if (data == undefined) {
                if (this.source) {
                    return;
                }
                get(chrome.extension.getURL('src/mooc.js'), (source: string) => {
                    version = SystemConfig.version;
                    this.source = this.dealScript(source, SystemConfig.version);
                });
                return;
            }
            if (this.lastHotVersion == data.hotversion) {
                return;
            }
            this.lastHotVersion = data.hotversion;
            //缓存js文件源码
            let hotVersion = dealHotVersion(data.hotversion);
            let isHotUpdate: boolean = false;
            if (hotVersion > SystemConfig.version) {
                Application.App.log.Info("使用热更新版本:" + hotVersion);
                isHotUpdate = true;
            }
            if (isHotUpdate) {
                sourceUrl = SystemConfig.url + 'js/' + hotVersion + '.js';
                version = hotVersion;
            }
            (<any>get(sourceUrl, (source: string) => {
                this.source = this.dealScript(source, version);
            })).error(() => {
                if (this.source) {
                    return;
                }
                get(chrome.extension.getURL('src/mooc.js'), (source: string) => {
                    version = SystemConfig.version;
                    this.source = this.dealScript(source, SystemConfig.version);
                });
            });
        });
    }

    protected dealScript(source: string, version: any): string {
        source = "//# sourceURL=" + chrome.extension.getURL("src/mooc.js?v=" + version) + "\n" + source;
        return this.dealSymbol(source);
    }

    protected dealSymbol(source: string): string {
        source = source.replace(/("|\\)/g, "\\$1");
        source = source.replace(/(\r\n|\n)/g, "\\n");
        return source;
    }

    protected async injectedScript() {
        if (Application.App.debug) {
            return;
        }
        let regex = new Array();
        for (let key in SystemConfig.match) {
            for (let i = 0; i < SystemConfig.match[key].length; i++) {
                let v = SystemConfig.match[key][i];
                v = v.replace(/(\.\?\/)/g, "\\$1");
                v = v.replace(/\*/g, ".*?");
                regex.push(v);
            }
        }
        let cache = await Application.App.config.ConfigList();
        let cacheJsonText = JSON.stringify(cache);
        Application.App.config.Watch("*", function (key: string, value: string) {
            cache[key] = value;
            cacheJsonText = JSON.stringify(cache);
        });
        chrome.runtime.onMessage.addListener((msg, details) => {
            if (!msg.status && msg.status != "loading") {
                return null;
            }
            for (let i = 0; i < regex.length; i++) {
                let reg = new RegExp(regex[i]);
                if (reg.test(details.url)) {
                    chrome.tabs.executeScript(details.tab.id, {
                        frameId: details.frameId,
                        code: `(function(){
                            let temp = document.createElement('script');
                            temp.setAttribute('type', 'text/javascript');
                            temp.innerHTML = "` + this.dealSymbol("window.configData=" + cacheJsonText + "\n") + this.source + `";
                            temp.className = "injected-js";
                            document.documentElement.appendChild(temp)
                        }())`,
                        runAt: "document_start",
                    });
                    break;
                }
            }
        });
    }
}

async function init() {
    let component = new Map<string, any>().set("logger", new ConsoleLog()).set("config", new ChromeConfigItems(await NewBackendConfig()));

    let application = new Application(Backend, new background(), component);
    application.run();
}

init();

// 在background.ts中添加定时任务处理逻辑
class ScheduledTaskManager {
    private intervalId: number | null = null;

    constructor() {
        this.startScheduler();
    }

    private startScheduler() {
        // 每分钟检查一次是否需要执行任务
        this.intervalId = window.setInterval(() => {
            this.checkAndExecuteTasks();
        }, 60000); // 每分钟检查一次
    }

    private checkAndExecuteTasks() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const savedUrls = localStorage.getItem('scheduledUrls');
        if (savedUrls) {
            const urls: ScheduledURL[] = JSON.parse(savedUrls);
            
            urls.forEach(url => {
                if (url.scheduleTime === currentTime) {
                    this.executeScheduledTask(url);
                }
            });
        }
    }

    private executeScheduledTask(scheduledUrl: ScheduledURL) {
        // 执行定时任务 - 访问指定网址
        chrome.tabs.create({ url: scheduledUrl.url }, (tab) => {
            // 可以在这里添加自动登录逻辑
            console.log(`Visited ${scheduledUrl.url} at scheduled time`);
            
            // 获取对应网站的账号信息并自动登录
            this.autoLogin(scheduledUrl.url, tab.id);
        });
    }

    private autoLogin(url: string, tabId: number | undefined) {
        // 根据网址获取存储的账号信息并执行自动登录
        const savedAccounts = localStorage.getItem('userAccounts');
        if (savedAccounts && tabId) {
            const accounts: UserAccount[] = JSON.parse(savedAccounts);
            
            // 简化匹配逻辑 - 实际应用中需要更复杂的匹配规则
            const account = accounts.find(acc => url.includes(acc.website));
            if (account) {
                // 注入登录脚本到目标页面
                chrome.tabs.executeScript(tabId, {
                    code: `
                        // 这里应该根据具体网站编写登录脚本
                        // 示例伪代码:
                        /*
                        document.getElementById('username').value = '${account.username}';
                        document.getElementById('password').value = '${account.password}';
                        document.querySelector('login-button').click();
                        */
                        console.log('Auto login for ${account.website}');
                    `
                });
            }
        }
    }
}

// 启动定时任务管理器
new ScheduledTaskManager();