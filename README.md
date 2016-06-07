分布式服务框架
============

基于Redis的分布式服务框架，传输层使用[super-queue](https://github.com/SuperID/super-queue)消息队列模块。

## 安装

```bash
$ npm install clouds --save
```


## 服务提供者（Server）

```javascript
var clouds = require('clouds');

// 创建服务提供者
var server = new clouds.Server({
  // redis连接配置
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  // 心跳周期，如果服务提供者异常下线，超过指定时间将自动从服务器端删除，单位：秒
  heartbeat: 2
});

// 注册服务处理程序
server.register('test.hello', function (name, msg, callback) {
  // 函数的最后一个参数表示回调函数，客户端在调用的时候必须保证参数数量是一致的
  // 回调函数第一个参数表示是否出错，第二个参数起表示返回的结果
  callback(null, 'Hello ' + name + ', ' + msg);
});
```

## 客户端（Client）

```javascript
const clouds = require('clouds');

const client = new clouds.Client({
  // redis连接配置
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  // 调用超时时间，如果服务器超过指定时间没有响应结果，则认为调用失败，单位：秒
  timeout: 2
  // 本地超时检查（timeout的倍数），默认为1.1，小于1表示不进行本地检查（如果没有启动server端，可能会导致回调无法执行）
  timeoutChecker: 1.1,
  // 心跳周期，如果服务提供者异常下线，超过指定时间将自动从服务器端删除，单位：秒
  heartbeat: 2
});

// 返回一个函数，用于直接调用远程服务
const testHello = client.bind('test.hello');

client.ready(() => {
  // 当所有bind()的函数都已经准备就绪时只需回调
});

// 调用远程服务，跟使用本地普通函数差不多
testHello('Glen', 'timestamp is ' + Date.now(), (err, ret) => {
  console.log(err, ret);
});

// 也可以这样直接调用，第一个参数是服务名，第二个参数是调用参数数组，第三个参数是回调函数
client.call('test.hello', ['Glen', 'timestamp is ' + Date.now()], (err, ret) => {
  console.log(err, ret);
});
```

## 监视器（Monitor）

```javascript
var clouds = require('clouds');

// 创建服务器
var monitor = new clouds.Monitor({
  // redis连接配置
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  }
});

// 获取状态
monitor.status(function (err, info) {
  console.log(err, info);
  // info.methods服务名对应的服务器ID列表
  // info.servers服务器对应的服务名列表
});
```


## License

```
Copyright (c) 2012-2016 Zongmin Lei (雷宗民) <leizongmin@gmail.com>
http://ucdok.com

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
