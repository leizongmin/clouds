分布式服务框架
==============

+ 基于Redis来传递消息
+ 无管理主机，由节点自主维护
+ 服务器任意加入
+ 简单出错处理机制：调用超时自动重新调用，超过一定次数时返回调用失败错误
+ 目前没有做任何性能测试
+ 可以随意启动多个节点进程，相同的服务也可以派发到多个不同节点来处理


## 服务器端

```javascript
var clouds = require('clouds');

// 创建服务器
var server = new clouds.Server({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  heartbeat: 2  // 心跳周期，如果服务器端异常下线，超过指定时间将自动从服务器端删除，单位：秒
});

// 注册服务处理程序
server.register('test.hello', function (name, msg, callback) {
  var err = new Error('hahaha');
  err.code = Date.now();
  callback(err.code % 2 === 0 ? err : null, 'Hello ' + name + ', ' + msg);
});
```

## 客户端

```javascript
var clouds = require('clouds');

var client = new clouds.Client({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  timeout: 2,  // 调用超时时间，如果服务器超过指定时间没有响应结果，则认为调用失败，单位：秒
  retry: 5     // 调用失败时自动重试次数
});

// 返回一个函数，用于直接调用远程服务
var testHello = client.bind('test.hello');

// 调用远程服务
testHello('Glen', 'timestamp is ' + Date.now(), function (err, ret) {
  console.log(err, ret);
});
```

授权
===========

基于MIT协议发布

