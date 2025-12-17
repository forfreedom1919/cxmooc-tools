// URL数据结构
interface ScheduledURL {
    id: string;
    url: string;
    scheduleTime: string;
    frequency: string;
}

// 账号数据结构
interface UserAccount {
    id: string;
    website: string;
    username: string;
    password: string;
}

class ManagementSystem {
    private urls: ScheduledURL[] = [];
    private accounts: UserAccount[] = [];

    constructor() {
        this.init();
    }

    private init() {
        this.loadFromStorage();
        this.bindEvents();
        this.renderURLs();
        this.renderAccounts();
    }

    private loadFromStorage() {
        // 从localStorage加载数据
        const savedUrls = localStorage.getItem('scheduledUrls');
        const savedAccounts = localStorage.getItem('userAccounts');
        
        if (savedUrls) {
            this.urls = JSON.parse(savedUrls);
        }
        
        if (savedAccounts) {
            this.accounts = JSON.parse(savedAccounts);
        }
    }

    private saveToStorage() {
        // 保存数据到localStorage
        localStorage.setItem('scheduledUrls', JSON.stringify(this.urls));
        localStorage.setItem('userAccounts', JSON.stringify(this.accounts));
    }

    private bindEvents() {
        // 绑定添加URL事件
        document.getElementById('add-url')?.addEventListener('click', () => {
            this.addURL();
        });

        // 绑定添加账号事件
        document.getElementById('add-account')?.addEventListener('click', () => {
            this.addAccount();
        });
    }

    private addURL() {
        const urlInput = document.getElementById('url') as HTMLInputElement;
        const scheduleInput = document.getElementById('schedule') as HTMLInputElement;
        const frequencyInput = document.getElementById('frequency') as HTMLSelectElement;

        if (!urlInput.value || !scheduleInput.value) {
            alert('请填写完整的网址和定时时间');
            return;
        }

        const newURL: ScheduledURL = {
            id: Date.now().toString(),
            url: urlInput.value,
            scheduleTime: scheduleInput.value,
            frequency: frequencyInput.value
        };

        this.urls.push(newURL);
        this.saveToStorage();
        this.renderURLs();

        // 清空输入框
        urlInput.value = '';
        scheduleInput.value = '';
    }

    private addAccount() {
        const websiteInput = document.getElementById('website') as HTMLInputElement;
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;

        if (!websiteInput.value || !usernameInput.value || !passwordInput.value) {
            alert('请填写完整的账号信息');
            return;
        }

        const newAccount: UserAccount = {
            id: Date.now().toString(),
            website: websiteInput.value,
            username: usernameInput.value,
            password: passwordInput.value
        };

        this.accounts.push(newAccount);
        this.saveToStorage();
        this.renderAccounts();

        // 清空输入框
        websiteInput.value = '';
        usernameInput.value = '';
        passwordInput.value = '';
    }

    private deleteURL(id: string) {
        this.urls = this.urls.filter(url => url.id !== id);
        this.saveToStorage();
        this.renderURLs();
    }

    private deleteAccount(id: string) {
        this.accounts = this.accounts.filter(account => account.id !== id);
        this.saveToStorage();
        this.renderAccounts();
    }

    private renderURLs() {
        const tbody = document.querySelector('#urls-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.urls.forEach(url => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${url.url}</td>
                <td>${url.scheduleTime}</td>
                <td>${url.frequency}</td>
                <td>
                    <button class="delete-btn" data-id="${url.id}" data-type="url">删除</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定删除事件
        document.querySelectorAll('.delete-btn[data-type="url"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).getAttribute('data-id') || '';
                this.deleteURL(id);
            });
        });
    }

    private renderAccounts() {
        const tbody = document.querySelector('#accounts-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.accounts.forEach(account => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${account.website}</td>
                <td>${account.username}</td>
                <td>
                    <button class="delete-btn" data-id="${account.id}" data-type="account">删除</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定删除事件
        document.querySelectorAll('.delete-btn[data-type="account"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).getAttribute('data-id') || '';
                this.deleteAccount(id);
            });
        });
    }
}

// 初始化管理系统
document.addEventListener('DOMContentLoaded', () => {
    new ManagementSystem();
});